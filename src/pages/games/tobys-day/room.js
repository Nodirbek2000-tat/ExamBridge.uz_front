/*
 * TOBY'S PLAY ROOM — the "My Talking Tom" mode: the learner gives Toby
 * commands by voice ("Jump!", "Don't cry!") and he does them at once.
 *
 * Pure data + rules (no React): the command table, how heard text becomes a
 * command (negative commands beat positive ones: "don't jump" ≠ "jump"), the
 * mischief Toby gets up to when nobody talks to him, the wardrobe unlock rules
 * and the small saved state (data.room / data.wardrobe in the progress JSON).
 */
import { matchCommand, normalizeWords } from '../../../games/voice/speechMatch.js'

/* ── commands ──────────────────────────────────────────────────────────────
 * kw:    keyword sets for matchCommand — any set whose words are ALL heard counts
 *        (contractions are expanded: "don't jump" → do not jump, so negatives use 'not')
 * act:   what Toby does — mood / pose (Toby.jsx), item in his paw, a whole-body
 *        motion drawn by the room (hop, sway, run, turn, shake), an effect (fx),
 *        the stage lights, and the posture he stays in afterwards
 * reply: what Toby says back (model voice; the mic is off while he talks)
 */
export const GROUPS = [
  { key: 'move', title: 'Harakatlar' },
  { key: 'day', title: 'Kundalik ishlar' },
  { key: 'kind', title: 'Mehr' },
  { key: 'dont', title: 'Bunaqa qilma!' },
]

