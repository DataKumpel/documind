/**
 * Document detail page — shows extracted text and structured data.
 */
import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { documentsApi, type Document as DocType } from '../lib/api'
import { useDocumentStore } from '../stores/documentStore'
import StatusBadge from '../components/ui/StatusBadge'
import toast from 'react-hot-toast'

export default function DocumentPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const updateDocument = useDocumentStore((s) => s.updateDocument)

  const [document, setDocument] = useState<DocType | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [editedData, setEditedData] = useState<Record<string, unknown> | null>(null)
  const [isSaving, setIsSaving] = useState(false)
  const [activeTab, setActiveTab] = useState<'data' | 'text'>('data')

  useEffect(() => {
    if (!id) return
    const load = async () => {
      try {
        const { data } = await documentsApi.get(Number(id))
        setDocument(data)
        setEditedData(data.extracted_data)
      } catch {
        toast.error('Dokument konnte nicht geladen werden.')
        navigate('/')
      } finally {
        setIsLoading(false)
      }
    }
    load()
  }, [id, navigate])

  // Poll while processing
  useEffect(() => {
    if (!document || (document.status !== 'processing' && document.status !== 'pending')) return
    const interval = setInterval(async () => {
      try {
        const { data } = await documentsApi.get(Number(id))
        setDocument(data)
        setEditedData(data.extracted_data)
        if (data.status !== 'processing' && data.status !== 'pending') {
          clearInterval(interval)
        }
      } catch { /* ignore */ }
    }, 2000)
    return () => clearInterval(interval)
  }, [document?.status, id])

  const handleSave = async () => {
    if (!document || !editedData) return
    setIsSaving(true)
    const success = await updateDocument(document.id, editedData)
    if (success) {
      setDocument({ ...document, extracted_data: editedData })
    }
    setIsSaving(false)
  }

  const handleFieldChange = (key: string, value: string) => {
    setEditedData((prev) => prev ? { ...prev, [key]: value || null } : prev)
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="w-8 h-8 border-2 border-brand-500/30 border-t-brand-500 rounded-full animate-spin" />
      </div>
    )
  }

  if (!document) return null

  const isProcessing = document.status === 'processing' || document.status === 'pending'
  const hasChanges = JSON.stringify(editedData) !== JSON.stringify(document.extracted_data)

  return (
    <div className="p-8 animate-fade-in">
      {/* Header */}
      <div className="flex items-center gap-4 mb-8">
        <button
          onClick={() => navigate('/')}
          className="p-2 rounded-lg hover:bg-surface-800 text-surface-200 transition-colors cursor-pointer"
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5 3 12m0 0 7.5-7.5M3 12h18" />
          </svg>
        </button>
        <div className="flex-1">
          <div className="flex items-center gap-3 mb-1">
            <h1 className="text-2xl font-bold text-surface-50 truncate">{document.filename}</h1>
            <StatusBadge status={document.status} />
          </div>
          <div className="flex items-center gap-4 text-sm text-surface-200">
            {document.document_type_name && (
              <span>Typ: <span className="text-brand-300">{document.document_type_name}</span></span>
            )}
            <span>
              Hochgeladen: {new Date(document.upload_date).toLocaleDateString('de-DE', {
                day: '2-digit', month: '2-digit', year: 'numeric',
                hour: '2-digit', minute: '2-digit',
              })}
            </span>
          </div>
        </div>
        {hasChanges && (
          <button
            onClick={handleSave}
            disabled={isSaving}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-brand-600 hover:bg-brand-500 text-white text-sm font-medium transition-colors disabled:opacity-50 cursor-pointer"
          >
            {isSaving ? 'Speichern...' : 'Änderungen speichern'}
          </button>
        )}
      </div>

      {/* Error message */}
      {document.status === 'failed' && document.error_message && (
        <div className="mb-6 p-4 rounded-xl bg-status-failed/10 border border-status-failed/20 text-status-failed text-sm">
          <strong>Fehler:</strong> {document.error_message}
        </div>
      )}

      {/* Processing indicator */}
      {isProcessing && (
        <div className="mb-6 p-4 rounded-xl bg-status-processing/10 border border-status-processing/20 text-status-processing text-sm flex items-center gap-3">
          <div className="w-5 h-5 border-2 border-status-processing/30 border-t-status-processing rounded-full animate-spin" />
          Dokument wird verarbeitet... Diese Seite aktualisiert sich automatisch.
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-1 mb-6 bg-surface-900 rounded-lg p-1 w-fit">
        <button
          onClick={() => setActiveTab('data')}
          className={`px-4 py-2 rounded-md text-sm font-medium transition-colors cursor-pointer ${
            activeTab === 'data' ? 'bg-surface-700 text-surface-50' : 'text-surface-200 hover:text-surface-50'
          }`}
        >
          Extrahierte Daten
        </button>
        <button
          onClick={() => setActiveTab('text')}
          className={`px-4 py-2 rounded-md text-sm font-medium transition-colors cursor-pointer ${
            activeTab === 'text' ? 'bg-surface-700 text-surface-50' : 'text-surface-200 hover:text-surface-50'
          }`}
        >
          Rohtext
        </button>
      </div>

      {/* Content */}
      <div className="glass rounded-xl p-6">
        {activeTab === 'data' ? (
          editedData && Object.keys(editedData).length > 0 ? (
            <div className="space-y-4">
              {Object.entries(editedData).map(([key, value]) => (
                <div key={key}>
                  <label className="block text-sm font-medium text-surface-200 mb-1.5 capitalize">
                    {key.replace(/_/g, ' ')}
                  </label>
                  <input
                    type="text"
                    value={String(value ?? '')}
                    onChange={(e) => handleFieldChange(key, e.target.value)}
                    className="w-full px-4 py-2.5 rounded-lg bg-surface-900 border border-surface-700 text-surface-50 focus:border-brand-500 focus:ring-1 focus:ring-brand-500 transition-colors"
                  />
                </div>
              ))}
            </div>
          ) : (
            <p className="text-surface-200 text-center py-8">
              {isProcessing ? 'Daten werden gerade extrahiert...' : 'Keine extrahierten Daten vorhanden.'}
            </p>
          )
        ) : (
          <div className="max-h-[60vh] overflow-auto">
            {document.raw_text ? (
              <pre className="text-sm text-surface-100 whitespace-pre-wrap font-mono leading-relaxed">
                {document.raw_text}
              </pre>
            ) : (
              <p className="text-surface-200 text-center py-8">
                {isProcessing ? 'Text wird gerade extrahiert...' : 'Kein Rohtext vorhanden.'}
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
