/*
 * Geometry helpers for procedural models.
 *
 *   const parts = new PartList()
 *   parts.add(new BoxGeometry(1, 1, 1), { at: [0, 0.5, 0], color: '#888', uv: [0.5, 0.5] })
 *   const geo = parts.build({ crease: 35 })   // one non-indexed geometry, smooth normals within 35°
 *
 * Every part is baked to plain arrays (position, normal, uv, color) with its own
 * transform, a flat vertex colour and, optionally, one constant uv (a swatch in a
 * texture atlas). Merging many parts that share a material keeps draw calls low.
 */
import {
  BufferGeometry, Color, Euler, Float32BufferAttribute, LatheGeometry, Matrix3, Matrix4, Quaternion, Shape, Vector2, Vector3,
} from 'three'

const _v = new Vector3()
const _n = new Vector3()
const _m3 = new Matrix3()
const _q = new Quaternion()
const _e = new Euler()
const WHITE = new Color(1, 1, 1)

/* A transform matrix from position / rotation (radians, XYZ) / scale (number or [x, y, z]). */
export function trs(at = [0, 0, 0], rot = [0, 0, 0], scale = 1) {
  const s = Array.isArray(scale) ? scale : [scale, scale, scale]
  _e.set(rot[0] || 0, rot[1] || 0, rot[2] || 0)
  _q.setFromEuler(_e)
  return new Matrix4().compose(_v.set(at[0], at[1], at[2]).clone(), _q.clone(), new Vector3(s[0], s[1], s[2]))
}

const toColor = (c) => (c == null ? WHITE : c.isColor ? c : new Color(c))

/* Bake one geometry into arrays (non-indexed), transformed, with a flat colour and an optional constant uv. */
export function bake(geometry, { matrix = null, color = null, uv = null } = {}) {
  const g = geometry.index ? geometry.toNonIndexed() : geometry
  const pos = g.getAttribute('position')
  const nor = g.getAttribute('normal')
  const tex = g.getAttribute('uv')
  const n = pos.count
  const P = new Float32Array(n * 3)
  const N = new Float32Array(n * 3)
  const U = new Float32Array(n * 2)
  const C = new Float32Array(n * 3)
  const flip = matrix ? matrix.determinant() < 0 : false
  if (matrix) _m3.getNormalMatrix(matrix)
  const col = toColor(color)
  for (let i = 0; i < n; i++) {
    // a mirroring transform turns triangles inside out: swap the 2nd and 3rd vertex
    const k = flip ? (i % 3 === 1 ? i + 1 : i % 3 === 2 ? i - 1 : i) : i
    _v.fromBufferAttribute(pos, k)
    if (matrix) _v.applyMatrix4(matrix)
    P[i * 3] = _v.x; P[i * 3 + 1] = _v.y; P[i * 3 + 2] = _v.z
    if (nor) {
      _n.fromBufferAttribute(nor, k)
      if (matrix) _n.applyMatrix3(_m3).normalize()
      N[i * 3] = _n.x; N[i * 3 + 1] = _n.y; N[i * 3 + 2] = _n.z
    }
    if (uv) { U[i * 2] = uv[0]; U[i * 2 + 1] = uv[1] } else if (tex) { U[i * 2] = tex.getX(k); U[i * 2 + 1] = tex.getY(k) }
    C[i * 3] = col.r; C[i * 3 + 1] = col.g; C[i * 3 + 2] = col.b
  }
  if (g !== geometry) g.dispose()
  return { P, N, U, C, count: n, hasNormals: !!nor }
}

