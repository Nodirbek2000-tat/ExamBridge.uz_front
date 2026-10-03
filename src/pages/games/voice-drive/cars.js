/*
 * VOICE DRIVE garage: the five cars, their perks, upgrade prices and the saved
 * garage (coin bank, owned cars, upgrades, missions). Pure data + functions.
 * The cars are generic look-alikes — no makes, models or logos.
 */
import { newMission, validMission } from './content'

export const CARS = [
  {
    id: 'klassik', name: 'Klassik', price: 0, color: '#b3122e',
    uz: '90-yillarning ixcham sedani',
    perk: null, perkUz: 'Halol klassika — hammasi o‘zingizga bog‘liq',
    stats: { speed: 2, power: 2, bonus: 1 },
  },
  {
    id: 'sedan', name: 'Sedan', price: 250, color: '#e8edf3',
    uz: 'Zamonaviy oilaviy sedan',
    perk: 'time', perkUz: 'Har bir buyruqqa +1,5 soniya vaqt',
    stats: { speed: 3, power: 2, bonus: 2 },
  },
  {
    id: 'van', name: 'Mini-van', price: 600, color: '#f4f6f8',
    uz: 'Kichkina, quti shaklidagi furgon',
    perk: 'magnet', perkUz: 'Tanga magniti — qo‘shni qatordagi tangalar ham sizniki',
    stats: { speed: 2, power: 3, bonus: 4 },
  },
  {
    id: 'jip', name: 'Jip', price: 1200, color: '#15171c',
    uz: 'Katta, kvadrat qora jip — eng kuchlisi',
    perk: 'shield', perkUz: 'Qalqon — har o‘yinda bitta xato bepul',
    stats: { speed: 3, power: 5, bonus: 3 },
  },
  {
    id: 'sport', name: 'Sport', price: 2000, color: '#facc15',
    uz: 'Past, sariq sport kupe',
    perk: 'score', perkUz: 'x1,5 ochko — lekin yo‘l tezroq',
    stats: { speed: 5, power: 3, bonus: 4 },
  },
]

export const carById = (id) => CARS.find(c => c.id === id) || CARS[0]

/* Upgrades go 1 → 3, one step at a time. */
export const UPGRADES = {
  engine: { uz: 'Dvigatel', note: ['Oddiy', '+10% ochko · xrom disklar', '+20% ochko · oltin disklar va neon'], base: [0, 150, 350] },
  turbo: { uz: 'Turbo', note: ['5 s turbo', '6,5 s turbo · ko‘k olov', '8 s turbo · katta olov'], base: [0, 200, 450] },
}
export const MAX_LEVEL = 3

/* Price of the next step (to level `to`, 2 or 3) — dearer cars cost a little more to tune. */
export function upgradePrice(carId, kind, to) {
  const i = Math.max(0, CARS.findIndex(c => c.id === carId))
  const base = UPGRADES[kind]?.base[to - 1] || 0
  return Math.round((base * (1 + i * 0.2)) / 10) * 10
}

/* What the selected car does in a run. */
export function carSetup(garage) {
  const g = garage || emptyGarage()
  const car = carById(g.car)
  const [engine, turbo] = g.up?.[car.id] || [1, 1]
  return {
    id: car.id,
    color: car.color,
    engine,
    turbo,
    speedMul: car.perk === 'score' ? 1.16 : 1,
    windowMul: car.perk === 'score' ? 0.94 : 1,
    windowAdd: car.perk === 'time' ? 1.5 : 0,
    scoreMul: (car.perk === 'score' ? 1.5 : 1) * (1 + (engine - 1) * 0.1),
    magnet: car.perk === 'magnet',
    shield: car.perk === 'shield' ? 1 : 0,
    turboDur: 5 + (turbo - 1) * 1.5,
  }
}

/* Stat bars 0–5 shown in the garage (upgrades add half a bar each step). */
export function carBars(carId, up) {
  const s = carById(carId).stats
  const [engine, turbo] = up || [1, 1]
  return {
    speed: Math.min(5, s.speed + (turbo - 1) * 0.5),
    power: Math.min(5, s.power + (engine - 1) * 0.5),
    bonus: Math.min(5, s.bonus + (engine - 1) * 0.25 + (turbo - 1) * 0.25),
  }
}

