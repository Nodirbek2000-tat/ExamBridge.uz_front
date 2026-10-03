/*
 * TOBY'S DAY — saving progress. The server is the source of truth, but every
 * call falls back to localStorage so the game always works (offline, server
 * error, endpoint not deployed yet).
 */
import api from '../../../api/client'
import { LS_KEY, SLUG } from './content'
import { cleanProgress, emptyProgress, mergeProgress, sameProgress } from './logic'

const base = `/games/voice/${SLUG}`
const TIMEOUT = 8000

export function readLocal() {
  try {
    const raw = localStorage.getItem(LS_KEY)
    return raw ? cleanProgress(JSON.parse(raw)) : emptyProgress()
  } catch {
    return emptyProgress()
  }
}

export function writeLocal(progress) {
  try { localStorage.setItem(LS_KEY, JSON.stringify(cleanProgress(progress))) } catch { /* private mode / full */ }
}

/* → { progress, online } — server and device progress merged */
export async function loadProgress() {
  const local = readLocal()
  try {
    const r = await api.get(`${base}/progress/`, { timeout: TIMEOUT })
    const server = cleanProgress(r.data?.data)
    const merged = mergeProgress(server, local)
    writeLocal(merged)
    // this device had progress the server does not know yet → send it up
    if (!sameProgress(merged, server)) api.put(`${base}/progress/`, { data: merged }, { timeout: TIMEOUT }).catch(() => {})
    return { progress: merged, online: true }
  } catch {
    return { progress: local, online: false }
  }
}

/*
 * → { saved, progress }: saved = the server has it, progress = what was stored.
 * The server copy is read and merged first: if the start-up GET failed (slow
 * network, new phone with empty localStorage) a blind PUT would wipe the
 * learner's real progress with this device's little bit.
 */
export async function saveProgress(progress) {
  let out = cleanProgress(progress)
  writeLocal(out)
  try {
    const r = await api.get(`${base}/progress/`, { timeout: TIMEOUT })
    out = mergeProgress(r.data?.data, out)
    writeLocal(out)
    await api.put(`${base}/progress/`, { data: out }, { timeout: TIMEOUT })
    return { saved: true, progress: out }
  } catch {
    return { saved: false, progress: out }
  }
}

/* run = { score, stars, accuracy, level, duration_sec, lines_said } → { id, best_score } | null */
export async function postRun(run) {
  try {
    const r = await api.post(`${base}/runs/`, run, { timeout: TIMEOUT })
    return r.data || null
  } catch {
    return null
  }
}

/* → { top: [{ name, score }], me: { best_score, rank } } | null */
export async function loadLeaderboard() {
  try {
    const r = await api.get(`${base}/leaderboard/`, { timeout: TIMEOUT })
    return r.data && Array.isArray(r.data.top) ? r.data : null
  } catch {
    return null
  }
}
