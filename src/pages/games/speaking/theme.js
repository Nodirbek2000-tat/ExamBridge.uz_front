/* Colours, level names and time formats of the Speaking game. */
export const ACCENT = '#7C3AED'
export const LEVELS = ['A1', 'A2', 'B1', 'B2', 'C1', 'C2']
export const LEVEL_NAMES = {
  A1: 'Boshlang‘ich', A2: 'Elementar', B1: 'O‘rta', B2: 'O‘rtadan yuqori', C1: 'Yuqori', C2: 'Mukammal',
}

/* green ≥ 80 · amber ≥ 50 · red below */
export function tone(score) {
  if (score >= 80) return { name: 'ok', hex: '#34D399', text: 'text-emerald-300', soft: 'bg-emerald-400/10', ring: 'border-emerald-400/25' }
  if (score >= 50) return { name: 'fix', hex: '#FBBF24', text: 'text-amber-300', soft: 'bg-amber-400/10', ring: 'border-amber-400/25' }
  return { name: 'skip', hex: '#F87171', text: 'text-rose-300', soft: 'bg-rose-400/10', ring: 'border-rose-400/25' }
}
export const STATUS_TONE = { ok: tone(100), fix: tone(60), skip: tone(0) }

export const fmtClock = (sec) => {
  const s = Math.max(0, Math.floor(sec || 0))
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`
}
export const fmtTimer = (sec) => {
  const s = Math.max(0, Math.floor(sec || 0))
  return `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`
}
export const aboutTime = (sec) => (sec >= 60 ? `~${Math.round(sec / 60)} daq` : `~${Math.max(10, Math.round(sec / 5) * 5)} sek`)
