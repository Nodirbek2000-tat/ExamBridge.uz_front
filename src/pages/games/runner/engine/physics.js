/*
 * TOBY RUN — Toby's body and the obstacles' shapes (RUNNER_PLAN §B2), shared by the engine,
 * the solver and the autopilot so all three agree to the centimetre. Pure JS, no allocation.
 *
 * Track coordinates: s = metres along the track (Toby is at s = dist), x = metres across
 * (lanes at −2.5 / 0 / +2.5), y = metres up. Toby's box: 0.7 × 1.0 × 0.6 (0.55 high while rolling).
 *
 * Obstacles: { type, lane, z, len, y0, top, ramp, vz }
 *   low   turnstile / bench / cart       — jump it (0.9 m)
 *   high  overhead "Diqqat!" sign        — roll under it (starts at 0.8 m)
 *   wall  crate stack / microvan         — change lane
 *   train standing carriage, 14 m        — change lane, or run up its front ramp onto the roof
 *   move  oncoming carriage (−6 m/s)     — change lane
 */

export const LANE_X = [-2.5, 0, 2.5]
export const LANE_HALF = 1.15                 // obstacle half width
export const SUPPORT_HALF = 1.2               // Toby stands on a surface when his centre is within this
export const BODY = { w: 0.7, h: 1.0, d: 0.6, rollH: 0.55 }
export const JUMP_T = 0.62
export const APEX = 1.35
export const G = (2 * APEX) / ((JUMP_T / 2) ** 2)      // ≈ 28.1 m/s²
export const JUMP_V = G * (JUMP_T / 2)                  // ≈ 8.71 m/s
export const LANE_T = 0.15
export const ROLL_T = 0.6
export const DROP_V = -16                     // a roll in the air drops Toby fast
export const COYOTE = 0.08
export const BUFFER = 0.15
export const STEP = 0.6                       // the highest step Toby walks up (ramps)
export const SUBSTEP = 1 / 60

export const SHAPES = {
  low: { len: 0.6, y0: 0, top: 0.9 },
  high: { len: 0.5, y0: 0.8, top: 3.0 },
  wall: { len: 1.6, y0: 0, top: 2.2 },
  train: { len: 14, y0: 0, top: 3.4 },
  move: { len: 14, y0: 0, top: 3.4 },
}
export const RAMP_LEN = 6
export const ONCOMING_V = 6
export const ONCOMING_ACT = 60                // an oncoming carriage starts rolling this far ahead of Toby

const easeOut = (t) => 1 - (1 - t) * (1 - t)

export function newPlayer(lane = 1) {
  return {
    lane, prevLane: lane, x: LANE_X[lane], fromX: LANE_X[lane], laneT: 1,
    y: 0, vy: 0, air: false, airT: 0, jumping: false, rollT: 0,
    buffered: '', bufT: 0, landed: 0, bumped: 0,
  }
}

export function copyPlayer(dst, p) {
  dst.lane = p.lane; dst.prevLane = p.prevLane; dst.x = p.x; dst.fromX = p.fromX; dst.laneT = p.laneT
  dst.y = p.y; dst.vy = p.vy; dst.air = p.air; dst.airT = p.airT; dst.jumping = p.jumping; dst.rollT = p.rollT
  dst.buffered = p.buffered; dst.bufT = p.bufT; dst.landed = p.landed; dst.bumped = p.bumped
  return dst
}

export const bodyH = (p) => (p.rollT > 0 ? BODY.rollH : BODY.h)

/* an action: 'left' | 'right' | 'jump' | 'roll' → true when it did something now */
export function act(p, a) {
  if (a === 'left' || a === 'right') {
    const to = Math.max(0, Math.min(2, p.lane + (a === 'left' ? -1 : 1)))
    if (to === p.lane) { p.bumped = 0.2; return false }
    p.prevLane = p.lane
    p.lane = to
    p.fromX = p.x
    p.laneT = 0
    return true
  }
  if (a === 'jump') {
    if (!p.air || (!p.jumping && p.airT < COYOTE)) {
      p.vy = JUMP_V
      p.air = true
      p.airT = 0
      p.jumping = true
      p.rollT = 0
      return true
    }
    p.buffered = 'jump'
    p.bufT = BUFFER
    return false
  }
  if (a === 'roll') {
    if (p.air) {
      p.vy = Math.min(p.vy, DROP_V)
      p.buffered = 'roll'
      p.bufT = 0.5
      return true
    }
    p.rollT = ROLL_T
    return true
  }
  return false
}

