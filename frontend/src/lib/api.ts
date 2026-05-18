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
  is_active: boolean
  theme: 'light' | 'dark'
  created_at: string
}

export interface TokenResponse {
  access_token: string
  token_type: string
  user: User
}

export interface AdminUserStats {
  id: number
  email: string
  is_admin: boolean
  is_active: boolean
  created_at: string
  document_count: number
  total_upload_bytes: number
  percentage_of_total_size: number
}

export interface AdminDatabaseStats {
  total_users: number
  total_documents: number
  total_database_bytes: number
}

export interface AdminUsersResponse {
  users: AdminUserStats[]
  stats: AdminDatabaseStats
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
  is_active: boolean
  schema_version: number
  fields: FieldDefinition[]
}

export interface OutdatedDocumentInfo {
  id: number
  filename: string
  upload_date: string
  has_manual_corrections: boolean
}

export interface ReanalyzeResult {
  triggered: number
}

export interface Document {
  id: number
  filename: string
  upload_date: string
  status: 'pending' | 'processing' | 'completed' | 'failed'
  document_type_id: number | null
  document_type_name: string | null
  document_type_deprecated: boolean
  needs_reanalysis: boolean
  user_email?: string | null
  raw_text: string | null
  extraction_method?: 'pypdf2' | 'ocr' | null
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

  updateTheme: (theme: 'light' | 'dark') =>
    api.put<User>('/auth/me/theme', { theme }),
}

// ── Documents ────────────────────────────────────────────────────────
export const documentsApi = {
  list: () => api.get<Document[]>('/documents'),

  get: (id: number) => api.get<Document>(`/documents/${id}`),

  getFile: (id: number) => api.get<Blob>(`/documents/${id}/file`, { responseType: 'blob' }),

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

  /** Documents that need re-analysis due to schema changes (current user). */
  pendingReanalysis: () => api.get<Document[]>('/documents/pending-reanalysis'),

  /** Trigger re-analysis for a single document. */
  reanalyzeOne: (id: number) => api.post<Document>(`/documents/${id}/reanalyze`),
}

// ── Admin ────────────────────────────────────────────────────────────
export const adminApi = {
  // Document Types
  listDocTypes: () => api.get<DocumentType[]>('/admin/document-types'),

  createDocType: (data: { name: string; description?: string; fields?: Array<Omit<FieldDefinition, 'id'>> }) =>
    api.post<DocumentType>('/admin/document-types', data),

  updateDocType: (id: number, data: { name?: string; description?: string; is_active?: boolean }) =>
    api.put<DocumentType>(`/admin/document-types/${id}`, data),

  /** Soft-deactivates a document type. Returns affected_documents count. */
  deactivateDocType: (id: number) =>
    api.delete<{ message: string; affected_documents: number }>(`/admin/document-types/${id}`),

  /** Re-activate a previously deactivated document type. */
  reactivateDocType: (id: number) =>
    api.put<DocumentType>(`/admin/document-types/${id}`, { is_active: true }),

  /** List documents of a type whose schema version is outdated. */
  getOutdatedDocuments: (id: number) =>
    api.get<OutdatedDocumentInfo[]>(`/admin/document-types/${id}/outdated-documents`),

  /** Trigger re-analysis for all outdated documents of a type. */
  reanalyzeDocType: (id: number) =>
    api.post<ReanalyzeResult>(`/admin/document-types/${id}/reanalyze`),

  // Fields
  addField: (docTypeId: number, data: Omit<FieldDefinition, 'id'>) =>
    api.post<FieldDefinition>(`/admin/document-types/${docTypeId}/fields`, data),

  updateField: (fieldId: number, data: Partial<Omit<FieldDefinition, 'id'>>) =>
    api.put<FieldDefinition>(`/admin/fields/${fieldId}`, data),

  deleteField: (fieldId: number) => api.delete(`/admin/fields/${fieldId}`),

  // Users
  listUsers: () => api.get<AdminUsersResponse>('/admin/users'),

  setTempPassword: (userId: number, newPassword: string) => 
    api.post(`/admin/users/${userId}/temp-password`, { new_password: newPassword }),

  toggleUserActive: (userId: number) => 
    api.put<{ is_active: boolean }>(`/admin/users/${userId}/toggle-active`),

  toggleUserAdmin: (userId: number) => 
    api.put<{ is_admin: boolean }>(`/admin/users/${userId}/toggle-admin`),

  // Deleted Documents
  listDeletedDocuments: () => api.get<Document[]>('/admin/documents/deleted'),

  restoreDocument: (docId: number) => api.post<Document>(`/admin/documents/${docId}/restore`),

  hardDeleteDocument: (docId: number) => api.delete(`/admin/documents/${docId}/hard`),
}

// ── Document Types (public — for upload dropdown) ────────────────────
export const publicApi = {
  /** Active document types only — for upload dropdown. */
  listDocTypes: () => api.get<DocumentType[]>('/documents/types'),
}
