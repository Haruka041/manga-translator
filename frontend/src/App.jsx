import { useEffect, useState } from 'react'
import { api } from './apiClient.js'
import { defaultConfig } from './configSchema.js'
import Sidebar from './components/Sidebar.jsx'
import GlobalSettingsPanel from './components/GlobalSettingsPanel.jsx'
import ProjectSettingsPanel from './components/ProjectSettingsPanel.jsx'
import ImportPanel from './components/ImportPanel.jsx'
import PagesPanel from './components/PagesPanel.jsx'
import ProgressPanel from './components/ProgressPanel.jsx'
import PageEditor from './components/PageEditor.jsx'

export default function App() {
  const [globalSettings, setGlobalSettings] = useState(null)
  const [globalDraft, setGlobalDraft] = useState(null)
  const [globalKey, setGlobalKey] = useState('')

  const [jobs, setJobs] = useState([])
  const [selectedJob, setSelectedJob] = useState(null)
  const [jobDraft, setJobDraft] = useState({ title: '', notes: '', tagsText: '', priority: 0 })

  const [pages, setPages] = useState([])
  const [selectedPage, setSelectedPage] = useState(null)
  const [pageJson, setPageJson] = useState(null)
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

  const createJob = async () => {
    if (!globalDraft) return
    try {
      const payload = {
        title: jobDraft.title || 'Untitled',
        notes: jobDraft.notes || '',
        tags: (jobDraft.tagsText || '').split(',').map((s) => s.trim()).filter(Boolean),
        priority: Number(jobDraft.priority || 0),
        config: globalDraft,
        api_key: null
      }
      const res = await api('/api/jobs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      })
      const data = await res.json()
      await loadJobs()
      setSelectedJob({ ...data, api_key: '' })
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
      setSelectedJob({ ...data, api_key: '' })
      await loadJobs()
      setLog('Project saved')
    } catch (e) {
      setLog(String(e))
    }
  }

  const selectJob = async (job) => {
    setSelectedJob({ ...job, api_key: '' })
    setSelectedPage(null)
    setPageJson(null)
    setJsonText('')
    await refreshPages(job.id)
  }

  const refreshPages = async (jobId) => {
    const id = jobId || selectedJob?.id
    if (!id) return
    try {
      const res = await api(`/api/jobs/${id}/pages`)
      const data = await res.json()
      setPages(data)
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

  const exportJob = async () => {
    if (!selectedJob) return
    window.open(`/api/jobs/${selectedJob.id}/export`, '_blank')
  }

  const loadJson = async (page) => {
    try {
      const res = await api(`/api/pages/${page.id}/json`)
      const data = await res.json()
      setSelectedPage(page)
      setPageJson(data)
      setJsonText(JSON.stringify(data, null, 2))
    } catch (e) {
      setLog(String(e))
    }
  }

  const applyJson = () => {
    try {
      const parsed = JSON.parse(jsonText)
      setPageJson(parsed)
      setLog('JSON applied')
    } catch (e) {
      setLog(`Invalid JSON: ${e.message}`)
    }
  }

  const saveJson = async () => {
    if (!selectedPage || !pageJson) return
    try {
      await api(`/api/pages/${selectedPage.id}/json`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: pageJson })
      })
      setJsonText(JSON.stringify(pageJson, null, 2))
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

  const retryFailedA = async () => {
    const failed = pages.filter((p) => p.status === 'failed')
    await Promise.all(
      failed.map((p) => api(`/api/pages/${p.id}/rerun?stage=A`, { method: 'POST' }))
    )
    setLog('Retry Stage A for failed pages')
  }

  const retryFailedB = async () => {
    const targets = pages.filter((p) => p.status === 'failed' || p.status === 'blocked')
    await Promise.all(
      targets.map((p) => api(`/api/pages/${p.id}/rerun?stage=B`, { method: 'POST' }))
    )
    setLog('Retry Stage B for failed/blocked pages')
  }

  useEffect(() => {
    loadGlobal()
    loadJobs()
  }, [])

  const jobLocked =
    selectedJob?.locked || selectedJob?.status === 'running' || selectedJob?.status === 'done'

  return (
    <div className="layout">
      <Sidebar
        jobs={jobs}
        selectedJobId={selectedJob?.id}
        jobDraft={jobDraft}
        setJobDraft={setJobDraft}
        onCreateJob={createJob}
        onRefreshJobs={loadJobs}
        onSelectJob={selectJob}
      />

      <main className="main">
        <GlobalSettingsPanel
          globalDraft={globalDraft}
          globalSettings={globalSettings}
          globalKey={globalKey}
          setGlobalKey={setGlobalKey}
          setGlobalDraft={setGlobalDraft}
          onSave={saveGlobal}
        />

        <ProjectSettingsPanel
          job={selectedJob}
          setJob={setSelectedJob}
          jobLocked={jobLocked}
          onSave={updateJob}
          onRun={runJob}
          onRefreshPages={() => refreshPages()}
          onExport={exportJob}
          onUploadCover={uploadCover}
        />

        {selectedJob && (
          <ImportPanel
            disabled={jobLocked}
            onImportArchive={importArchive}
            onUploadImages={uploadImages}
          />
        )}

        {selectedJob && (
          <ProgressPanel
            pages={pages}
            onRetryA={retryFailedA}
            onRetryB={retryFailedB}
          />
        )}

        {selectedJob && <PagesPanel pages={pages} onSelectPage={loadJson} />}

        <PageEditor
          page={selectedPage}
          pageJson={pageJson}
          setPageJson={setPageJson}
          jsonText={jsonText}
          setJsonText={setJsonText}
          onSaveJson={saveJson}
          onApplyJson={applyJson}
          onRerunB={rerunB}
        />

        <div className="log">{log}</div>
      </main>
    </div>
  )
}
