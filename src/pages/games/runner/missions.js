/*
 * TOBY RUN — daily missions (RUNNER_PLAN §B7), pure (node --test runs it).
 *
 * 3 active at a time, at least 2 about speaking, from a pool of 12; rewards 100 / 150 / 200 coins; at most
 * 6 completions a day; a new set every day (Asia/Tashkent). "In one run" missions keep the best single
 * run, the others add up over the day. In server mode "5 answers faster than 1.5 s" becomes "10 passes"
 * (the recogniser's latency is not the learner's fault).
 *
 *   tashkentDay(date) → 'YYYY-MM-DD'
 *   rollMissions(m, { day, server }) → m with 3 active (a new day starts over)
 *   applyRun(m, summary, { day, server }) → { missions, completed: [{ id, reward }], reward }
 *   applyFixes(m, n, { day, server }) → same (Tuzat / results-screen fixes)
 *   missionInfo(id) → { id, kind, title, goal, reward, per }
 */
import { seeded } from '../../../games/three/random.js'

export const MAX_PER_DAY = 6

export const MISSIONS = [
  { id: 'say8', kind: 'speak', per: 'run', goal: 8, reward: 150, title: 'Bitta o‘yinda 8 ta so‘zni birinchi urinishda ayting' },
  { id: 'fix3', kind: 'speak', per: 'day', goal: 3, reward: 100, title: '3 ta qizil so‘zni tuzating' },
  { id: 'bekat2', kind: 'speak', per: 'day', goal: 2, reward: 200, title: '2 ta bekatni a’lo o‘ting' },
  { id: 'revive1', kind: 'speak', per: 'day', goal: 1, reward: 100, title: 'Bir marta gapirib turing (tirilish)' },
  { id: 'fast5', kind: 'speak', per: 'day', goal: 5, reward: 150, title: '5 ta javobni 1,5 soniyadan tez ayting', browser: true },
  { id: 'pass10', kind: 'speak', per: 'day', goal: 10, reward: 150, title: '10 ta to‘g‘ri javob bering', server: true },
  { id: 'puff2', kind: 'speak', per: 'day', goal: 2, reward: 100, title: 'Shovqinni 2 marta puflab yuboring' },
  { id: 'learn5', kind: 'speak', per: 'day', goal: 5, reward: 200, title: '5 ta yangi so‘z o‘rganing (eshiting, keyin eslab ayting)' },
  { id: 'run2000', kind: 'run', per: 'day', goal: 2000, reward: 150, title: '2 000 metr yuguring' },
  { id: 'coins300', kind: 'run', per: 'day', goal: 300, reward: 100, title: '300 tanga yig‘ing' },
  { id: 'roll10', kind: 'run', per: 'day', goal: 10, reward: 150, title: '10 ta to‘siq ostidan yumalab o‘ting' },
  { id: 'roof200', kind: 'run', per: 'day', goal: 200, reward: 150, title: 'Vagon tomida 200 metr yuguring' },
  { id: 'magnet3', kind: 'run', per: 'day', goal: 3, reward: 100, title: '3 marta magnit oling' },
]
const BY_ID = new Map(MISSIONS.map(m => [m.id, m]))
export const missionInfo = (id) => BY_ID.get(id) || null

export function tashkentDay(date = new Date()) {
  try {
    return new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Tashkent', year: 'numeric', month: '2-digit', day: '2-digit' }).format(date)
  } catch {
    const t = new Date(date.getTime() + 5 * 3600 * 1000)
    return t.toISOString().slice(0, 10)
  }
}

const daySeed = (day, n) => {
  let h = 2166136261
  for (const ch of `${day}:${n}`) h = Math.imul(h ^ ch.charCodeAt(0), 16777619)
  return h >>> 0
}

const usable = (m, server) => !(server && m.browser) && !(!server && m.server)

