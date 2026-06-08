import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import api from '../api/client'

function saveTokens(access, refresh) {
  if (access) localStorage.setItem('access_token', access)
  if (refresh) localStorage.setItem('refresh_token', refresh)
}

function clearTokens() {
  localStorage.removeItem('access_token')
  localStorage.removeItem('refresh_token')
}

export const useAuthStore = create(
  persist(
    (set) => ({
      user: null,
      loading: false,

      login: async (email, password) => {
        set({ loading: true })
        try {
          const { data } = await api.post('/auth/login/', { email, password })
          saveTokens(data.access, data.refresh)
          set({ user: data.user, loading: false })
          return { success: true, user: data.user }
        } catch (err) {
          set({ loading: false })
          return { success: false, error: err.response?.data?.detail || 'Login failed' }
        }
      },

      register: async (payload) => {
        set({ loading: true })
        try {
          const { data } = await api.post('/auth/register/', payload)
          saveTokens(data.access, data.refresh)
          set({ user: data.user, loading: false })
          return { success: true }
        } catch (err) {
          set({ loading: false })
          return { success: false, error: err.response?.data }
        }
      },

      googleLogin: async (credential) => {
        set({ loading: true })
        try {
          const { data } = await api.post('/auth/google/', { credential })
          saveTokens(data.access, data.refresh)
          set({ user: data.user, loading: false })
          return { success: true, user: data.user, created: data.created }
        } catch (err) {
          set({ loading: false })
          return { success: false, error: err.response?.data?.detail || 'Google login failed' }
        }
      },

      logout: async () => {
        try {
          const refresh = localStorage.getItem('refresh_token')
          await api.post('/auth/logout/', { refresh })
        } catch {}
        clearTokens()
        set({ user: null })
      },

      fetchUser: async () => {
        try {
          const { data } = await api.get('/auth/me/')
          set({ user: data })
        } catch {
          clearTokens()
          set({ user: null })
        }
      },

      updateProfile: async (payload) => {
        try {
          const { data } = await api.patch('/auth/profile/', payload)
          set({ user: data })
          return { success: true }
        } catch (err) {
          return { success: false, error: err.response?.data?.detail || 'Update failed' }
        }
      },

      changePassword: async (oldPassword, newPassword) => {
        try {
          await api.post('/auth/change-password/', { old_password: oldPassword, new_password: newPassword })
          return { success: true }
        } catch (err) {
          return { success: false, error: err.response?.data?.detail || 'Failed to change password' }
        }
      },
    }),
    { name: 'auth-store', partialize: (s) => ({ user: s.user }) }
  )
)