/* ── the saved garage ─────────────────────────────────────────────── */

export function emptyGarage() {
  return { ts: 0, bank: 0, car: 'klassik', owned: ['klassik'], up: {}, missions: [], mDone: 0, lastRun: '' }
}

const lvl = (v) => Math.max(1, Math.min(MAX_LEVEL, Math.round(Number(v) || 1)))

/* Anything (old saves, server data, junk) → a valid garage. */
export function normalizeGarage(raw) {
  const g = emptyGarage()
  if (!raw || typeof raw !== 'object') return g
  g.ts = Number.isFinite(raw.ts) ? raw.ts : 0
  g.bank = Math.max(0, Math.min(1e7, Math.floor(Number(raw.bank) || 0)))
  const known = new Set(CARS.map(c => c.id))
  g.owned = [...new Set(['klassik', ...(Array.isArray(raw.owned) ? raw.owned : []).filter(id => known.has(id))])]
  g.car = g.owned.includes(raw.car) ? raw.car : 'klassik'
  if (raw.up && typeof raw.up === 'object') {
    for (const id of g.owned) {
      const u = raw.up[id]
      if (Array.isArray(u)) g.up[id] = [lvl(u[0]), lvl(u[1])]
    }
  }
  g.missions = (Array.isArray(raw.missions) ? raw.missions : []).filter(validMission).slice(0, 3)
  g.mDone = Math.max(0, Math.floor(Number(raw.mDone) || 0))
  g.lastRun = typeof raw.lastRun === 'string' ? raw.lastRun.slice(0, 80) : ''
  return g
}

/* Two copies (this device / the server): the newer one wins, but a bought car or upgrade is never lost. */
export function mergeGarage(a, b) {
  const A = normalizeGarage(a)
  const B = normalizeGarage(b)
  const [newer, older] = A.ts >= B.ts ? [A, B] : [B, A]
  const out = { ...newer, owned: [...new Set([...newer.owned, ...older.owned])], up: { ...newer.up } }
  for (const [id, u] of Object.entries(older.up)) {
    const n = out.up[id] || [1, 1]
    out.up[id] = [Math.max(n[0], u[0]), Math.max(n[1], u[1])]
  }
  return out
}

/* Fill the mission board up to 3. */
export function withMissions(g) {
  if (g.missions.length >= 3) return g
  const missions = [...g.missions]
  const tier = Math.min(3, Math.floor(g.mDone / 3))
  while (missions.length < 3) missions.push(newMission(tier, missions.map(m => m.type)))
  return { ...g, missions }
}

/* Buy a car → new garage, or null if there are not enough coins. */
export function buyCar(g, carId) {
  const car = carById(carId)
  if (g.owned.includes(car.id) || g.bank < car.price) return null
  return { ...g, bank: g.bank - car.price, owned: [...g.owned, car.id], car: car.id, ts: Date.now() }
}

export function selectCar(g, carId) {
  if (!g.owned.includes(carId) || g.car === carId) return null
  return { ...g, car: carId, ts: Date.now() }
}

/* One upgrade step for an owned car → new garage, or null. */
export function upgradeCar(g, carId, kind) {
  if (!g.owned.includes(carId) || !UPGRADES[kind]) return null
  const cur = g.up[carId] || [1, 1]
  const i = kind === 'engine' ? 0 : 1
  if (cur[i] >= MAX_LEVEL) return null
  const price = upgradePrice(carId, kind, cur[i] + 1)
  if (g.bank < price) return null
  const next = [...cur]
  next[i] += 1
  return { ...g, bank: g.bank - price, up: { ...g.up, [carId]: next }, ts: Date.now() }
}

/* The cheapest car not owned yet (for "keyingi mashina" hints). */
export function nextCar(g) {
  return CARS.filter(c => !g.owned.includes(c.id)).sort((a, b) => a.price - b.price)[0] || null
}
