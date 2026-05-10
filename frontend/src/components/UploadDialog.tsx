/**
 * Upload dialog with drag & drop and document type selection.
 */
import { useState, useRef, type DragEvent, type FormEvent } from 'react'
import { useDocumentStore } from '../stores/documentStore'
import type { DocumentType } from '../lib/api'

interface UploadDialogProps {
  open: boolean
  onClose: () => void
  documentTypes: DocumentType[]
}

export default function UploadDialog({ open, onClose, documentTypes }: UploadDialogProps) {
  const [file, setFile] = useState<File | null>(null)
  const [docTypeId, setDocTypeId] = useState<number | ''>('')
  const [isDragOver, setIsDragOver] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  const uploadDocument = useDocumentStore((s) => s.uploadDocument)
  const isUploading = useDocumentStore((s) => s.isUploading)
  const uploadProgress = useDocumentStore((s) => s.uploadProgress)

  if (!open) return null

  const handleDrop = (e: DragEvent) => {
    e.preventDefault()
    setIsDragOver(false)
    const dropped = e.dataTransfer.files[0]
    if (dropped?.type === 'application/pdf') setFile(dropped)
  }

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    if (!file || !docTypeId) return
    const success = await uploadDocument(file, Number(docTypeId))
    if (success) {
      setFile(null)
      setDocTypeId('')
      onClose()
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />

      {/* Dialog */}
      <div className="relative glass rounded-2xl p-8 w-full max-w-lg animate-slide-up">
        <h2 className="text-xl font-bold text-surface-50 mb-6">Dokument hochladen</h2>

        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Drop zone */}
          <div
            onDragOver={(e) => { e.preventDefault(); setIsDragOver(true) }}
            onDragLeave={() => setIsDragOver(false)}
            onDrop={handleDrop}
            onClick={() => inputRef.current?.click()}
            className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-colors ${
              isDragOver
                ? 'border-brand-400 bg-brand-500/10'
                : file
                  ? 'border-status-completed/40 bg-status-completed/5'
                  : 'border-surface-700 hover:border-surface-200'
            }`}
          >
            <input
              ref={inputRef}
              type="file"
              accept=".pdf"
              className="hidden"
              onChange={(e) => setFile(e.target.files?.[0] ?? null)}
            />
            {file ? (
              <div>
                <svg className="w-8 h-8 mx-auto mb-2 text-status-completed" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75 11.25 15 15 9.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
                </svg>
                <p className="text-sm font-medium text-surface-50">{file.name}</p>
                <p className="text-xs text-surface-200 mt-1">{(file.size / 1024 / 1024).toFixed(2)} MB</p>
              </div>
            ) : (
              <div>
                <svg className="w-8 h-8 mx-auto mb-2 text-surface-200" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5m-13.5-9L12 3m0 0 4.5 4.5M12 3v13.5" />
                </svg>
                <p className="text-sm text-surface-200">PDF hierher ziehen oder klicken</p>
              </div>
            )}
          </div>

          {/* Document type selection */}
          <div>
            <label htmlFor="upload-doctype" className="block text-sm font-medium text-surface-200 mb-1.5">
              Dokumenttyp
            </label>
            <select
              id="upload-doctype"
              required
              value={docTypeId}
              onChange={(e) => setDocTypeId(e.target.value ? Number(e.target.value) : '')}
              className="w-full px-4 py-2.5 rounded-lg bg-surface-900 border border-surface-700 text-surface-50 focus:border-brand-500 focus:ring-1 focus:ring-brand-500 transition-colors"
            >
              <option value="">Typ auswählen...</option>
              {documentTypes.map((dt) => (
                <option key={dt.id} value={dt.id}>{dt.name}</option>
              ))}
            </select>
          </div>

          {/* Progress bar */}
          {isUploading && (
            <div className="w-full bg-surface-800 rounded-full h-2 overflow-hidden">
              <div
                className="h-full bg-brand-500 rounded-full transition-all duration-300"
                style={{ width: `${uploadProgress}%` }}
              />
            </div>
          )}

          {/* Actions */}
          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              disabled={isUploading}
              className="px-4 py-2 rounded-lg text-sm text-surface-200 hover:bg-surface-800 transition-colors cursor-pointer disabled:opacity-50"
            >
              Abbrechen
            </button>
            <button
              type="submit"
              disabled={!file || !docTypeId || isUploading}
              className="px-5 py-2 rounded-lg bg-brand-600 hover:bg-brand-500 text-white text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
            >
              {isUploading ? `Hochladen... ${uploadProgress}%` : 'Hochladen'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
