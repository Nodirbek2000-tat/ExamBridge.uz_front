/*
 * Building blocks for merged, vertex-coloured props (one draw call per model).
 *
 *   const m = new ModelBuilder()
 *   m.box(1, 2, 1, { at: [0, 1, 0], color: '#888' })
 *   m.cyl(0.1, 0.1, 3, { at: [0, 1.5, 0], color: '#555' })
 *   m.blob(1.2, { at: [0, 3, 0], color: '#3f8a4a', seed: 4 })     // a lumpy sphere (foliage, rocks)
 *   const geo = m.build({ crease: 35 })
 *
 * at / rot / scale like PartList.add; every helper returns the builder (chainable).
 */
import {
  BoxGeometry, ConeGeometry, CylinderGeometry, DodecahedronGeometry, IcosahedronGeometry, PlaneGeometry, SphereGeometry, TorusGeometry, Vector3,
} from 'three'
import { PartList } from './geometry'
import { hash } from './random'

const _v = new Vector3()

/* Push vertices in or out by a smooth pseudo-noise (same position → same offset, so no cracks). */
export function lumpy(g, amount = 0.15, seed = 1) {
  const p = g.attributes.position
  for (let i = 0; i < p.count; i++) {
    _v.fromBufferAttribute(p, i)
    const k = Math.round(_v.x * 97 + seed * 13) * 73856093 ^ Math.round(_v.y * 97) * 19349663 ^ Math.round(_v.z * 97) * 83492791
    const n = hash(k) * 2 - 1
    const len = _v.length() || 1
    _v.multiplyScalar(1 + (n * amount) / len)
    p.setXYZ(i, _v.x, _v.y, _v.z)
  }
  p.needsUpdate = true
  return g
}

export class ModelBuilder {
  constructor() { this.parts = new PartList() }

  add(g, { at, rot, scale, color } = {}) {
    this.parts.add(g, { at, rot, scale, color })
    return this
  }

  box(w, h, d, o = {}) { return this.add(new BoxGeometry(w, h, d), o) }

  cyl(rTop, rBot, h, o = {}) { return this.add(new CylinderGeometry(rTop, rBot, h, o.seg || 10, 1, !!o.open), o) }

  cone(r, h, o = {}) { return this.add(new ConeGeometry(r, h, o.seg || 10), o) }

  sphere(r, o = {}) { return this.add(new SphereGeometry(r, o.seg || 12, Math.max(4, Math.round((o.seg || 12) * 0.6))), o) }

  /* a lumpy low-poly ball */
  blob(r, o = {}) {
    const g = new IcosahedronGeometry(r, o.detail ?? 1)
    lumpy(g, o.lump ?? r * 0.18, o.seed ?? 1)
    return this.add(g, o)
  }

  rock(r, o = {}) {
    const g = new DodecahedronGeometry(r, o.detail ?? 0)
    lumpy(g, o.lump ?? r * 0.25, o.seed ?? 3)
    return this.add(g, o)
  }

  torus(r, tube, o = {}) { return this.add(new TorusGeometry(r, tube, o.radial || 6, o.tubular || 16, o.arc || Math.PI * 2), o) }

  /* a flat quad (both faces when twoSided) */
  quad(w, h, o = {}) {
    this.add(new PlaneGeometry(w, h), o)
    if (o.twoSided) this.add(new PlaneGeometry(w, h), { ...o, rot: [(o.rot?.[0] || 0), (o.rot?.[1] || 0) + Math.PI, (o.rot?.[2] || 0)] })
    return this
  }

  /* a beam between two points (posts, arms, branches) */
  beam(a, b, r, o = {}) {
    const dx = b[0] - a[0]
    const dy = b[1] - a[1]
    const dz = b[2] - a[2]
    const len = Math.hypot(dx, dy, dz) || 1e-3
    const g = new CylinderGeometry(o.r2 ?? r, r, len, o.seg || 6)
    // CylinderGeometry runs along +y: turn it onto the a→b direction
    const yaw = Math.atan2(dx, dz)
    const pitch = Math.acos(Math.max(-1, Math.min(1, dy / len)))
    g.rotateX(pitch)
    g.rotateY(yaw)
    g.translate((a[0] + b[0]) / 2, (a[1] + b[1]) / 2, (a[2] + b[2]) / 2)
    return this.add(g, { color: o.color })
  }

  /* raw triangles with one colour; twoSided adds the reversed copy */
  tris(P, { color, twoSided = false } = {}) {
    this.parts.addArrays(P, { color })
    if (twoSided) {
      const R = []
      for (let i = 0; i < P.length; i += 9) R.push(P[i], P[i + 1], P[i + 2], P[i + 6], P[i + 7], P[i + 8], P[i + 3], P[i + 4], P[i + 5])
      this.parts.addArrays(R, { color })
    }
    return this
  }

  get empty() { return this.parts.empty }

  build({ crease = 35 } = {}) { return this.parts.build({ crease }) }
}
