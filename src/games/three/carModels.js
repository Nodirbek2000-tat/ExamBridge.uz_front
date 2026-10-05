/*
 * Five procedural cars — no model files, no logos, no brand or model names.
 *
 *   klassik  90s compact saloon        sedan  modern family sedan
 *   van      small boxy microvan       jip    big boxy off-roader (spare wheel on the back)
 *   sport    low coupé with a wing
 *
 * buildCarModel(id) → {
 *   id, L, W, H, R, tyreW,
 *   geos: { paint, glass, chrome, trim, head, tail, plate },   one merged geometry per material
 *   tyre, rim,                                                  one wheel (axis x, rim face toward +x)
 *   wheels: [{ x, y, z, front, left }], spare: { x, y, z } | null,
 *   exhaust: [[x, y, z]], headlamps: [[x, y, z]], taillamps: [[x, y, z]]
 * }   (metres; the car faces −z, wheels on the ground at y = 0)
 */
import { BoxGeometry, CylinderGeometry, ExtrudeGeometry, Path, PlaneGeometry, Shape, TorusGeometry } from 'three'
import { PartList, tyreGeometry } from './geometry'
import {
  barAcross, bodyOutline, capPanel, clipPoly, cylinderZ, extrudeAcross, facePatch, facePlate, flipWinding, insetConvex, insideOut,
  mirrorX, roundPoly, toShapePts, warp,
} from './carShapes'

export const CAR_IDS = ['klassik', 'sedan', 'van', 'jip', 'sport']

const COL = {
  black: '#101114', plastic: '#1b1d21', seal: '#08090b', amber: '#ff9a1f', amberDim: '#b8650c', clear: '#dfe5ec',
  grey: '#34373d', mesh: '#0c0d10', reflector: '#9a1016', interior: '#0d0e10', red: '#8a0f12', white: '#f4f6f8',
}

const smooth = (a, b, x) => { const t = Math.max(0, Math.min(1, (x - a) / (b - a))); return t * t * (3 - 2 * t) }

/* rounded rectangle outline (centred), as [x, y, r] points */
const rr = (w, h, r = 0.02) => [[-w / 2, -h / 2, r], [w / 2, -h / 2, r], [w / 2, h / 2, r], [-w / 2, h / 2, r]]
/* any polygon given as [x, y] with one radius for every corner */
const poly = (pts, r = 0.02) => pts.map(([x, y]) => [x, y, r])

/* ── wheels ─────────────────────────────────────────────────────────── */

function spokeHoles(n, r1, r2, spoke, twist = 0) {
  const holes = []
  const step = (Math.PI * 2) / n
  for (let i = 0; i < n; i++) {
    const c = i * step + step / 2 + twist
    const outer = (step - spoke / r2) / 2
    const inner = Math.max(0.04, (step - spoke / r1) / 2)
    const p = new Path()
    p.moveTo(Math.cos(c - outer) * r2, Math.sin(c - outer) * r2)
    p.absarc(0, 0, r2, c - outer, c + outer, false)
    p.lineTo(Math.cos(c + inner) * r1, Math.sin(c + inner) * r1)
    p.absarc(0, 0, r1, c + inner, c - inner, true)
    p.closePath()
    holes.push(p)
  }
  return holes
}

function roundHoles(n, rc, rh) {
  const holes = []
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2
    const p = new Path()
    p.absarc(Math.cos(a) * rc, Math.sin(a) * rc, rh, 0, Math.PI * 2, true)
    holes.push(p)
  }
  return holes
}

/* The rim (face toward +x): style = steel | five | multi | offroad | van */
export function rimGeometry(style, rr0, width) {
  const parts = new PartList()
  const face = new Shape()
  face.absarc(0, 0, rr0 * 0.97, 0, Math.PI * 2, false)
  let holes
  if (style === 'five') holes = spokeHoles(5, rr0 * 0.34, rr0 * 0.84, rr0 * 0.2, 0.3)
  else if (style === 'multi') holes = spokeHoles(10, rr0 * 0.36, rr0 * 0.86, rr0 * 0.075)
  else if (style === 'offroad') holes = spokeHoles(6, rr0 * 0.4, rr0 * 0.8, rr0 * 0.26)
  else if (style === 'van') holes = roundHoles(4, rr0 * 0.6, rr0 * 0.13)
  else holes = roundHoles(6, rr0 * 0.62, rr0 * 0.12)
  face.holes.push(...holes)
  const fg = new ExtrudeGeometry(face, { depth: 0.03, curveSegments: 10, bevelEnabled: true, bevelThickness: 0.008, bevelSize: 0.008, bevelOffset: -0.008, bevelSegments: 2 })
  fg.rotateY(Math.PI / 2)
  const fx = width / 2 - 0.055
  fg.translate(fx, 0, 0)
  parts.add(fg)
  // the lip and the barrel behind it
  const lip = new TorusGeometry(rr0 * 0.975, 0.012, 6, 32)
  lip.rotateY(Math.PI / 2)
  lip.translate(fx + 0.035, 0, 0)
  parts.add(lip)
  const barrel = new CylinderGeometry(rr0 * 0.96, rr0 * 0.96, width * 0.8, 28, 1, true)
  barrel.rotateZ(Math.PI / 2)
  parts.add(barrel)
  // hub and nuts
  const hubR = style === 'steel' || style === 'van' ? rr0 * 0.42 : rr0 * 0.24
  const hub = new CylinderGeometry(hubR * 0.85, hubR, 0.045, 20)
  hub.rotateZ(-Math.PI / 2)
  hub.translate(fx + 0.045, 0, 0)
  parts.add(hub)
  if (style !== 'steel' && style !== 'van') {
    for (let i = 0; i < 5; i++) {
      const a = (i / 5) * Math.PI * 2
      const nut = new CylinderGeometry(0.011, 0.011, 0.03, 6)
      nut.rotateZ(Math.PI / 2)
      nut.translate(fx + 0.05, Math.cos(a) * hubR * 0.62, Math.sin(a) * hubR * 0.62)
      parts.add(nut)
    }
  }
  return parts.build({ crease: 50 })
}

