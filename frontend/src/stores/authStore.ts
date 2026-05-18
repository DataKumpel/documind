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
  setTheme: (theme: 'light' | 'dark') => Promise<void>
}

export const useAuthStore = create<AuthState>((set, get) => ({
  token: null,
  user: null,
  isLoading: false,

  login: async (email, password) => {
    set({ isLoading: true })
    try {
      const { data } = await authApi.login(email, password)
      localStorage.setItem('documind_token', data.access_token)
      localStorage.setItem('documind_user', JSON.stringify(data.user))
      
      // Apply theme
      document.documentElement.classList.remove('light', 'dark')
      document.documentElement.classList.add(data.user.theme || 'dark')
      
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

      // Apply theme
      document.documentElement.classList.remove('light', 'dark')
      document.documentElement.classList.add(data.user.theme || 'dark')

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
    document.documentElement.classList.remove('light', 'dark')
    document.documentElement.classList.add('dark')
    set({ token: null, user: null })
    toast.success('Abgemeldet.')
  },

  hydrate: () => {
    const token = localStorage.getItem('documind_token')
    const userStr = localStorage.getItem('documind_user')
    if (token && userStr) {
      try {
        const user = JSON.parse(userStr) as User
        document.documentElement.classList.remove('light', 'dark')
        document.documentElement.classList.add(user.theme || 'dark')
        set({ token, user })
      } catch {
        localStorage.removeItem('documind_token')
        localStorage.removeItem('documind_user')
      }
    }
  },

  setTheme: async (theme) => {
    const { user } = get()
    if (!user) return

    try {
      const { data: updatedUser } = await authApi.updateTheme(theme)
      localStorage.setItem('documind_user', JSON.stringify(updatedUser))
      
      document.documentElement.classList.remove('light', 'dark')
      document.documentElement.classList.add(theme)
      
      set({ user: updatedUser })
    } catch (err) {
      toast.error('Theme konnte nicht gespeichert werden.')
    }
  }
}))
