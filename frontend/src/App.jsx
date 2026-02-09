import { useEffect, useState } from 'react'

const apiBase = ''

async function api(path, options = {}) {
  const res = await fetch(`${apiBase}${path}`, options)
  if (!res.ok) {
    const text = await res.text()
    throw new Error(text)
  }
  return res
}

const defaultConfig = {
  openai_base_url: '',
  model_a: 'gemini-3-pro-preview',
  model_b: 'gemini-3-pro-image-preview',
  model_a_protocol: 'chat_completions',
  model_b_protocol: 'images_edits',
  model_b_endpoint: '/v1/images/edits',
  model_a_use_schema: true,
  qa_mode: 'auto',
  reading_direction: 'auto',
  output_format: 'cbz',
  stage_a_timeout: 120,
  stage_b_timeout: 300,
  retries: 1,
  stage_a_concurrency: 6,
  stage_b_concurrency: 4,
  keep_all_artifacts: true
}

const configFields = [
  { key: 'openai_base_url', label: 'OpenAI Base URL' },
  { key: 'model_a', label: 'Model A' },
  { key: 'model_b', label: 'Model B' },
  { key: 'model_a_protocol', label: 'Model A Protocol', type: 'select', options: ['chat_completions', 'responses'] },
  { key: 'model_b_protocol', label: 'Model B Protocol', type: 'select', options: ['images_edits', 'responses'] },
  { key: 'model_b_endpoint', label: 'Model B Endpoint' },
  { key: 'model_a_use_schema', label: 'Use JSON Schema', type: 'checkbox' },
  { key: 'qa_mode', label: 'QA Mode', type: 'select', options: ['auto', 'strict'] },
  { key: 'reading_direction', label: 'Reading Direction', type: 'select', options: ['auto', 'rtl', 'ltr'] },
  { key: 'output_format', label: 'Output Format', type: 'select', options: ['cbz', 'zip'] },
  { key: 'stage_a_timeout', label: 'Stage A Timeout (s)', type: 'number' },
  { key: 'stage_b_timeout', label: 'Stage B Timeout (s)', type: 'number' },
  { key: 'retries', label: 'Retries', type: 'number' },
  { key: 'stage_a_concurrency', label: 'Stage A Concurrency', type: 'number', hint: '需重启 worker 生效' },
  { key: 'stage_b_concurrency', label: 'Stage B Concurrency', type: 'number', hint: '需重启 worker 生效' },
  { key: 'keep_all_artifacts', label: 'Keep All Artifacts', type: 'checkbox' }
]

