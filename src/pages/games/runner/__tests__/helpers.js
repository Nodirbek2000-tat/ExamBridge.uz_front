/* Shared bits for the runner's node tests: a deck from the sample bank and a whole simulated run. */
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { RunnerEngine } from '../engine/engine.js'
import { Deck } from '../engine/deck.js'
import { Autopilot, simHooks } from '../engine/autopilot.js'

const BANK = fileURLToPath(new URL('../../../../../../games_import_samples/runner_bank_a1a2.json', import.meta.url))

export function bankItems() {
  const bank = JSON.parse(readFileSync(BANK, 'utf8'))
  const items = []
  bank.words.forEach((w, i) => {
    const pt = ['hear', 'choice', 'picture', 'uz'][i % 4]
    items.push({ k: 'w', id: i + 1, kind: 'word', pt, text: w.word, uz: w.uz || '', picture: w.picture || '', say_also: w.say_also || [], voice: 'teacher', box: null })
  })
  bank.phrases.forEach((p, i) => {
    const it = { k: 'p', id: 1000 + i, kind: p.kind, text: p.text || '', uz: p.uz || '', voice: p.voice || 'narrator', box: null }
    if (p.kind === 'answer') Object.assign(it, { prompt: p.prompt, accept: p.accept, min_words: p.min_words || 0 })
    items.push(it)
  })
  return items
}

let cached = null
export const ITEMS = () => (cached || (cached = bankItems()))

/* a deck like the server's: 28 words + 10 phrases */
export function deckItems(offset = 0) {
  const all = ITEMS()
  const words = all.filter(i => i.kind === 'word')
  const phrases = all.filter(i => i.kind !== 'word')
  const w = []
  for (let i = 0; i < 28; i++) w.push(words[(offset + i * 5) % words.length])
  const p = []
  for (let i = 0; i < 10; i++) p.push(phrases[(offset + i * 3) % phrases.length])
  return [...w, ...p]
}

/*
 * Run a whole game for `seconds` of game time with the autopilot and a fake recogniser.
 * → { game, hooks, events }  events: gates passed (t), stations (dist), crashes, listens
 */
export async function simulate({ level = 'A1', seconds = 180, seed = 1, profile = {}, config = {}, listenMode = false, answer = false, dt = 1 / 60, onFrame, hooks: extra = {} } = {}) {
  const ref = { current: null }
  const hooks = simHooks(ref, { seed, ...profile }, extra)
  const deck = new Deck(deckItems(seed), { level, seed, starter: ITEMS().slice(0, 60) })
  const game = new RunnerEngine({ level, deck, config, hooks, seed, sttMode: profile.server ? 'server' : 'browser', listenMode })
  ref.current = game
  game.auto = new Autopilot({ answer })
  const events = { gates: [], stations: [], crashes: 0, rides: [], landings: [] }
  const origGate = game.director.onGate.bind(game.director)
  game.director.onGate = (g) => { events.gates.push({ t: game.clock, run: game.runT, s: g.s }); return origGate(g) }
  const origStation = game.director.onStation.bind(game.director)
  game.director.onStation = (st) => { events.stations.push({ t: game.clock, dist: game.dist, stop: st.stop }); return origStation(st) }
  const origCrash = game.director.onCrash.bind(game.director)
  game.director.onCrash = () => { events.crashes++; return origCrash() }
  const origLand = game.land.bind(game)
  game.land = () => { events.landings.push({ t: game.clock, dist: game.dist, shield: true }); return origLand() }
  game.start()
  const frames = Math.round(seconds / dt)
  for (let i = 0; i < frames && game.status !== 'over'; i++) {
    game.step(dt)
    if (onFrame) onFrame(game, i)
    // let promise continuations (say → open the mic) run between frames
    await null
    await null
    await null
  }
  return { game, hooks, events }
}
