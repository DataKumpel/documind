/**
 * Zustand store for documents state management.
 */
import { create } from 'zustand'
import { documentsApi, type Document, type DocumentType } from '../lib/api'
import toast from 'react-hot-toast'
import api from '../lib/api'

interface DocumentState {
  documents: Document[]
  documentTypes: DocumentType[]
  isLoading: boolean
  isUploading: boolean
  uploadProgress: number

  fetchDocuments: () => Promise<void>
  fetchDocumentTypes: () => Promise<void>
  uploadDocument: (file: File, documentTypeId: number) => Promise<boolean>
  deleteDocument: (id: number) => Promise<boolean>
  updateDocument: (id: number, extractedData: Record<string, unknown>) => Promise<boolean>
}

export const useDocumentStore = create<DocumentState>((set, get) => ({
  documents: [],
  documentTypes: [],
  isLoading: false,
  isUploading: false,
  uploadProgress: 0,

  fetchDocuments: async () => {
    set({ isLoading: true })
    try {
      const { data } = await documentsApi.list()
      set({ documents: data, isLoading: false })
    } catch {
      set({ isLoading: false })
      toast.error('Dokumente konnten nicht geladen werden.')
    }
  },

  fetchDocumentTypes: async () => {
    try {
      const { data } = await api.get<DocumentType[]>('/documents/types')
      set({ documentTypes: data })
    } catch {
      toast.error('Dokumenttypen konnten nicht geladen werden.')
    }
  },

  uploadDocument: async (file, documentTypeId) => {
    set({ isUploading: true, uploadProgress: 0 })
    try {
      await documentsApi.upload(file, documentTypeId, (pct) => {
        set({ uploadProgress: pct })
      })
      set({ isUploading: false, uploadProgress: 100 })
      toast.success('Dokument erfolgreich hochgeladen!')
      // Refresh document list
      await get().fetchDocuments()
      return true
    } catch (err: any) {
      set({ isUploading: false, uploadProgress: 0 })
      const msg = err.response?.data?.detail || 'Upload fehlgeschlagen.'
      toast.error(msg)
      return false
    }
  },

  deleteDocument: async (id) => {
    try {
      await documentsApi.delete(id)
      set({ documents: get().documents.filter((d) => d.id !== id) })
      toast.success('Dokument gelöscht.')
      return true
    } catch {
      toast.error('Löschen fehlgeschlagen.')
      return false
    }
  },

  updateDocument: async (id, extractedData) => {
    try {
      const { data } = await documentsApi.update(id, extractedData)
      set({
        documents: get().documents.map((d) => (d.id === id ? data : d)),
      })
      toast.success('Änderungen gespeichert.')
      return true
    } catch {
      toast.error('Speichern fehlgeschlagen.')
      return false
    }
  },
}))
