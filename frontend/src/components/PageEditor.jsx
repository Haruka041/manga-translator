import { useEffect, useMemo, useRef, useState } from 'react'

function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max)
}

function createNewItem(nextId, nextOrder) {
  return {
    id: String(nextId),
    panel: 'P1',
    order: nextOrder,
    type: 'dialogue',
    action: 'replace',
    orientation: 'vertical',
    is_small_text: false,
    location: '',
    anchor: '',
    bbox_norm: [0.1, 0.1, 0.3, 0.2],
    jp_text: null,
    cn_text: '',
    tone: '平静',
    emotion_intensity: 1,
    linebreak_suggestion: null,
    linebreak_lock: false,
    confidence: 0.9,
    needs_user_confirm: false,
    notes: ''
  }
}

function BBoxCanvas({ imageUrl, items, selectedId, onSelect, onUpdateBBox }) {
  const imgRef = useRef(null)
  const containerRef = useRef(null)
  const [baseDims, setBaseDims] = useState({ width: 1, height: 1 })
  const [drag, setDrag] = useState(null)
  const [scale, setScale] = useState(1)
  const [offset, setOffset] = useState({ x: 0, y: 0 })
  const [panning, setPanning] = useState(null)

  useEffect(() => {
    const img = imgRef.current
    if (!img) return
    const onLoad = () => {
      const rect = img.getBoundingClientRect()
      setBaseDims({ width: rect.width, height: rect.height })
      setScale(1)
      setOffset({ x: 0, y: 0 })
    }
    img.addEventListener('load', onLoad)
    return () => img.removeEventListener('load', onLoad)
  }, [imageUrl])

  const localPoint = (clientX, clientY) => {
    const rect = containerRef.current.getBoundingClientRect()
    const x = (clientX - rect.left - offset.x) / scale
    const y = (clientY - rect.top - offset.y) / scale
    return { x, y }
  }

  const startDrag = (e, itemId, mode, handle) => {
    e.stopPropagation()
    const { x, y } = localPoint(e.clientX, e.clientY)
    const item = items.find((i) => i.id === itemId)
    if (!item) return
    setDrag({
      itemId,
      mode,
      handle,
      startX: x,
      startY: y,
      startBBox: [...item.bbox_norm]
    })
  }

  const onMove = (e) => {
    if (!drag) return
    const { x, y } = localPoint(e.clientX, e.clientY)
    const dx = (x - drag.startX) / baseDims.width
    const dy = (y - drag.startY) / baseDims.height
    let [x1, y1, x2, y2] = drag.startBBox

    if (drag.mode === 'move') {
      const w = x2 - x1
      const h = y2 - y1
      x1 = clamp(x1 + dx, 0, 1 - w)
      y1 = clamp(y1 + dy, 0, 1 - h)
      x2 = x1 + w
      y2 = y1 + h
    } else if (drag.mode === 'resize') {
      const minSize = 10 / Math.max(baseDims.width, baseDims.height)
      if (drag.handle.includes('n')) y1 = clamp(y1 + dy, 0, y2 - minSize)
      if (drag.handle.includes('s')) y2 = clamp(y2 + dy, y1 + minSize, 1)
      if (drag.handle.includes('w')) x1 = clamp(x1 + dx, 0, x2 - minSize)
      if (drag.handle.includes('e')) x2 = clamp(x2 + dx, x1 + minSize, 1)
    }

    onUpdateBBox(drag.itemId, [x1, y1, x2, y2])
  }

  const stopDrag = () => {
    if (drag) setDrag(null)
    if (panning) setPanning(null)
  }

  const startPan = (e) => {
    if (e.target.classList.contains('bbox') || e.target.classList.contains('handle')) return
    setPanning({ startX: e.clientX, startY: e.clientY, startOffset: { ...offset } })
  }

  const onPanMove = (e) => {
    if (!panning) return
    const dx = e.clientX - panning.startX
    const dy = e.clientY - panning.startY
    setOffset({ x: panning.startOffset.x + dx, y: panning.startOffset.y + dy })
  }

  const onWheel = (e) => {
    e.preventDefault()
    const delta = e.deltaY > 0 ? -0.1 : 0.1
    setScale((s) => clamp(Number((s + delta).toFixed(2)), 0.5, 3))
  }

  return (
    <div
      className="bbox-container"
      ref={containerRef}
      onMouseMove={(e) => {
        onMove(e)
        onPanMove(e)
      }}
      onMouseUp={stopDrag}
      onMouseLeave={stopDrag}
      onWheel={onWheel}
    >
      <div className="bbox-toolbar">
        <button onClick={() => setScale((s) => clamp(s + 0.1, 0.5, 3))}>+</button>
        <button onClick={() => setScale((s) => clamp(s - 0.1, 0.5, 3))}>-</button>
        <button onClick={() => { setScale(1); setOffset({ x: 0, y: 0 }) }}>Reset</button>
      </div>
      <div className="bbox-stage" onMouseDown={startPan}>
        <div className="bbox-transform" style={{ transform: `translate(${offset.x}px, ${offset.y}px) scale(${scale})` }}>
          <img ref={imgRef} src={imageUrl} className="bbox-image" />
          <div className="bbox-overlay">
            {items.map((item) => {
              const [x1, y1, x2, y2] = item.bbox_norm
              const left = x1 * baseDims.width
              const top = y1 * baseDims.height
              const width = (x2 - x1) * baseDims.width
              const height = (y2 - y1) * baseDims.height
              const isActive = selectedId === item.id
              return (
                <div
                  key={item.id}
                  className={`bbox ${isActive ? 'active' : ''}`}
                  style={{ left, top, width, height }}
                  onMouseDown={(e) => startDrag(e, item.id, 'move', '')}
                  onClick={() => onSelect(item.id)}
                >
                  {['nw', 'ne', 'sw', 'se'].map((h) => (
                    <div
                      key={h}
                      className={`handle ${h}`}
                      onMouseDown={(e) => startDrag(e, item.id, 'resize', h)}
                    />
                  ))}
                  <div className="bbox-label">{item.id}</div>
                </div>
              )
            })}
          </div>
        </div>
      </div>
    </div>
  )
}

