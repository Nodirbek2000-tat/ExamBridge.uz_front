/*
 * TOBY RUN — the run's queue of things to say (RUNNER_PLAN §B4).
 *
 *   const deck = new Deck(items, { level, seed, starter })
 *   deck.nextBalloon(now) → an item instance for a So'z shari (words, fill phrases)
 *   deck.nextBekat()      → [line, line] for a Bekat (echo / answer phrases, or a picture question)
 *   deck.result(inst, v, now)   in-run requeue: a passed `hear` comes back 60–90 s later as recall,
 *                               a miss / skip comes back once 40–80 s later
 *   deck.reviveItem(nth), deck.twister(), deck.peek(n)
 *
 * The server's prompt type (pt) is kept unless the item cannot show it (no picture → uz → hear).
 * When the server deck runs short, the bundled starter deck tops it up (k: 'local', never posted).
 */
import { seeded } from '../../../../games/three/random.js'
import { ITEM_NAMES } from '../../tobys-day/world-items.js'
import { wordCount } from './levels.js'

const PICTURES = new Set(ITEM_NAMES)
const MAX_SHOWN = 2

export const hasPicture = (item) => !!item.picture && PICTURES.has(item.picture)
export const itemKey = (item) => `${item.k}:${item.id}`

/* what the learner has to say, in words */
export function sayText(item) {
  if (item.kind === 'fill') return item.answer || item.text
  if (item.kind === 'answer') return item.text
  return item.text
}

export class Deck {
  constructor(items = [], { level = 'A1', seed = 1, starter = [] } = {}) {
    this.level = level
    // no server items at all: the run is offline and the starter deck scores
    this.offline = !items.some(it => it.k === 'w' || it.k === 'p')
    this.rng = seeded(seed ^ 0x5bd1e995)
    this.uid = 0
    const isBalloon = (it) => it.k === 'w' || it.k === 'local' ? it.kind === 'word' || it.kind === 'fill' : it.kind === 'fill'
    this.balloons = items.filter(isBalloon)
    this.bekat = items.filter(it => it.kind === 'echo' || it.kind === 'answer')
    this.twisters = items.filter(it => it.kind === 'twister')
    this.starter = starter.filter(isBalloon)
    this.starterBekat = starter.filter(it => it.kind === 'echo' || it.kind === 'answer')
    this.pool = items.filter(it => it.kind === 'word').concat(this.starter.filter(it => it.kind === 'word'))
    this.qi = 0
    this.si = 0
    this.bi = 0
    this.sbi = 0
    this.ti = 0
    this.later = []          // [{ inst, at }] requeued in this run
    this.shown = new Map()   // key → times shown
    this.seen = []           // instances shown (revive picks from these)
    this.missed = []
    this.requeued = new Set()
  }

  instance(item, pt) {
    const inst = { ...item, uid: ++this.uid, pt: pt || item.pt || (item.kind === 'word' ? 'hear' : item.kind) }
    this.fit(inst)
    inst.n = wordCount(sayText(inst))
    return inst
  }

  /* make sure the prompt can be shown with what the item has */
  fit(inst) {
    if (inst.kind === 'fill') {
      inst.pt = inst.prompt && inst.prompt.includes('___') ? 'fill' : 'hear'
      return inst
    }
    if (inst.kind !== 'word') return inst
    const pic = hasPicture(inst)
    if (!pic) inst.picture = ''
    const down = () => (inst.uz ? 'uz' : 'hear')
    if (inst.pt === 'picture' && !pic) inst.pt = down()
    if (inst.pt === 'uz' && !inst.uz) inst.pt = pic ? 'picture' : 'hear'
    if (['definition', 'opposite', 'synonym'].includes(inst.pt) && !inst.prompt) inst.pt = down()
    if (inst.pt === 'choice') {
      const ch = this.choicesFor(inst)
      if (ch) inst.choices = ch
      else inst.pt = 'hear'
    }
    return inst
  }

  /* the item's own choices, or the target + 2 other words of this deck */
  choicesFor(inst) {
    if (Array.isArray(inst.choices) && inst.choices.length >= 3 && inst.choices.includes(inst.text)) return inst.choices.slice(0, 3)
    const others = this.pool.filter(w => w.text && w.text.toLowerCase() !== inst.text.toLowerCase())
    const same = others.filter(w => w.picture && !!inst.picture)
    const src = same.length >= 2 ? same : others
    if (src.length < 2) return null
    const picked = []
    const used = new Set([inst.text.toLowerCase()])
    for (let k = 0; k < 20 && picked.length < 2; k++) {
      const w = src[Math.floor(this.rng() * src.length)]
      if (used.has(w.text.toLowerCase())) continue
      used.add(w.text.toLowerCase())
      picked.push(w.text)
    }
    if (picked.length < 2) return null
    const out = [inst.text, ...picked]
    for (let i = out.length - 1; i > 0; i--) {
      const j = Math.floor(this.rng() * (i + 1))
      ;[out[i], out[j]] = [out[j], out[i]]
    }
    return out
  }

  /* choices with their pictures, for Listen mode (balloons in 3 lanes) */
  optionsFor(inst) {
    const texts = this.choicesFor(inst) || [inst.text]
    return texts.map(t => {
      const w = t === inst.text ? inst : this.pool.find(p => p.text === t)
      return { text: t, picture: w && hasPicture(w) ? w.picture : '', uz: w?.uz || '' }
    })
  }