export default function App() {
  const [globalSettings, setGlobalSettings] = useState(null)
  const [globalDraft, setGlobalDraft] = useState(null)
  const [globalKey, setGlobalKey] = useState('')

  const [jobs, setJobs] = useState([])
  const [selectedJob, setSelectedJob] = useState(null)
  const [jobDraft, setJobDraft] = useState(null)

  const [pages, setPages] = useState([])
  const [selectedPage, setSelectedPage] = useState(null)
  const [jsonText, setJsonText] = useState('')
  const [log, setLog] = useState('')

  const loadGlobal = async () => {
    try {
      const res = await api('/api/settings')
      const data = await res.json()
      setGlobalSettings(data)
      setGlobalDraft({ ...defaultConfig, ...data.config })
    } catch (e) {
      setLog(String(e))
    }
  }

  const saveGlobal = async () => {
    try {
      const payload = { config: globalDraft, api_key: globalKey || null }
      const res = await api('/api/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      })
      const data = await res.json()
      setGlobalSettings(data)
      setGlobalKey('')
      setLog('Global settings saved')
    } catch (e) {
      setLog(String(e))
    }
  }

  const loadJobs = async () => {
    try {
      const res = await api('/api/jobs')
      const data = await res.json()
      setJobs(data)
    } catch (e) {
      setLog(String(e))
    }
  }

  useEffect(() => {
    loadGlobal()
    loadJobs()
  }, [])

  const createJob = async () => {
    if (!globalDraft) return
    try {
      const payload = {
        title: jobDraft?.title || 'Untitled',
        notes: jobDraft?.notes || '',
        tags: jobDraft?.tags || [],
        priority: Number(jobDraft?.priority || 0),
        config: jobDraft?.config || globalDraft,
        api_key: jobDraft?.api_key || null
      }
      const res = await api('/api/jobs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      })
      const data = await res.json()
      await loadJobs()
      setSelectedJob(data)
      setLog(`Project created: ${data.id}`)
    } catch (e) {
      setLog(String(e))
    }
  }

  const updateJob = async () => {
    if (!selectedJob) return
    try {
      const payload = {
        title: selectedJob.title,
        notes: selectedJob.notes,
        tags: selectedJob.tags,
        priority: Number(selectedJob.priority || 0),
        config: selectedJob.config,
        api_key: selectedJob.api_key || null
      }
      const res = await api(`/api/jobs/${selectedJob.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      })
      const data = await res.json()
      setSelectedJob(data)
      await loadJobs()
      setLog('Project saved')
    } catch (e) {
      setLog(String(e))
    }
  }

  const importArchive = async (file) => {
    if (!selectedJob) return
    const form = new FormData()
    form.append('file', file)
    try {
      await api(`/api/jobs/${selectedJob.id}/import`, { method: 'POST', body: form })
      setLog('Archive imported')
      await refreshPages()
    } catch (e) {
      setLog(String(e))
    }
  }

  const uploadImages = async (files) => {
    if (!selectedJob) return
    const form = new FormData()
    for (const f of files) form.append('files', f)
    try {
      await api(`/api/jobs/${selectedJob.id}/pages`, { method: 'POST', body: form })
      setLog('Images uploaded')
      await refreshPages()
    } catch (e) {
      setLog(String(e))
    }
  }

  const runJob = async () => {
    if (!selectedJob) return
    try {
      await api(`/api/jobs/${selectedJob.id}/run`, { method: 'POST' })
      setLog('Job running')
      await loadJobs()
    } catch (e) {
      setLog(String(e))
    }
  }

  const refreshPages = async () => {
    if (!selectedJob) return
    try {
      const res = await api(`/api/jobs/${selectedJob.id}/pages`)
      const data = await res.json()
      setPages(data)
    } catch (e) {
      setLog(String(e))
    }
  }

  const loadJson = async (page) => {
    try {
      const res = await api(`/api/pages/${page.id}/json`)
      const data = await res.json()
      setJsonText(JSON.stringify(data, null, 2))
      setSelectedPage(page)
    } catch (e) {
      setLog(String(e))
    }
  }

  const saveJson = async () => {
    if (!selectedPage) return
    try {
      const parsed = JSON.parse(jsonText)
      await api(`/api/pages/${selectedPage.id}/json`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: parsed })
      })
      setLog('JSON saved')
    } catch (e) {
      setLog(String(e))
    }
  }

  const rerunB = async () => {
    if (!selectedPage) return
    try {
      await api(`/api/pages/${selectedPage.id}/rerun?stage=B`, { method: 'POST' })
      setLog('Stage B rerun enqueued')
    } catch (e) {
      setLog(String(e))
    }
  }

  const exportJob = async () => {
    if (!selectedJob) return
    window.open(`/api/jobs/${selectedJob.id}/export`, '_blank')
  }

  const uploadCover = async (file) => {
    if (!selectedJob) return
    const form = new FormData()
    form.append('file', file)
    try {
      await api(`/api/jobs/${selectedJob.id}/cover`, { method: 'POST', body: form })
      setLog('Cover uploaded')
      await loadJobs()
    } catch (e) {
      setLog(String(e))
    }
  }

  const selectJob = async (job) => {
    setSelectedJob({ ...job, api_key: '' })
    setSelectedPage(null)
    setPages([])
    try {
      const res = await api(`/api/jobs/${job.id}/pages`)
      const data = await res.json()
      setPages(data)
    } catch (e) {
      setLog(String(e))
    }
  }

  const jobLocked = selectedJob?.locked || selectedJob?.status === 'running' || selectedJob?.status === 'done'

  return (
    <div className="layout">
      <aside className="sidebar">
        <div className="brand">Mangat</div>
        <div className="section">
          <button onClick={loadJobs}>Refresh</button>
        </div>

        <div className="section">
          <h3>Create Project</h3>
          <input placeholder="Title" onChange={(e) => setJobDraft({ ...(jobDraft || {}), title: e.target.value })} />
          <textarea placeholder="Notes" rows="3" onChange={(e) => setJobDraft({ ...(jobDraft || {}), notes: e.target.value })} />
          <input placeholder="Tags (comma)" onChange={(e) => setJobDraft({ ...(jobDraft || {}), tags: e.target.value.split(',').map(s => s.trim()).filter(Boolean) })} />
          <input type="number" placeholder="Priority" onChange={(e) => setJobDraft({ ...(jobDraft || {}), priority: e.target.value })} />
          <button onClick={createJob}>Create</button>
        </div>

        <div className="section">
          <h3>Projects</h3>
          <div className="list">
            {jobs.map((j) => (
              <div key={j.id} className={`item ${selectedJob?.id === j.id ? 'active' : ''}`} onClick={() => selectJob(j)}>
                <div className="item-title">{j.title || 'Untitled'}</div>
                <div className="item-sub">{j.status} · {j.done_pages}/{j.total_pages}</div>
              </div>
            ))}
          </div>
        </div>
      </aside>

      <main className="main">
        <section className="panel">
          <h2>Global Settings</h2>
          {globalDraft && (
            <div className="grid">
              {configFields.map((f) => (
                <div key={f.key} className="field">
                  <label>{f.label}</label>
                  {f.type === 'select' ? (
                    <select value={globalDraft[f.key]} onChange={(e) => setGlobalDraft({ ...globalDraft, [f.key]: e.target.value })}>
                      {f.options.map((opt) => <option key={opt} value={opt}>{opt}</option>)}
                    </select>
                  ) : f.type === 'checkbox' ? (
                    <input type="checkbox" checked={!!globalDraft[f.key]} onChange={(e) => setGlobalDraft({ ...globalDraft, [f.key]: e.target.checked })} />
                  ) : (
                    <input type={f.type || 'text'} value={globalDraft[f.key]} onChange={(e) => setGlobalDraft({ ...globalDraft, [f.key]: f.type === 'number' ? Number(e.target.value) : e.target.value })} />
                  )}
                  {f.hint && <div className="hint">{f.hint}</div>}
                </div>
              ))}
              <div className="field">
                <label>API Key (encrypted)</label>
                <input type="password" placeholder={globalSettings?.api_key_set ? `****${globalSettings.api_key_last4}` : 'Not set'} value={globalKey} onChange={(e) => setGlobalKey(e.target.value)} />
              </div>
            </div>
          )}
          <button onClick={saveGlobal}>Save Global</button>
        </section>

        {selectedJob && (
          <section className="panel">
            <h2>Project Settings</h2>
            {jobLocked && <div className="hint">项目已锁定（运行后不可修改配置）</div>}
            <div className="grid">
              <div className="field">
                <label>Title</label>
                <input value={selectedJob.title} onChange={(e) => setSelectedJob({ ...selectedJob, title: e.target.value })} disabled={jobLocked} />
              </div>
              <div className="field">
                <label>Notes</label>
                <textarea rows="3" value={selectedJob.notes} onChange={(e) => setSelectedJob({ ...selectedJob, notes: e.target.value })} disabled={jobLocked} />
              </div>
              <div className="field">
                <label>Tags</label>
                <input value={selectedJob.tags?.join(', ') || ''} onChange={(e) => setSelectedJob({ ...selectedJob, tags: e.target.value.split(',').map(s => s.trim()).filter(Boolean) })} disabled={jobLocked} />
              </div>
              <div className="field">
                <label>Priority</label>
                <input type="number" value={selectedJob.priority || 0} onChange={(e) => setSelectedJob({ ...selectedJob, priority: e.target.value })} disabled={jobLocked} />
              </div>
              <div className="field">
                <label>Cover</label>
                <input type="file" onChange={(e) => e.target.files[0] && uploadCover(e.target.files[0])} disabled={jobLocked} />
                {selectedJob.cover_path && (
                  <div className="hint">
                    <img className="cover" src={`/api/jobs/${selectedJob.id}/cover`} />
                  </div>
                )}
              </div>
            </div>

            <div className="divider" />

            <h3>Project Config (override)</h3>
            <div className="grid">
              {configFields.map((f) => (
                <div key={f.key} className="field">
                  <label>{f.label}</label>
                  {f.type === 'select' ? (
                    <select value={selectedJob.config?.[f.key] ?? ''} onChange={(e) => setSelectedJob({ ...selectedJob, config: { ...selectedJob.config, [f.key]: e.target.value } })} disabled={jobLocked}>
                      {f.options.map((opt) => <option key={opt} value={opt}>{opt}</option>)}
                    </select>
                  ) : f.type === 'checkbox' ? (
                    <input type="checkbox" checked={!!selectedJob.config?.[f.key]} onChange={(e) => setSelectedJob({ ...selectedJob, config: { ...selectedJob.config, [f.key]: e.target.checked } })} disabled={jobLocked} />
                  ) : (
                    <input type={f.type || 'text'} value={selectedJob.config?.[f.key] ?? ''} onChange={(e) => setSelectedJob({ ...selectedJob, config: { ...selectedJob.config, [f.key]: f.type === 'number' ? Number(e.target.value) : e.target.value } })} disabled={jobLocked} />
                  )}
                  {f.hint && <div className="hint">{f.hint}</div>}
                </div>
              ))}
              <div className="field">
                <label>API Key Override</label>
                <input type="password" placeholder={selectedJob.api_key_last4 ? `****${selectedJob.api_key_last4}` : 'Not set'} value={selectedJob.api_key || ''} onChange={(e) => setSelectedJob({ ...selectedJob, api_key: e.target.value })} disabled={jobLocked} />
              </div>
            </div>

            <div className="actions">
              <button onClick={updateJob} disabled={jobLocked}>Save Project</button>
              <button onClick={runJob}>Run</button>
              <button onClick={refreshPages}>Refresh Pages</button>
              <button onClick={exportJob}>Export CBZ</button>
            </div>
          </section>
        )}

        {selectedJob && (
          <section className="panel">
            <h2>Import</h2>
            <div className="grid">
              <div className="field">
                <label>CBZ/ZIP/PDF</label>
                <input type="file" onChange={(e) => e.target.files[0] && importArchive(e.target.files[0])} />
              </div>
              <div className="field">
                <label>Images</label>
                <input type="file" multiple onChange={(e) => uploadImages(e.target.files)} />
              </div>
            </div>
          </section>
        )}

        {selectedJob && (
          <section className="panel">
            <h2>Pages</h2>
            <div className="pages">
              {pages.map((p) => (
                <div key={p.id} className="page" onClick={() => loadJson(p)}>
                  <div>#{p.page_index}</div>
                  <div>{p.status}</div>
                </div>
              ))}
            </div>
          </section>
        )}

        {selectedPage && (
          <section className="panel">
            <h2>Page Viewer</h2>
            <div className="grid">
              <div>
                <h3>Original</h3>
                <img src={`/api/pages/${selectedPage.id}/image?variant=original`} />
              </div>
              <div>
                <h3>Output</h3>
                <img src={`/api/pages/${selectedPage.id}/image?variant=output`} />
              </div>
            </div>
          </section>
        )}

        {selectedPage && (
          <section className="panel">
            <h2>JSON Editor</h2>
            <textarea value={jsonText} onChange={(e) => setJsonText(e.target.value)} rows="18" />
            <div className="actions">
              <button onClick={saveJson}>Save JSON</button>
              <button onClick={rerunB}>Rerun Stage B</button>
            </div>
          </section>
        )}

        <div className="log">{log}</div>
      </main>
    </div>
  )
}
