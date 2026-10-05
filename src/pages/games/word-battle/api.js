/* Word Battle API (/api/games/word-battle/). Every answer is judged on the server. */
import api from '../../../api/client'

const BASE = '/games/word-battle'
const sleep = (ms) => new Promise(r => setTimeout(r, ms))

// next / answer / finish are idempotent on the server, so one quiet retry on a dropped connection is safe
async function retry(fn, tries = 2) {
  for (let i = 0; ; i++) {
    try {
      return await fn()
    } catch (e) {
      if (e?.response || i >= tries - 1) throw e
      await sleep(500)
    }
  }
}

export const fetchHome = () => api.get(`${BASE}/home/`).then(r => r.data)
export const startRound = (level) => api.post(`${BASE}/rounds/`, { level }).then(r => r.data)
export const fetchRound = (id) => api.get(`${BASE}/rounds/${id}/`).then(r => r.data)
export const nextQuestion = (id) => retry(() => api.post(`${BASE}/rounds/${id}/next/`).then(r => r.data))
export const sendAnswer = (id, idx, choice) => retry(() => api.post(`${BASE}/rounds/${id}/answer/`, { idx, choice }).then(r => r.data))
export const finishRound = (id) => retry(() => api.post(`${BASE}/rounds/${id}/finish/`).then(r => r.data), 3)
export const fetchLeaderboard = (level) => api.get(`${BASE}/leaderboard/`, { params: { level } }).then(r => r.data)
export const createDuel = ({ level, round }) => api.post(`${BASE}/duels/`, round ? { round } : { level }).then(r => r.data)
export const fetchDuel = (code) => api.get(`${BASE}/duels/${encodeURIComponent(code)}/`).then(r => r.data)
export const acceptDuel = (code) => api.post(`${BASE}/duels/${encodeURIComponent(code)}/accept/`).then(r => r.data)

/* Uzbek message for a failed request */
export function errorText(e, fallback = 'Xatolik yuz berdi. Qayta urinib ko‘ring.') {
  if (!e?.response) return 'Internet aloqasini tekshiring va qayta urinib ko‘ring.'
  if (e.response.status === 429) return 'Juda tez-tez urinyapsiz — biroz kutib, qayta urinib ko‘ring.'
  return e.response.data?.error || fallback
}

export const errorCode = (e) => e?.response?.data?.code || ''
