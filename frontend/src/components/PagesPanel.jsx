export default function PagesPanel({ pages, onSelectPage }) {
  return (
    <section className="panel">
      <h2>Pages</h2>
      <div className="pages">
        {pages.map((p) => (
          <div key={p.id} className="page" onClick={() => onSelectPage(p)}>
            <div>#{p.page_index}</div>
            <div>{p.status}</div>
          </div>
        ))}
      </div>
    </section>
  )
}