/* The tyre, plus a dark brake disc behind the spokes (nothing shows through the wheel). */
export function tyreWithDisc(R, rr0, width) {
  const parts = new PartList()
  parts.add(tyreGeometry(R, rr0 * 0.98, width, 32))
  const disc = new CylinderGeometry(rr0 * 0.95, rr0 * 0.95, 0.03, 24)
  disc.rotateZ(Math.PI / 2)
  disc.translate(width / 2 - 0.11, 0, 0)
  parts.add(disc)
  return parts.build({ crease: 40 })
}

/* ── the builder ────────────────────────────────────────────────────── */

function makeBodyWarp(spec) {
  const { L, W } = spec
  const b = spec.body
  const tp = b.taper || {}
  const [hb, hh] = b.bulgeH || [0.55, 0.35]
  const half = W / 2
  const beltTop = spec.cabin.belt
  return (v) => {
    const s = v.z + L / 2
    let k = 1
    if (tp.f && s < tp.f) k -= tp.kf * (1 - s / tp.f) ** 2
    if (tp.r && s > L - tp.r) k -= tp.kr * (1 - (L - s) / tp.r) ** 2
    const d = (v.y - hb) / hh
    if (b.bulge && Math.abs(d) < 1) k *= 1 + b.bulge * (1 - d * d)
    if (b.hip) k *= 1 + b.hip[2] * smooth(b.hip[0], b.hip[1], s)
    v.x *= k
    if (b.crown) {
      const q = Math.min(1, Math.abs(v.x) / half)
      v.y += b.crown * (1 - q * q) * smooth(beltTop - 0.32, beltTop - 0.02, v.y)
    }
  }
}

function makeCabinWarp(spec) {
  const c = spec.cabin
  const half = c.width / 2
  return (v) => {
    const t = Math.max(0, Math.min(1, (v.y - c.belt) / (c.roof - c.belt)))
    v.x *= 1 - c.narrow * t
    if (c.crown) {
      const q = Math.min(1, Math.abs(v.x) / (half * (1 - c.narrow)))
      v.y += c.crown * (1 - q * q) * smooth(c.roof - 0.16, c.roof, v.y)
    }
  }
}

