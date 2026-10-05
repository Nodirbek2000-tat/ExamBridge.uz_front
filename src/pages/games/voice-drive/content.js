/*
 * VOICE DRIVE — levels, spoken commands, missions and how a heard phrase is judged.
 * Pure data + functions, no React, no DOM.
 */
import { bestMatch, matchCommand, normalizeWords } from '../../../games/voice/speechMatch'

export const SLUG = 'voice-drive'
export const LIVES = 3

/*
 * The words that name each action — used to tell "you said a different command".
 * Several lists per action = any one of them names it.
 */
export const INTENT = {
  left: [['left']],
  right: [['right']],
  stop: [['stop']],
  go: [['go']],
  jump: [['jump']],
  straight: [['straight']],
  slow: [['slow']],
  fast: [['speed']],
  honk: [['honk'], ['horn'], ['beep']],
  lights: [['lights'], ['light'], ['headlights']],
  fuel: [['fill']],
  pickup: [['here'], ['stop', 'here'], ['pull', 'over']],
  turbo: [['turbo']],
}

/* Bonus events: a miss costs no life and is not repeated. */
export const BONUS = new Set(['turbo', 'pickup'])

/* What the car does, in Uzbek, for the command lists. */
export const ACTION_UZ = {
  left: 'Chap qatorga o‘tadi',
  right: 'O‘ng qatorga o‘tadi',
  stop: 'Qizil chiroqda to‘xtaydi',
  go: 'Yashil chiroqda yuradi',
  jump: 'To‘siqdan sakraydi',
  straight: 'To‘g‘riga ketadi',
  slow: 'Sekinlashadi — bolalar o‘tadi',
  fast: 'Tezlashadi — shlagbaum yopilmasdan',
  honk: 'Signal chaladi — qo‘y-sigirlar qochadi',
  lights: 'Tunnelda chiroqlarni yoqadi',
  fuel: 'Benzin quyadi (yoqilg‘i kam bo‘lsa)',
  pickup: 'Yo‘lovchini oladi — bonus',
  turbo: 'Turbo! Tezlik va 2x tanga — bonus',
}

/* Short colour per action — chips, icons, the command card. */
export const ACTION_TONE = {
  left: 'from-sky-400 to-blue-600',
  right: 'from-sky-400 to-blue-600',
  straight: 'from-sky-400 to-indigo-600',
  stop: 'from-rose-500 to-red-600',
  go: 'from-emerald-400 to-green-600',
  jump: 'from-amber-400 to-orange-600',
  slow: 'from-yellow-300 to-amber-500',
  fast: 'from-fuchsia-500 to-rose-500',
  honk: 'from-lime-400 to-emerald-600',
  lights: 'from-yellow-200 to-amber-400',
  fuel: 'from-orange-400 to-red-500',
  pickup: 'from-teal-400 to-cyan-600',
  turbo: 'from-cyan-300 via-fuchsia-500 to-orange-400',
}

/*
 * keys: the words that must be heard for the command to count (any one list).
 * Medium / Hard also need the whole phrase said well (score ≥ min, default 0.6).
 * scene / scenes: what the road shows for this line.
 */