export default function PageEditor({
  page,
  pageJson,
  setPageJson,
  jsonText,
  setJsonText,
  onSaveJson,
  onApplyJson,
  onRerunB
}) {
  const [selectedId, setSelectedId] = useState('')

  useEffect(() => {
    if (pageJson?.items?.length) {
      setSelectedId(pageJson.items[0].id)
    } else {
      setSelectedId('')
    }
  }, [pageJson?.items?.length])

  const selectedItem = useMemo(() => {
    return pageJson?.items?.find((i) => i.id === selectedId)
  }, [pageJson, selectedId])

  const updateItemField = (key, value) => {
    if (!pageJson) return
    const items = pageJson.items.map((i) => (i.id === selectedId ? { ...i, [key]: value } : i))
    setPageJson({ ...pageJson, items })
  }

  const updateBBox = (itemId, bbox) => {
    if (!pageJson) return
    const items = pageJson.items.map((i) => (i.id === itemId ? { ...i, bbox_norm: bbox } : i))
    setPageJson({ ...pageJson, items })
  }

  const addItem = () => {
    if (!pageJson) return
    const nextId = pageJson.items.length ? Math.max(...pageJson.items.map(i => Number(i.id))) + 1 : 1
    const nextOrder = pageJson.items.length ? Math.max(...pageJson.items.map(i => i.order)) + 1 : 1
    const newItem = createNewItem(nextId, nextOrder)
    setPageJson({ ...pageJson, items: [...pageJson.items, newItem] })
    setSelectedId(newItem.id)
  }

  const removeItem = () => {
    if (!pageJson || !selectedId) return
    const items = pageJson.items.filter((i) => i.id !== selectedId)
    setPageJson({ ...pageJson, items })
    setSelectedId(items[0]?.id || '')
  }

  if (!page || !pageJson) return null

  return (
    <>
      <section className="panel">
        <h2>Page Viewer</h2>
        <div className="grid">
          <div>
            <h3>Original (Edit BBox)</h3>
            <BBoxCanvas
              imageUrl={`/api/pages/${page.id}/image?variant=original`}
              items={pageJson.items}
              selectedId={selectedId}
              onSelect={setSelectedId}
              onUpdateBBox={updateBBox}
            />
          </div>
          <div>
            <h3>Output</h3>
            <img src={`/api/pages/${page.id}/image?variant=output`} />
          </div>
        </div>
      </section>

      <section className="panel">
        <div className="actions">
          <button onClick={addItem}>Add Item</button>
          <button onClick={removeItem} disabled={!selectedId}>Delete Item</button>
        </div>
        <div className="item-list">
          {pageJson.items.map((i) => (
            <div
              key={i.id}
              className={`item-row ${selectedId === i.id ? 'active' : ''}`}
              onClick={() => setSelectedId(i.id)}
            >
              #{i.id} · {i.type} · {i.action}
            </div>
          ))}
        </div>

        {selectedItem && (
          <div className="grid">
            <div className="field">
              <label>Type</label>
              <select value={selectedItem.type} onChange={(e) => updateItemField('type', e.target.value)}>
                {['dialogue','narration','sfx','title','note','sign','credit','logo','watermark'].map((t) => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </select>
            </div>
            <div className="field">
              <label>Action</label>
              <select value={selectedItem.action} onChange={(e) => updateItemField('action', e.target.value)}>
                {['replace','remove'].map((t) => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </select>
            </div>
            <div className="field">
              <label>Orientation</label>
              <select value={selectedItem.orientation} onChange={(e) => updateItemField('orientation', e.target.value)}>
                {['vertical','horizontal','unknown'].map((t) => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </select>
            </div>
            <div className="field">
              <label>JP Text</label>
              <textarea rows="2" value={selectedItem.jp_text || ''} onChange={(e) => updateItemField('jp_text', e.target.value || null)} />
            </div>
            <div className="field">
              <label>CN Text</label>
              <textarea rows="2" value={selectedItem.cn_text || ''} onChange={(e) => updateItemField('cn_text', e.target.value || null)} />
            </div>
            <div className="field">
              <label>Tone</label>
              <input value={selectedItem.tone || ''} onChange={(e) => updateItemField('tone', e.target.value)} />
            </div>
            <div className="field">
              <label>Emotion</label>
              <input type="number" value={selectedItem.emotion_intensity || 1} onChange={(e) => updateItemField('emotion_intensity', Number(e.target.value))} />
            </div>
            <div className="field">
              <label>Linebreak</label>
              <textarea rows="2" value={selectedItem.linebreak_suggestion || ''} onChange={(e) => updateItemField('linebreak_suggestion', e.target.value || null)} />
            </div>
            <div className="field">
              <label>Needs Confirm</label>
              <input type="checkbox" checked={!!selectedItem.needs_user_confirm} onChange={(e) => updateItemField('needs_user_confirm', e.target.checked)} />
            </div>
            <div className="field">
              <label>Notes</label>
              <textarea rows="2" value={selectedItem.notes || ''} onChange={(e) => updateItemField('notes', e.target.value)} />
            </div>
          </div>
        )}

        <div className="actions">
          <button onClick={onSaveJson}>Save JSON</button>
          <button onClick={onRerunB}>Rerun Stage B</button>
        </div>
      </section>

      <section className="panel">
        <h2>Raw JSON</h2>
        <textarea value={jsonText} onChange={(e) => setJsonText(e.target.value)} rows="14" />
        <div className="actions">
          <button onClick={onApplyJson}>Apply JSON</button>
          <button onClick={() => setJsonText(JSON.stringify(pageJson, null, 2))}>Sync JSON</button>
        </div>
      </section>
    </>
  )
}
