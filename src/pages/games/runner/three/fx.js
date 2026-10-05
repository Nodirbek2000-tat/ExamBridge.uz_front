/*
 * TOBY RUN — small effects (RUNNER_PLAN §B9.1 fx.js): confetti when a balloon pops, sparkles when coins
 * and power-ups are picked up, a glow ring where Toby lands, purple puffs when Shovqin is blown away,
 * and speed lines at top speed (off with reduced motion). 3 draw calls at most; nothing is created
 * while running — every particle's path is a function of its burst's start time and its index.
 *
 * The engine only stamps times (game.fx: popT, coinT, landT, powerT, puffT); this file turns a new stamp
 * into a burst.
 */
import { DoubleSide, MeshBasicMaterial, PlaneGeometry, RingGeometry } from 'three'
import { InstancedBatch } from '../../../../games/three/instancing'
import { glowMaterial } from '../../../../games/three/materials'
import { radialTexture } from '../../../../games/three/textures'
import { hash } from '../../../../games/three/random'


const PALETTE = ['#2E5AAC', '#2BB3C0', '#F5B14C', '#D94A5A', '#F6EBD9', '#A98BFF']
const MAX_BURSTS = 6
const CONFETTI = 26
const LINES = 22

export class Fx {
  constructor(stage, { reduced = false } = {}) {
    this.reduced = reduced
    const scene = stage.scene
    this.confetti = new InstancedBatch(new PlaneGeometry(0.13, 0.22), new MeshBasicMaterial({ color: '#ffffff', side: DoubleSide, toneMapped: false }), MAX_BURSTS * CONFETTI, { colors: true })
    const tex = radialTexture([[0, 'rgba(255,255,255,1)'], [0.3, 'rgba(255,255,255,0.45)'], [1, 'rgba(255,255,255,0)']], 64)
    stage.track(tex)
    this.glows = new InstancedBatch(new PlaneGeometry(1, 1), glowMaterial('#ffffff', tex, 0.9), 90, { colors: true })
    this.glows.renderOrder = 5
    const ring = new RingGeometry(0.6, 0.78, 32)
    ring.rotateX(-Math.PI / 2)
    this.rings = new InstancedBatch(ring, glowMaterial('#ffffff', null, 0.55), 4, { colors: true })
    this.rings.renderOrder = 5
    const line = new PlaneGeometry(0.035, 3.2)
    line.rotateX(-Math.PI / 2)
    this.lines = new InstancedBatch(line, glowMaterial('#ffffff', null, 0.22), LINES)
    for (const b of [this.confetti, this.glows, this.rings, this.lines]) scene.add(b)
    this.bursts = []                  // { kind, t0, x, y, z, seed }
    this.seen = { popT: -9, coinT: -9, landT: -9, powerT: -9, puffT: -9 }
    this.seq = 0
    this.lineK = 0
    this.lineScale = [1, 1, 1]
  }

  burst(kind, t0, x, y, z) {
    if (this.bursts.length >= MAX_BURSTS) this.bursts.shift()
    this.bursts.push({ kind, t0, x, y, z, seed: ++this.seq * 97 })
  }

