/**
 * Admin panel for managing document types and their fields.
 */
import { useEffect, useState } from 'react'
import { adminApi, type DocumentType, type FieldDefinition } from '../lib/api'
import toast from 'react-hot-toast'

export default function AdminPage() {
  const [docTypes, setDocTypes] = useState<DocumentType[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [showCreate, setShowCreate] = useState(false)
  const [editingType, setEditingType] = useState<DocumentType | null>(null)
  const [expandedId, setExpandedId] = useState<number | null>(null)

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

  const handleDeleteType = async (id: number) => {
    if (!confirm('Dokumenttyp und alle zugehörigen Felder löschen?')) return
    try {
      await adminApi.deleteDocType(id)
      setDocTypes((prev) => prev.filter((t) => t.id !== id))
      toast.success('Dokumenttyp gelöscht.')
    } catch {
      toast.error('Löschen fehlgeschlagen.')
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
        <div className="space-y-4">
          {docTypes.map((dt) => (
            <div key={dt.id} className="glass rounded-xl overflow-hidden">
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
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => { setEditingType(dt); setShowCreate(true) }}
                    className="p-2 rounded-md hover:bg-surface-700 text-surface-200 hover:text-surface-50 transition-colors cursor-pointer"
                    title="Bearbeiten"
                  >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="m16.862 4.487 1.687-1.688a1.875 1.875 0 1 1 2.652 2.652L10.582 16.07a4.5 4.5 0 0 1-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 0 1 1.13-1.897l8.932-8.931Zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0 1 15.75 21H5.25A2.25 2.25 0 0 1 3 18.75V8.25A2.25 2.25 0 0 1 5.25 6H10" />
                    </svg>
                  </button>
                  <button
                    onClick={() => handleDeleteType(dt.id)}
                    className="p-2 rounded-md hover:bg-status-failed/20 text-surface-200 hover:text-status-failed transition-colors cursor-pointer"
                    title="Löschen"
                  >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0" />
                    </svg>
                  </button>
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
                onClick={() => handleDeleteField(field.id)}
                className="p-1 rounded opacity-0 group-hover:opacity-100 hover:bg-status-failed/20 text-surface-200 hover:text-status-failed transition-all cursor-pointer"
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
    </div>
  )
}