function buildCar(spec) {
  const { L, W, R, tyreW, axles, bottom } = spec
  const lists = { paint: new PartList(), glass: new PartList(), chrome: new PartList(), trim: new PartList(), head: new PartList(), tail: new PartList(), plate: new PartList() }
  const bodyWarp = makeBodyWarp(spec)
  const cabinWarp = makeCabinWarp(spec)
  const archR = spec.archR

  /* add(material, geometry, colour?, warp?) — warp 'body' (default) | 'cabin' | null */
  const add = (key, g, color = null, w = 'body') => {
    if (w === 'body') warp(g, bodyWarp)
    else if (w === 'cabin') warp(g, cabinWarp)
    lists[key].add(g, { color })
  }
  const pair = (key, g, color, w) => { add(key, mirrorX(g.clone()), color, w); add(key, g, color, w) }
  const k = { L, W, R, add, pair, spec, archR }

  // lower body
  const outline = bodyOutline(spec.body.top, { L, bottom, axles, archR, archY: R })
  add('paint', extrudeAcross(outline, W, spec.body.bevel))

  // greenhouse
  const c = spec.cabin
  add('paint', extrudeAcross(toShapePts(roundPoly(c.pts), L), c.width, c.bevel), null, 'cabin')

  // side windows: the greenhouse outline shrunk by the pillar width, cut at the sill and at every pillar
  const capX = c.width / 2
  const ghPoly = c.pts.map(([s, h, r = 0]) => [s, h, r])
  let win = clipPoly(insetConvex(ghPoly, c.pillar), 0, 1, c.sill)
  const panes = []
  for (const p of c.pillars || []) {
    panes.push(clipPoly(win, -1, 0, -(p.s - p.w / 2)))
    win = clipPoly(win, 1, 0, p.s + p.w / 2)
  }
  panes.push(win)
  for (const pane of panes) {
    if (pane.length < 3) continue
    const glassPts = roundPoly(pane.map(([s, h, r]) => [s, h, Math.max(0.03, Math.min(0.14, r * 0.8))]))
    const sealPts = roundPoly(insetConvex(pane, -0.014).map(([s, h, r]) => [s, h, Math.max(0.04, Math.min(0.15, r * 0.8 + 0.01))]))
    for (const side of [-1, 1]) {
      add('glass', capPanel(glassPts, side * (capX + 0.006), L), null, 'cabin')
      add('trim', capPanel(sealPts, side * (capX + 0.003), L), COL.seal, 'cabin')
    }
  }

  // windscreen and rear window on the sloping faces
  const P = c.pts
  const along = (a, b, d) => {
    const ds = b[0] - a[0]
    const dh = b[1] - a[1]
    const l = Math.hypot(ds, dh)
    return [a[0] + (ds / l) * d, a[1] + (dh / l) * d]
  }
  const screen = (a, b, inA, inB) => {
    const halfW = c.width / 2 - c.aPillar
    add('glass', facePatch(along(a, b, inA), along(b, a, inB), halfW, L, { off: 0.007 }), null, 'cabin')
    add('trim', facePatch(along(a, b, inA - 0.016), along(b, a, inB - 0.016), halfW + 0.016, L, { off: 0.0035 }), COL.seal, 'cabin')
  }
  const fr = (P[2][2] || 0) * 1.15 + 0.03
  const rrd = (P[3][2] || 0) * 1.15 + 0.03
  screen(P[1], P[2], c.screenIn?.[0] ?? 0.035, Math.max(0.05, fr))
  screen(P[3], P[4], Math.max(0.05, rrd), c.rearIn?.[1] ?? 0.03)

  // wheel-arch liners, underbody
  for (const ax of axles) {
    const sinA = Math.max(-1, Math.min(1, (bottom - R) / archR))
    const a0 = Math.asin(sinA)
    const liner = new CylinderGeometry(archR - 0.008, archR - 0.008, W - 0.04, 20, 1, true, a0, Math.PI - 2 * a0)
    liner.rotateZ(Math.PI / 2)
    insideOut(liner)
    liner.translate(0, R, ax - L / 2)
    add('trim', liner, COL.black)
  }
  const under = new BoxGeometry(W - 0.16, 0.05, L - 0.5)
  under.translate(0, bottom + 0.03, 0)
  add('trim', under, COL.black, null)

  // number plates
  const plate = (pl, dir) => {
    const g = new PlaneGeometry(0.52, 0.112)
    if (dir < 0) g.rotateY(Math.PI)
    if (pl.tilt) g.rotateX(dir < 0 ? pl.tilt : -pl.tilt)
    g.translate(pl.x || 0, pl.h, pl.s - L / 2 + dir * 0.012)
    add('plate', g, null, null)
    const back = new BoxGeometry(0.54, 0.128, 0.012)
    if (pl.tilt) back.rotateX(dir < 0 ? pl.tilt : -pl.tilt)
    back.translate(pl.x || 0, pl.h, pl.s - L / 2 + dir * 0.004)
    add('trim', back, COL.black, null)
  }
  if (spec.plateF) plate(spec.plateF, -1)
  if (spec.plateR) plate(spec.plateR, 1)

  // exhaust tips
  for (const [x, h, s, r = 0.032] of spec.exhaust || []) {
    add('chrome', cylinderZ(r, 0.12, x, h, s, L, 14), null, null)
    add('trim', cylinderZ(r * 0.7, 0.122, x, h, s + 0.002, L, 12), COL.seal, null)
  }

  // mirrors (body-coloured housing on a black stalk, chrome glass facing back)
  if (spec.mirror) {
    const { s, h, out = 0.17, len = 0.15, hgt = 0.1 } = spec.mirror
    const x0 = capX + 0.02
    const housing = barAcross(s, s + len, h, h + hgt, out, { L, r: 0.035, t: 0.03, bs: 0.025, x: x0 + out / 2 })
    pair('paint', housing, null, null)
    pair('chrome', facePlate(rr(out - 0.04, hgt - 0.035, 0.02), { x: x0 + out / 2, h: h + hgt / 2, s: s + len + 0.004, L, dir: 1, depth: 0.008, bevel: 0 }), null, null)
    const stalk = new BoxGeometry(0.08, 0.03, 0.05)
    stalk.translate(x0 - 0.01, h + 0.02, s + len * 0.5 - L / 2)
    pair('trim', stalk, COL.black, null)
  }

  // door seams (thin dark lines on the body sides) and handles
  for (const [s, h0, h1] of spec.seams || []) pair('trim', boxOnSide(W, s, h0, h1, L), '#1c1e22')
  for (const [s, h] of spec.handles || []) {
    const g = new BoxGeometry(0.016, 0.026, 0.13)
    g.translate(W / 2 + 0.006, h, s - L / 2)
    pair(spec.chromeHandles ? 'chrome' : 'trim', g, COL.plastic)
  }

  spec.details?.(k)

  const geos = {}
  for (const [key, list] of Object.entries(lists)) {
    if (list.empty) continue
    geos[key] = list.build({ crease: key === 'plate' ? null : 42 })
  }

  // wheels
  const rimR = spec.rimR ?? R * 0.62
  const wx = W / 2 - tyreW / 2 - (spec.wheelInset ?? 0.03)
  const wheels = []
  axles.forEach((ax, i) => {
    for (const side of [-1, 1]) wheels.push({ x: side * wx, y: R, z: ax - L / 2, front: i === 0, left: side < 0 })
  })
  return {
    id: spec.id, L, W, H: spec.H, R, tyreW,
    geos,
    tyre: tyreWithDisc(R, rimR, tyreW),
    rim: rimGeometry(spec.rim, rimR, tyreW),
    wheels,
    spare: spec.spare ? { x: 0, y: spec.spare.h, z: spec.spare.s - L / 2 } : null,
    exhaust: (spec.exhaust || []).map(([x, h, s]) => [x, h, s - L / 2 + 0.07]),
    headlamps: (spec.headlamps || []).map(([x, h, s]) => [x, h, s - L / 2]),
    taillamps: (spec.taillamps || []).map(([x, h, s]) => [x, h, s - L / 2]),
  }
}

