export default function Sidebar({
  jobs,
  selectedJobId,
  jobDraft,
  setJobDraft,
  onCreateJob,
  onRefreshJobs,
  onSelectJob
}) {
  return (
    <aside className="sidebar">
      <div className="brand">Mangat</div>
      <div className="section">
        <button onClick={onRefreshJobs}>Refresh</button>
      </div>

      <div className="section">
        <h3>Create Project</h3>
        <input
          placeholder="Title"
          value={jobDraft.title || ''}
          onChange={(e) => setJobDraft({ ...jobDraft, title: e.target.value })}
        />
        <textarea
          placeholder="Notes"
          rows="3"
          value={jobDraft.notes || ''}
          onChange={(e) => setJobDraft({ ...jobDraft, notes: e.target.value })}
        />
        <input
          placeholder="Tags (comma)"
          value={jobDraft.tagsText || ''}
          onChange={(e) => setJobDraft({ ...jobDraft, tagsText: e.target.value })}
        />
        <input
          type="number"
          placeholder="Priority"
          value={jobDraft.priority || 0}
          onChange={(e) => setJobDraft({ ...jobDraft, priority: e.target.value })}
        />
        <button onClick={onCreateJob}>Create</button>
      </div>

      <div className="section">
        <h3>Projects</h3>
        <div className="list">
          {jobs.map((j) => (
            <div
              key={j.id}
              className={`item ${selectedJobId === j.id ? 'active' : ''}`}
              onClick={() => onSelectJob(j)}
            >
              <div className="item-title">{j.title || 'Untitled'}</div>
              <div className="item-sub">
                {j.status} · {j.done_pages}/{j.total_pages}
              </div>
            </div>
          ))}
        </div>
      </div>
    </aside>
  )
}