  count(item) { return this.shown.get(itemKey(item)) || 0 }

  mark(inst) {
    const key = itemKey(inst)
    this.shown.set(key, (this.shown.get(key) || 0) + 1)
    this.seen.push(inst)
    if (this.seen.length > 60) this.seen.shift()
    return inst
  }

  nextBalloon(now) {
    // 1) something requeued earlier in this run that is due now
    this.later.sort((a, b) => a.at - b.at)
    if (this.later.length && this.later[0].at <= now) return this.mark(this.later.shift().inst)
    // 2) the server deck in order
    while (this.qi < this.balloons.length) {
      const it = this.balloons[this.qi++]
      if (this.count(it) < MAX_SHOWN) return this.mark(this.instance(it))
    }
    // 3) the starter deck (small bank / offline)
    while (this.si < this.starter.length) {
      const it = this.starter[this.si++]
      if (this.count(it) < MAX_SHOWN) return this.mark(this.instance(it))
    }
    // 4) a requeued one early, then anything seen before, as recall
    if (this.later.length) return this.mark(this.later.shift().inst)
    const src = this.balloons.length ? this.balloons : this.starter
    if (!src.length) return null
    const it = src[Math.floor(this.rng() * src.length)]
    return this.mark(this.instance(it, it.kind === 'word' ? (hasPicture(it) ? 'picture' : it.uz ? 'uz' : 'hear') : undefined))
  }

  /* the next few items (voice clips are fetched ahead) */
  peek(n = 2) {
    const out = []
    for (const l of this.later) if (out.length < n) out.push(l.inst)
    for (let i = this.qi; i < this.balloons.length && out.length < n; i++) out.push(this.balloons[i])
    for (let i = this.si; i < this.starter.length && out.length < n; i++) out.push(this.starter[i])
    return out
  }

  requeue(inst, reason, now, [a, b]) {
    const key = `${itemKey(inst)}:${reason}`
    if (this.requeued.has(key)) return false
    this.requeued.add(key)
    const pt = reason === 'recall' ? (hasPicture(inst) ? 'picture' : inst.uz ? 'uz' : 'hear') : inst.pt
    const next = this.instance(inst, pt)
    next.again = reason
    this.later.push({ inst: next, at: now + a + this.rng() * (b - a) })
    return true
  }

  /* in-run spacing (§B4.2, §B3.3) */
  result(inst, v, now) {
    if ((v === 'ok' || v === 'close') && inst.pt === 'hear' && inst.kind === 'word') return this.requeue(inst, 'recall', now, [60, 90])
    if (v === 'miss') {
      if (!this.missed.some(m => itemKey(m) === itemKey(inst))) this.missed.push(inst)
      return this.requeue(inst, 'practise', now, [40, 80])
    }
    if (v === 'skip') return this.requeue(inst, 'skip', now, [40, 80])
    return false
  }

  /* the next unused phrase of these kinds: the server deck first, then the starter deck, then a repeat */
  nextPhrase(kinds, avoid = '') {
    const used = this.usedPhrases || (this.usedPhrases = new Set())
    for (const list of [this.bekat, this.starterBekat]) {
      const it = list.find(p => kinds.includes(p.kind) && !used.has(itemKey(p)))
      if (it) { used.add(itemKey(it)); return it }
    }
    const src = [...this.bekat, ...this.starterBekat].filter(p => kinds.includes(p.kind) && itemKey(p) !== avoid)
    return src.length ? src[Math.floor(this.rng() * src.length)] : null
  }

  /* a Bekat: an echo, then an answer question (or a second echo, or "What's this?" with a picture) */
  nextBekat() {
    const lines = []
    const first = this.nextPhrase(['echo'])
    if (first) lines.push(this.mark(this.instance(first, 'echo')))
    // the server's own phrases first (an answer, else a second echo); the starter deck only when it has none
    const avoid = first ? itemKey(first) : ''
    const fromServer = (kind) => {
      const used = this.usedPhrases || (this.usedPhrases = new Set())
      const it = this.bekat.find(p => p.kind === kind && !used.has(itemKey(p)) && itemKey(p) !== avoid)
      if (it) used.add(itemKey(it))
      return it || null
    }
    const second = fromServer('answer') || fromServer('echo') || this.nextPhrase(['answer'], avoid) || this.nextPhrase(['echo'], avoid)
    if (second && (!first || itemKey(second) !== itemKey(first))) lines.push(this.mark(this.instance(second, second.kind)))
    if (lines.length < 2) {
      const pics = this.pool.filter(w => hasPicture(w))
      if (pics.length) {
        const w = pics[Math.floor(this.rng() * pics.length)]
        lines.push(this.mark({ ...this.instance(w, 'picture'), as: 'picture' }))
      }
    }
    return lines
  }

  /* revive: a word missed in this run (or one seen), the second time a phrase */
  reviveItem(nth) {
    if (nth >= 1) {
      const p = this.nextPhrase(['echo'])
      if (p) return this.instance(p, 'echo')
    }
    const words = this.missed.length ? this.missed : this.seen.filter(s => s.kind === 'word')
    const src = words.length ? words : this.pool
    if (!src.length) return null
    const w = src[Math.floor(this.rng() * src.length)]
    return this.instance(w, 'hear')
  }

  twister() {
    if (this.ti >= this.twisters.length) return null
    return this.mark(this.instance(this.twisters[this.ti++], 'twister'))
  }
}
