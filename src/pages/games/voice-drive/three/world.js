/*
 * How the engine's world maps into metres, and what each theme looks like in 3D.
 *
 * The engine measures across the road in lanes (LANE_X = −1, 0, 1) and along it
 * in its own units; the car always sits at the origin and the world streams past:
 *   x = lanes · LANE        z = −(pos − carPos) · ZS        carPos = dist + CAR_Z
 */
import { CAR_Z } from '../engine'

export const LANE = 3.0            // metres per lane
export const ZS = 2.0              // metres per engine unit along the road
export const HY = 1.6              // metres per engine unit of height (jumps, hops)
export const ROAD_HALF = 4.5       // kerb to kerb / 2
export const SLOT = 4.2            // roadside slot (engine units) = 8.4 m
export const FAR = 270             // metres of road drawn ahead

export const carPosOf = (game) => game.dist + CAR_Z
export const zOf = (pos, carPos) => -(pos - carPos) * ZS

/*
 * Roadside slots the engine keeps clear (junction mouths, crossings, tunnels…):
 * 0 = both sides blocked, −1 / 1 = that side, null = free. Same rules as the 2D road.
 */
export function blockedAt(decals, p, wide = 2.5) {
  let side = null
  for (const d of decals) {
    if (d.kind === 'tunnel') {
      if (p > d.pos - 4 && p < d.pos + d.len + 1) return 0
      continue
    }
    if (d.kind !== 'junction' && d.kind !== 'rail' && d.kind !== 'zebra' && d.kind !== 'clear') continue
    if (p > d.pos - wide && p < d.pos + (d.len || 0) + wide) {
      const s = d.side ?? 0
      if (s === 0) return 0
      side = side === null || side === s ? s : 0
    }
  }
  return side
}

/*
 * env      sky / light preset (games/three/environment)
 * ground   verge colour · walk = pavements and kerbs · verge = what lines the road otherwise
 * kerb     what stands on the pavement between the lamps · build = building rows
 * extras   loose items further out · far = backdrop shapes · lit = street lamps glow
 */
export const THEME3D = {
  day: {
    env: 'day', ground: '#6f9a52', road: '#ffffff', walk: true, kerb: 'tree', build: 'city', extras: ['bush', 'billboard'], far: 'tower',
    walls: ['#efe6d8', '#e4d3bd', '#d7dee6', '#f1e3c2', '#cfdfd4', '#e8cfc4'],
  },
  sunset: {
    env: 'sunset', ground: '#5a7748', road: '#f0e6ff', walk: true, kerb: 'palm', build: 'low', extras: ['billboard', 'bush'], far: 'tower',
    walls: ['#f2d4c2', '#e9c3b0', '#f5e0c8', '#dcc6d9'],
  },
  night: {
    env: 'night', ground: '#2b3b2e', road: '#ffffff', walk: true, kerb: 'tree', build: 'tall', extras: ['billboard'], far: 'tower', lit: true,
    walls: ['#c8cbd4', '#b9bfcc', '#d6d2c8', '#aeb6c4'],
  },
  desert: {
    env: 'desert', ground: '#d8b584', road: '#f3e6d6', walk: false, verge: 'sand', kerb: null, build: null, extras: ['cactus', 'rock', 'deadbush', 'cactus', 'billboard'], far: 'mesa', poles: true,
    walls: ['#e7c79a'],
  },
  snow: {
    env: 'snow', ground: '#eef3f8', road: '#e9edf2', walk: false, verge: 'snow', kerb: null, build: 'cabins', extras: ['snowpine', 'snowpine', 'snowman', 'rock'], far: 'peak', rail: true,
    walls: ['#8b5a3c'],
  },
  rain: {
    env: 'rain', ground: '#557a52', road: '#d9dde3', walk: true, kerb: 'tree', build: 'city', extras: ['bush', 'billboard'], far: 'tower', lit: true,
    walls: ['#d5d9de', '#c9ccd2', '#dcd3c6', '#c3ccd4'],
  },
}

export const themeOf = (name) => THEME3D[name] || THEME3D.day
