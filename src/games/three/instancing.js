/*
 * InstancedBatch: one draw call for many copies of a mesh, refilled every frame.
 *
 *   const trees = new InstancedBatch(treeGeo, leafMat, 200, { colors: true })
 *   trees.begin(); trees.add(x, 0, z, rotY, scale, color); …; trees.end()
 *
 * { cells: true } adds a per-instance atlas cell (u0, v0, su, sv) for textures that
 * hold many pictures (signs, billboards) — use atlasCellMaterial() on the material.
 */
import { Color, DynamicDrawUsage, Euler, InstancedBufferAttribute, InstancedMesh, Matrix4, Quaternion, Vector3 } from 'three'

const _m = new Matrix4()
const _p = new Vector3()
const _q = new Quaternion()
const _s = new Vector3()
const _e = new Euler()
const _c = new Color()

/* A css colour parsed once (Color.set(string) runs a regex — too slow / wasteful every frame). Read-only. */
const parsed = new Map()
export function colorOf(css) {
  let c = parsed.get(css)
  if (!c) { c = new Color(css); parsed.set(css, c) }
  return c
}

export class InstancedBatch extends InstancedMesh {
  constructor(geometry, material, capacity, { colors = false, cells = false, castShadow = false, receiveShadow = false, name = '' } = {}) {
    super(geometry, material, capacity)
    this.name = name
    this.capacity = capacity
    this.instanceMatrix.setUsage(DynamicDrawUsage)
    this.frustumCulled = false
    this.castShadow = castShadow
    this.receiveShadow = receiveShadow
    this.count = 0
    this.visible = false
    this.n = 0
    if (colors) {
      this.instanceColor = new InstancedBufferAttribute(new Float32Array(capacity * 3).fill(1), 3)
      this.instanceColor.setUsage(DynamicDrawUsage)
    }
    if (cells) {
      this.cells = new InstancedBufferAttribute(new Float32Array(capacity * 4), 4)
      this.cells.setUsage(DynamicDrawUsage)
      geometry.setAttribute('aCell', this.cells)
    }
  }

  begin() { this.n = 0 }

  get full() { return this.n >= this.capacity }

  /* add(x, y, z, rotY, scale (number | [x, y, z]), color?, cell?) → index or -1 */
  add(x, y, z, rotY = 0, scale = 1, color = null, cell = null) {
    if (this.n >= this.capacity) return -1
    _e.set(0, rotY, 0)
    _q.setFromEuler(_e)
    if (Array.isArray(scale)) _s.set(scale[0], scale[1], scale[2]); else _s.set(scale, scale, scale)
    _m.compose(_p.set(x, y, z), _q, _s)
    return this.addMatrix(_m, color, cell)
  }

  /* full rotation (radians, XYZ) */
  addRot(x, y, z, rx, ry, rz, scale = 1, color = null, cell = null) {
    if (this.n >= this.capacity) return -1
    _e.set(rx, ry, rz)
    _q.setFromEuler(_e)
    if (Array.isArray(scale)) _s.set(scale[0], scale[1], scale[2]); else _s.set(scale, scale, scale)
    _m.compose(_p.set(x, y, z), _q, _s)
    return this.addMatrix(_m, color, cell)
  }

  addMatrix(m, color = null, cell = null) {
    if (this.n >= this.capacity) return -1
    const i = this.n++
    this.setMatrixAt(i, m)
    if (this.instanceColor) {
      if (color == null) this.setColorAt(i, _c.setRGB(1, 1, 1))
      else if (typeof color === 'object' && color.isColor) this.setColorAt(i, color)
      else if (typeof color === 'string') this.setColorAt(i, colorOf(color))
      else this.setColorAt(i, _c.set(color))
    }
    if (this.cells && cell) this.cells.setXYZW(i, cell[0], cell[1], cell[2], cell[3])
    return i
  }

  end() {
    this.count = this.n
    this.visible = this.n > 0
    if (!this.n) return
    this.instanceMatrix.clearUpdateRanges?.()
    this.instanceMatrix.needsUpdate = true
    if (this.instanceColor) this.instanceColor.needsUpdate = true
    if (this.cells) this.cells.needsUpdate = true
  }
}

/*
 * Texture coordinates in metres for stretched instances (side streets, verges):
 * uv = the instance-scaled local x / z (or x / y) divided by `tile`, so a 40 m strip
 * repeats its texture instead of smearing one copy across it.
 */
export function metricUvMaterial(material, tile = 4, plane = 'xz') {
  material.onBeforeCompile = (shader) => {
    shader.vertexShader = shader.vertexShader.replace('#include <uv_vertex>', `#include <uv_vertex>
#ifdef USE_MAP
  vec3 vdScale = vec3(length(instanceMatrix[0].xyz), length(instanceMatrix[1].xyz), length(instanceMatrix[2].xyz));
  vec3 vdLocal = position * vdScale;
  vMapUv = ${plane === 'xz' ? 'vdLocal.xz' : 'vdLocal.xy'} / ${tile.toFixed(3)};
#endif`)
  }
  material.customProgramCacheKey = () => `metric-uv-${plane}-${tile}`
  return material
}

/* Make a material read its map / emissiveMap from the instance's atlas cell (attribute aCell). */
export function atlasCellMaterial(material) {
  material.onBeforeCompile = (shader) => {
    shader.vertexShader = `attribute vec4 aCell;\n${shader.vertexShader}`.replace('#include <uv_vertex>', `#include <uv_vertex>
#ifdef USE_MAP
  vMapUv = aCell.xy + vMapUv * aCell.zw;
#endif
#ifdef USE_EMISSIVEMAP
  vEmissiveMapUv = aCell.xy + vEmissiveMapUv * aCell.zw;
#endif`)
  }
  material.customProgramCacheKey = () => 'atlas-cell'
  return material
}
