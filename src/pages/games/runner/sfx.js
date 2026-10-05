/*
 * TOBY RUN — sounds: tiny WebAudio synth blips and a small music loop (doira pattern, bass, a pentatonic
 * tune; no files). While the mic is open the page mutes the blips and ducks the music by 12 dB
 * (RUNNER_PLAN §B3.1). unlockSfx() from a tap.
 */
let ctx = null
let master = null
let sfxBus = null
let musicBus = null
let noise = null
let musicTimer = 0
let musicOn = false
let step = 0
let nextAt = 0

export function unlockSfx() {
  try {
    if (!ctx) {
      const AC = window.AudioContext || window.webkitAudioContext
      if (!AC) return
      ctx = new AC()
      master = ctx.createGain()
      master.gain.value = 0.9
      master.connect(ctx.destination)
      sfxBus = ctx.createGain()
      sfxBus.gain.value = 0.24
      sfxBus.connect(master)
      musicBus = ctx.createGain()
      musicBus.gain.value = 0.05
      musicBus.connect(master)
    }
    if (ctx.state === 'suspended') ctx.resume().catch(() => {})
  } catch { ctx = null }
}

function tone(freq, start, dur, { type = 'sine', vol = 0.5, to = null, attack = 0.006, bus = sfxBus } = {}) {
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
  g.connect(bus)
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
  g.connect(sfxBus)
  s.start(t0)
  s.stop(t0 + dur + 0.02)
}

const SOUNDS = {
  count: () => tone(523, 0, 0.12, { vol: 0.3 }),
  go: () => { tone(784, 0, 0.12, { vol: 0.3 }); tone(1047, 0.1, 0.3, { vol: 0.35 }) },
  jump: () => tone(320, 0, 0.18, { vol: 0.25, to: 720 }),
  roll: () => hiss(0, 0.25, { vol: 0.3, freq: 500, to: 220, q: 1.4 }),
  swoosh: () => hiss(0, 0.16, { vol: 0.22, freq: 700, to: 2200, q: 1.2 }),
  coin: () => { tone(1319, 0, 0.06, { vol: 0.16 }); tone(1760, 0.05, 0.09, { vol: 0.14 }) },
  chime: () => { tone(880, 0, 0.12, { vol: 0.22 }); tone(1320, 0.07, 0.18, { vol: 0.18 }) },
  ok: () => { tone(523, 0, 0.1); tone(659, 0.08, 0.1); tone(988, 0.16, 0.22) },
  close: () => { tone(523, 0, 0.12); tone(659, 0.1, 0.2) },
  perfect: () => { [523, 659, 784, 1047, 1319].forEach((f, i) => tone(f, i * 0.07, 0.2, { vol: 0.35 })) },
  miss: () => { tone(392, 0, 0.16, { type: 'triangle', vol: 0.3 }); tone(311, 0.14, 0.26, { type: 'triangle', vol: 0.3 }) },
  crash: () => { hiss(0, 0.4, { vol: 0.6, freq: 420, q: 0.5 }); tone(110, 0, 0.35, { type: 'triangle', vol: 0.5, to: 60 }) },
  bump: () => { hiss(0, 0.12, { vol: 0.4, freq: 900, q: 0.7 }); tone(180, 0, 0.12, { type: 'triangle', vol: 0.3 }) },
  land: () => tone(160, 0, 0.1, { type: 'triangle', vol: 0.22 }),
  lift: () => { tone(392, 0, 0.35, { vol: 0.2, to: 784 }); hiss(0, 0.35, { vol: 0.12, freq: 1500, to: 3000 }) },
  power: () => { [784, 988, 1175, 1568].forEach((f, i) => tone(f, i * 0.05, 0.14, { vol: 0.25 })) },
  token: () => { [1047, 1319, 1568, 2093].forEach((f, i) => tone(f, i * 0.06, 0.2, { type: 'triangle', vol: 0.25 })) },
  puff: () => hiss(0, 0.45, { vol: 0.35, freq: 1800, to: 400, q: 0.6 }),
  shield: () => tone(700, 0, 0.4, { vol: 0.25, to: 1500 }),
  revive: () => { [392, 523, 659, 784].forEach((f, i) => tone(f, i * 0.08, 0.2, { vol: 0.3 })) },
  door: () => { tone(659, 0, 0.25, { vol: 0.25 }); tone(523, 0.22, 0.35, { vol: 0.25 }) },
  brake: () => hiss(0, 0.5, { vol: 0.18, freq: 2800, q: 6, to: 1500 }),
  over: () => { tone(523, 0, 0.2); tone(415, 0.18, 0.2); tone(330, 0.36, 0.4) },
}

