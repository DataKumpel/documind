/**
 * Dashboard page with document list, stats, and upload.
 */
import { useEffect, useState, useCallback } from 'react'
import { Link } from 'react-router-dom'
import { useDocumentStore } from '../stores/documentStore'
import StatusBadge from '../components/ui/StatusBadge'
import UploadDialog from '../components/UploadDialog'

export default function DashboardPage() {
  const documents = useDocumentStore((s) => s.documents)
  const documentTypes = useDocumentStore((s) => s.documentTypes)
  const isLoading = useDocumentStore((s) => s.isLoading)
  const fetchDocuments = useDocumentStore((s) => s.fetchDocuments)
  const fetchDocumentTypes = useDocumentStore((s) => s.fetchDocumentTypes)
  const deleteDocument = useDocumentStore((s) => s.deleteDocument)

  const [showUpload, setShowUpload] = useState(false)
  const [deletingId, setDeletingId] = useState<number | null>(null)

  useEffect(() => {
    fetchDocuments()
    fetchDocumentTypes()
  }, [fetchDocuments, fetchDocumentTypes])

  // Poll for processing documents
  const hasProcessing = documents.some((d) => d.status === 'processing' || d.status === 'pending')
  useEffect(() => {
    if (!hasProcessing) return
    const interval = setInterval(fetchDocuments, 3000)
    return () => clearInterval(interval)
  }, [hasProcessing, fetchDocuments])

  const handleDelete = useCallback(async (id: number) => {
    setDeletingId(id)
    await deleteDocument(id)
    setDeletingId(null)
  }, [deleteDocument])

  // Stats
  const stats = {
    total: documents.length,
    completed: documents.filter((d) => d.status === 'completed').length,
    processing: documents.filter((d) => d.status === 'processing' || d.status === 'pending').length,
    failed: documents.filter((d) => d.status === 'failed').length,
  }

  return (
    <div className="p-8 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-surface-50">Dashboard</h1>
          <p className="text-surface-200 mt-1">Übersicht aller Dokumente</p>
        </div>
        <button
          onClick={() => setShowUpload(true)}
          className="flex items-center gap-2 px-5 py-2.5 rounded-lg bg-brand-600 hover:bg-brand-500 text-white text-sm font-medium transition-colors cursor-pointer"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
          </svg>
          Dokument hochladen
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-4 mb-8">
        <StatCard label="Gesamt" value={stats.total} color="brand" />
        <StatCard label="Abgeschlossen" value={stats.completed} color="completed" />
        <StatCard label="In Bearbeitung" value={stats.processing} color="processing" />
        <StatCard label="Fehlgeschlagen" value={stats.failed} color="failed" />
      </div>

      {/* Documents table */}
      <div className="glass rounded-xl overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="border-b border-surface-700">
              <th className="text-left py-3 px-4 text-xs font-medium text-surface-200 uppercase tracking-wider">Datei</th>
              <th className="text-left py-3 px-4 text-xs font-medium text-surface-200 uppercase tracking-wider">Typ</th>
              <th className="text-left py-3 px-4 text-xs font-medium text-surface-200 uppercase tracking-wider">Status</th>
              <th className="text-left py-3 px-4 text-xs font-medium text-surface-200 uppercase tracking-wider">Datum</th>
              <th className="text-right py-3 px-4 text-xs font-medium text-surface-200 uppercase tracking-wider">Aktionen</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-surface-800">
            {isLoading && documents.length === 0 ? (
              <tr>
                <td colSpan={5} className="py-12 text-center text-surface-200">
                  <LoadingSpinner />
                </td>
              </tr>
            ) : documents.length === 0 ? (
              <tr>
                <td colSpan={5} className="py-12 text-center text-surface-200">
                  <p className="text-lg mb-2">Keine Dokumente vorhanden</p>
                  <p className="text-sm">Laden Sie Ihr erstes PDF hoch, um zu starten.</p>
                </td>
              </tr>
            ) : (
              documents.map((doc) => (
                <tr key={doc.id} className="hover:bg-surface-800/50 transition-colors">
                  <td className="py-3 px-4">
                    <Link to={`/documents/${doc.id}`} className="flex items-center gap-3 group">
                      <div className="w-8 h-8 rounded-lg bg-accent-500/10 flex items-center justify-center">
                        <svg className="w-4 h-4 text-accent-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Z" />
                        </svg>
                      </div>
                      <span className="text-sm font-medium text-surface-50 group-hover:text-brand-300 transition-colors truncate max-w-xs">
                        {doc.filename}
                      </span>
                    </Link>
                  </td>
                  <td className="py-3 px-4 text-sm text-surface-200">
                    {doc.document_type_name ?? '—'}
                  </td>
                  <td className="py-3 px-4">
                    <StatusBadge status={doc.status} />
                  </td>
                  <td className="py-3 px-4 text-sm text-surface-200">
                    {new Date(doc.upload_date).toLocaleDateString('de-DE', {
                      day: '2-digit', month: '2-digit', year: 'numeric',
                      hour: '2-digit', minute: '2-digit',
                    })}
                  </td>
                  <td className="py-3 px-4 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <Link
                        to={`/documents/${doc.id}`}
                        className="p-1.5 rounded-md hover:bg-surface-700 text-surface-200 hover:text-surface-50 transition-colors"
                        title="Anzeigen"
                      >
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 0 1 0-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178Z" />
                          <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" />
                        </svg>
                      </Link>
                      <button
                        onClick={() => handleDelete(doc.id)}
                        disabled={deletingId === doc.id}
                        className="p-1.5 rounded-md hover:bg-status-failed/20 text-surface-200 hover:text-status-failed transition-colors cursor-pointer disabled:opacity-50"
                        title="Löschen"
                      >
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0" />
                        </svg>
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Upload Dialog */}
      <UploadDialog
        open={showUpload}
        onClose={() => setShowUpload(false)}
        documentTypes={documentTypes}
      />
    </div>
  )
}

/* ── Helper Components ────────────────────────────────────────────── */

function StatCard({ label, value, color }: { label: string; value: number; color: string }) {
  const colorMap: Record<string, string> = {
    brand: 'text-brand-400 bg-brand-500/10 border-brand-500/20',
    completed: 'text-status-completed bg-status-completed/10 border-status-completed/20',
    processing: 'text-status-processing bg-status-processing/10 border-status-processing/20',
    failed: 'text-status-failed bg-status-failed/10 border-status-failed/20',
  }

  return (
    <div className={`rounded-xl border p-4 ${colorMap[color]}`}>
      <p className="text-2xl font-bold">{value}</p>
      <p className="text-xs mt-1 opacity-80">{label}</p>
    </div>
  )
}

function LoadingSpinner() {
  return (
    <div className="flex flex-col items-center gap-3">
      <div className="w-8 h-8 border-2 border-brand-500/30 border-t-brand-500 rounded-full animate-spin" />
      <span className="text-sm">Lade Dokumente...</span>
    </div>
  )
}
