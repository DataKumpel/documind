/**
 * Register page with email/password form.
 */
import { useState, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuthStore } from '../stores/authStore'
import toast from 'react-hot-toast'

export default function RegisterPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const register = useAuthStore((s) => s.register)
  const isLoading = useAuthStore((s) => s.isLoading)
  const navigate = useNavigate()

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    if (password !== confirmPassword) {
      toast.error('Passwörter stimmen nicht überein.')
      return
    }
    const success = await register(email, password)
    if (success) navigate('/')
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <div className="w-full max-w-md animate-fade-in">
        <div className="text-center mb-8">
          <div className="mx-auto mb-4 w-14 h-14 rounded-xl bg-brand-500/20 border border-brand-500/30 flex items-center justify-center">
            {/* TODO: Phase 4 — Replace inline SVG with proper icon component (e.g. @heroicons/react) */}
            <svg className="w-7 h-7 text-brand-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m5.231 13.481L15 17.25m-4.5-15H5.625c-.621 0-1.125.504-1.125 1.125v16.5c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Zm3.75 11.625a2.625 2.625 0 1 1-5.25 0 2.625 2.625 0 0 1 5.25 0Z" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-surface-50">Registrieren</h1>
          <p className="text-surface-200 text-sm mt-1">Neues DocuMind-Konto erstellen</p>
        </div>

        <form onSubmit={handleSubmit} className="glass rounded-2xl p-8 space-y-5">
          <div>
            <label htmlFor="reg-email" className="block text-sm font-medium text-surface-200 mb-1.5">E-Mail</label>
            <input id="reg-email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)}
              className="w-full px-4 py-2.5 rounded-lg bg-surface-900 border border-surface-700 text-surface-50 placeholder:text-surface-200/40 focus:border-brand-500 focus:ring-1 focus:ring-brand-500 transition-colors"
              placeholder="name@beispiel.de" />
          </div>
          <div>
            <label htmlFor="reg-pw" className="block text-sm font-medium text-surface-200 mb-1.5">Passwort</label>
            <input id="reg-pw" type="password" required minLength={6} value={password} onChange={(e) => setPassword(e.target.value)}
              className="w-full px-4 py-2.5 rounded-lg bg-surface-900 border border-surface-700 text-surface-50 placeholder:text-surface-200/40 focus:border-brand-500 focus:ring-1 focus:ring-brand-500 transition-colors"
              placeholder="Mindestens 6 Zeichen" />
          </div>
          <div>
            <label htmlFor="reg-confirm" className="block text-sm font-medium text-surface-200 mb-1.5">Passwort bestätigen</label>
            <input id="reg-confirm" type="password" required minLength={6} value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)}
              className="w-full px-4 py-2.5 rounded-lg bg-surface-900 border border-surface-700 text-surface-50 placeholder:text-surface-200/40 focus:border-brand-500 focus:ring-1 focus:ring-brand-500 transition-colors"
              placeholder="Passwort wiederholen" />
          </div>
          <button type="submit" disabled={isLoading}
            className="w-full py-2.5 px-4 rounded-lg bg-brand-600 hover:bg-brand-500 text-white font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer">
            {isLoading ? 'Registrieren...' : 'Konto erstellen'}
          </button>
          <p className="text-center text-sm text-surface-200">
            Bereits ein Konto?{' '}
            <Link to="/login" className="text-brand-400 hover:text-brand-300 transition-colors">Anmelden</Link>
          </p>
        </form>
      </div>
    </div>
  )
}
