export default function ImportPanel({ onImportArchive, onUploadImages, disabled }) {
  return (
    <section className="panel">
      <h2>Import</h2>
      <div className="grid">
        <div className="field">
          <label>CBZ/ZIP/PDF</label>
          <input type="file" onChange={(e) => e.target.files[0] && onImportArchive(e.target.files[0])} disabled={disabled} />
        </div>
        <div className="field">
          <label>Images</label>
          <input type="file" multiple onChange={(e) => onUploadImages(e.target.files)} disabled={disabled} />
        </div>
      </div>
    </section>
  )
}
