/*
 * Low-level shape tools for procedural car bodies (pure geometry, no materials).
 *
 * Coordinates while modelling: s = metres from the front bumper (0) to the rear (L),
 * h = height above the ground, x = across (left −, right +). Models face −Z:
 * world z = s − L/2.
 */
import {
  BufferGeometry, CylinderGeometry, ExtrudeGeometry, Float32BufferAttribute, Matrix4, Path, PlaneGeometry, Shape, Vector2, Vector3,
} from 'three'

const _v = new Vector3()

/* Polyline through [x, y, r?] points; r rounds that corner (quadratic, `seg` steps). */
export function roundPoly(pts, { closed = true, seg = 5 } = {}) {
  const out = []
  const n = pts.length
  for (let i = 0; i < n; i++) {
    const [x, y, r = 0] = pts[i]
    const edge = !closed && (i === 0 || i === n - 1)
    if (!r || edge) { out.push(new Vector2(x, y)); continue }
    const [px, py] = pts[(i - 1 + n) % n]
    const [nx, ny] = pts[(i + 1) % n]
    const d1 = Math.hypot(px - x, py - y) || 1
    const d2 = Math.hypot(nx - x, ny - y) || 1
    const r1 = Math.min(r, d1 * 0.48)
    const r2 = Math.min(r, d2 * 0.48)
    const ax = x + ((px - x) / d1) * r1
    const ay = y + ((py - y) / d1) * r1
    const bx = x + ((nx - x) / d2) * r2
    const by = y + ((ny - y) / d2) * r2
    for (let k = 0; k <= seg; k++) {
      const t = k / seg
      const u = 1 - t
      out.push(new Vector2(u * u * ax + 2 * u * t * x + t * t * bx, u * u * ay + 2 * u * t * y + t * t * by))
    }
  }
  return out
}

/*
 * A body side outline: the top contour (front-bottom → over the car → rear-bottom,
 * as [s, h, r]) closed along the sill at `bottom`, with wheel arches cut at `axles`.
 * Returned in shape coordinates (x = s − L/2, y = h).
 */
export function bodyOutline(top, { L, bottom, axles = [], archR = 0.36, archY = 0.3, archSeg = 16 }) {
  const pts = roundPoly(top, { closed: false })
  const last = pts[pts.length - 1]
  const first = pts[0]
  const sill = []
  // rear → front along the sill, arches bulging up
  const sorted = [...axles].sort((a, b) => b - a)
  for (const ax of sorted) {
    const sinA = Math.max(-1, Math.min(1, (bottom - archY) / archR))
    const a0 = Math.asin(sinA)
    for (let k = 0; k <= archSeg; k++) {
      const a = a0 + ((Math.PI - 2 * a0) * k) / archSeg
      sill.push(new Vector2(ax + Math.cos(a) * archR, archY + Math.sin(a) * archR))
    }
  }
  const out = [...pts]
  if (Math.abs(last.y - bottom) > 1e-4) out.push(new Vector2(last.x, bottom))
  out.push(...sill)
  if (Math.abs(first.y - bottom) > 1e-4) out.push(new Vector2(first.x, bottom))
  return out.map(p => new Vector2(p.x - L / 2, p.y))
}

/* Shape-coordinate helper for plain polygons given in s / h. */
export const toShapePts = (pts, L) => pts.map(p => new Vector2(p.x - L / 2, p.y))

/*
 * Extrude a side outline across the car: total width `width`, rounded edges
 * (bevel t = across, s = in the outline plane). The silhouette stays exactly the
 * outline. Result spans x ∈ ±width/2, z = s − L/2 (outline already shifted).
 */
export function extrudeAcross(outline, width, { t = 0.05, s = 0.04, seg = 3, holes = [] } = {}) {
  const shape = new Shape(outline)
  for (const h of holes) shape.holes.push(new Path(h))
  const depth = Math.max(0.001, width - 2 * t)
  const g = new ExtrudeGeometry(shape, {
    depth, steps: 1, curveSegments: 4,
    bevelEnabled: t > 0, bevelThickness: t, bevelSize: s, bevelOffset: -s, bevelSegments: seg,
  })
  g.rotateY(-Math.PI / 2)
  g.translate(depth / 2, 0, 0)
  return g
}