export const LEVELS = [
  {
    id: 'easy',
    cefr: 'A1',
    title: 'Easy',
    uz: 'Bir-ikki so‘z',
    note: 'Bolalar va yangi boshlovchilar uchun',
    window: 5,
    speed: 13,
    theme: 'day',
    points: { good: 60, perfect: 80 },
    weights: { left: 3, right: 3, stop: 2, jump: 2, honk: 1.3, lights: 1, slow: 1, pickup: 0.6, turbo: 0.8 },
    afterStop: 'go',
    commands: [
      { action: 'left', text: 'Left', keys: [['left']] },
      { action: 'right', text: 'Right', keys: [['right']] },
      { action: 'stop', text: 'Stop', keys: [['stop']], scene: 'lights' },
      { action: 'go', text: 'Go', keys: [['go']] },
      { action: 'jump', text: 'Jump', keys: [['jump']] },
      { action: 'honk', text: 'Beep beep', keys: [['beep'], ['bip'], ['peep'], ['honk'], ['horn']], scenes: ['sheep', 'cows'] },
      { action: 'lights', text: 'Lights on', keys: [['lights'], ['light', 'on']], scene: 'tunnel' },
      { action: 'slow', text: 'Slow down', keys: [['slow']], scene: 'school' },
      { action: 'fuel', text: 'Fill it up', keys: [['fill', 'up'], ['fill', 'it']], scene: 'station' },
      { action: 'pickup', text: 'Stop here', keys: [['stop', 'here']], scene: 'pickup' },
      { action: 'turbo', text: 'Turbo', keys: [['turbo'], ['turbos'], ['turbot']], scene: 'turbo' },
    ],
  },
  {
    id: 'medium',
    cefr: 'A2',
    title: 'Medium',
    uz: 'Qisqa buyruqlar',
    note: 'Ikki-to‘rt so‘zli iboralar',
    window: 4.5,
    speed: 14.5,
    theme: 'sunset',
    points: { good: 80, perfect: 110 },
    weights: { left: 2, right: 2, straight: 1.2, stop: 1.4, slow: 1.2, fast: 1, honk: 1, lights: 1, pickup: 0.6, turbo: 0.8 },
    afterStop: 'straight',
    commands: [
      { action: 'left', text: 'Turn left', keys: [['turn', 'left']] },
      { action: 'right', text: 'Turn right', keys: [['turn', 'right']] },
      { action: 'straight', text: 'Go straight', keys: [['straight']], scene: 'junction' },
      { action: 'stop', text: 'Stop at the light', keys: [['stop', 'light'], ['stop', 'lights']], scene: 'lights' },
      { action: 'slow', text: 'Slow down', keys: [['slow', 'down']], scenes: ['school', 'bumps'] },
      { action: 'fast', text: 'Speed up', keys: [['speed', 'up']] },
      { action: 'honk', text: 'Honk the horn', keys: [['honk'], ['horn']], scenes: ['sheep', 'cows'] },
      { action: 'lights', text: 'Turn on the lights', keys: [['lights'], ['light']], scene: 'tunnel' },
      { action: 'fuel', text: 'Fill it up, please', keys: [['fill', 'up']], scene: 'station' },
      { action: 'pickup', text: 'Stop here, please', keys: [['stop', 'here']], scene: 'pickup' },
      { action: 'turbo', text: 'Turbo boost', keys: [['turbo']], scene: 'turbo', min: 0.5 },
    ],
  },
  {
    id: 'hard',
    cefr: 'B1',
    title: 'Hard',
    uz: 'To‘liq yo‘l-yo‘riq',
    note: 'Uzun gaplar: qayerda, nima uchun',
    window: 5.5,
    speed: 15.5,
    theme: 'night',
    points: { good: 100, perfect: 140 },
    weights: { left: 2.2, right: 2.2, straight: 1.1, stop: 1.3, jump: 0.9, slow: 1.1, fast: 0.9, honk: 0.9, lights: 0.8, pickup: 0.6, turbo: 0.7 },
    afterStop: null,
    commands: [
      { action: 'left', text: 'Take the next left', keys: [['next', 'left']], scene: 'side-left' },
      { action: 'right', text: 'Take the next right', keys: [['next', 'right']], scene: 'side-right' },
      { action: 'right', text: 'Turn right at the traffic lights', keys: [['right', 'lights'], ['right', 'light']], scene: 'green-lights' },
      { action: 'left', text: 'Turn left at the traffic lights', keys: [['left', 'lights'], ['left', 'light']], scene: 'green-lights' },
      { action: 'left', text: 'Turn left at the bank', keys: [['left', 'bank']], scene: 'bank' },
      { action: 'right', text: 'Turn right at the school', keys: [['right', 'school']], scene: 'school-corner' },
      { action: 'left', text: 'Turn left at the park', keys: [['left', 'park']], scene: 'park' },
      { action: 'straight', text: 'Go straight on at the roundabout', keys: [['straight', 'roundabout'], ['straight', 'round', 'about']], scene: 'roundabout' },
      { action: 'stop', text: 'Stop at the zebra crossing', keys: [['stop', 'zebra'], ['stop', 'crossing']], scene: 'zebra' },
      { action: 'jump', text: 'Jump over the barrier', keys: [['jump', 'barrier']] },
      { action: 'slow', text: 'Slow down for the speed bumps', keys: [['slow', 'bumps'], ['slow', 'bump']], scene: 'bumps' },
      { action: 'slow', text: 'Slow down near the school', keys: [['slow', 'school']], scene: 'school' },
      { action: 'fast', text: 'Speed up before the gate closes', keys: [['speed', 'gate'], ['speed', 'closes']] },
      { action: 'honk', text: 'Honk at the sheep', keys: [['honk', 'sheep'], ['horn', 'sheep'], ['beep', 'sheep']], scene: 'sheep' },
      { action: 'honk', text: 'Honk at the cows', keys: [['honk', 'cows'], ['honk', 'cow'], ['horn', 'cows'], ['horn', 'cow']], scene: 'cows' },
      { action: 'lights', text: 'Turn on the headlights', keys: [['headlights'], ['headlight'], ['head', 'lights'], ['head', 'light']], scene: 'tunnel' },
      { action: 'fuel', text: 'Fill up the tank, please', keys: [['fill', 'tank'], ['fill', 'up']], scene: 'station' },
      { action: 'pickup', text: 'Pull over here, please', keys: [['pull', 'over'], ['stop', 'here']], scene: 'pickup', min: 0.5 },
      { action: 'turbo', text: 'Turbo boost, now!', keys: [['turbo']], scene: 'turbo', min: 0.3 },
    ],
  },
].map(level => ({
  ...level,
  // every way of naming each action of the level, for "a different command was said"
  intents: [...new Set(level.commands.map(c => c.action))].flatMap(a => (INTENT[a] || []).map(k => ({ key: a, keywords: k }))),
}))

