import { useEffect, useState } from 'react'
import { adminApi, type AdminUserStats, type AdminDatabaseStats, type Document } from '../lib/api'
import { useAuthStore } from '../stores/authStore'
import toast from 'react-hot-toast'

function formatBytes(bytes: number) {
  if (bytes === 0) return '0 MB'
  return (bytes / (1024 * 1024)).toFixed(2) + ' MB'
}

export default function AdminUsersPage() {
  const currentUser = useAuthStore((s) => s.user)
  const [users, setUsers] = useState<AdminUserStats[]>([])
  const [stats, setStats] = useState<AdminDatabaseStats | null>(null)
  const [deletedDocs, setDeletedDocs] = useState<Document[]>([])
  
  const [isLoading, setIsLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<'users' | 'trash'>('users')
  
  // Temp Password Modal
  const [pwModalUser, setPwModalUser] = useState<AdminUserStats | null>(null)
  const [newPassword, setNewPassword] = useState('')
  const [isSavingPw, setIsSavingPw] = useState(false)

  const loadData = async () => {
    setIsLoading(true)
    try {
      const [usersRes, docsRes] = await Promise.all([
        adminApi.listUsers(),
        adminApi.listDeletedDocuments()
      ])
      setUsers(usersRes.data.users)
      setStats(usersRes.data.stats)
      setDeletedDocs(docsRes.data)
    } catch {
      toast.error('Daten konnten nicht geladen werden.')
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => { loadData() }, [])

  const handleToggleActive = async (user: AdminUserStats) => {
    try {
      const { data } = await adminApi.toggleUserActive(user.id)
      setUsers(users.map(u => u.id === user.id ? { ...u, is_active: data.is_active } : u))
      toast.success(data.is_active ? 'Benutzer aktiviert.' : 'Benutzer deaktiviert.')
    } catch (err: any) {
      toast.error(err.response?.data?.detail || 'Fehler beim Ändern des Status.')
    }
  }

  const handleToggleAdmin = async (user: AdminUserStats) => {
    try {
      const { data } = await adminApi.toggleUserAdmin(user.id)
      setUsers(users.map(u => u.id === user.id ? { ...u, is_admin: data.is_admin } : u))
      toast.success(data.is_admin ? 'Admin-Rechte erteilt.' : 'Admin-Rechte entfernt.')
    } catch (err: any) {
      toast.error(err.response?.data?.detail || 'Fehler beim Ändern der Rechte.')
    }
  }

  const handleSavePassword = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!pwModalUser || newPassword.length < 6) return
    
    setIsSavingPw(true)
    try {
      await adminApi.setTempPassword(pwModalUser.id, newPassword)
      toast.success('Temporäres Passwort gesetzt.')
      setPwModalUser(null)
      setNewPassword('')
    } catch (err: any) {
      toast.error(err.response?.data?.detail || 'Fehler beim Setzen des Passworts.')
    } finally {
      setIsSavingPw(false)
    }
  }

  const handleRestore = async (docId: number) => {
    try {
      await adminApi.restoreDocument(docId)
      toast.success('Dokument wiederhergestellt.')
      loadData()
    } catch {
      toast.error('Fehler bei der Wiederherstellung.')
    }
  }

  const handleHardDelete = async (docId: number) => {
    if (!confirm('Dieses Dokument endgültig löschen? Diese Aktion kann nicht rückgängig gemacht werden.')) return
    try {
      await adminApi.hardDeleteDocument(docId)
      toast.success('Dokument endgültig gelöscht.')
      loadData()
    } catch {
      toast.error('Fehler beim Löschen.')
    }
  }

  return (
    <div className="p-8 animate-fade-in max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-surface-50">Benutzerverwaltung</h1>
        <p className="text-surface-200 mt-1">Benutzer, Statistiken und Papierkorb verwalten</p>
      </div>

      {/* Stats Cards */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="glass rounded-xl p-6">
            <h3 className="text-surface-200 text-sm font-medium mb-1">Gesamt Datenbankgröße</h3>
            <p className="text-3xl font-bold text-brand-300">{formatBytes(stats.total_database_bytes)}</p>
          </div>
          <div className="glass rounded-xl p-6">
            <h3 className="text-surface-200 text-sm font-medium mb-1">Registrierte Benutzer</h3>
            <p className="text-3xl font-bold text-brand-300">{stats.total_users}</p>
          </div>
          <div className="glass rounded-xl p-6">
            <h3 className="text-surface-200 text-sm font-medium mb-1">Gesamt Dokumente</h3>
            <p className="text-3xl font-bold text-brand-300">{stats.total_documents}</p>
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="flex border-b border-surface-700 mb-6">
        <button
          className={`px-6 py-3 font-medium text-sm border-b-2 transition-colors cursor-pointer ${
            activeTab === 'users' ? 'border-brand-500 text-brand-300' : 'border-transparent text-surface-200 hover:text-surface-50'
          }`}
          onClick={() => setActiveTab('users')}
        >
          Benutzer ({users.length})
        </button>
        <button
          className={`px-6 py-3 font-medium text-sm border-b-2 transition-colors cursor-pointer flex items-center gap-2 ${
            activeTab === 'trash' ? 'border-brand-500 text-brand-300' : 'border-transparent text-surface-200 hover:text-surface-50'
          }`}
          onClick={() => setActiveTab('trash')}
        >
          Papierkorb
          {deletedDocs.length > 0 && (
            <span className="px-2 py-0.5 rounded-full bg-surface-800 text-xs">{deletedDocs.length}</span>
          )}
        </button>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-12">
          <div className="w-8 h-8 border-2 border-brand-500/30 border-t-brand-500 rounded-full animate-spin" />
        </div>
      ) : activeTab === 'users' ? (
        <div className="glass rounded-xl overflow-hidden">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-surface-800/50 border-b border-surface-700">
                <th className="px-5 py-4 text-xs font-semibold text-surface-200 uppercase tracking-wider">Benutzer</th>
                <th className="px-5 py-4 text-xs font-semibold text-surface-200 uppercase tracking-wider">Status</th>
                <th className="px-5 py-4 text-xs font-semibold text-surface-200 uppercase tracking-wider text-right">Dokumente</th>
                <th className="px-5 py-4 text-xs font-semibold text-surface-200 uppercase tracking-wider text-right">Speicherplatz</th>
                <th className="px-5 py-4 text-xs font-semibold text-surface-200 uppercase tracking-wider text-center">Aktionen</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-surface-700">
              {users.map(u => {
                const isSelf = currentUser?.id === u.id
                const activeAdminCount = users.filter(x => x.is_admin && x.is_active).length
                // Protect if this user is the only active admin
                const isLastAdmin = u.is_admin && u.is_active && activeAdminCount <= 1

                const adminBtnDisabled = isSelf || (isLastAdmin && u.is_admin)
                const activeBtnDisabled = isSelf || isLastAdmin

                const adminBtnTitle = isSelf
                  ? 'Sie können sich selbst keine Admin-Rechte entziehen'
                  : isLastAdmin && u.is_admin
                  ? 'Mindestens ein aktiver Admin muss verbleiben'
                  : u.is_admin ? 'Admin-Rechte entziehen' : 'Admin-Rechte erteilen'

                const activeBtnTitle = isSelf
                  ? 'Sie können sich selbst nicht sperren'
                  : isLastAdmin
                  ? 'Mindestens ein aktiver Admin muss verbleiben'
                  : u.is_active ? 'Benutzer sperren' : 'Benutzer entsperren'

                return (
                <tr key={u.id} className="hover:bg-surface-800/30 transition-colors">
                  <td className="px-5 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-brand-600/30 flex items-center justify-center text-brand-300 text-sm font-bold">
                        {u.email[0].toUpperCase()}
                      </div>
                      <div>
                        <div className="font-medium text-surface-50">
                          {u.email}
                          {isSelf && (
                            <span className="ml-2 px-1.5 py-0.5 rounded text-[10px] font-semibold bg-brand-500/20 text-brand-300 align-middle">
                              Sie
                            </span>
                          )}
                        </div>
                        <div className="text-xs text-surface-300">
                          ID: {u.id} • Erstellt: {new Date(u.created_at).toLocaleDateString('de-DE')}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="px-5 py-4">
                    <div className="flex gap-2">
                      <span className={`px-2 py-1 rounded text-xs font-medium ${
                        u.is_admin ? 'bg-accent-500/20 text-accent-300' : 'bg-surface-800 text-surface-300'
                      }`}>
                        Admin
                      </span>
                      <span className={`px-2 py-1 rounded text-xs font-medium ${
                        u.is_active ? 'bg-status-completed/20 text-status-completed' : 'bg-status-failed/20 text-status-failed'
                      }`}>
                        {u.is_active ? 'Aktiv' : 'Inaktiv'}
                      </span>
                    </div>
                  </td>
                  <td className="px-5 py-4 text-right">
                    <span className="font-medium text-surface-100">{u.document_count}</span>
                  </td>
                  <td className="px-5 py-4">
                    <div className="font-medium text-surface-100 mb-1.5">{formatBytes(u.total_upload_bytes)}</div>
                    <div className="relative w-full min-w-[120px] h-3 bg-surface-800 rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all duration-500"
                        style={{
                          width: `${Math.min(u.percentage_of_total_size, 100)}%`,
                          background: 'linear-gradient(90deg, #f97316, #fb923c)',
                        }}
                      />
                      <span className="absolute inset-0 flex items-center justify-center text-[10px] font-semibold text-surface-50 drop-shadow-sm">
                        {u.percentage_of_total_size > 0 ? `${u.percentage_of_total_size}%` : '—'}
                      </span>
                    </div>
                  </td>
                  <td className="px-5 py-4 text-center">
                    <div className="flex items-center justify-center gap-2">
                      <button 
                        onClick={() => setPwModalUser(u)}
                        className="px-3 py-1.5 rounded bg-surface-800 hover:bg-surface-700 text-xs font-medium text-surface-100 transition-colors cursor-pointer"
                        title="Neues Passwort setzen"
                      >
                        Passwort
                      </button>
                      <button 
                        onClick={() => !adminBtnDisabled && handleToggleAdmin(u)}
                        disabled={adminBtnDisabled}
                        className={`px-3 py-1.5 rounded text-xs font-medium transition-colors ${
                          adminBtnDisabled
                            ? 'bg-surface-800/40 text-surface-500 cursor-not-allowed opacity-50'
                            : 'bg-surface-800 hover:bg-surface-700 text-surface-100 cursor-pointer'
                        }`}
                        title={adminBtnTitle}
                      >
                        Admin
                      </button>
                      <button 
                        onClick={() => !activeBtnDisabled && handleToggleActive(u)}
                        disabled={activeBtnDisabled}
                        className={`px-3 py-1.5 rounded text-xs font-medium transition-colors ${
                          activeBtnDisabled
                            ? 'opacity-50 cursor-not-allowed ' + (u.is_active
                              ? 'bg-status-failed/5 text-status-failed/40'
                              : 'bg-status-completed/5 text-status-completed/40')
                            : u.is_active 
                              ? 'bg-status-failed/10 text-status-failed hover:bg-status-failed/20 cursor-pointer' 
                              : 'bg-status-completed/10 text-status-completed hover:bg-status-completed/20 cursor-pointer'
                        }`}
                        title={activeBtnTitle}
                      >
                        {u.is_active ? 'Sperren' : 'Entsperren'}
                      </button>
                    </div>
                  </td>
                </tr>
              )})}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="glass rounded-xl overflow-hidden">
          {deletedDocs.length === 0 ? (
            <div className="p-12 text-center text-surface-300">
              Der Papierkorb ist leer.
            </div>
          ) : (
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-surface-800/50 border-b border-surface-700">
                  <th className="px-5 py-4 text-xs font-semibold text-surface-200 uppercase tracking-wider">Dokument</th>
                  <th className="px-5 py-4 text-xs font-semibold text-surface-200 uppercase tracking-wider">Typ & Typ</th>
                  <th className="px-5 py-4 text-xs font-semibold text-surface-200 uppercase tracking-wider text-right">Aktionen</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-surface-700">
                {deletedDocs.map(doc => (
                  <tr key={doc.id} className="hover:bg-surface-800/30 transition-colors">
                    <td className="px-5 py-4">
                      <div className="font-medium text-surface-50">{doc.filename}</div>
                      <div className="text-xs text-surface-400">
                        Hochgeladen am {new Date(doc.upload_date).toLocaleDateString('de-DE')}
                      </div>
                    </td>
                    <td className="px-5 py-4">
                      <div className="text-sm text-surface-100">{doc.user_email || 'Unbekannt'}</div>
                      <div className="text-xs text-surface-400">{doc.document_type_name || '-'}</div>
                    </td>
                    <td className="px-5 py-4 text-right">
                      <button 
                        onClick={() => handleRestore(doc.id)}
                        className="px-3 py-1.5 rounded bg-brand-600/20 text-brand-300 hover:bg-brand-600/30 text-xs font-medium transition-colors cursor-pointer mr-2"
                      >
                        Wiederherstellen
                      </button>
                      <button 
                        onClick={() => handleHardDelete(doc.id)}
                        className="px-3 py-1.5 rounded bg-status-failed/10 text-status-failed hover:bg-status-failed/20 text-xs font-medium transition-colors cursor-pointer"
                      >
                        Endgültig Löschen
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {/* Password Modal */}
      {pwModalUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setPwModalUser(null)} />
          <div className="relative glass rounded-2xl p-8 w-full max-w-md animate-slide-up">
            <h2 className="text-xl font-bold text-surface-50 mb-2">Passwort zurücksetzen</h2>
            <p className="text-sm text-surface-200 mb-6">Neues Passwort für {pwModalUser.email}</p>
            
            <form onSubmit={handleSavePassword} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-surface-200 mb-1.5">Neues Passwort (min. 6 Zeichen)</label>
                <input
                  required
                  type="text"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Passwort eingeben..."
                  minLength={6}
                  className="w-full px-4 py-2.5 rounded-lg bg-surface-900 border border-surface-700 text-surface-50 focus:border-brand-500 focus:ring-1 focus:ring-brand-500 transition-colors"
                />
              </div>
              <div className="flex justify-end gap-3 pt-2">
                <button type="button" onClick={() => setPwModalUser(null)} className="px-4 py-2 rounded-lg text-sm text-surface-200 hover:bg-surface-800 transition-colors cursor-pointer">
                  Abbrechen
                </button>
                <button type="submit" disabled={isSavingPw || newPassword.length < 6} className="px-5 py-2 rounded-lg bg-brand-600 hover:bg-brand-500 text-white text-sm font-medium transition-colors disabled:opacity-50 cursor-pointer">
                  {isSavingPw ? 'Speichern...' : 'Speichern'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