/* Concatenate baked parts into one BufferGeometry. */
export function mergeBaked(list) {
  let n = 0
  for (const b of list) n += b.count
  const P = new Float32Array(n * 3)
  const N = new Float32Array(n * 3)
  const U = new Float32Array(n * 2)
  const C = new Float32Array(n * 3)
  let o = 0
  for (const b of list) {
    P.set(b.P, o * 3); N.set(b.N, o * 3); U.set(b.U, o * 2); C.set(b.C, o * 3)
    o += b.count
  }
  const geo = new BufferGeometry()
  geo.setAttribute('position', new Float32BufferAttribute(P, 3))
  geo.setAttribute('normal', new Float32BufferAttribute(N, 3))
  geo.setAttribute('uv', new Float32BufferAttribute(U, 2))
  geo.setAttribute('color', new Float32BufferAttribute(C, 3))
  return geo
}

/*
 * Smooth normals for a non-indexed geometry: vertices at the same position share the
 * normals of the faces that meet there within `creaseDeg`; sharper edges stay crisp.
 */
export function creaseNormals(geo, creaseDeg = 40) {
  const P = geo.attributes.position.array
  const n = P.length / 3
  const F = new Float32Array(n)               // face normal per triangle (3 floats per triangle → stored per vertex slot)
  const a = new Vector3(); const b = new Vector3(); const c = new Vector3()
  for (let t = 0; t < n; t += 3) {
    a.fromArray(P, t * 3); b.fromArray(P, t * 3 + 3); c.fromArray(P, t * 3 + 6)
    b.sub(a); c.sub(a); b.cross(c)         // (b−a)×(c−a): the area-weighted normal of a, b, c
    F[t] = b.x; F[t + 1] = b.y; F[t + 2] = b.z
  }
  const unit = (t, out) => out.set(F[t], F[t + 1], F[t + 2]).normalize()
  const groups = new Map()
  for (let i = 0; i < n; i++) {
    const key = `${Math.round(P[i * 3] * 1e4)}|${Math.round(P[i * 3 + 1] * 1e4)}|${Math.round(P[i * 3 + 2] * 1e4)}`
    const g = groups.get(key)
    if (g) g.push(i); else groups.set(key, [i])
  }
  const cos = Math.cos((creaseDeg * Math.PI) / 180)
  const N = new Float32Array(n * 3)
  const fi = new Vector3(); const fj = new Vector3(); const acc = new Vector3()
  for (const g of groups.values()) {
    for (const i of g) {
      const ti = i - (i % 3)
      unit(ti, fi)
      acc.set(0, 0, 0)
      for (const j of g) {
        const tj = j - (j % 3)
        unit(tj, fj)
        if (fi.dot(fj) >= cos) { acc.x += F[tj]; acc.y += F[tj + 1]; acc.z += F[tj + 2] }
      }
      acc.normalize()
      N[i * 3] = acc.x; N[i * 3 + 1] = acc.y; N[i * 3 + 2] = acc.z
    }
  }
  geo.setAttribute('normal', new Float32BufferAttribute(N, 3))
  return geo
}

/* Collects parts and merges them into one geometry. */
export class PartList {
  constructor() { this.parts = [] }

  /* add(geometry, { at, rot, scale, matrix, color, uv, keep }) — the geometry is disposed unless keep */
  add(geometry, { at, rot, scale, matrix, color, uv, keep = false } = {}) {
    const m = matrix || (at || rot || scale ? trs(at, rot, scale ?? 1) : null)
    this.parts.push(bake(geometry, { matrix: m, color, uv }))
    if (!keep) geometry.dispose()
    return this
  }

  /* raw triangles: P (positions) and per-vertex colour / uv */
  addArrays(P, { color, uv, U } = {}) {
    const n = P.length / 3
    const col = toColor(color)
    const C = new Float32Array(n * 3)
    const UU = new Float32Array(n * 2)
    for (let i = 0; i < n; i++) {
      C[i * 3] = col.r; C[i * 3 + 1] = col.g; C[i * 3 + 2] = col.b
      if (U) { UU[i * 2] = U[i * 2]; UU[i * 2 + 1] = U[i * 2 + 1] } else if (uv) { UU[i * 2] = uv[0]; UU[i * 2 + 1] = uv[1] }
    }
    this.parts.push({ P: Float32Array.from(P), N: new Float32Array(n * 3), U: UU, C, count: n, hasNormals: false })
    return this
  }

