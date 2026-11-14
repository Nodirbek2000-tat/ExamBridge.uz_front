import axios from 'axios'

const DEVICE_KEY = 'eb_device_id'

/**
 * This browser's own id. The server counts signed-in devices by it (two at most
 * per account), so signing in again here never signs out another device.
 */
export function deviceId() {
  try {
    let id = localStorage.getItem(DEVICE_KEY)
    if (!id) {
      id = globalThis.crypto?.randomUUID?.() ?? `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 12)}`
      localStorage.setItem(DEVICE_KEY, id)
    }
    return id
  } catch {
    return ''                         // storage blocked: the server falls back to the browser's name
  }
}

function withDevice(headers = {}) {
  const id = deviceId()
  return id ? { ...headers, 'X-Device-Id': id } : headers
}

const api = axios.create({
  baseURL: '/api',
  withCredentials: false,
  headers: { 'Content-Type': 'application/json' },
})

// Attach JWT access token to every request
api.interceptors.request.use((config) => {
  const access = localStorage.getItem('access_token')
  if (access) config.headers['Authorization'] = `Bearer ${access}`
  const id = deviceId()
  if (id) config.headers['X-Device-Id'] = id
  return config
})

/** Signed out on purpose (another device took the place): back to the login page, which says why. */
function signOut(error) {
  localStorage.removeItem('access_token')
  localStorage.removeItem('refresh_token')
  const data = error?.response?.data
  if (data?.code === 'session_revoked') localStorage.removeItem('auth-store')    // the page reloads signed out
  window.location.href = data?.code === 'session_revoked'
    ? `/login?signed_out=${data.reason === 'user' ? 'user' : 'device'}`
    : '/login'
}

// On 401: try refresh once, then redirect to login
let isRefreshing = false
let failedQueue = []

function processQueue(error, token = null) {
  failedQueue.forEach(prom => {
    if (error) prom.reject(error)
    else prom.resolve(token)
  })
  failedQueue = []
}

api.interceptors.response.use(
  (res) => res,
  async (err) => {
    const original = err.config
    if (err.response?.status === 401 && !original._retry) {
      const refresh = localStorage.getItem('refresh_token')
      if (!refresh) {
        window.location.href = '/login'
        return Promise.reject(err)
      }

      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject })
        }).then(token => {
          original.headers['Authorization'] = `Bearer ${token}`
          return api(original)
        })
      }

      original._retry = true
      isRefreshing = true

      try {
        const { data } = await axios.post('/api/auth/refresh/', { refresh }, { headers: withDevice() })
        localStorage.setItem('access_token', data.access)
        if (data.refresh) localStorage.setItem('refresh_token', data.refresh)
        api.defaults.headers['Authorization'] = `Bearer ${data.access}`
        processQueue(null, data.access)
        original.headers['Authorization'] = `Bearer ${data.access}`
        return api(original)
      } catch (refreshErr) {
        processQueue(refreshErr, null)
        signOut(refreshErr)
        return Promise.reject(refreshErr)
      } finally {
        isRefreshing = false
      }
    }
    return Promise.reject(err)
  }
)

export default api
