/**
 * Auth store using Zustand.
 * Manages JWT token, user state, login/logout/register actions.
 */

import { create } from 'zustand'
import { authApi, type User } from '../lib/api'
import toast from 'react-hot-toast'

interface AuthState {
  token: string | null
  user: User | null
  isLoading: boolean

  // Actions
  login: (email: string, password: string) => Promise<boolean>
  register: (email: string, password: string) => Promise<boolean>
  logout: () => void
  hydrate: () => void
}

export const useAuthStore = create<AuthState>((set) => ({
  token: null,
  user: null,
  isLoading: false,

  login: async (email, password) => {
    set({ isLoading: true })
    try {
      const { data } = await authApi.login(email, password)
      localStorage.setItem('documind_token', data.access_token)
      localStorage.setItem('documind_user', JSON.stringify(data.user))
      set({ token: data.access_token, user: data.user, isLoading: false })
      toast.success('Erfolgreich angemeldet!')
      return true
    } catch (err: any) {
      set({ isLoading: false })
      const msg = err.response?.data?.detail || 'Anmeldung fehlgeschlagen.'
      toast.error(msg)
      return false
    }
  },

  register: async (email, password) => {
    set({ isLoading: true })
    try {
      const { data } = await authApi.register(email, password)
      localStorage.setItem('documind_token', data.access_token)
      localStorage.setItem('documind_user', JSON.stringify(data.user))
      set({ token: data.access_token, user: data.user, isLoading: false })
      toast.success('Registrierung erfolgreich!')
      return true
    } catch (err: any) {
      set({ isLoading: false })
      const msg = err.response?.data?.detail || 'Registrierung fehlgeschlagen.'
      toast.error(msg)
      return false
    }
  },

  logout: () => {
    localStorage.removeItem('documind_token')
    localStorage.removeItem('documind_user')
    set({ token: null, user: null })
    toast.success('Abgemeldet.')
  },

  hydrate: () => {
    const token = localStorage.getItem('documind_token')
    const userStr = localStorage.getItem('documind_user')
    if (token && userStr) {
      try {
        const user = JSON.parse(userStr) as User
        set({ token, user })
      } catch {
        localStorage.removeItem('documind_token')
        localStorage.removeItem('documind_user')
      }
    }
  },
}))
