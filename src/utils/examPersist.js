// ── Exam progress persistence (survives page refresh) ────────────────────────
// Saves in-progress exam state to localStorage so a refresh resumes exactly
// where the user left off — answers, written text, elapsed time, audio position.
// State is cleared automatically on submit/finish.

const PREFIX = 'exam_progress_'
const MAX_AGE_MS = 1000 * 60 * 60 * 24 // 24h — stale entries are ignored & purged

export function examKey(kind, id) {
  return `${PREFIX}${kind}_${id}`
}

export function loadExam(key) {
  if (!key) return null
  try {
    const raw = localStorage.getItem(key)
    if (!raw) return null
    const parsed = JSON.parse(raw)
    if (!parsed || typeof parsed !== 'object') return null
    if (parsed._ts && Date.now() - parsed._ts > MAX_AGE_MS) {
      localStorage.removeItem(key)
      return null
    }
    return parsed.data ?? null
  } catch {
    return null
  }
}

export function saveExam(key, data) {
  if (!key) return
  try {
    localStorage.setItem(key, JSON.stringify({ _ts: Date.now(), data }))
  } catch {
    /* quota / private mode — ignore */
  }
}

export function clearExam(key) {
  if (!key) return
  try {
    localStorage.removeItem(key)
  } catch {
    /* ignore */
  }
}
