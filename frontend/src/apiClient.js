const apiBase = ''

export async function api(path, options = {}) {
  const res = await fetch(`${apiBase}${path}`, options)
  if (!res.ok) {
    const text = await res.text()
    throw new Error(text)
  }
  return res
}