export const COMMANDS = [
  // ── move ──
  { key: 'stand', group: 'move', say: 'Stand up!', uz: 'O‘rningdan tur!', kw: [['stand', 'up'], ['stand'], ['get', 'up']],
    reply: "Okay! I'm up!", act: { mood: 'happy', pose: 'up', posture: 'stand' } },
  { key: 'sit', group: 'move', say: 'Sit down!', uz: 'O‘tir!', kw: [['sit', 'down'], ['sit']],
    reply: 'Okay! I sit down.', act: { mood: 'happy', pose: 'sit', posture: 'sit' } },
  { key: 'jump', group: 'move', say: 'Jump!', uz: 'Sakra!', kw: [['jump'], ['jumping']],
    reply: 'Wheee!', act: { mood: 'happy', pose: 'up', motion: 'hop', posture: 'stand', dur: 1900 } },
  { key: 'dance', group: 'move', say: 'Dance!', uz: 'Raqs tush!', kw: [['dance'], ['dancing']],
    reply: 'Look at me!', act: { mood: 'happy', pose: 'dance', motion: 'sway', stage: 'disco', fx: 'notes', posture: 'stand', dur: 3800 } },
  { key: 'turn', group: 'move', say: 'Turn around!', uz: 'Aylan!', kw: [['turn', 'around'], ['turn'], ['spin']],
    reply: 'Ta-da!', act: { mood: 'happy', pose: 'up', motion: 'turn', then: 'dizzy', posture: 'stand', dur: 2600 } },
  { key: 'run', group: 'move', say: 'Run!', uz: 'Yugur!', kw: [['run'], ['running']],
    reply: 'Zoom, zoom!', act: { mood: 'happy', pose: 'rest', motion: 'run', walking: true, fx: 'dust', posture: 'stand', dur: 2600 } },
  { key: 'lie', group: 'move', say: 'Lie down!', uz: 'Yotib ol!', kw: [['lie', 'down'], ['lay', 'down'], ['lie']],
    reply: 'Okay! I lie down.', act: { mood: 'relax', pose: 'lie', posture: 'lie' } },
  { key: 'raise', group: 'move', say: 'Raise your hand!', uz: 'Qo‘lingni ko‘tar!', kw: [['raise', 'hand'], ['raise'], ['hand', 'up'], ['hands', 'up']],
    reply: 'Me! Me! Me!', act: { mood: 'proud', pose: 'raise' } },
  { key: 'clap', group: 'move', say: 'Clap your hands!', uz: 'Qarsak chal!', kw: [['clap'], ['clapping']],
    reply: 'Clap, clap, clap!', act: { mood: 'happy', pose: 'clap', fx: 'clap' } },
  { key: 'five', group: 'move', say: 'Give me five!', uz: 'Besh qo‘y!', kw: [['give', 'five'], ['high', 'five'], ['five']],
    reply: 'Yeah! High five!', act: { mood: 'happy', pose: 'highfive', fx: 'five' } },
  { key: 'hello', group: 'move', say: 'Say hello!', uz: 'Salom de!', kw: [['say', 'hello'], ['hello'], ['hi'], ['wave']],
    reply: 'Hello! Hello!', act: { mood: 'happy', pose: 'wave' } },
  { key: 'nose', group: 'move', say: 'Touch your nose!', uz: 'Burningni ushla!', kw: [['touch', 'nose'], ['nose']],
    reply: 'Boop! My nose!', act: { mood: 'wink', pose: 'mouth', fx: 'boop' } },

  // ── daily life ──
  { key: 'eat', group: 'day', say: 'Eat an apple!', uz: 'Olma ye!', kw: [['eat', 'apple'], ['apple'], ['apples'], ['eat']],
    reply: 'Yummy! I love apples!', act: { mood: 'chew', pose: 'mouth', right: 'apple', fx: 'crumbs', dur: 3000 } },
  { key: 'drink', group: 'day', say: 'Drink some milk!', uz: 'Sut ich!', kw: [['drink', 'milk'], ['milk'], ['drink']],
    reply: 'Mmm, milk!', act: { mood: 'lick', pose: 'mouth', right: 'milk', dur: 3000 } },
  { key: 'sleep', group: 'day', say: 'Go to sleep!', uz: 'Uxla!', kw: [['go', 'sleep'], ['sleep'], ['bed'], ['goodnight']],
    reply: 'Good night!', act: { mood: 'yawn', pose: 'up', posture: 'sleep', dur: 1600 } },
  { key: 'wake', group: 'day', say: 'Wake up!', uz: 'Uyg‘on!', kw: [['wake', 'up'], ['wake'], ['good', 'morning'], ['goodmorning']],
    reply: 'Good morning!', act: { mood: 'yawn', pose: 'up', posture: 'stand', fx: 'puff' } },
  { key: 'hat_on', group: 'day', say: 'Put on your hat!', uz: 'Shapkangni kiy!', kw: [['put', 'hat'], ['hat', 'on'], ['wear', 'hat']],
    reply: 'I like my hat!', act: { mood: 'proud', pose: 'rest', fx: 'hatOn' } },
  { key: 'hat_off', group: 'day', say: 'Take off your hat!', uz: 'Shapkangni yech!', kw: [['take', 'off', 'hat'], ['hat', 'off'], ['take', 'hat']],
    reply: 'Bye-bye, hat!', act: { mood: 'happy', pose: 'wave', fx: 'hatOff' } },
  { key: 'sing', group: 'day', say: 'Sing a song!', uz: 'Qo‘shiq ayt!', kw: [['sing'], ['song'], ['singing']],
    reply: 'La la la! I love to sing!', act: { mood: 'sing', pose: 'raise', stage: 'spot', fx: 'notes', dur: 3800 } },
  { key: 'laugh', group: 'day', say: 'Laugh!', uz: 'Kul!', kw: [['laugh'], ['laughing']],
    reply: 'Ha ha ha!', act: { mood: 'laugh', pose: 'belly', motion: 'shake', dur: 2600 } },

  // ── kindness ──
  { key: 'good', group: 'kind', say: 'Good boy!', uz: 'Barakalla, yaxshi bola!', kw: [['good', 'boy'], ['good', 'job'], ['well', 'done'], ['good', 'toby']],
    reply: 'Thank you!', act: { mood: 'shy', pose: 'hug', fx: 'hearts' } },
  { key: 'love', group: 'kind', say: 'I love you!', uz: 'Seni yaxshi ko‘raman!', kw: [['love', 'you'], ['love']],
    reply: 'I love you too!', act: { mood: 'love', pose: 'hug', fx: 'hearts' } },
  { key: 'calm', group: 'kind', say: 'Calm down!', uz: 'Tinchlan!', kw: [['calm', 'down'], ['calm'], ['relax']],
    reply: "I'm calm now.", act: { mood: 'relax', pose: 'rest', fx: 'calm' } },

  // ── don't (negatives: these beat the positive ones) ──
  { key: 'stop', group: 'dont', neg: true, say: 'Stop!', uz: 'To‘xta!', kw: [['stop'], ['freeze']],
    reply: 'Okay, I stop!', act: { mood: 'surprised', pose: 'rest' } },
  { key: 'quiet', group: 'dont', neg: true, say: 'Be quiet!', uz: 'Jim bo‘l!', kw: [['be', 'quiet'], ['quiet'], ['be', 'quite'], ['shh'], ['shush'], ['silence']],
    reply: 'Shhh!', act: { mood: 'shy', pose: 'shh', fx: 'shh' } },
  { key: 'dont_cry', group: 'dont', neg: true, say: "Don't cry!", uz: 'Yig‘lama!', kw: [['not', 'cry'], ['not', 'crying'], ['stop', 'crying'], ['no', 'crying']],
    reply: "I'm not crying!", act: { mood: 'cool', pose: 'rest' } },
  { key: 'dont_jump', group: 'dont', neg: true, say: "Don't jump!", uz: 'Sakrama!', kw: [['not', 'jump'], ['not', 'jumping'], ['stop', 'jumping'], ['no', 'jumping']],
    reply: 'Okay, no jumping!', act: { mood: 'wink', pose: 'rest' } },
  { key: 'dont_eat', group: 'dont', neg: true, say: "Don't eat that!", uz: 'Buni yema!', kw: [['not', 'eat'], ['not', 'eating'], ['stop', 'eating'], ['not', 'cake'], ['no', 'cake']],
    reply: "Okay, I won't eat it!", act: { mood: 'surprised', pose: 'rest' } },
]

