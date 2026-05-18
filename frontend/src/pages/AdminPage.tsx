/**
 * Admin panel for managing document types and their fields.
 */
import { useEffect, useState } from 'react'
import { adminApi, type DocumentType, type FieldDefinition, type OutdatedDocumentInfo } from '../lib/api'
import toast from 'react-hot-toast'

export default function AdminPage() {
  const [docTypes, setDocTypes] = useState<DocumentType[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [showCreate, setShowCreate] = useState(false)
  const [editingType, setEditingType] = useState<DocumentType | null>(null)
  const [expandedId, setExpandedId] = useState<number | null>(null)

  // Modal state
  const [deactivateTarget, setDeactivateTarget] = useState<DocumentType | null>(null)
  const [reanalyzeTarget, setReanalyzeTarget] = useState<DocumentType | null>(null)
  const [outdatedDocs, setOutdatedDocs] = useState<OutdatedDocumentInfo[]>([])
  const [outdatedLoading, setOutdatedLoading] = useState(false)

  const load = async () => {
    try {
      const { data } = await adminApi.listDocTypes()
      setDocTypes(data)
    } catch {
      toast.error('Dokumenttypen konnten nicht geladen werden.')
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => { load() }, [])

  const handleDeactivate = (dt: DocumentType) => {
    setDeactivateTarget(dt)
  }

  const handleOpenReanalyze = async (dt: DocumentType) => {
    setReanalyzeTarget(dt)
    setOutdatedLoading(true)
    setOutdatedDocs([])
    try {
      const { data } = await adminApi.getOutdatedDocuments(dt.id)
      setOutdatedDocs(data)
    } catch {
      toast.error('Veraltete Dokumente konnten nicht geladen werden.')
    } finally {
      setOutdatedLoading(false)
    }
  }

  const handleReactivate = async (dt: DocumentType) => {
    try {
      await adminApi.reactivateDocType(dt.id)
      toast.success(`"${dt.name}" wurde reaktiviert.`)
      load()
    } catch {
      toast.error('Reaktivierung fehlgeschlagen.')
    }
  }

  return (
    <div className="p-8 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-surface-50">Admin-Panel</h1>
          <p className="text-surface-200 mt-1">Dokumenttypen und Felder verwalten</p>
        </div>
        <button
          onClick={() => { setShowCreate(true); setEditingType(null) }}
          className="flex items-center gap-2 px-5 py-2.5 rounded-lg bg-brand-600 hover:bg-brand-500 text-white text-sm font-medium transition-colors cursor-pointer"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
          </svg>
          Neuer Dokumenttyp
        </button>
      </div>

      {/* Document type cards */}
      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <div className="w-8 h-8 border-2 border-brand-500/30 border-t-brand-500 rounded-full animate-spin" />
        </div>
      ) : docTypes.length === 0 ? (
        <div className="glass rounded-xl p-12 text-center">
          <p className="text-surface-200 text-lg mb-2">Keine Dokumenttypen vorhanden</p>
          <p className="text-surface-200 text-sm">Erstellen Sie einen Dokumenttyp, um Felder für die KI-Extraktion zu definieren.</p>
        </div>
      ) : (
        <div className="space-y-4">          {docTypes.map((dt) => (
            <div key={dt.id} className={`glass rounded-xl overflow-hidden transition-opacity ${!dt.is_active ? 'opacity-60' : ''}`}>
              {/* Type header */}
              <div className="flex items-center justify-between p-5">
                <div
                  className="flex items-center gap-3 flex-1 cursor-pointer"
                  onClick={() => setExpandedId(expandedId === dt.id ? null : dt.id)}
                >
                  <svg
                    className={`w-4 h-4 text-surface-200 transition-transform ${expandedId === dt.id ? 'rotate-90' : ''}`}
                    fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" d="m8.25 4.5 7.5 7.5-7.5 7.5" />
                  </svg>
                  <div>
                    <h3 className="text-lg font-semibold text-surface-50">{dt.name}</h3>
                    {dt.description && <p className="text-sm text-surface-200">{dt.description}</p>}
                  </div>
                  <span className="ml-3 px-2 py-0.5 rounded-full text-xs bg-surface-800 text-surface-200">
                    {dt.fields.length} {dt.fields.length === 1 ? 'Feld' : 'Felder'}
                  </span>
                  {!dt.is_active && (
                    <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-surface-700 text-surface-400 border border-surface-600">
                      Inaktiv
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  {dt.is_active ? (
                    <>
                      {/* Neu analysieren */}
                      <button
                        onClick={(e) => { e.stopPropagation(); handleOpenReanalyze(dt) }}
                        className="p-2 rounded-md hover:bg-orange-500/20 text-surface-200 hover:text-orange-400 transition-colors cursor-pointer"
                        title="Veraltete Dokumente neu analysieren"
                      >
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0 3.181 3.183a8.25 8.25 0 0 0 13.803-3.7M4.031 9.865a8.25 8.25 0 0 1 13.803-3.7l3.181 3.182m0-4.991v4.99" />
                        </svg>
                      </button>
                      {/* Bearbeiten */}
                      <button
                        onClick={(e) => { e.stopPropagation(); setEditingType(dt); setShowCreate(true) }}
                        className="p-2 rounded-md hover:bg-surface-700 text-surface-200 hover:text-surface-50 transition-colors cursor-pointer"
                        title="Bearbeiten"
                      >
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="m16.862 4.487 1.687-1.688a1.875 1.875 0 1 1 2.652 2.652L10.582 16.07a4.5 4.5 0 0 1-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 0 1 1.13-1.897l8.932-8.931Zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0 1 15.75 21H5.25A2.25 2.25 0 0 1 3 18.75V8.25A2.25 2.25 0 0 1 5.25 6H10" />
                        </svg>
                      </button>
                      {/* Deaktivieren */}
                      <button
                        onClick={(e) => { e.stopPropagation(); handleDeactivate(dt) }}
                        className="p-2 rounded-md hover:bg-status-failed/20 text-surface-200 hover:text-status-failed transition-colors cursor-pointer"
                        title="Deaktivieren"
                      >
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M18.364 18.364A9 9 0 0 0 5.636 5.636m12.728 12.728A9 9 0 0 1 5.636 5.636m12.728 12.728L5.636 5.636" />
                        </svg>
                      </button>
                    </>
                  ) : (
                    /* Reaktivieren */
                    <button
                      onClick={(e) => { e.stopPropagation(); handleReactivate(dt) }}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-green-500/10 hover:bg-green-500/20 text-green-400 hover:text-green-300 text-xs font-medium transition-colors cursor-pointer border border-green-500/20"
                      title="Reaktivieren"
                    >
                      <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75 11.25 15 15 9.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
                      </svg>
                      Reaktivieren
                    </button>
                  )}
                </div>
              </div>

              {/* Expanded fields */}
              {expandedId === dt.id && (
                <FieldsEditor
                  docTypeId={dt.id}
                  fields={dt.fields}
                  onUpdate={load}
                />
              )}
            </div>
          ))}
        </div>
      )}

      {/* Create/Edit dialog */}
      {showCreate && (
        <DocTypeDialog
          editType={editingType}
          onClose={() => { setShowCreate(false); setEditingType(null) }}
          onSave={load}
        />
      )}

      {/* Deactivate modal */}
      {deactivateTarget && (
        <DeactivateModal
          target={deactivateTarget}
          onClose={() => setDeactivateTarget(null)}
          onConfirmed={() => { setDeactivateTarget(null); load() }}
        />
      )}

      {/* Reanalyze modal */}
      {reanalyzeTarget && (
        <ReanalyzeModal
          target={reanalyzeTarget}
          docs={outdatedDocs}
          loading={outdatedLoading}
          onClose={() => setReanalyzeTarget(null)}
          onConfirmed={() => { setReanalyzeTarget(null); load() }}
        />
      )}
    </div>
  )
}


/* ── Document Type Create/Edit Dialog ─────────────────────────────── */

function DocTypeDialog({
  editType,
  onClose,
  onSave,
}: {
  editType: DocumentType | null
  onClose: () => void
  onSave: () => void
}) {
  const [name, setName] = useState(editType?.name ?? '')
  const [description, setDescription] = useState(editType?.description ?? '')
  const [isSaving, setIsSaving] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSaving(true)
    try {
      if (editType) {
        await adminApi.updateDocType(editType.id, { name, description: description || undefined })
      } else {
        await adminApi.createDocType({ name, description: description || undefined })
      }
      toast.success(editType ? 'Dokumenttyp aktualisiert.' : 'Dokumenttyp erstellt.')
      onSave()
      onClose()
    } catch (err: any) {
      toast.error(err.response?.data?.detail || 'Speichern fehlgeschlagen.')
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative glass rounded-2xl p-8 w-full max-w-md animate-slide-up">
        <h2 className="text-xl font-bold text-surface-50 mb-6">
          {editType ? 'Dokumenttyp bearbeiten' : 'Neuer Dokumenttyp'}
        </h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-surface-200 mb-1.5">Name</label>
            <input
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="z.B. Rechnung, Vertrag..."
              className="w-full px-4 py-2.5 rounded-lg bg-surface-900 border border-surface-700 text-surface-50 focus:border-brand-500 focus:ring-1 focus:ring-brand-500 transition-colors"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-surface-200 mb-1.5">Beschreibung</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Optionale Beschreibung..."
              rows={3}
              className="w-full px-4 py-2.5 rounded-lg bg-surface-900 border border-surface-700 text-surface-50 focus:border-brand-500 focus:ring-1 focus:ring-brand-500 transition-colors resize-none"
            />
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={onClose} className="px-4 py-2 rounded-lg text-sm text-surface-200 hover:bg-surface-800 transition-colors cursor-pointer">
              Abbrechen
            </button>
            <button type="submit" disabled={isSaving} className="px-5 py-2 rounded-lg bg-brand-600 hover:bg-brand-500 text-white text-sm font-medium transition-colors disabled:opacity-50 cursor-pointer">
              {isSaving ? 'Speichern...' : 'Speichern'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}


/* ── Fields Editor ────────────────────────────────────────────────── */

function FieldsEditor({
  docTypeId,
  fields,
  onUpdate,
}: {
  docTypeId: number
  fields: FieldDefinition[]
  onUpdate: () => void
}) {
  const [newField, setNewField] = useState({
    field_name: '',
    field_type: 'string' as const,
    required: false,
    description: '',
    sort_order: fields.length,
  })
  const [isAdding, setIsAdding] = useState(false)
  const [editingField, setEditingField] = useState<FieldDefinition | null>(null)

  const handleAddField = async () => {
    if (!newField.field_name.trim()) return
    setIsAdding(true)
    try {
      await adminApi.addField(docTypeId, {
        ...newField,
        description: newField.description || null,
      })
      setNewField({ field_name: '', field_type: 'string', required: false, description: '', sort_order: fields.length + 1 })
      toast.success('Feld hinzugefügt.')
      onUpdate()
    } catch (err: any) {
      toast.error(err.response?.data?.detail || 'Feld konnte nicht hinzugefügt werden.')
    } finally {
      setIsAdding(false)
    }
  }

  const handleDeleteField = async (fieldId: number) => {
    try {
      await adminApi.deleteField(fieldId)
      toast.success('Feld gelöscht.')
      onUpdate()
    } catch {
      toast.error('Löschen fehlgeschlagen.')
    }
  }

  const handleToggleRequired = async (field: FieldDefinition) => {
    try {
      await adminApi.updateField(field.id, { required: !field.required })
      onUpdate()
    } catch {
      toast.error('Aktualisierung fehlgeschlagen.')
    }
  }

  return (
    <div className="border-t border-surface-700 p-5">
      {/* Existing fields */}
      {fields.length > 0 && (
        <div className="mb-4 space-y-2">
          {fields.map((field) => (
            <div key={field.id} className="flex items-center gap-3 px-4 py-2.5 rounded-lg bg-surface-900/50 group">
              <span className="text-sm font-medium text-surface-50 flex-1">{field.field_name}</span>
              <span className="text-xs px-2 py-0.5 rounded-full bg-surface-800 text-surface-200">{field.field_type}</span>
              <button
                onClick={() => handleToggleRequired(field)}
                className={`text-xs px-2 py-0.5 rounded-full cursor-pointer transition-colors ${
                  field.required
                    ? 'bg-brand-500/20 text-brand-300 border border-brand-500/30'
                    : 'bg-surface-800 text-surface-200 hover:bg-surface-700'
                }`}
              >
                {field.required ? 'Pflicht' : 'Optional'}
              </button>
              {field.description && (
                <span className="text-xs text-surface-200 truncate max-w-32" title={field.description}>
                  {field.description}
                </span>
              )}
              <button
                onClick={() => setEditingField(field)}
                className="p-1 rounded opacity-0 group-hover:opacity-100 hover:bg-surface-700 text-surface-200 hover:text-surface-50 transition-all cursor-pointer ml-auto"
                title="Feld bearbeiten"
              >
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="m16.862 4.487 1.687-1.688a1.875 1.875 0 1 1 2.652 2.652L10.582 16.07a4.5 4.5 0 0 1-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 0 1 1.13-1.897l8.932-8.931Zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0 1 15.75 21H5.25A2.25 2.25 0 0 1 3 18.75V8.25A2.25 2.25 0 0 1 5.25 6H10" />
                </svg>
              </button>
              <button
                onClick={() => handleDeleteField(field.id)}
                className="p-1 rounded opacity-0 group-hover:opacity-100 hover:bg-status-failed/20 text-surface-200 hover:text-status-failed transition-all cursor-pointer"
                title="Feld löschen"
              >
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Add new field */}
      <div className="flex items-end gap-3">
        <div className="flex-1">
          <label className="block text-xs text-surface-200 mb-1">Feldname</label>
          <input
            value={newField.field_name}
            onChange={(e) => setNewField({ ...newField, field_name: e.target.value })}
            placeholder="z.B. betrag, datum..."
            className="w-full px-3 py-2 rounded-lg bg-surface-900 border border-surface-700 text-surface-50 text-sm focus:border-brand-500 transition-colors"
          />
        </div>
        <div className="w-32">
          <label className="block text-xs text-surface-200 mb-1">Typ</label>
          <select
            value={newField.field_type}
            onChange={(e) => setNewField({ ...newField, field_type: e.target.value as any })}
            className="w-full px-3 py-2 rounded-lg bg-surface-900 border border-surface-700 text-surface-50 text-sm focus:border-brand-500 transition-colors"
          >
            <option value="string">String</option>
            <option value="number">Number</option>
            <option value="boolean">Boolean</option>
            <option value="date">Date</option>
          </select>
        </div>
        <div className="w-48">
          <label className="block text-xs text-surface-200 mb-1">Beschreibung</label>
          <input
            value={newField.description}
            onChange={(e) => setNewField({ ...newField, description: e.target.value })}
            placeholder="Hilfe für die KI..."
            className="w-full px-3 py-2 rounded-lg bg-surface-900 border border-surface-700 text-surface-50 text-sm focus:border-brand-500 transition-colors"
          />
        </div>
        <label className="flex items-center gap-1.5 pb-1.5 cursor-pointer">
          <input
            type="checkbox"
            checked={newField.required}
            onChange={(e) => setNewField({ ...newField, required: e.target.checked })}
            className="rounded border-surface-700"
          />
          <span className="text-xs text-surface-200">Pflicht</span>
        </label>
        <button
          onClick={handleAddField}
          disabled={isAdding || !newField.field_name.trim()}
          className="px-4 py-2 rounded-lg bg-brand-600 hover:bg-brand-500 text-white text-sm font-medium transition-colors disabled:opacity-50 cursor-pointer"
        >
          Hinzufügen
        </button>
      </div>

      {/* Edit Field Dialog */}
      {editingField && (
        <EditFieldDialog
          field={editingField}
          onClose={() => setEditingField(null)}
          onSave={() => {
            setEditingField(null)
            onUpdate()
          }}
        />
      )}
    </div>
  )
}


/* ── Deactivate Modal ─────────────────────────────────────────────── */

function DeactivateModal({
  target,
  onClose,
  onConfirmed,
}: {
  target: DocumentType
  onClose: () => void
  onConfirmed: () => void
}) {
  const [affectedCount, setAffectedCount] = useState<number | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isConfirming, setIsConfirming] = useState(false)

  useEffect(() => {
    adminApi.deactivateDocType(target.id)
      .then(({ data }) => setAffectedCount(data.affected_documents))
      .catch(() => setAffectedCount(null))
      .finally(() => setIsLoading(false))
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const handleConfirm = async () => {
    setIsConfirming(true)
    try {
      toast.success(`"${target.name}" wurde deaktiviert.`)
      onConfirmed()
    } catch {
      toast.error('Deaktivierung fehlgeschlagen.')
      setIsConfirming(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative glass rounded-2xl p-8 w-full max-w-md animate-slide-up">
        <h2 className="text-xl font-bold text-surface-50 mb-2">Dokumenttyp deaktivieren</h2>
        <p className="text-surface-200 text-sm mb-6">
          <span className="font-semibold text-surface-50">{target.name}</span> wird als inaktiv markiert.
        </p>

        <div className="rounded-lg bg-surface-900/60 border border-surface-700 p-4 mb-4 space-y-2">
          <div className="flex items-start gap-2 text-sm text-surface-200">
            <svg className="w-4 h-4 mt-0.5 text-brand-400 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="m11.25 11.25.041-.02a.75.75 0 0 1 1.063.852l-.708 2.836a.75.75 0 0 0 1.063.853l.041-.021M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Zm-9-3.75h.008v.008H12V8.25Z" />
            </svg>
            <span>Soft-Delete: Vorhandene Dokumente bleiben erhalten und sind weiterhin einsehbar.</span>
          </div>
          <div className="flex items-center gap-2 text-sm">
            <span className="text-surface-200">Betroffene Dokumente:</span>
            {isLoading ? (
              <span className="w-4 h-4 border border-surface-500 border-t-brand-400 rounded-full animate-spin inline-block" />
            ) : (
              <span className="font-semibold text-surface-50">{affectedCount ?? '?'}</span>
            )}
          </div>
        </div>

        <div className="flex justify-end gap-3 pt-2">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-lg text-sm text-surface-200 hover:bg-surface-800 transition-colors cursor-pointer"
          >
            Abbrechen
          </button>
          <button
            onClick={handleConfirm}
            disabled={isConfirming || isLoading}
            className="px-5 py-2 rounded-lg bg-status-failed/80 hover:bg-status-failed text-white text-sm font-medium transition-colors disabled:opacity-50 cursor-pointer"
          >
            {isConfirming ? 'Wird deaktiviert...' : 'Deaktivieren'}
          </button>
        </div>
      </div>
    </div>
  )
}


/* ── Reanalyze Modal ─────────────────────────────────────────────── */

function ReanalyzeModal({
  target,
  docs,
  loading,
  onClose,
  onConfirmed,
}: {
  target: DocumentType
  docs: OutdatedDocumentInfo[]
  loading: boolean
  onClose: () => void
  onConfirmed: () => void
}) {
  const [expandedList, setExpandedList] = useState(false)
  const [isConfirming, setIsConfirming] = useState(false)
  const hasManualCorrections = docs.some((d) => d.has_manual_corrections)

  const handleConfirm = async () => {
    setIsConfirming(true)
    try {
      const { data } = await adminApi.reanalyzeDocType(target.id)
      toast.success(`${data.triggered} Dokument(e) zur Neu-Analyse gestartet.`)
      onConfirmed()
    } catch {
      toast.error('Neu-Analyse konnte nicht gestartet werden.')
      setIsConfirming(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative glass rounded-2xl p-8 w-full max-w-lg animate-slide-up">
        <h2 className="text-xl font-bold text-surface-50 mb-2">Veraltete Dokumente neu analysieren</h2>
        <p className="text-surface-200 text-sm mb-5">
          Typ: <span className="font-semibold text-surface-50">{target.name}</span>
        </p>

        {/* Document list */}
        <div className="rounded-lg bg-surface-900/60 border border-surface-700 mb-4 overflow-hidden">
          <button
            onClick={() => setExpandedList(!expandedList)}
            className="w-full flex items-center justify-between px-4 py-3 text-sm text-surface-200 hover:bg-surface-800/50 transition-colors cursor-pointer"
          >
            <span>
              {loading ? 'Lade Dokumente...' : `${docs.length} veraltete${docs.length === 1 ? 's' : ''} Dokument${docs.length === 1 ? '' : 'e'}`}
            </span>
            {loading ? (
              <span className="w-4 h-4 border border-surface-500 border-t-brand-400 rounded-full animate-spin inline-block" />
            ) : (
              <svg className={`w-4 h-4 transition-transform ${expandedList ? 'rotate-90' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="m8.25 4.5 7.5 7.5-7.5 7.5" />
              </svg>
            )}
          </button>
          {expandedList && docs.length > 0 && (
            <div className="border-t border-surface-700 max-h-52 overflow-y-auto divide-y divide-surface-800">
              {docs.map((doc) => (
                <div key={doc.id} className="flex items-center gap-3 px-4 py-2.5 text-sm">
                  <span className="text-surface-50 flex-1 truncate">{doc.filename}</span>
                  <span className="text-surface-400 text-xs flex-shrink-0">
                    {new Date(doc.upload_date).toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric' })}
                  </span>
                  {doc.has_manual_corrections && (
                    <span className="px-1.5 py-0.5 rounded text-xs bg-yellow-500/15 text-yellow-400 border border-yellow-500/25 flex-shrink-0">
                      Manuell
                    </span>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Warning if manual corrections */}
        {hasManualCorrections && (
          <div className="flex items-start gap-2 px-4 py-3 rounded-lg bg-yellow-500/10 border border-yellow-500/25 mb-4">
            <svg className="w-4 h-4 mt-0.5 text-yellow-400 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z" />
            </svg>
            <span className="text-sm text-yellow-300">
              Achtung: Manuell korrigierte Daten werden durch die Neu-Analyse <strong>überschrieben</strong>.
            </span>
          </div>
        )}

        <div className="flex justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-lg text-sm text-surface-200 hover:bg-surface-800 transition-colors cursor-pointer"
          >
            Abbrechen
          </button>
          <button
            onClick={handleConfirm}
            disabled={isConfirming || loading || docs.length === 0}
            className="px-5 py-2 rounded-lg bg-orange-600 hover:bg-orange-500 text-white text-sm font-medium transition-colors disabled:opacity-50 cursor-pointer"
          >
            {isConfirming ? 'Wird gestartet...' : `${docs.length} Dokument${docs.length === 1 ? '' : 'e'} neu analysieren`}
          </button>
        </div>
      </div>
    </div>
  )
}


/* ── Edit Field Dialog ────────────────────────────────────────────── */

function EditFieldDialog({
  field,
  onClose,
  onSave,
}: {
  field: FieldDefinition
  onClose: () => void
  onSave: () => void
}) {
  const [name, setName] = useState(field.field_name)
  const [type, setType] = useState(field.field_type)
  const [description, setDescription] = useState(field.description || '')
  const [required, setRequired] = useState(field.required)
  const [isSaving, setIsSaving] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSaving(true)
    try {
      await adminApi.updateField(field.id, {
        field_name: name,
        field_type: type,
        description: description || null,
        required,
      })
      toast.success('Feld aktualisiert.')
      onSave()
    } catch (err: any) {
      toast.error(err.response?.data?.detail || 'Feld konnte nicht aktualisiert werden.')
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative glass rounded-2xl p-8 w-full max-w-md animate-slide-up">
        <h2 className="text-xl font-bold text-surface-50 mb-6">Feld bearbeiten</h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-surface-200 mb-1.5">Name</label>
            <input
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-4 py-2.5 rounded-lg bg-surface-900 border border-surface-700 text-surface-50 focus:border-brand-500 focus:ring-1 focus:ring-brand-500 transition-colors"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-surface-200 mb-1.5">Typ</label>
            <select
              value={type}
              onChange={(e) => setType(e.target.value as any)}
              className="w-full px-4 py-2.5 rounded-lg bg-surface-900 border border-surface-700 text-surface-50 focus:border-brand-500 focus:ring-1 focus:ring-brand-500 transition-colors"
            >
              <option value="string">String</option>
              <option value="number">Number</option>
              <option value="boolean">Boolean</option>
              <option value="date">Date</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-surface-200 mb-1.5">Beschreibung</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Optionale Beschreibung..."
              rows={2}
              className="w-full px-4 py-2.5 rounded-lg bg-surface-900 border border-surface-700 text-surface-50 focus:border-brand-500 focus:ring-1 focus:ring-brand-500 transition-colors resize-none"
            />
          </div>
          <div>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={required}
                onChange={(e) => setRequired(e.target.checked)}
                className="rounded border-surface-700 text-brand-600 focus:ring-brand-500"
              />
              <span className="text-sm font-medium text-surface-200">Pflichtfeld</span>
            </label>
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={onClose} className="px-4 py-2 rounded-lg text-sm text-surface-200 hover:bg-surface-800 transition-colors cursor-pointer">
              Abbrechen
            </button>
            <button type="submit" disabled={isSaving} className="px-5 py-2 rounded-lg bg-brand-600 hover:bg-brand-500 text-white text-sm font-medium transition-colors disabled:opacity-50 cursor-pointer">
              {isSaving ? 'Speichern...' : 'Speichern'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
