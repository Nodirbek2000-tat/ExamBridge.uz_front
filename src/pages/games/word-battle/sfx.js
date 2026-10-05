/*
 * WORD BATTLE sounds: a few short synthesized blips (WebAudio, no files), quiet on purpose.
 * unlockSfx() must run inside a tap (browsers start audio only after one).
 * The on/off choice is remembered on this device.
 */
const KEY = 'wb-sound'
let ctx = null
let master = null
let on = (() => { try { return localStorage.getItem(KEY) !== '0' } catch { return true } })()

export const soundOn = () => on
export function setSound(v) {
  on = Boolean(v)
  try { localStorage.setItem(KEY, on ? '1' : '0') } catch { /* private mode */ }
}

export function unlockSfx() {
  try {
    if (!ctx) {
      const AC = window.AudioContext || window.webkitAudioContext
      if (!AC) return
      ctx = new AC()
      master = ctx.createGain()
      master.gain.value = 0.2
      master.connect(ctx.destination)
    }
    if (ctx.state === 'suspended') ctx.resume().catch(() => {})
  } catch { ctx = null }
}

function tone(freq, start, dur, { type = 'sine', vol = 0.5, to = null } = {}) {
  const t0 = ctx.currentTime + start
  const o = ctx.createOscillator()
  const g = ctx.createGain()
  o.type = type
  o.frequency.setValueAtTime(freq, t0)
  if (to) o.frequency.exponentialRampToValueAtTime(to, t0 + dur)
  g.gain.setValueAtTime(0.0001, t0)
  g.gain.exponentialRampToValueAtTime(vol, t0 + 0.006)
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur)
  o.connect(g)
  g.connect(master)
  o.start(t0)
  o.stop(t0 + dur + 0.02)
}

const SOUNDS = {
  tap: () => tone(660, 0, 0.06, { type: 'triangle', vol: 0.25 }),
  tick: () => tone(1240, 0, 0.05, { type: 'square', vol: 0.06 }),
  right: () => { tone(740, 0, 0.12, { type: 'triangle', vol: 0.45 }); tone(1110, 0.08, 0.18, { type: 'triangle', vol: 0.4 }) },
  combo: () => { tone(880, 0, 0.1, { type: 'triangle', vol: 0.4 }); tone(1320, 0.07, 0.12, { vol: 0.35 }); tone(1760, 0.14, 0.2, { vol: 0.3 }) },
  wrong: () => tone(200, 0, 0.26, { type: 'sawtooth', vol: 0.16, to: 120 }),
  hit: () => tone(320, 0, 0.14, { type: 'square', vol: 0.1, to: 90 }),
  win: () => [523, 659, 784, 1047].forEach((f, i) => tone(f, i * 0.1, 0.24, { type: 'triangle', vol: 0.4 })),
  lose: () => [440, 370, 294].forEach((f, i) => tone(f, i * 0.14, 0.28, { type: 'triangle', vol: 0.3 })),
}

export function sfx(name) {
  if (!on || !ctx || !SOUNDS[name]) return
  try { SOUNDS[name]() } catch { /* audio not available */ }
}

export function buzz(ms = 30) {
  if (!on) return
  try { navigator.vibrate?.(ms) } catch { /* not supported */ }
}
