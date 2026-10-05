import { useState } from 'react'
import { useReactFlow } from '@xyflow/react'
import { exportTreeAsPng, exportTreeAsPdf } from './exportTree'
import './export-button.css'

export function ExportButton() {
  const { getNodes } = useReactFlow()
  const [busy, setBusy] = useState<'png' | 'pdf' | null>(null)
  const [error, setError] = useState<string | null>(null)

  async function handleExport(format: 'png' | 'pdf') {
    setBusy(format)
    setError(null)
    try {
      const nodes = getNodes()
      if (format === 'png') await exportTreeAsPng(nodes)
      else await exportTreeAsPdf(nodes)
    } catch (err) {
      console.error(err)
      setError('Export failed — try again.')
    } finally {
      setBusy(null)
    }
  }

  return (
    <div className="export-controls">
      <button type="button" disabled={busy !== null} onClick={() => handleExport('png')}>
        {busy === 'png' ? 'Exporting…' : 'Export PNG'}
      </button>
      <button type="button" disabled={busy !== null} onClick={() => handleExport('pdf')}>
        {busy === 'pdf' ? 'Exporting…' : 'Export PDF'}
      </button>
      {error && <span className="export-error">{error}</span>}
    </div>
  )
}
