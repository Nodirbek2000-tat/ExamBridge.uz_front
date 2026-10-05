/*
 * TOBY RUN — scene-level helpers on top of the 3D kit: the ornament atlas as a texture, repeatable
 * pattern tiles (marble, ganch, cobble…) with uvs in metres, and AtlasBuilder — ModelBuilder for merged
 * props that mix plain vertex colours with ornament cells (one material, one draw call per model).
 *
 *   const kit = new SceneKit()
 *   kit.atlasMaterial({ roughness })          vertex colours × the ornament atlas
 *   kit.tileMaterial('cobble', 2, 'xz')       a repeating pattern, `tile` metres per repeat
 *   new AtlasBuilder().box(1, 1, 1, { color, cell: 'girih' }).build()
 */
import {
  BoxGeometry, CanvasTexture, ConeGeometry, CylinderGeometry, IcosahedronGeometry, MeshStandardMaterial, PlaneGeometry,
  RepeatWrapping, SRGBColorSpace, SphereGeometry, TorusGeometry,
} from 'three'
import { PartList } from '../../../../games/three/geometry'
import { lumpy } from '../../../../games/three/primitives'
import { metricUvMaterial } from '../../../../games/three/instancing'
import { WHITE_UV, cellUv, ornamentCanvas, ornamentTile } from '../../../../games/three/ornaments'

export class SceneKit {
  constructor() {
    this.textures = new Map()
    this.atlas = null
  }

  atlasTexture() {
    if (!this.atlas) {
      const t = new CanvasTexture(ornamentCanvas())
      t.colorSpace = SRGBColorSpace
      t.anisotropy = 8
      this.atlas = t
    }
    return this.atlas
  }

  atlasMaterial(opts = {}) {
    return new MeshStandardMaterial({ color: '#ffffff', map: this.atlasTexture(), vertexColors: true, roughness: 0.8, metalness: 0, ...opts })
  }

  tile(key) {
    let t = this.textures.get(key)
    if (!t) {
      t = new CanvasTexture(ornamentTile(key))
      t.colorSpace = SRGBColorSpace
      t.wrapS = RepeatWrapping
      t.wrapT = RepeatWrapping
      t.anisotropy = 8
      this.textures.set(key, t)
    }
    return t
  }

  /* a material whose pattern repeats every `tile` metres on instanced, scaled boxes / planes */
  tileMaterial(key, tile = 2, plane = 'xz', opts = {}) {
    const m = new MeshStandardMaterial({ color: '#ffffff', map: this.tile(key), roughness: 0.9, metalness: 0, ...opts })
    return metricUvMaterial(m, tile, plane)
  }

  dispose() {
    for (const t of this.textures.values()) t.dispose()
    this.textures.clear()
    this.atlas?.dispose()
    this.atlas = null
  }
}

/* merged props: plain parts sample the atlas' white cell, `cell` parts show an ornament */
export class AtlasBuilder {
  constructor() { this.parts = new PartList() }

  add(geo, { at, rot, scale, color = '#ffffff', cell = null } = {}) {
    if (cell) cellUv(geo, cell)
    this.parts.add(geo, { at, rot, scale, color, uv: cell ? null : WHITE_UV })
    return this
  }

  box(w, h, d, o = {}) { return this.add(new BoxGeometry(w, h, d), o) }

  /* a box whose front face (+z) alone carries the cell; the other faces are plain */
  panel(w, h, d, o = {}) {
    this.box(w, h, d, { ...o, cell: null })
    return this.add(new PlaneGeometry(w, h), { ...o, at: [(o.at?.[0] || 0), (o.at?.[1] || 0), (o.at?.[2] || 0) + d / 2 + 0.004], color: o.faceColor || '#ffffff', cell: o.cell })
  }

  plane(w, h, o = {}) { return this.add(new PlaneGeometry(w, h), o) }

  cyl(rTop, rBot, h, o = {}) { return this.add(new CylinderGeometry(rTop, rBot, h, o.seg || 10, 1, !!o.open, o.start || 0, o.arc || Math.PI * 2), o) }

  cone(r, h, o = {}) { return this.add(new ConeGeometry(r, h, o.seg || 10), o) }

  sphere(r, o = {}) { return this.add(new SphereGeometry(r, o.seg || 12, Math.max(4, Math.round((o.seg || 12) * 0.6)), 0, Math.PI * 2, 0, o.theta || Math.PI), o) }

  torus(r, tube, o = {}) { return this.add(new TorusGeometry(r, tube, o.radial || 6, o.tubular || 16, o.arc || Math.PI * 2), o) }

  blob(r, o = {}) {
    const g = new IcosahedronGeometry(r, o.detail ?? 1)
    lumpy(g, o.lump ?? r * 0.18, o.seed ?? 1)
    return this.add(g, o)
  }

  build({ crease = 35 } = {}) { return this.parts.build({ crease }) }
}