  update(game, dt, balloonPos) {
    const t = game.clock
    const p = game.player
    const fx = game.fx
    const S = this.seen
    if (fx.popT !== S.popT) { S.popT = fx.popT; if (balloonPos) this.burst('pop', t, balloonPos.x, balloonPos.y, balloonPos.z) }
    if (fx.coinT !== S.coinT) { S.coinT = fx.coinT; this.burst('coin', t, p.x, p.y + 0.6, -0.2) }
    if (fx.landT !== S.landT) { S.landT = fx.landT; this.burst('land', t, p.x, p.y + 0.03, 0) }
    if (fx.powerT !== S.powerT) { S.powerT = fx.powerT; this.burst('power', t, p.x, p.y + 0.8, -0.3) }
    if (fx.puffT !== S.puffT) { S.puffT = fx.puffT; this.burst('puff', t, p.x * 0.85, 0.9, 2.4) }

    this.confetti.begin(); this.glows.begin(); this.rings.begin()
    let w = 0
    for (let i = 0; i < this.bursts.length; i++) {
      const b = this.bursts[i]
      const age = t - b.t0
      const life = b.kind === 'pop' ? 1.3 : b.kind === 'land' ? 0.55 : b.kind === 'puff' ? 0.8 : 0.5
      if (age < 0 || age > life) continue
      this.bursts[w++] = b
      const k = age / life
      if (b.kind === 'pop') {
        // a flash, then confetti in the palette falling with a flutter
        if (age < 0.18) this.glows.add(b.x, b.y, b.z + 0.3, 0, 2.6 * (1 - age / 0.18) + 0.6, '#fff4d6')
        if (this.reduced) continue
        for (let j = 0; j < CONFETTI; j++) {
          const h1 = hash(b.seed + j)
          const h2 = hash(b.seed + j * 7 + 3)
          const a = h1 * Math.PI * 2
          const v = 2.2 + h2 * 2.6
          const x = b.x + Math.cos(a) * v * age * 0.9
          const y = b.y + Math.sin(a) * v * age * 0.7 + 1.2 * age - 3.2 * age * age
          const z = b.z + (h2 - 0.5) * 2.4 * age
          this.confetti.addRot(x, y, z, age * (6 + h1 * 8), age * 5 + h2 * 3, 0, 1 - k * 0.4, PALETTE[j % PALETTE.length])
        }
      } else if (b.kind === 'coin') {
        for (let j = 0; j < 3; j++) {
          const a = (j / 3) * Math.PI * 2 + b.seed
          this.glows.add(b.x + Math.cos(a) * 0.35 * (1 + k), b.y + k * 0.7 + Math.sin(a) * 0.2, b.z, 0, 0.55 * (1 - k), '#ffd36b')
        }
      } else if (b.kind === 'power') {
        this.glows.add(b.x, b.y, b.z, 0, 1.2 + k * 2.4, '#9fe9ff')
        if (!this.reduced) {
          for (let j = 0; j < 8; j++) {
            const a = (j / 8) * Math.PI * 2
            this.glows.add(b.x + Math.cos(a) * k * 1.6, b.y + Math.sin(a) * k * 1.6, b.z, 0, 0.35 * (1 - k), '#ffffff')
          }
        }
      } else if (b.kind === 'land') {
        this.rings.add(b.x, b.y, b.z, 0, 0.7 + k * 1.6, '#9fe9ff')
      } else if (b.kind === 'puff') {
        for (let j = 0; j < 7; j++) {
          const a = (j / 7) * Math.PI * 2
          this.glows.add(b.x + Math.cos(a) * k * 2.2, b.y + Math.sin(a) * k * 1.4 + k, b.z + k * 1.5, 0, 0.9 * (1 - k) + 0.3, '#a78bfa')
        }
      }
    }
    this.bursts.length = w
    this.confetti.end(); this.glows.end(); this.rings.end()

    // speed lines: near the top speed, never with reduced motion, not during a ride or a stop
    const fast = !this.reduced && game.status === 'running' && game.phase === 'run' && game.speed > 13.5
    this.lineK += ((fast ? 1 : 0) - this.lineK) * Math.min(1, dt * 3)
    this.lines.begin()
    if (this.lineK > 0.05) {
      const span = 46
      const sc = this.lineScale
      sc[2] = 0.6 + this.lineK * 0.7
      for (let j = 0; j < LINES; j++) {
        const h1 = hash(j * 13 + 5)
        const h2 = hash(j * 29 + 11)
        const side = j % 2 ? 1 : -1
        const x = side * (2.2 + h1 * 4.5)
        const y = 0.4 + h2 * 4.2
        const z = -38 + ((game.dist * 1.6 + h1 * span) % span)
        this.lines.add(p.x * 0.5 + x, y, z, 0, sc)
      }
      this.lines.material.opacity = 0.2 * this.lineK
    }
    this.lines.end()
  }
}