export const levelById = (id) => LEVELS.find(l => l.id === id) || LEVELS[0]

/* Every line the game speaks (the commands, in the coach's voice) — for preloading / pre-generating clips. */
export const VOICE = 'coach'
export function allVoiceLines() {
  return [...new Set(LEVELS.flatMap(l => l.commands.map(c => c.text)))].map(text => ({ text, voice: VOICE }))
}

/* Stars for a finished run, by score. */
export const STAR_AT = [800, 2500, 6000]
export const starsFor = (score) => STAR_AT.filter(s => score >= s).length

// "beep-beep", "turbo!" … — recognisers glue words with dashes
const cleanHeard = (a) => String(a || '').replace(/[-–—_/]+/g, ' ')
const intentsOf = (action) => (INTENT[action] || []).map(k => ({ key: action, keywords: k }))

/*
 * Judge what the recogniser heard against the command on the card.
 *   ok    → said (Easy: the keyword; Medium/Hard: keywords + phrase score ≥ 0.6)
 *   wrong → the best guess clearly names another command
 *   none  → nothing decisive yet, keep listening
 * Always returns `match` (bestMatch of the phrase) so the card can colour words.
 */
export function evaluate(level, cmd, alternatives) {
  const list = (alternatives && alternatives.length ? alternatives : ['']).map(cleanHeard)
  const own = cmd.keys.map(k => ({ key: 'own', keywords: k }))
  const said = list.some(a => matchCommand(a, own) === 'own')
  const match = bestMatch(cmd.text, list)
  if (said && (level.id === 'easy' || match.score >= (cmd.min ?? 0.6))) {
    return { status: 'ok', match, verdict: match.score >= 0.9 ? 'perfect' : 'good' }
  }
  if (!said && list[0].trim()) {
    const ownIntent = matchCommand(list[0], intentsOf(cmd.action))
    if (!ownIntent) {
      const other = matchCommand(list[0], rivalsOf(level, cmd))
      if (other) return { status: 'wrong', match, wrong: other }
    }
  }
  return { status: 'none', match }
}

/*
 * The other commands that count as "you said a different one". A keyword that is
 * part of this line itself is not enough: "Slow down for the speed bumps" contains
 * "speed", so a misheard "slow" must not turn the right answer into "Speed up".
 * For such a command the rival's opening words ("speed up") are needed instead.
 * The line's accepted answers count as its own words too: "Pull over here" also
 * takes "stop here", so the live partial "stop" must not end it as "Stop".
 */
const rivalCache = new WeakMap()
function rivalsOf(level, cmd) {
  let r = rivalCache.get(cmd)
  if (!r) {
    const own = new Set([...normalizeWords(cmd.text), ...cmd.keys.flat().flatMap(normalizeWords)])
    r = []
    const seen = new Set()
    const add = (key, keywords) => {
      const id = `${key}:${keywords.join(' ')}`
      if (!seen.has(id)) { seen.add(id); r.push({ key, keywords }) }
    }
    for (const i of level.intents) {
      if (i.key === cmd.action) continue
      if (!i.keywords.some(k => own.has(k))) { add(i.key, i.keywords); continue }
      for (const c of level.commands) {
        if (c.action !== i.key) continue
        const opening = normalizeWords(c.text).slice(0, 2)
        if (opening.some(w => !own.has(w))) add(i.key, opening)
      }
    }
    rivalCache.set(cmd, r)
  }
  return r
}

