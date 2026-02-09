import { configFields } from '../configSchema.js'

export default function ProjectSettingsPanel({
  job,
  setJob,
  jobLocked,
  onSave,
  onRun,
  onRefreshPages,
  onExport,
  onUploadCover
}) {
  if (!job) return null

  return (
    <section className="panel">
      <h2>Project Settings</h2>
      {jobLocked && <div className="hint">项目已锁定（运行后不可修改配置）</div>}
      <div className="grid">
        <div className="field">
          <label>Title</label>
          <input value={job.title} onChange={(e) => setJob({ ...job, title: e.target.value })} disabled={jobLocked} />
        </div>
        <div className="field">
          <label>Notes</label>
          <textarea rows="3" value={job.notes} onChange={(e) => setJob({ ...job, notes: e.target.value })} disabled={jobLocked} />
        </div>
        <div className="field">
          <label>Tags</label>
          <input value={job.tags?.join(', ') || ''} onChange={(e) => setJob({ ...job, tags: e.target.value.split(',').map(s => s.trim()).filter(Boolean) })} disabled={jobLocked} />
        </div>
        <div className="field">
          <label>Priority</label>
          <input type="number" value={job.priority || 0} onChange={(e) => setJob({ ...job, priority: e.target.value })} disabled={jobLocked} />
        </div>
        <div className="field">
          <label>Cover</label>
          <input type="file" onChange={(e) => e.target.files[0] && onUploadCover(e.target.files[0])} disabled={jobLocked} />
          {job.cover_path && (
            <div className="hint">
              <img className="cover" src={`/api/jobs/${job.id}/cover`} />
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
              <select
                value={job.config?.[f.key] ?? ''}
                onChange={(e) => setJob({ ...job, config: { ...job.config, [f.key]: e.target.value } })}
                disabled={jobLocked}
              >
                {f.options.map((opt) => (
                  <option key={opt} value={opt}>
                    {opt}
                  </option>
                ))}
              </select>
            ) : f.type === 'checkbox' ? (
              <input
                type="checkbox"
                checked={!!job.config?.[f.key]}
                onChange={(e) => setJob({ ...job, config: { ...job.config, [f.key]: e.target.checked } })}
                disabled={jobLocked}
              />
            ) : (
              <input
                type={f.type || 'text'}
                value={job.config?.[f.key] ?? ''}
                onChange={(e) =>
                  setJob({
                    ...job,
                    config: {
                      ...job.config,
                      [f.key]: f.type === 'number' ? Number(e.target.value) : e.target.value
                    }
                  })
                }
                disabled={jobLocked}
              />
            )}
            {f.hint && <div className="hint">{f.hint}</div>}
          </div>
        ))}
        <div className="field">
          <label>API Key Override</label>
          <input
            type="password"
            placeholder={job.api_key_last4 ? `****${job.api_key_last4}` : 'Not set'}
            value={job.api_key || ''}
            onChange={(e) => setJob({ ...job, api_key: e.target.value })}
            disabled={jobLocked}
          />
        </div>
      </div>

      <div className="actions">
        <button onClick={onSave} disabled={jobLocked}>Save Project</button>
        <button onClick={onRun}>Run</button>
        <button onClick={onRefreshPages}>Refresh Pages</button>
        <button onClick={onExport}>Export CBZ</button>
      </div>
    </section>
  )
}