/* A rounded-rectangle profile (in s/h) extruded across: bumpers, sills, bars. */
export function barAcross(s0, s1, h0, h1, width, { r = 0.03, L, t = 0.03, bs = 0.025, seg = 3, x = 0 } = {}) {
  const pts = [[s0, h0, r], [s1, h0, r], [s1, h1, r], [s0, h1, r]]
  const g = extrudeAcross(toShapePts(roundPoly(pts), L), width, { t, s: bs, seg })
  if (x) g.translate(x, 0, 0)
  return g
}

/* A flat panel lying on the plane x = c (facing −x for c < 0, +x for c > 0), outline in s/h. */
export function capPanel(pts, c, L, depth = 0.004) {
  const shape = new Shape(toShapePts(pts, L))
  const g = new ExtrudeGeometry(shape, { depth, bevelEnabled: false, curveSegments: 4 })
  g.rotateY(-Math.PI / 2)                    // shape x → z, extrusion → −x
  if (c >= 0) { mirrorX(g); g.translate(c - depth, 0, 0) } else g.translate(c + depth, 0, 0)
  return g
}

/* Mirror across x = 0 in place, keeping triangles front-facing. */
export function mirrorX(g) {
  g.scale(-1, 1, 1)
  return flipWinding(g)
}

export function flipWinding(g) {
  if (g.index) {
    const a = g.index.array
    for (let i = 0; i < a.length; i += 3) { const t = a[i + 1]; a[i + 1] = a[i + 2]; a[i + 2] = t }
    g.index.needsUpdate = true
    return g
  }
  for (const name of Object.keys(g.attributes)) {
    const at = g.attributes[name]
    const n = at.itemSize
    const arr = at.array
    for (let i = 0; i < at.count; i += 3) {
      for (let k = 0; k < n; k++) {
        const a = (i + 1) * n + k
        const b = (i + 2) * n + k
        const t = arr[a]; arr[a] = arr[b]; arr[b] = t
      }
    }
    at.needsUpdate = true
  }
  return g
}

/* Both sides: the geometry and its mirror image. */
export function bothSides(g) {
  return [g, mirrorX(g.clone())]
}

/* Bend every vertex through fn(v: Vector3) (normals are rebuilt later by creaseNormals). */
export function warp(g, fn) {
  const p = g.attributes.position
  for (let i = 0; i < p.count; i++) {
    _v.fromBufferAttribute(p, i)
    fn(_v)
    p.setXYZ(i, _v.x, _v.y, _v.z)
  }
  p.needsUpdate = true
  return g
}

/* Signed area (shoelace) of [x, y] points. */
const area = (P) => {
  let a = 0
  for (let i = 0; i < P.length; i++) { const [x1, y1] = P[i]; const [x2, y2] = P[(i + 1) % P.length]; a += x1 * y2 - x2 * y1 }
  return a / 2
}

/* Shrink a convex polygon ([x, y, r] points) by d; r is kept per vertex. */
export function insetConvex(P, d) {
  const n = P.length
  const sgn = area(P) > 0 ? 1 : -1
  const lines = P.map((p, i) => {
    const q = P[(i + 1) % n]
    const ex = q[0] - p[0]
    const ey = q[1] - p[1]
    const l = Math.hypot(ex, ey) || 1
    const nx = (-ey / l) * sgn
    const ny = (ex / l) * sgn
    return { px: p[0] + nx * d, py: p[1] + ny * d, ex, ey }
  })
  return P.map((p, i) => {
    const a = lines[(i - 1 + n) % n]
    const b = lines[i]
    const den = a.ex * b.ey - a.ey * b.ex
    if (Math.abs(den) < 1e-9) return [b.px, b.py, p[2] || 0]
    const t = ((b.px - a.px) * b.ey - (b.py - a.py) * b.ex) / den
    return [a.px + a.ex * t, a.py + a.ey * t, p[2] || 0]
  })
}

