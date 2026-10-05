/*
 * Object pools — nothing is created or thrown away while the game runs.
 *
 *   const pool = new Pool(() => makeCone(), { onAcquire: o => (o.visible = true), onRelease: o => (o.visible = false) })
 *   const cone = pool.acquire(); … pool.release(cone)
 *
 * KeyedPool binds pooled items to outside objects (e.g. the game's obstacles) frame by frame:
 *   kp.begin(); for (const o of game.objects) kp.use(o) …; kp.end()   // items not used this frame go back
 */
export class Pool {
  constructor(create, { onAcquire = null, onRelease = null, prefill = 0 } = {}) {
    this.create = create
    this.onAcquire = onAcquire
    this.onRelease = onRelease
    this.free = []
    this.all = []
    for (let i = 0; i < prefill; i++) this.release(this.make())
  }

  make() {
    const item = this.create()
    this.all.push(item)
    return item
  }

  acquire() {
    const item = this.free.pop() || this.make()
    this.onAcquire?.(item)
    return item
  }

  release(item) {
    this.onRelease?.(item)
    this.free.push(item)
  }

  forEach(fn) { this.all.forEach(fn) }
}

export class KeyedPool {
  constructor(create, opts = {}) {
    this.pool = new Pool(create, opts)
    this.bound = new Map()          // key → item
    this.used = new Set()
  }

  begin() { this.used.clear() }

  /* the item bound to `key` (a fresh one from the pool on first use); second value: true when new */
  use(key) {
    let item = this.bound.get(key)
    let fresh = false
    if (!item) {
      item = this.pool.acquire()
      this.bound.set(key, item)
      fresh = true
    }
    this.used.add(key)
    this.lastFresh = fresh
    return item
  }

  end() {
    if (this.bound.size === this.used.size) return          // every bound item was used this frame
    for (const key of this.bound.keys()) {
      if (this.used.has(key)) continue
      const item = this.bound.get(key)
      this.bound.delete(key)
      this.pool.release(item)
    }
  }

  clear() {
    for (const item of this.bound.values()) this.pool.release(item)
    this.bound.clear()
  }

  forEach(fn) { this.pool.forEach(fn) }
}