export function playSfx(name) {
  if (!ctx || ctx.state !== 'running') return
  try { SOUNDS[name]?.() } catch { /* never let a sound break the game */ }
}

/*
 * The music: a small two-bar loop with a doira-like pattern (low "dum", bright "tak"), a soft bass and a
 * pentatonic nay-ish tune that changes every other bar. Scheduled a little ahead on the audio clock.
 */
const BPM = 104
const DOIRA = ['D', '', 't', 'D', '', 't', 't', '']          // eighths
const BASS = [146.8, 0, 0, 0, 110, 0, 0, 0, 130.8, 0, 0, 0, 110, 0, 98, 0]
const TUNE = [
  [587, 0, 659, 740, 880, 0, 740, 659, 587, 0, 494, 0, 587, 0, 0, 0],
  [740, 0, 880, 988, 880, 740, 659, 0, 587, 659, 587, 494, 440, 0, 0, 0],
]
function dum(start) {
  tone(92, start, 0.22, { type: 'sine', vol: 0.9, to: 52, attack: 0.004, bus: musicBus })
}
function tak(start) {
  if (!noise) return
  const t0 = ctx.currentTime + start
  const src = ctx.createBufferSource()
  src.buffer = noise
  const f = ctx.createBiquadFilter()
  f.type = 'bandpass'
  f.frequency.value = 3200
  f.Q.value = 1.2
  const g = ctx.createGain()
  g.gain.setValueAtTime(0.5, t0)
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.06)
  src.connect(f)
  f.connect(g)
  g.connect(musicBus)
  src.start(t0)
  src.stop(t0 + 0.08)
}
function schedule() {
  if (!ctx || !musicOn) return
  if (!noise) hiss(0, 0.01, { vol: 0.0001 })          // makes the shared noise buffer
  const eighth = 60 / BPM / 2
  while (nextAt < ctx.currentTime + 0.4) {
    const start = Math.max(0, nextAt - ctx.currentTime)
    const i = step % 16
    const bar = Math.floor(step / 16) % 4
    const d = DOIRA[step % 8]
    if (d === 'D') dum(start)
    else if (d === 't') tak(start)
    if (BASS[i]) tone(BASS[i], start, eighth * 3.2, { type: 'triangle', vol: 0.55, bus: musicBus, attack: 0.02 })
    const n = TUNE[bar % 2][i]
    if (n && bar !== 3) tone(n, start, eighth * 1.6, { type: 'sine', vol: 0.32, bus: musicBus, attack: 0.03 })
    nextAt += eighth
    step++
  }
}

export function setMusic(on) {
  musicOn = !!on && !!ctx
  clearInterval(musicTimer)
  if (!musicOn) return
  nextAt = ctx.currentTime + 0.1
  musicTimer = setInterval(schedule, 120)
}

/* while the mic is open: music −12 dB, sound effects off */
export function duck(on) {
  if (!ctx) return
  const t = ctx.currentTime
  musicBus.gain.cancelScheduledValues(t)
  musicBus.gain.setTargetAtTime(on ? 0.0125 : 0.05, t, 0.08)
  sfxBus.gain.cancelScheduledValues(t)
  sfxBus.gain.setTargetAtTime(on ? 0 : 0.24, t, 0.03)
}

export function stopAudio() {
  setMusic(false)
}
