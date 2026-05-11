/**
 * Typed API client for the DocuMind backend.
 * Axios instance with JWT interceptor and base URL.
 */

import axios from 'axios'
import toast from 'react-hot-toast'

const api = axios.create({
  baseURL: '/api',
  headers: { 'Content-Type': 'application/json' },
})

// ── Request interceptor: attach JWT ──────────────────────────────────
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('documind_token')
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

// ── Response interceptor: handle 401 ─────────────────────────────────
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('documind_token')
      localStorage.removeItem('documind_user')
      // Only redirect if not already on login page
      if (!window.location.pathname.startsWith('/login')) {
        window.location.href = '/login'
      }
    } else if (error.response?.data?.detail) {
      toast.error(error.response.data.detail)
    } else {
      toast.error('Ein unerwarteter Fehler ist aufgetreten.')
    }
    return Promise.reject(error)
  }
)

export default api


// ═══════════════════════════════════════════════════════════════════════
// TYPE DEFINITIONS
// ═══════════════════════════════════════════════════════════════════════

export interface User {
  id: number
  email: string
  is_admin: boolean
  created_at: string
}

export interface TokenResponse {
  access_token: string
  token_type: string
  user: User
}

export interface FieldDefinition {
  id: number
  field_name: string
  field_type: 'string' | 'number' | 'boolean' | 'date'
  required: boolean
  description: string | null
  sort_order: number
}

export interface DocumentType {
  id: number
  name: string
  description: string | null
  created_at: string
  fields: FieldDefinition[]
}

export interface Document {
  id: number
  filename: string
  upload_date: string
  status: 'pending' | 'processing' | 'completed' | 'failed'
  document_type_id: number | null
  document_type_name: string | null
  raw_text: string | null
  extracted_data: Record<string, unknown> | null
  error_message: string | null
}


// ═══════════════════════════════════════════════════════════════════════
// API FUNCTIONS
// ═══════════════════════════════════════════════════════════════════════

// ── Auth ─────────────────────────────────────────────────────────────
export const authApi = {
  register: (email: string, password: string) =>
    api.post<TokenResponse>('/auth/register', { email, password }),

  login: (email: string, password: string) =>
    api.post<TokenResponse>('/auth/login', { email, password }),

  me: () => api.get<User>('/auth/me'),
}

// ── Documents ────────────────────────────────────────────────────────
export const documentsApi = {
  list: () => api.get<Document[]>('/documents'),

  get: (id: number) => api.get<Document>(`/documents/${id}`),

  upload: (file: File, documentTypeId: number, onProgress?: (pct: number) => void) => {
    const formData = new FormData()
    formData.append('file', file)
    formData.append('document_type_id', String(documentTypeId))
    return api.post<Document>('/documents/upload', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
      onUploadProgress: (e) => {
        if (e.total && onProgress) onProgress(Math.round((e.loaded / e.total) * 100))
      },
    })
  },

  update: (id: number, extractedData: Record<string, unknown>) =>
    api.put<Document>(`/documents/${id}`, { extracted_data: extractedData }),

  delete: (id: number) => api.delete(`/documents/${id}`),
}

// ── Admin ────────────────────────────────────────────────────────────
export const adminApi = {
  // Document Types
  listDocTypes: () => api.get<DocumentType[]>('/admin/document-types'),

  createDocType: (data: { name: string; description?: string; fields?: Array<Omit<FieldDefinition, 'id'>> }) =>
    api.post<DocumentType>('/admin/document-types', data),

  updateDocType: (id: number, data: { name?: string; description?: string }) =>
    api.put<DocumentType>(`/admin/document-types/${id}`, data),

  deleteDocType: (id: number) => api.delete(`/admin/document-types/${id}`),

  // Fields
  addField: (docTypeId: number, data: Omit<FieldDefinition, 'id'>) =>
    api.post<FieldDefinition>(`/admin/document-types/${docTypeId}/fields`, data),

  updateField: (fieldId: number, data: Partial<Omit<FieldDefinition, 'id'>>) =>
    api.put<FieldDefinition>(`/admin/fields/${fieldId}`, data),

  deleteField: (fieldId: number) => api.delete(`/admin/fields/${fieldId}`),
}

// ── Document Types (public — for upload dropdown) ────────────────────
export const publicApi = {
  listDocTypes: () => api.get<DocumentType[]>('/documents/types'),
}
