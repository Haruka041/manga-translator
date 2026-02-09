import { configFields } from '../configSchema.js'

export default function GlobalSettingsPanel({
  globalDraft,
  globalSettings,
  globalKey,
  setGlobalKey,
  setGlobalDraft,
  onSave
}) {
  if (!globalDraft) return null

  return (
    <section className="panel">
      <h2>Global Settings</h2>
      <div className="grid">
        {configFields.map((f) => (
          <div key={f.key} className="field">
            <label>{f.label}</label>
            {f.type === 'select' ? (
              <select
                value={globalDraft[f.key] ?? ''}
                onChange={(e) => setGlobalDraft({ ...globalDraft, [f.key]: e.target.value })}
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
                checked={!!globalDraft[f.key]}
                onChange={(e) => setGlobalDraft({ ...globalDraft, [f.key]: e.target.checked })}
              />
            ) : (
              <input
                type={f.type || 'text'}
                value={globalDraft[f.key] ?? ''}
                onChange={(e) =>
                  setGlobalDraft({
                    ...globalDraft,
                    [f.key]: f.type === 'number' ? Number(e.target.value) : e.target.value
                  })
                }
              />
            )}
            {f.hint && <div className="hint">{f.hint}</div>}
          </div>
        ))}
        <div className="field">
          <label>API Key (encrypted)</label>
          <input
            type="password"
            placeholder={
              globalSettings?.api_key_set ? `****${globalSettings.api_key_last4}` : 'Not set'
            }
            value={globalKey}
            onChange={(e) => setGlobalKey(e.target.value)}
          />
        </div>
      </div>
      <button onClick={onSave}>Save Global</button>
    </section>
  )
}