/* Keep the part of a polygon where (x, y) · (nx, ny) ≥ c (Sutherland–Hodgman); new corners get radius r. */
export function clipPoly(P, nx, ny, c, r = 0.02) {
  const out = []
  const inside = (p) => p[0] * nx + p[1] * ny >= c
  for (let i = 0; i < P.length; i++) {
    const a = P[i]
    const b = P[(i + 1) % P.length]
    const ia = inside(a)
    const ib = inside(b)
    if (ia) out.push(a)
    if (ia !== ib) {
      const da = a[0] * nx + a[1] * ny - c
      const db = b[0] * nx + b[1] * ny - c
      const t = da / (da - db)
      out.push([a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, r])
    }
  }
  return out
}

/*
 * A quad patch spanning p0 → p1 (along) and ±halfW (across x), lifted by `off`
 * along its normal: windscreens and rear windows on a slanted face (s/h points).
 */
export function facePatch(p0, p1, halfW, L, { off = 0.004, segX = 8, segY = 4, normalSign = 1 } = {}) {
  const [s0, h0] = p0
  const [s1, h1] = p1
  const ds = s1 - s0
  const dh = h1 - h0
  const len = Math.hypot(ds, dh) || 1
  // outward normal in the s/h plane (front face: points forward = −s and up)
  const ns = (-dh / len) * normalSign
  const nh = (ds / len) * normalSign
  const g = new PlaneGeometry(halfW * 2, len, segX, segY)
  const P = g.attributes.position
  for (let i = 0; i < P.count; i++) {
    const x = P.getX(i)
    const t = P.getY(i) / len + 0.5
    const s = s0 + ds * t + ns * off
    const h = h0 + dh * t + nh * off
    P.setXYZ(i, x, h, s - L / 2)
  }
  g.computeVertexNormals()
  // make sure it faces outward
  const n = new Vector3().fromBufferAttribute(g.attributes.normal, 0)
  if (n.z * ns + n.y * nh < 0) flipWinding(g)
  return g
}

/* A cylinder whose axis runs along x (wheels, pipes across), centred at (x, h, s). */
export function cylinderX(r, len, x, h, s, L, seg = 20, open = false) {
  const g = new CylinderGeometry(r, r, len, seg, 1, open)
  g.rotateZ(Math.PI / 2)
  g.translate(x, h, s - L / 2)
  return g
}

/* A cylinder along z (exhaust tips, round lamps facing front / rear). */
export function cylinderZ(r, len, x, h, s, L, seg = 20, r2 = r) {
  const g = new CylinderGeometry(r2, r, len, seg)
  g.rotateX(Math.PI / 2)
  g.translate(x, h, s - L / 2)
  return g
}

/* Turn a geometry inside out (wheel-arch liners are seen from within). */
export function insideOut(g) {
  flipWinding(g)
  const n = g.attributes.normal
  if (n) { for (let i = 0; i < n.array.length; i++) n.array[i] = -n.array[i]; n.needsUpdate = true }
  return g
}

/*
 * A lamp / grille plate lying on the car's front (dir −1) or rear (dir +1) face:
 * outline `pts` (local x / y in metres, centred; +x = the car's right), extruded
 * `depth`, its top leaning `tilt` radians toward the car's middle (a sloping nose
 * or tailgate), centred at (x, h, s).
 */
export function facePlate(pts, { x = 0, h, s, L, dir = -1, tilt = 0, depth = 0.025, bevel = 0.006 }) {
  const shape = new Shape(roundPoly(pts))
  const g = new ExtrudeGeometry(shape, {
    depth, curveSegments: 6, bevelEnabled: bevel > 0, bevelThickness: bevel, bevelSize: bevel, bevelOffset: -bevel, bevelSegments: 2,
  })
  g.translate(0, 0, -depth / 2)
  if (dir < 0) { g.scale(1, 1, -1); flipWinding(g) }      // the cap faces forward (−z), x unchanged
  if (tilt) g.applyMatrix4(new Matrix4().makeRotationX(dir < 0 ? tilt : -tilt))
  g.translate(x, h, s - L / 2)
  return g
}

/* A plain BufferGeometry from raw triangles (non-indexed positions). */
export function trianglesGeometry(P) {
  const g = new BufferGeometry()
  g.setAttribute('position', new Float32BufferAttribute(P, 3))
  g.computeVertexNormals()
  return g
}