/* the next mission for a slot: speaking ones until two of the three are about speaking */
function pick(active, done, day, server, n) {
  const rnd = seeded(daySeed(day, n))
  const speakCount = active.filter(a => BY_ID.get(a.id)?.kind === 'speak').length
  const needSpeak = speakCount < 2
  const taken = new Set([...active.map(a => a.id), ...done])
  let pool = MISSIONS.filter(m => usable(m, server) && !taken.has(m.id) && (!needSpeak || m.kind === 'speak'))
  if (!pool.length) pool = MISSIONS.filter(m => usable(m, server) && !taken.has(m.id))
  if (!pool.length) return null
  return pool[Math.floor(rnd() * pool.length)]
}

export function rollMissions(m, { day, server = false } = {}) {
  let cur = m && m.day === day ? { ...m, active: [...(m.active || [])], done: [...(m.done || [])] } : { day, active: [], done_today: 0, done: [], fixes: 0 }
  // the browser / server swap of the speed mission
  cur.active = cur.active.map(a => {
    const info = BY_ID.get(a.id)
    if (!info) return null
    if (server && a.id === 'fast5') return { id: 'pass10', p: 0 }
    if (!server && a.id === 'pass10') return { id: 'fast5', p: 0 }
    return a
  }).filter(Boolean)
  if (cur.done_today >= MAX_PER_DAY) return { ...cur, active: [] }          // that's all for today
  let n = cur.done_today * 3 + cur.active.length
  while (cur.active.length < 3) {
    const next = pick(cur.active, cur.done, day, server, n++)
    if (!next) break
    cur.active.push({ id: next.id, p: 0 })
  }
  // speaking first on the card
  cur.active.sort((a, b) => (BY_ID.get(a.id).kind === 'speak' ? 0 : 1) - (BY_ID.get(b.id).kind === 'speak' ? 0 : 1))
  return cur
}

/* what a finished run is worth for each mission */
export function runMetrics(summary, { server = false } = {}) {
  const outs = summary?.outcomes || []
  const st = summary?.stats || {}
  // spoken first-try passes (a Listen-mode swipe is not "saying" a word)
  const firstOk = outs.filter(o => o.v === 'ok' && (o.tries || 1) <= 1 && o.pt !== 'listen')
  const learned = new Set()
  const heard = new Set()
  for (const o of outs) {
    const key = `${o.k}:${o.id}`
    if (o.pt === 'hear' && (o.v === 'ok' || o.v === 'close')) heard.add(key)
    else if (heard.has(key) && (o.v === 'ok' || o.v === 'close') && o.pt !== 'hear') learned.add(key)
  }
  return {
    say8: firstOk.filter(o => o.kind === 'word').length,
    bekat2: st.perfect || 0,
    revive1: summary?.revives || 0,
    fast5: server ? 0 : firstOk.filter(o => o.ms != null && o.ms < 1500).length,
    pass10: outs.filter(o => (o.v === 'ok' || o.v === 'close') && (o.tries || 1) <= 1 && o.m !== 'r' && o.pt !== 'listen').length,
    puff2: st.puffs || 0,
    learn5: learned.size,
    run2000: summary?.distance_m || 0,
    coins300: summary?.coins || 0,
    roll10: st.rolls || 0,
    roof200: Math.floor(st.roofM || 0),
    magnet3: st.magnets || 0,
    fix3: 0,
  }
}

function advance(m, metrics, { day, server }) {
  const cur = rollMissions(m, { day, server })
  const completed = []
  const active = []
  for (const a of cur.active) {
    const info = BY_ID.get(a.id)
    const got = metrics[a.id] || 0
    const p = info.per === 'run' ? Math.max(a.p, got) : a.p + got
    if (p >= info.goal && cur.done_today < MAX_PER_DAY) {
      completed.push({ id: a.id, reward: info.reward })
      cur.done_today++
      cur.done.push(a.id)
    } else active.push({ id: a.id, p: Math.min(p, info.goal) })
  }
  const next = rollMissions({ ...cur, active }, { day, server })
  return { missions: next, completed, reward: completed.reduce((s, c) => s + c.reward, 0) }
}

export function applyRun(m, summary, { day, server = false } = {}) {
  return advance(m, runMetrics(summary, { server }), { day, server })
}

export function applyFixes(m, n, { day, server = false } = {}) {
  return advance(m, { fix3: n }, { day, server })
}