/* the walkable top of a carriage / its ramp at s, or −1 */
export function surfaceTop(o, s) {
  if (o.type !== 'train' && o.type !== 'move') return -1
  if (s >= o.z && s <= o.z + o.len) return o.top
  if (o.ramp && s >= o.z - o.ramp && s < o.z) return (o.top * (s - (o.z - o.ramp))) / o.ramp
  return -1
}

/* the ground under Toby's centre: 0, a roof or a ramp */
export function groundAt(obs, n, x, s) {
  let g = 0
  for (let i = 0; i < n; i++) {
    const o = obs[i]
    if ((o.type !== 'train' && o.type !== 'move') || Math.abs(x - LANE_X[o.lane]) > SUPPORT_HALF) continue
    const t = surfaceTop(o, s)
    if (t > g) g = t
  }
  return g
}

/* does Toby's box (centre x, feet y, height h, at s) touch the solid part of o? */
export function solidHit(o, x, y, h, s) {
  if (Math.abs(x - LANE_X[o.lane]) >= BODY.w / 2 + LANE_HALF) return false
  const s0 = s - BODY.d / 2
  const s1 = s + BODY.d / 2
  if (o.type === 'train' || o.type === 'move') {
    // a ramp leads onto the roof, so its top edge is a step, not a wall
    if (s1 > o.z && s0 < o.z + o.len && y < o.top - (o.ramp ? STEP : 0.08)) return true
    if (o.ramp && s1 > o.z - o.ramp && s0 < o.z) {
      const front = Math.min(s1, o.z)
      const top = (o.top * (front - (o.z - o.ramp))) / o.ramp
      return y < top - STEP
    }
    return false
  }
  if (s1 <= o.z || s0 >= o.z + o.len) return false
  return y < o.top && y + h > o.y0
}

/*
 * Advance Toby by dt (≤ SUBSTEP) while the world moves him from sPrev to s.
 * Returns 0 (fine), 1 (side hit: he bounces back to his lane) or 2 (front hit: crash).
 * obs[0..n) are the obstacles near Toby; `ghost` obstacles (passed through under a shield) are skipped.
 */
export function stepPlayer(p, dt, obs, n, sPrev, s, shielded = false) {
  const px = p.x
  const py = p.y
  // across
  if (p.laneT < 1) {
    p.laneT = Math.min(1, p.laneT + dt / LANE_T)
    p.x = p.fromX + (LANE_X[p.lane] - p.fromX) * easeOut(p.laneT)
  } else p.x = LANE_X[p.lane]
  // up and down
  const g = groundAt(obs, n, p.x, s)
  if (p.air) {
    p.vy -= G * dt
    p.y += p.vy * dt
    p.airT += dt
    if (p.vy <= 0 && p.y <= g && py >= g - STEP) {
      p.y = g
      p.vy = 0
      p.air = false
      p.jumping = false
      p.landed = 0.12
      if (p.bufT > 0 && p.buffered) {
        const b = p.buffered
        p.buffered = ''
        p.bufT = 0
        act(p, b)
      }
    }
  } else if (g < p.y - 0.02) {
    p.air = true                               // off the end of a roof
    p.jumping = false
    p.airT = 0
    p.vy = 0
  } else if (g - p.y <= STEP) p.y = g
  if (p.rollT > 0) p.rollT = Math.max(0, p.rollT - dt)
  if (p.bufT > 0) p.bufT = Math.max(0, p.bufT - dt)
  if (p.landed > 0) p.landed = Math.max(0, p.landed - dt)
  if (p.bumped > 0) p.bumped = Math.max(0, p.bumped - dt)
  if (shielded) return 0
  const h = bodyH(p)
  let hit = 0
  for (let i = 0; i < n; i++) {
    const o = obs[i]
    if (o.ghost || !solidHit(o, p.x, p.y, h, s)) continue
    // already touching it at the old s with the new x → he moved sideways into it
    const side = solidHit(o, p.x, p.y, h, sPrev) && !solidHit(o, px, py, h, sPrev)
    if (side) { if (!hit) hit = 1 } else return 2
  }
  if (hit === 1) {
    // bounce back into the lane he came from
    const back = p.prevLane
    p.prevLane = p.lane
    p.lane = back
    p.fromX = p.x
    p.laneT = 0
  }
  return hit
}

/* moving obstacles: oncoming carriages start rolling once Toby is ONCOMING_ACT m away */
export function moveObstacles(obs, n, dist, dtWorld) {
  for (let i = 0; i < n; i++) {
    const o = obs[i]
    if (!o.vz) continue
    if (!o.on) {
      if (o.z - dist <= ONCOMING_ACT) o.on = true
      else continue
    }
    o.z += o.vz * dtWorld
  }
}