export const BY_KEY = Object.fromEntries(COMMANDS.map(c => [c.key, c]))
export const COMMAND_COUNT = COMMANDS.length

// negatives first: matchCommand keeps the first of equally specific matches, so
// "don't eat the apple" (not+eat = 2 words) beats "eat an apple" (eat+apple = 2 words)
const MATCHERS = [...COMMANDS.filter(c => c.neg), ...COMMANDS.filter(c => !c.neg)]
  .flatMap(c => c.kw.map(keywords => ({ key: c.key, keywords })))

/* recogniser spellings → the words our keywords use */
const PREP = [
  [/[’‘`]/g, "'"],
  [/[-_]/g, ' '],
  [/\bdont\b/g, "don't"],
  [/\b(hi|hai|hy)\s?five\b/g, 'high five'],
  [/\bhighfive\b/g, 'high five'],
  [/\bgimme\b/g, 'give me'],
  [/\bsh{2,}\b/g, 'shh'],
  [/\bshush+\b/g, 'shush'],
  [/\bwakeup\b/g, 'wake up'],
  [/\bstandup\b/g, 'stand up'],
  [/\bsitdown\b/g, 'sit down'],
  [/\b(lie|lay)down\b/g, '$1 down'],
  [/\bcalmdown\b/g, 'calm down'],
  [/\bturnaround\b/g, 'turn around'],
  [/\btoby's\b/g, 'toby'],
  [/\bluv\b/g, 'love'],
  [/\bi love u\b/g, 'i love you'],
]
export const prepHeard = (text) => PREP.reduce((t, [re, to]) => t.replace(re, to), String(text || '').toLowerCase()).trim()

// "don't dance", "do not sit down": a positive command said with "not" in front of it
function negatedBefore(words, key) {
  const cmd = BY_KEY[key]
  const kws = new Set(cmd.kw.flat().flatMap(normalizeWords))
  const at = words.findIndex(w => kws.has(w))
  if (at < 0) return false
  return words.slice(Math.max(0, at - 3), at).some(w => w === 'not' || w === 'never')
}

/*
 * One heard text → { key, neg } (a command; neg = it is a "don't" command),
 * { key: null, negOf } ("don't dance" — not one of the 28, Toby just won't),
 * or null (nothing known was said).
 */
export function resolveCommand(text) {
  const t = prepHeard(text)
  if (!t) return null
  const key = matchCommand(t, MATCHERS)
  if (!key) return null
  const cmd = BY_KEY[key]
  if (!cmd.neg && negatedBefore(normalizeWords(t), key)) return { key: null, negOf: key }
  return { key, neg: !!cmd.neg }
}

/* recogniser alternatives (best first) → the first one that is a command */
export function resolveAlternatives(alternatives) {
  for (const alt of alternatives || []) {
    const r = resolveCommand(alt)
    if (r) return { ...r, heard: String(alt || '').trim() }
  }
  return null
}

/* ── mischief: what Toby does on his own after 20–30 s without a command ── */
export const MISCHIEF_MIN_MS = 20000
export const MISCHIEF_MAX_MS = 30000
export const MISCHIEF_GIVE_UP_MS = 30000     // nobody said anything: he gets bored and stops by himself

export const MISCHIEFS = [
  { kind: 'cry', fix: 'dont_cry', fixes: ['dont_cry', 'stop', 'calm', 'love', 'good'], negOf: [],
    what: 'Toby yig‘layapti!', line: 'Boo hoo hoo!', spot: 'center', toby: { mood: 'cry', pose: 'face' } },
  { kind: 'sofa', fix: 'dont_jump', fixes: ['dont_jump', 'stop', 'calm', 'sit'], negOf: ['jump'],
    what: 'Toby divanda sakrayapti!', line: 'Wheee! Jump, jump, jump!', spot: 'sofa', toby: { mood: 'happy', pose: 'up' }, motion: 'bounce' },
  { kind: 'cake', fix: 'dont_eat', fixes: ['dont_eat', 'stop'], negOf: ['eat'],
    what: 'Toby tortni yemoqchi!', line: 'Mmm, cake! Yummy, yummy!', spot: 'cake', toby: { mood: 'lick', pose: 'give' } },
  { kind: 'drum', fix: 'quiet', fixes: ['quiet', 'stop', 'calm'], negOf: [],
    what: 'Toby barabanni juda qattiq chalyapti!', line: 'Boom! Boom! Boom!', spot: 'drum', toby: { mood: 'happy', pose: 'scrub' }, motion: 'drum' },
  { kind: 'zoom', fix: 'calm', fixes: ['calm', 'stop', 'sit'], negOf: ['run'],
    what: 'Toby xonada yugurib yuribdi!', line: 'Zoom, zoom! Catch me!', spot: 'center', toby: { mood: 'happy', pose: 'rest', walking: true }, motion: 'zoom' },
]
export const MISCHIEF_BY_KIND = Object.fromEntries(MISCHIEFS.map(m => [m.kind, m]))

/* does this heard command stop the mischief? */
export function fixesMischief(mischief, hit) {
  if (!mischief || !hit) return false
  const m = MISCHIEF_BY_KIND[mischief]
  if (!m) return false
  if (hit.key) return m.fixes.includes(hit.key)
  return !!hit.negOf && m.negOf.includes(hit.negOf)
}

export const SORRY = 'Okay, sorry!'
export const WONT = "Okay, I won't!"
export const REFUSE = 'No, no, no!'
export const SLEEPY = 'Zzz… five more minutes!'
export const HELLO = 'Hi! Tell me what to do!'
export const TICKLE = 'Hee hee! That tickles!'
export const NO_HAT = 'I have no hat!'
export const HAT_ALREADY = 'My hat is on!'

/* poking Toby (tap on him): a different reaction each time; many quick pokes make him dizzy */
export const POKES = [
  { mood: 'laugh', pose: 'belly', motion: 'shake', line: TICKLE },
  { mood: 'surprised', pose: 'up', line: 'Oh! Hello there!' },
  { mood: 'love', pose: 'hug', fx: 'hearts', line: 'I like you!' },
  { mood: 'wink', pose: 'point', line: 'Talk to me!' },
]
export const DIZZY = { mood: 'dizzy', pose: 'rest', motion: 'turn', line: 'Whoa! I am dizzy!' }
export const POKE_DIZZY_N = 5           // this many pokes …
export const POKE_DIZZY_MS = 2500       // … within this time

/* every line the model voice may say in the room (for preloading) */
export const ROOM_LINES = [
  HELLO,
  ...COMMANDS.map(c => c.reply),
  SORRY, WONT, REFUSE, SLEEPY, NO_HAT, HAT_ALREADY,
  ...POKES.map(p => p.line), DIZZY.line,
  ...MISCHIEFS.map(m => m.line),
  ...COMMANDS.map(c => c.say),
]

/* ── saved state ─────────────────────────────────────────────────────────
 * data.room     = { said: { [commandKey]: count }, best: most different commands in one day }
 * data.wardrobe = { owned: [acc…], worn: acc | null }
 * (logic.js cleanProgress / mergeProgress keep and validate both)
 */
export const roomSaid = (progress) => progress?.room?.said || {}

/* stars from the room: one per command ever said */
export function roomStars(progress) {
  const said = roomSaid(progress)
  return COMMANDS.reduce((n, c) => n + (said[c.key] > 0 ? 1 : 0), 0)
}

/* stars from the zones (same as logic.totalStars, without importing the zone list) */
export function zoneStars(progress) {
  return Object.values(progress?.zones || {}).reduce((n, z) => n + (Number(z?.stars) || 0), 0)
}

export const allStars = (progress) => zoneStars(progress) + roomStars(progress)

/* a command was said → the new data.room */
export function addSaid(room, key, todayCount = 0) {
  const said = { ...(room?.said || {}) }
  said[key] = Math.min(9999, (said[key] || 0) + 1)
  return { said, best: Math.max(Number(room?.best) || 0, todayCount) }
}

/* ── wardrobe: accessories unlock with total stars (zones + room) ───────── */
export const accUnlocks = [
  { acc: 'cap', need: 5, name: 'Kepka' },
  { acc: 'bow', need: 15, name: 'Bantik' },
  { acc: 'glasses', need: 30, name: 'Ko‘zoynak' },
  { acc: 'scarf', need: 50, name: 'Sharf' },
  { acc: 'headphones', need: 75, name: 'Quloqchin' },
  { acc: 'party', need: 105, name: 'Bayram shlyapasi' },
  { acc: 'crown', need: 150, name: 'Toj' },
]
export const ACC_KEYS = accUnlocks.map(a => a.acc)
export const accName = (acc) => accUnlocks.find(a => a.acc === acc)?.name || ''

export const unlockedByStars = (stars) => accUnlocks.filter(a => stars >= a.need).map(a => a.acc)
export const savedOwned = (progress) => (progress?.wardrobe?.owned || []).filter(a => ACC_KEYS.includes(a))

export function ownedAccs(progress) {
  const set = new Set([...savedOwned(progress), ...unlockedByStars(allStars(progress))])
  return ACC_KEYS.filter(a => set.has(a))
}

/* unlocked by stars but not seen in the wardrobe yet → the "new" dot */
export function newAccs(progress) {
  const seen = new Set(savedOwned(progress))
  return unlockedByStars(allStars(progress)).filter(a => !seen.has(a))
}

export function wornAcc(progress) {
  const w = progress?.wardrobe?.worn
  return ACC_KEYS.includes(w) && ownedAccs(progress).includes(w) ? w : null
}

export function nextUnlock(stars) {
  return accUnlocks.find(a => stars < a.need) || null
}

/* ── today's commands (this device only — a per-day counter, not progress) ── */
const TODAY_KEY = 'tobys-day-room-today'
export const dayStamp = (d = new Date()) => `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`

export function readToday() {
  try {
    const raw = JSON.parse(localStorage.getItem(TODAY_KEY) || 'null')
    if (raw && raw.d === dayStamp() && Array.isArray(raw.k)) return raw.k.filter(k => BY_KEY[k])
  } catch { /* private mode */ }
  return []
}

export function writeToday(keys) {
  try { localStorage.setItem(TODAY_KEY, JSON.stringify({ d: dayStamp(), k: keys })) } catch { /* private mode / full */ }
}

/* two lines to try after something unknown was heard */
export function suggestions({ mischief, asleep, said = {}, avoid } = {}) {
  if (mischief) return [MISCHIEF_BY_KIND[mischief]?.fix || 'stop', 'stop'].filter((k, i, a) => a.indexOf(k) === i).slice(0, 2)
  if (asleep) return ['wake', 'stand']
  const fresh = COMMANDS.filter(c => !said[c.key] && c.key !== avoid && !c.neg)
  const pool = fresh.length >= 2 ? fresh : COMMANDS.filter(c => c.key !== avoid && !c.neg)
  const a = pool[Math.floor(Math.random() * pool.length)]
  const rest = pool.filter(c => c.key !== a.key)
  const b = rest[Math.floor(Math.random() * rest.length)]
  return [a.key, b.key]
}
