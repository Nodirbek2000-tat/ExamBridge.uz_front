/* Speaking game API (/api/games/speaking/) and the recordings kept in memory for this visit. */
import api from '../../../api/client'

const BASE = '/games/speaking'

export const fetchLessons = () => api.get(`${BASE}/lessons/`).then(r => r.data)
export const fetchLesson = (id) => api.get(`${BASE}/lessons/${id}/`).then(r => r.data)
export const fetchAttempt = (id) => api.get(`${BASE}/attempts/${id}/`).then(r => r.data)

const extFor = (mime) => (/mp4|m4a|aac/.test(mime) ? 'm4a' : /ogg/.test(mime) ? 'ogg' : /wav/.test(mime) ? 'wav' : 'webm')

/* → { id, status } · onProgress(0–1) while the recording uploads */
export function uploadAttempt(lessonId, { blob, mime, seconds }, onProgress) {
  const type = (mime || blob.type || 'audio/webm').split(';')[0]
  const fd = new FormData()
  fd.append('audio', blob, `reading.${extFor(type)}`)
  fd.append('mime', type)
  fd.append('duration_sec', String(Math.round(seconds * 10) / 10))
  return api.post(`${BASE}/lessons/${lessonId}/attempts/`, fd, {
    headers: { 'Content-Type': 'multipart/form-data' },
    timeout: 120000,
    onUploadProgress: (e) => onProgress?.(e.total ? Math.min(1, e.loaded / e.total) : 0),
  }).then(r => r.data)
}

// the recording just made — the result screen plays it without downloading it again
// (only the last few: each take is up to ~1.5 MB and the visit can be long)
const localClips = new Map()
const KEEP_CLIPS = 4
export const rememberClip = (attemptId, blob) => {
  if (!blob) return
  localClips.set(String(attemptId), blob)
  while (localClips.size > KEEP_CLIPS) localClips.delete(localClips.keys().next().value)
}

export async function loadClip(attempt) {
  const local = localClips.get(String(attempt.id))
  if (local) return local
  if (!attempt.audio_url) return null
  const r = await api.get(attempt.audio_url.replace(/^\/api/, ''), { responseType: 'blob', timeout: 60000 })
  return r.data
}

/* Uzbek message for a failed request */
export function errorText(e, fallback = 'Xatolik yuz berdi. Qayta urinib ko‘ring.') {
  if (!e?.response) return 'Internet aloqasini tekshiring va qayta urinib ko‘ring.'
  return e.response.data?.error || fallback
}