/* Which other command (if any) the heard text names — evaluate()'s "wrong" check on its own. */
export function rivalNamed(level, cmd, heard) {
  const text = cleanHeard(heard)
  return text.trim() ? matchCommand(text, rivalsOf(level, cmd)) : null
}

export const formatDistance = (m) => (m >= 1000 ? `${(m / 1000).toFixed(m >= 10000 ? 0 : 1)} km` : `${Math.floor(m)} m`)

/* ── missions: 3 per run, coins for each one done ─────────────────────── */

const SAY_WORD = { left: 'Left', right: 'Right', stop: 'Stop', honk: 'Beep / Honk', lights: 'Lights', slow: 'Slow down' }
const MISSION_TYPES = {
  say: { tiers: [3, 4, 5, 6], reward: 40 },
  coins: { tiers: [30, 50, 80, 120], reward: 40 },
  clean: { tiers: [300, 500, 1000, 1500], reward: 50 },
  dist: { tiers: [800, 1500, 2500, 4000], reward: 40 },
  combo: { tiers: [1.5, 2, 2.5, 3], reward: 50 },
  perfect: { tiers: [3, 5, 8, 12], reward: 50 },
  pickup: { tiers: [1, 1, 2, 3], reward: 40 },
  turbo: { tiers: [1, 2, 2, 3], reward: 40 },
}
const fmtMult = (m) => `x${Number.isInteger(m) ? m : m.toFixed(1)}`

/* Uzbek line for a mission card. */
export function missionText(m) {
  switch (m.type) {
    case 'say': return `“${SAY_WORD[m.action] || m.action}” buyrug‘ini ${m.n} marta bajaring`
    case 'coins': return `Bir o‘yinda ${m.n} ta tanga yig‘ing`
    case 'clean': return `${formatDistance(m.n)} xatosiz yuring`
    case 'dist': return `Bir o‘yinda ${formatDistance(m.n)} yuring`
    case 'combo': return `${fmtMult(m.n)} kombo qiling (ketma-ket to‘g‘ri)`
    case 'perfect': return `${m.n} ta a’lo javob bering`
    case 'pickup': return `${m.n} ta yo‘lovchi oling (“Stop here”)`
    case 'turbo': return `Turbo’ni ${m.n} marta yoqing`
    default: return ''
  }
}

/* A fresh mission; `tier` 0–3 grows as missions are done, `avoid` = types already on the board. */
export function newMission(tier = 0, avoid = [], rnd = Math.random) {
  const types = Object.keys(MISSION_TYPES).filter(t => !avoid.includes(t))
  const type = types[Math.floor(rnd() * types.length)] || 'coins'
  const def = MISSION_TYPES[type]
  const t = Math.max(0, Math.min(3, tier | 0))
  const m = { id: `${type}${Math.floor(rnd() * 1e6).toString(36)}`, type, n: def.tiers[t], reward: def.reward + t * 20 }
  if (type === 'say') {
    const acts = Object.keys(SAY_WORD)
    m.action = acts[Math.floor(rnd() * acts.length)]
  }
  return m
}

/* How far a mission got, from the run's numbers (engine missionStats()). */
export function missionValue(m, s) {
  switch (m.type) {
    case 'say': return s.actions?.[m.action] || 0
    case 'coins': return s.coins || 0
    case 'clean': return Math.floor(s.clean || 0)
    case 'dist': return Math.floor(s.meters || 0)
    case 'combo': return s.maxMult || 1
    case 'perfect': return s.perfect || 0
    case 'pickup': return s.pickups || 0
    case 'turbo': return s.turbos || 0
    default: return 0
  }
}

/* Is a saved mission well-formed? (server data may be old or edited) */
export function validMission(m) {
  return !!m && typeof m === 'object' && typeof m.id === 'string' && m.id.length < 40 && !!MISSION_TYPES[m.type]
    && Number.isFinite(m.n) && m.n > 0 && Number.isFinite(m.reward) && m.reward >= 0 && m.reward <= 500
    && (m.type !== 'say' || !!SAY_WORD[m.action])
}