  get empty() { return this.parts.length === 0 }

  /* crease: smooth the normals of the whole thing (needed when raw triangles were added) */
  build({ crease = null } = {}) {
    const geo = mergeBaked(this.parts)
    if (crease != null) creaseNormals(geo, crease)
    geo.computeBoundingSphere()
    geo.computeBoundingBox()
    this.parts = []
    return geo
  }
}

/* A rounded rectangle centred on (0, 0). */
export function roundedRect(w, h, r) {
  r = Math.min(r, w / 2, h / 2)
  const s = new Shape()
  const x = -w / 2
  const y = -h / 2
  s.moveTo(x + r, y)
  s.lineTo(x + w - r, y)
  s.quadraticCurveTo(x + w, y, x + w, y + r)
  s.lineTo(x + w, y + h - r)
  s.quadraticCurveTo(x + w, y + h, x + w - r, y + h)
  s.lineTo(x + r, y + h)
  s.quadraticCurveTo(x, y + h, x, y + h - r)
  s.lineTo(x, y + r)
  s.quadraticCurveTo(x, y, x + r, y)
  return s
}

/* A tyre: lathe of a rounded profile, axis along X. */
export function tyreGeometry(R, rimR, width, segments = 28) {
  const w = width / 2
  const k = Math.min(0.045, (R - rimR) * 0.45)
  const pts = [
    [rimR, -w * 0.92], [R - k, -w], [R - k * 0.3, -w + k * 0.35], [R, -w + k], [R, w - k],
    [R - k * 0.3, w - k * 0.35], [R - k, w], [rimR, w * 0.92],
  ].map(([r, y]) => new Vector2(r, y))
  const g = new LatheGeometry(pts, segments)
  g.rotateZ(Math.PI / 2)
  return g
}

/* Monotone cubic interpolation through [x, y] points (no overshoot) → f(x). */
export function smoothCurve(points) {
  const xs = points.map(p => p[0])
  const ys = points.map(p => p[1])
  const n = xs.length
  if (n === 1) return () => ys[0]
  const d = []
  for (let i = 0; i < n - 1; i++) d[i] = (ys[i + 1] - ys[i]) / Math.max(1e-6, xs[i + 1] - xs[i])
  const m = new Array(n)
  m[0] = d[0]
  m[n - 1] = d[n - 2]
  for (let i = 1; i < n - 1; i++) m[i] = d[i - 1] * d[i] <= 0 ? 0 : (d[i - 1] + d[i]) / 2
  for (let i = 0; i < n - 1; i++) {
    if (d[i] === 0) { m[i] = 0; m[i + 1] = 0; continue }
    const a = m[i] / d[i]
    const b = m[i + 1] / d[i]
    const s = a * a + b * b
    if (s > 9) { const t = 3 / Math.sqrt(s); m[i] = t * a * d[i]; m[i + 1] = t * b * d[i] }
  }
  return (x) => {
    if (x <= xs[0]) return ys[0]
    if (x >= xs[n - 1]) return ys[n - 1]
    let i = 0
    while (i < n - 2 && x > xs[i + 1]) i++
    const h = xs[i + 1] - xs[i]
    const t = (x - xs[i]) / h
    const t2 = t * t
    const t3 = t2 * t
    return (2 * t3 - 3 * t2 + 1) * ys[i] + (t3 - 2 * t2 + t) * h * m[i] + (-2 * t3 + 3 * t2) * ys[i + 1] + (t3 - t2) * h * m[i + 1]
  }
}

export const lerp = (a, b, t) => a + (b - a) * t
export const clamp01 = (v) => (v < 0 ? 0 : v > 1 ? 1 : v)
export const smoothstep = (a, b, x) => { const t = clamp01((x - a) / (b - a)); return t * t * (3 - 2 * t) }
