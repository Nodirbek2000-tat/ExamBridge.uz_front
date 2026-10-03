/*
 * VOICE DRIVE sounds: tiny synthesized blips (WebAudio, no files). Quiet on
 * purpose, and the page never plays them while the mic is listening.
 * unlockSfx() must be called from a tap (browsers start audio only after one).
 */
let ctx = null
let master = null
let noise = null

export function unlockSfx() {
  try {
    if (!ctx) {
      const AC = window.AudioContext || window.webkitAudioContext
      if (!AC) return
      ctx = new AC()
      master = ctx.createGain()
      master.gain.value = 0.22
      master.connect(ctx.destination)
    }
    if (ctx.state === 'suspended') ctx.resume().catch(() => {})
  } catch { ctx = null }
}

function tone(freq, start, dur, { type = 'sine', vol = 0.5, to = null, attack = 0.005 } = {}) {
  const t0 = ctx.currentTime + start
  const o = ctx.createOscillator()
  const g = ctx.createGain()
  o.type = type
  o.frequency.setValueAtTime(freq, t0)
  if (to) o.frequency.exponentialRampToValueAtTime(to, t0 + dur)
  g.gain.setValueAtTime(0.0001, t0)
  g.gain.exponentialRampToValueAtTime(vol, t0 + attack)
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur)
  o.connect(g)
  g.connect(master)
  o.start(t0)
  o.stop(t0 + dur + 0.02)
}

function hiss(start, dur, { vol = 0.4, freq = 1200, q = 0.8, to = null } = {}) {
  if (!noise) {
    noise = ctx.createBuffer(1, ctx.sampleRate * 0.6, ctx.sampleRate)
    const d = noise.getChannelData(0)
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1
  }
  const t0 = ctx.currentTime + start
  const s = ctx.createBufferSource()
  s.buffer = noise
  const f = ctx.createBiquadFilter()
  f.type = 'bandpass'
  f.frequency.setValueAtTime(freq, t0)
  if (to) f.frequency.exponentialRampToValueAtTime(to, t0 + dur)
  f.Q.value = q
  const g = ctx.createGain()
  g.gain.setValueAtTime(vol, t0)
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur)
  s.connect(f)
  f.connect(g)
  g.connect(master)
  s.start(t0)
  s.stop(t0 + dur + 0.02)
}

const SOUNDS = {
  coin: () => { tone(988, 0, 0.07, { vol: 0.3 }); tone(1319, 0.06, 0.12, { vol: 0.3 }) },
  ok: () => { tone(523, 0, 0.1); tone(659, 0.08, 0.1); tone(784, 0.16, 0.18) },
  perfect: () => { tone(523, 0, 0.09); tone(659, 0.07, 0.09); tone(784, 0.14, 0.09); tone(1047, 0.21, 0.25) },
  fail: () => { tone(330, 0, 0.18, { type: 'square', vol: 0.18 }); tone(220, 0.16, 0.3, { type: 'square', vol: 0.18 }) },
  crash: () => { hiss(0, 0.35, { vol: 0.6, freq: 500, q: 0.5 }); tone(90, 0, 0.3, { type: 'triangle', vol: 0.5 }) },
  horn: () => {
    for (const s of [0, 0.3]) { tone(392, s, 0.22, { type: 'square', vol: 0.16 }); tone(494, s, 0.22, { type: 'square', vol: 0.16 }) }
  },
  turbo: () => { tone(180, 0, 0.7, { type: 'sawtooth', vol: 0.18, to: 1100 }); hiss(0, 0.7, { vol: 0.25, freq: 800, to: 4000 }) },
  fuel: () => { for (let i = 0; i < 6; i++) tone(400 + i * 90, i * 0.12, 0.1, { vol: 0.2 }) },
  door: () => { hiss(0, 0.05, { vol: 0.5, freq: 2000 }); tone(140, 0.03, 0.12, { type: 'triangle', vol: 0.4 }) },
  mission: () => { [659, 784, 988, 1319].forEach((f, i) => tone(f, i * 0.08, 0.16, { vol: 0.35 })) },
  best: () => { [523, 659, 784, 1047, 784, 1047].forEach((f, i) => tone(f, i * 0.1, 0.18, { type: 'triangle', vol: 0.4 })) },
  count: () => tone(523, 0, 0.12, { vol: 0.3 }),
  go: () => tone(1047, 0, 0.3, { vol: 0.35 }),
  jump: () => tone(300, 0, 0.2, { vol: 0.3, to: 760 }),
  swoosh: () => hiss(0, 0.22, { vol: 0.35, freq: 600, to: 2400, q: 1.2 }),
  brake: () => hiss(0, 0.3, { vol: 0.2, freq: 3200, q: 6 }),
  skid: () => hiss(0, 0.55, { vol: 0.3, freq: 2600, q: 5, to: 1800 }),
  lights: () => { tone(1800, 0, 0.04, { type: 'square', vol: 0.12 }); tone(1200, 0.05, 0.05, { type: 'square', vol: 0.12 }) },
  shield: () => tone(900, 0, 0.45, { vol: 0.3, to: 1900 }),
  over: () => { tone(523, 0, 0.2); tone(415, 0.18, 0.2); tone(330, 0.36, 0.4) },
}

export function playSfx(name) {
  if (!ctx || ctx.state !== 'running') return
  try { SOUNDS[name]?.() } catch { /* never let a sound break the game */ }
}