/* a vertical seam line on the right body side */
function boxOnSide(W, s, h0, h1, L) {
  const g = new BoxGeometry(0.006, h1 - h0, 0.0055)
  g.translate(W / 2 + 0.0012, (h0 + h1) / 2, s - L / 2)
  return g
}

/* ── the five cars ──────────────────────────────────────────────────── */

const SPECS = {
  /* 90s compact saloon: wedge nose, notchback boot, wide rectangular lamps */
  klassik: {
    id: 'klassik', L: 4.26, W: 1.66, H: 1.4, R: 0.29, tyreW: 0.185, axles: [0.84, 3.36], bottom: 0.21, archR: 0.35,
    rim: 'steel', rimR: 0.19, wheelInset: 0.035,
    body: {
      top: [[0.06, 0.21], [0.0, 0.31, 0.05], [0.012, 0.57, 0.05], [0.11, 0.715, 0.07], [1.3, 0.865, 0.06], [3.5, 0.92, 0.03], [4.15, 0.95, 0.08], [4.248, 0.87, 0.05], [4.262, 0.42, 0.05], [4.21, 0.21]],
      bevel: { t: 0.06, s: 0.045, seg: 3 },
      taper: { f: 0.6, kf: 0.09, r: 0.42, kr: 0.05 }, bulge: 0.012, bulgeH: [0.56, 0.36], crown: 0.018,
    },
    cabin: {
      pts: [[1.22, 0.8], [1.3, 0.862], [2.08, 1.378, 0.1], [2.98, 1.395, 0.13], [3.6, 0.928], [3.68, 0.86]],
      width: 1.5, belt: 0.88, roof: 1.39, narrow: 0.15, crown: 0.022, bevel: { t: 0.075, s: 0.04, seg: 4 },
      sill: 0.905, pillar: 0.068, aPillar: 0.085, pillars: [{ s: 2.62, w: 0.09 }],
    },
    mirror: { s: 1.38, h: 0.9 },
    seams: [[1.32, 0.3, 0.83], [2.62, 0.27, 0.86], [3.03, 0.68, 0.87]],
    handles: [[2.4, 0.8], [2.98, 0.81]],
    plateF: { s: -0.04, h: 0.355 }, plateR: { s: 4.262, h: 0.62 },
    exhaust: [[-0.48, 0.2, 4.24]],
    headlamps: [[0.53, 0.63, 0.06], [-0.53, 0.63, 0.06]],
    details(k) {
      const { L, add, pair } = k
      const tilt = Math.atan2(0.1, 0.145)
      // wide headlamps on the sloping nose, a black grille with a chrome bar between them
      pair('head', facePlate(rr(0.36, 0.11, 0.015), { x: 0.53, h: 0.638, s: 0.06, L, dir: -1, tilt, depth: 0.03 }))
      pair('trim', facePlate(rr(0.385, 0.134, 0.02), { x: 0.53, h: 0.638, s: 0.066, L, dir: -1, tilt, depth: 0.02 }), COL.black)
      add('trim', facePlate(rr(0.6, 0.09, 0.02), { h: 0.638, s: 0.064, L, dir: -1, tilt, depth: 0.024 }), COL.mesh)
      add('chrome', facePlate(rr(0.58, 0.014, 0.006), { h: 0.642, s: 0.054, L, dir: -1, tilt, depth: 0.014, bevel: 0.003 }))
      // body-coloured bumpers with a black rubbing strip, amber indicators
      add('paint', barAcross(-0.035, 0.14, 0.235, 0.45, 1.64, { L, r: 0.055 }))
      add('trim', barAcross(-0.045, 0.05, 0.325, 0.372, 1.62, { L, r: 0.016 }), COL.plastic)
      pair('trim', facePlate(rr(0.15, 0.05, 0.012), { x: 0.6, h: 0.415, s: -0.03, L, dir: -1, depth: 0.02 }), COL.amber)
      add('paint', barAcross(4.14, 4.3, 0.235, 0.45, 1.64, { L, r: 0.055 }))
      add('trim', barAcross(4.24, 4.31, 0.325, 0.372, 1.62, { L, r: 0.016 }), COL.plastic)
      // tail clusters: red outside, amber and white inside
      pair('tail', facePlate(rr(0.3, 0.15, 0.018), { x: 0.6, h: 0.75, s: 4.258, L, dir: 1, depth: 0.03 }))
      pair('trim', facePlate(rr(0.12, 0.15, 0.012), { x: 0.37, h: 0.75, s: 4.258, L, dir: 1, depth: 0.028 }), COL.amberDim)
      add('trim', facePlate(rr(0.72, 0.03, 0.01), { h: 0.83, s: 4.25, L, dir: 1, depth: 0.02 }), COL.black)
      // black side mouldings
      pair('trim', boxStrip(k.W, 1.45, 3.04, 0.53, 0.04, L), COL.plastic)
    },
    taillamps: [[0.6, 0.75, 4.27], [-0.6, 0.75, 4.27]],
  },

  /* modern family sedan: raked screen, high boot, swept lamps, chrome belt line */
  sedan: {
    id: 'sedan', L: 4.52, W: 1.74, H: 1.45, R: 0.31, tyreW: 0.2, axles: [0.93, 3.53], bottom: 0.2, archR: 0.37,
    rim: 'five', rimR: 0.21, wheelInset: 0.03,
    body: {
      top: [[0.08, 0.22], [0.0, 0.34, 0.06], [0.02, 0.6, 0.07], [0.22, 0.765, 0.1], [1.4, 0.915, 0.05], [3.7, 0.99, 0.02], [4.38, 1.03, 0.09], [4.5, 0.93, 0.06], [4.52, 0.47, 0.07], [4.46, 0.22]],
      bevel: { t: 0.07, s: 0.05, seg: 4 },
      taper: { f: 0.75, kf: 0.1, r: 0.5, kr: 0.06 }, bulge: 0.016, bulgeH: [0.6, 0.38], crown: 0.022,
    },
    cabin: {
      pts: [[1.32, 0.85], [1.4, 0.918], [2.3, 1.432, 0.17], [3.22, 1.452, 0.22], [3.97, 1.0], [4.03, 0.92]],
      width: 1.56, belt: 0.95, roof: 1.45, narrow: 0.17, crown: 0.028, bevel: { t: 0.085, s: 0.045, seg: 4 },
      sill: 0.975, pillar: 0.064, aPillar: 0.09, pillars: [{ s: 2.8, w: 0.09 }, { s: 3.58, w: 0.11 }],
    },
    mirror: { s: 1.48, h: 0.96, out: 0.18 },
    seams: [[1.42, 0.3, 0.9], [2.8, 0.27, 0.95], [3.3, 0.74, 0.95]],
    handles: [[2.56, 0.86], [3.2, 0.87]], chromeHandles: true,
    plateF: { s: -0.03, h: 0.32 }, plateR: { s: 4.52, h: 0.66 },
    exhaust: [[-0.52, 0.2, 4.47]],
    headlamps: [[0.58, 0.67, 0.12], [-0.58, 0.67, 0.12]],
    details(k) {
      const { L, add, pair } = k
      const tilt = Math.atan2(0.2, 0.165)
      // swept headlamps (right side shape; mirrored for the left)
      const lampPts = poly([[-0.2, -0.045], [0.17, -0.06], [0.22, 0.045], [-0.16, 0.06]], 0.03)
      pair('head', facePlate(lampPts, { x: 0.56, h: 0.675, s: 0.095, L, dir: -1, tilt, depth: 0.03 }))
      pair('trim', facePlate(poly([[-0.215, -0.06], [0.185, -0.075], [0.235, 0.058], [-0.175, 0.074]], 0.035), { x: 0.56, h: 0.675, s: 0.101, L, dir: -1, tilt, depth: 0.02 }), COL.black)
      // slim upper grille with a chrome bar, big lower intake
      add('trim', facePlate(rr(0.66, 0.075, 0.03), { h: 0.655, s: 0.066, L, dir: -1, tilt: 0.85, depth: 0.024 }), COL.mesh)
      add('chrome', facePlate(rr(0.64, 0.012, 0.006), { h: 0.668, s: 0.056, L, dir: -1, tilt: 0.85, depth: 0.012, bevel: 0.003 }))
      add('trim', facePlate(rr(0.84, 0.13, 0.05), { h: 0.33, s: 0.003, L, dir: -1, depth: 0.03 }), COL.mesh)
      pair('trim', facePlate(rr(0.15, 0.06, 0.03), { x: 0.63, h: 0.34, s: 0.012, L, dir: -1, depth: 0.03 }), COL.black)
      pair('head', facePlate(rr(0.1, 0.035, 0.017), { x: 0.63, h: 0.34, s: 0.0, L, dir: -1, depth: 0.016, bevel: 0.003 }))
      // tail lamps wrapping the corners, black diffuser
      pair('tail', facePlate(poly([[-0.2, -0.05], [0.2, -0.065], [0.22, 0.07], [-0.2, 0.06]], 0.03), { x: 0.55, h: 0.83, s: 4.508, L, dir: 1, depth: 0.03 }))
      add('chrome', facePlate(rr(0.6, 0.022, 0.008), { h: 0.83, s: 4.508, L, dir: 1, depth: 0.014, bevel: 0.003 }))
      add('trim', barAcross(4.44, 4.535, 0.22, 0.3, 1.5, { L, r: 0.03 }), COL.plastic)
      // chrome belt line under the side windows
      for (const side of [-1, 1]) add('chrome', capPanel(roundPoly([[1.52, 0.958], [3.96, 0.995], [3.96, 1.008], [1.52, 0.971]]), side * (k.spec.cabin.width / 2 + 0.008), L), null, 'cabin')
    },
    taillamps: [[0.55, 0.83, 4.52], [-0.55, 0.83, 4.52]],
  },

  /* small boxy microvan: short nose, tall cabin, sliding door */
  van: {
    id: 'van', L: 3.4, W: 1.42, H: 1.88, R: 0.27, tyreW: 0.155, axles: [0.62, 2.48], bottom: 0.22, archR: 0.33,
    rim: 'van', rimR: 0.17, wheelInset: 0.05,
    body: {
      top: [[0.05, 0.24], [0.0, 0.33, 0.04], [0.02, 0.62, 0.05], [0.13, 0.79, 0.07], [0.37, 0.89, 0.04], [3.33, 0.99, 0.02], [3.39, 0.96, 0.03], [3.405, 0.4, 0.05], [3.36, 0.24]],
      bevel: { t: 0.05, s: 0.04, seg: 3 },
      taper: { f: 0.32, kf: 0.06, r: 0.18, kr: 0.03 }, bulge: 0.008, bulgeH: [0.62, 0.42], crown: 0.012,
    },
    cabin: {
      pts: [[0.32, 0.83], [0.37, 0.892], [0.93, 1.8, 0.14], [3.32, 1.845, 0.11], [3.4, 1.0], [3.405, 0.95]],
      width: 1.34, belt: 0.97, roof: 1.84, narrow: 0.06, crown: 0.02, bevel: { t: 0.055, s: 0.035, seg: 3 },
      sill: 1.0, pillar: 0.06, aPillar: 0.07, pillars: [{ s: 1.36, w: 0.08 }, { s: 2.48, w: 0.1 }],
      rearIn: [0.06, 0.12],
    },
    mirror: { s: 0.5, h: 1.08, out: 0.15, len: 0.12, hgt: 0.15 },
    seams: [[0.36, 0.34, 0.95], [1.38, 0.3, 0.97], [2.42, 0.66, 0.98]],
    handles: [[1.2, 0.86], [1.5, 0.86]],
    plateF: { s: -0.03, h: 0.32 }, plateR: { s: 3.405, h: 0.5 },
    exhaust: [[-0.42, 0.2, 3.36]],
    headlamps: [[0.47, 0.66, 0.05], [-0.47, 0.66, 0.05]],
    details(k) {
      const { L, add, pair, W } = k
      const tilt = Math.atan2(0.11, 0.17)
      pair('head', facePlate(rr(0.22, 0.13, 0.025), { x: 0.47, h: 0.665, s: 0.058, L, dir: -1, tilt, depth: 0.03 }))
      pair('trim', facePlate(rr(0.245, 0.155, 0.03), { x: 0.47, h: 0.665, s: 0.064, L, dir: -1, tilt, depth: 0.02 }), COL.black)
      add('trim', facePlate(rr(0.5, 0.07, 0.02), { h: 0.66, s: 0.06, L, dir: -1, tilt, depth: 0.024 }), COL.mesh)
      add('chrome', facePlate(rr(0.46, 0.012, 0.005), { h: 0.664, s: 0.05, L, dir: -1, tilt, depth: 0.012, bevel: 0.003 }))
      pair('trim', facePlate(rr(0.1, 0.045, 0.01), { x: 0.5, h: 0.53, s: 0.012, L, dir: -1, depth: 0.02 }), COL.amber)
      add('trim', barAcross(-0.045, 0.1, 0.24, 0.42, W - 0.02, { L, r: 0.035 }), COL.plastic)
      add('trim', barAcross(3.31, 3.45, 0.24, 0.42, W - 0.02, { L, r: 0.035 }), COL.plastic)
      // tall rear lamps on the corners
      pair('tail', facePlate(rr(0.12, 0.26, 0.02), { x: 0.6, h: 0.66, s: 3.405, L, dir: 1, depth: 0.03 }))
      pair('trim', facePlate(rr(0.12, 0.08, 0.014), { x: 0.6, h: 0.48, s: 3.405, L, dir: 1, depth: 0.028 }), COL.amberDim)
      // sliding-door rail and roof gutters
      pair('trim', boxStrip(W, 1.4, 3.3, 0.955, 0.022, L), COL.plastic)
      pair('trim', boxStrip(k.spec.cabin.width, 0.95, 3.3, 1.77, 0.02, L), COL.plastic, 'cabin')
    },
    taillamps: [[0.6, 0.66, 3.42], [-0.6, 0.66, 3.42]],
  },

  /* big boxy off-roader: flat panels, upright screen, round lamps, spare wheel on the back */
  jip: {
    id: 'jip', L: 4.66, W: 1.88, H: 1.95, R: 0.39, tyreW: 0.27, axles: [0.86, 3.72], bottom: 0.36, archR: 0.45,
    rim: 'offroad', rimR: 0.25, wheelInset: 0.0,
    body: {
      top: [[0.08, 0.4], [0.02, 0.47, 0.03], [0.018, 0.88, 0.03], [0.09, 1.03, 0.04], [1.36, 1.1, 0.03], [4.56, 1.12, 0.02], [4.625, 1.1, 0.03], [4.64, 0.48, 0.03], [4.58, 0.4]],
      bevel: { t: 0.035, s: 0.03, seg: 3 },
      taper: { f: 0.25, kf: 0.04, r: 0.12, kr: 0.02 }, bulge: 0.004, bulgeH: [0.75, 0.4], crown: 0.01,
    },
    cabin: {
      pts: [[1.32, 1.04], [1.36, 1.1], [1.62, 1.88, 0.05], [4.53, 1.92, 0.05], [4.62, 1.13], [4.63, 1.06]],
      width: 1.74, belt: 1.12, roof: 1.92, narrow: 0.045, crown: 0.012, bevel: { t: 0.04, s: 0.03, seg: 3 },
      sill: 1.15, pillar: 0.075, aPillar: 0.085, pillars: [{ s: 2.74, w: 0.1 }, { s: 3.86, w: 0.12 }],
      screenIn: [0.04, 0.06], rearIn: [0.07, 0.42],
    },
    mirror: { s: 1.5, h: 1.18, out: 0.17, len: 0.12, hgt: 0.16 },
    seams: [[1.4, 0.46, 1.08], [2.74, 0.44, 1.1], [3.25, 0.86, 1.1]],
    handles: [[2.55, 1.0], [3.62, 1.0]], chromeHandles: true,
    plateF: { s: -0.08, h: 0.51 }, plateR: { s: 4.72, h: 0.51 },
    exhaust: [[-0.6, 0.38, 4.62]],
    spare: { h: 1.02, s: 4.64 + 0.135 + 0.03 },
    headlamps: [[0.62, 0.86, 0.02], [-0.62, 0.86, 0.02]],
    details(k) {
      const { L, W, add, pair, R } = k
      // round headlamps in chrome rings, indicator pods on the wing tops
      const lamp = new CylinderGeometry(0.1, 0.1, 0.04, 28)
      lamp.rotateX(Math.PI / 2)
      lamp.translate(0.62, 0.86, 0.012 - L / 2)
      pair('head', lamp)
      const ring = new TorusGeometry(0.11, 0.016, 8, 28)
      ring.translate(0.62, 0.86, 0.004 - L / 2)
      pair('chrome', ring)
      const pod = new BoxGeometry(0.14, 0.05, 0.1)
      pod.translate(0.8, 1.06, 0.14 - L / 2)
      pair('trim', pod, COL.amber)
      // black grille with slats, bumper bar with tow hooks
      add('trim', facePlate(rr(0.66, 0.26, 0.02), { h: 0.88, s: 0.016, L, dir: -1, depth: 0.03 }), COL.mesh)
      for (let i = 0; i < 4; i++) add('trim', facePlate(rr(0.62, 0.02, 0.006), { h: 0.79 + i * 0.06, s: 0.0, L, dir: -1, depth: 0.012, bevel: 0.002 }), COL.grey)
      add('trim', barAcross(-0.07, 0.12, 0.42, 0.6, W + 0.02, { L, r: 0.03 }), COL.plastic)
      pair('chrome', cylinderZ(0.025, 0.08, 0.42, 0.42, -0.1, L, 10))
      add('trim', barAcross(4.54, 4.72, 0.42, 0.6, W + 0.02, { L, r: 0.03 }), COL.plastic)
      // low rear lamps on the corners
      pair('tail', facePlate(rr(0.13, 0.26, 0.016), { x: 0.8, h: 0.76, s: 4.64, L, dir: 1, depth: 0.03 }))
      // black wheel-arch flares
      for (const ax of k.spec.axles) {
        const sh = new Shape()
        const a0 = Math.asin((k.spec.bottom - R) / k.archR)
        sh.absarc(0, 0, k.archR + 0.075, a0, Math.PI - a0, false)
        sh.absarc(0, 0, k.archR - 0.005, Math.PI - a0, a0, true)
        const fl = new ExtrudeGeometry(sh, { depth: 0.075, curveSegments: 18, bevelEnabled: true, bevelThickness: 0.012, bevelSize: 0.012, bevelOffset: -0.012, bevelSegments: 2 })
        fl.rotateY(Math.PI / 2)                   // arch in the s/h plane, sticking out along +x
        // shape x (along the car) → world −z after this turn; flip it back
        fl.scale(1, 1, -1)
        flipWinding(fl)
        fl.translate(W / 2 - 0.035, R, ax - L / 2)
        pair('trim', fl, COL.plastic)
      }
      // side steps, roof gutters
      pair('trim', boxStrip(W + 0.06, 1.25, 3.33, 0.39, 0.05, L), COL.plastic)
      pair('trim', boxStrip(k.spec.cabin.width, 1.66, 4.5, 1.86, 0.022, L), COL.plastic, 'cabin')
    },
    taillamps: [[0.8, 0.76, 4.67], [-0.8, 0.76, 4.67]],
  },

  /* low coupé: long bonnet, fastback, wide hips, rear wing */
  sport: {
    id: 'sport', L: 4.46, W: 1.92, H: 1.22, R: 0.33, tyreW: 0.255, axles: [1.02, 3.64], bottom: 0.13, archR: 0.365,
    rim: 'multi', rimR: 0.235, wheelInset: 0.02,
    body: {
      top: [[0.12, 0.14], [0.0, 0.25, 0.06], [0.05, 0.4, 0.08], [0.45, 0.665, 0.16], [1.62, 0.82, 0.06], [3.45, 0.87, 0.02], [4.3, 0.885, 0.07], [4.44, 0.82, 0.05], [4.46, 0.37, 0.07], [4.38, 0.14]],
      bevel: { t: 0.08, s: 0.05, seg: 4 },
      taper: { f: 0.9, kf: 0.13, r: 0.5, kr: 0.08 }, bulge: 0.02, bulgeH: [0.5, 0.36], crown: 0.03, hip: [2.9, 3.5, 0.02],
    },
    cabin: {
      pts: [[1.56, 0.76], [1.62, 0.825], [2.5, 1.205, 0.2], [3.05, 1.225, 0.3], [4.16, 0.884], [4.22, 0.8]],
      width: 1.6, belt: 0.84, roof: 1.22, narrow: 0.2, crown: 0.03, bevel: { t: 0.1, s: 0.05, seg: 4 },
      sill: 0.865, pillar: 0.07, aPillar: 0.1, pillars: [{ s: 3.32, w: 0.1 }],
    },
    mirror: { s: 1.78, h: 0.86, out: 0.17, len: 0.15, hgt: 0.09 },
    seams: [[1.68, 0.24, 0.79], [3.0, 0.4, 0.83]],
    handles: [[2.85, 0.76]],
    plateF: { s: 0.0, h: 0.27 }, plateR: { s: 4.462, h: 0.56 },
    exhaust: [[-0.42, 0.2, 4.46, 0.04], [-0.32, 0.2, 4.46, 0.04], [0.32, 0.2, 4.46, 0.04], [0.42, 0.2, 4.46, 0.04]],
    headlamps: [[0.62, 0.57, 0.2], [-0.62, 0.57, 0.2]],
    details(k) {
      const { L, W, add, pair } = k
      const tilt = Math.atan2(0.4, 0.265)
      // thin swept LED headlamps
      pair('head', facePlate(poly([[-0.22, -0.02], [0.2, -0.045], [0.24, 0.03], [-0.2, 0.04]], 0.02), { x: 0.6, h: 0.56, s: 0.2, L, dir: -1, tilt, depth: 0.026 }))
      pair('trim', facePlate(poly([[-0.235, -0.035], [0.215, -0.06], [0.255, 0.045], [-0.215, 0.055]], 0.025), { x: 0.6, h: 0.56, s: 0.207, L, dir: -1, tilt, depth: 0.018 }), COL.black)
      // big intake, splitter, side skirts
      add('trim', facePlate(rr(1.0, 0.16, 0.06), { h: 0.3, s: 0.02, L, dir: -1, tilt: 0.25, depth: 0.03 }), COL.mesh)
      add('trim', barAcross(-0.03, 0.42, 0.12, 0.155, W - 0.08, { L, r: 0.012 }), COL.plastic)
      pair('trim', boxStrip(W + 0.02, 1.38, 3.25, 0.17, 0.06, L), COL.plastic)
      // light bar across the tail, diffuser
      add('tail', facePlate(rr(1.5, 0.042, 0.02), { h: 0.745, s: 4.452, L, dir: 1, tilt: 0.12, depth: 0.026 }))
      pair('tail', facePlate(rr(0.2, 0.07, 0.03), { x: 0.68, h: 0.74, s: 4.45, L, dir: 1, tilt: 0.12, depth: 0.03 }))
      add('trim', barAcross(4.32, 4.48, 0.14, 0.27, 1.6, { L, r: 0.03 }), COL.plastic)
      // the wing on two stands
      const wing = extrudeAcross(toShapePts(roundPoly([[4.06, 1.0, 0.02], [4.4, 0.99, 0.02], [4.42, 1.03, 0.02], [4.1, 1.035, 0.02]]), L), 1.62, { t: 0.02, s: 0.012, seg: 2 })
      add('paint', wing, null, null)
      for (const side of [-1, 1]) {
        const st = new BoxGeometry(0.03, 0.15, 0.12)
        st.translate(side * 0.55, 0.93, 4.28 - L / 2)
        add('trim', st, COL.black, null)
      }
      // bonnet vents
      pair('trim', facePlate(rr(0.18, 0.05, 0.02), { x: 0.36, h: 0.768, s: 1.15, L, dir: -1, tilt: 1.43, depth: 0.012, bevel: 0.002 }), COL.mesh, null)
    },
    taillamps: [[0.68, 0.74, 4.47], [-0.68, 0.74, 4.47]],
  },
}

/* a long thin strip on the right body side (mouldings, sills, gutters) from s0 to s1 at height h */
function boxStrip(W, s0, s1, h, th, L) {
  const g = new BoxGeometry(0.02, th, s1 - s0)
  g.translate(W / 2 + 0.006, h, (s0 + s1) / 2 - L / 2)
  return g
}

export function buildCarModel(id) {
  const spec = SPECS[id] || SPECS.klassik
  return buildCar(spec)
}
