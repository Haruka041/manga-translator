function countStatus(pages, status) {
  return pages.filter((p) => p.status === status).length
}

export default function ProgressPanel({ pages, onRetryA, onRetryB }) {
  const total = pages.length
  const done = countStatus(pages, 'done')
  const failed = countStatus(pages, 'failed')
  const blocked = countStatus(pages, 'blocked')
  const running = countStatus(pages, 'A_running') + countStatus(pages, 'B_running')
  const queued = countStatus(pages, 'queued')
  const percent = total ? Math.round((done / total) * 100) : 0

  return (
    <section className="panel">
      <h2>Progress</h2>
      <div className="progress-bar">
        <div className="progress-fill" style={{ width: `${percent}%` }} />
      </div>
      <div className="progress-meta">
        <span>Done {done}/{total}</span>
        <span>Running {running}</span>
        <span>Queued {queued}</span>
        <span>Failed {failed}</span>
        <span>Blocked {blocked}</span>
      </div>
      <div className="actions">
        <button onClick={onRetryA} disabled={!failed}>Retry Failed A</button>
        <button onClick={onRetryB} disabled={!failed && !blocked}>Retry Failed/Blocked B</button>
      </div>
    </section>
  )
}
