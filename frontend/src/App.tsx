/**
 * DocuMind — Main App Component with routing.
 */
import { useEffect } from 'react'
import { Routes, Route } from 'react-router-dom'
import { useAuthStore } from './stores/authStore'
import ProtectedRoute from './components/ProtectedRoute'
import LoginPage from './pages/LoginPage'
import RegisterPage from './pages/RegisterPage'

/** Placeholder dashboard — will be replaced in Phase 4. */
function DashboardPlaceholder() {
  const user = useAuthStore((s) => s.user)
  const logout = useAuthStore((s) => s.logout)

  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center animate-fade-in">
        <div className="mx-auto mb-6 w-20 h-20 rounded-2xl bg-brand-500/20 border border-brand-500/30 flex items-center justify-center">
          {/* TODO: Phase 4 — Replace inline SVG with proper icon component (e.g. @heroicons/react) */}
          <svg className="w-10 h-10 text-brand-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m5.231 13.481L15 17.25m-4.5-15H5.625c-.621 0-1.125.504-1.125 1.125v16.5c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Zm3.75 11.625a2.625 2.625 0 1 1-5.25 0 2.625 2.625 0 0 1 5.25 0Z" />
          </svg>
        </div>
        <h1 className="text-4xl font-bold mb-2 bg-gradient-to-r from-brand-300 to-accent-400 bg-clip-text text-transparent">DocuMind</h1>
        <p className="text-surface-200 mb-2">Eingeloggt als <span className="text-brand-300 font-medium">{user?.email}</span></p>
        {user?.is_admin && (
          <span className="inline-block px-2 py-0.5 text-xs rounded-full bg-accent-500/20 text-accent-400 border border-accent-500/30 mb-4">Admin</span>
        )}
        <div className="glass rounded-xl px-6 py-4 inline-block mt-4">
          <div className="flex items-center gap-3">
            <span className="relative flex h-3 w-3">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-status-completed opacity-75"></span>
              <span className="relative inline-flex rounded-full h-3 w-3 bg-status-completed"></span>
            </span>
            <span className="text-surface-100 text-sm font-medium">Phase 2 ✓ — Auth funktioniert</span>
          </div>
        </div>
        <div className="mt-6">
          <button onClick={logout} className="px-4 py-2 rounded-lg bg-surface-800 hover:bg-surface-700 text-surface-200 text-sm transition-colors cursor-pointer">
            Abmelden
          </button>
        </div>
      </div>
    </div>
  )
}

export default function App() {
  // Restore auth state (token + user) from localStorage on page reload,
  // otherwise the Zustand store would be empty and the user would be logged out.
  const hydrate = useAuthStore((s) => s.hydrate)
  useEffect(() => { hydrate() }, [hydrate]) 

  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/register" element={<RegisterPage />} />
      <Route element={<ProtectedRoute />}>
        <Route path="/" element={<DashboardPlaceholder />} />
      </Route>
    </Routes>
  )
}
