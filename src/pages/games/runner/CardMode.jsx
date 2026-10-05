/*
 * TOBY RUN — Card mode (RUNNER_PLAN §B3.8, §B9.5): the run without WebGL (no WebGL, the context lost
 * twice, or ?rn2d=1). The same engine, deck, director, speech and outcomes; the world is a flat drawn
 * picture: the biome's sky and skyline, rails running toward the horizon (sleepers stream past), the
 * So'z shari arch coming closer with its picture, the SVG Toby running, lifted by his speech-bubble
 * balloon on a ride, happy or sad as the moments go, a platform at a Bekat. Obstacles are lifted
 * (engine.toCardMode), so the learner only speaks — the run is saved as mode "card": full `say` credit,
 * not ranked.
 *
 * It steps the engine from its own animation loop; per-frame changes go straight to SVG attributes
 * through refs (no React render per frame); React renders only when the biome or the moment changes.
 * The drawing's height follows the screen's shape (a phone in portrait sees more sky and track).
 */
import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import Toby from '../tobys-day/Toby'
import { ItemArt } from '../tobys-day/items'
import { hasPicture } from './engine/deck.js'
import { BIOMES } from './engine/track.js'
import { KidFigure, ShovqinFigure } from './art'

const W = 400
const D = 7                       // the camera's depth: z metres ahead → scale D / (D + z)
const PICTURE_PT = new Set(['picture', 'choice', 'hear'])

const LOOK = {
  metro: { sky: ['#17130f', '#3b3026'], ground: '#5f5a54', side: '#d8cdb8', line: '#c9c2b6', sleeper: '#3f352c' },
  bozor: { sky: ['#5ea5e8', '#dcecfa'], ground: '#a99782', side: '#e6d6bb', line: '#efe7da', sleeper: '#8d7b66' },
  xiyobon: { sky: ['#3b2a5e', '#ff9f6a'], ground: '#8c7c6a', side: '#6f9a4e', line: '#f1e2cc', sleeper: '#6f604f' },
  shahar: { sky: ['#03050d', '#1b2b5a'], ground: '#343947', side: '#2a2f3d', line: '#9aa3b2', sleeper: '#262a34' },
}

/* the view for a screen shape: height, horizon, pixels per metre, the runner's size */
function viewFor(aspect) {
  const H = Math.round(Math.max(260, Math.min(820, W / Math.max(0.3, aspect))))
  const portrait = H > 420
  return { H, HZ: Math.round(H * (portrait ? 0.4 : 0.37)), PX: portrait ? 40 : 46, S: portrait ? 0.52 : 0.42 }
}

const project = (v, x, y, z) => {
  const k = D / (D + Math.max(-D * 0.9, z))
  return { x: W / 2 + x * v.PX * k, y: v.HZ + (v.H - v.HZ) * k - y * v.PX * k, k }
}
const pt = (v, x, y, z) => { const p = project(v, x, y, z); return `${p.x.toFixed(1)},${p.y.toFixed(1)}` }

function Skyline({ biome, v }) {
  const hz = v.HZ
  if (biome === 'metro') {
    // the vault: arches shrinking toward the tunnel's mouth
    return (
      <g fill="none" stroke="#e9dcc4" strokeOpacity=".5">
        {[0, 1, 2, 3, 4, 5].map(i => {
          const z = i * 6
          const a = project(v, -6.3, 0, z)
          const b = project(v, 6.3, 2.6, z)
          const r = (b.x - a.x) / 2
          return <path key={i} d={`M${a.x} ${a.y} V${b.y} A${r} ${r} 0 0 1 ${b.x} ${b.y} V${a.y}`} strokeWidth={3 * a.k + 0.5} />
        })}
        <circle cx={W / 2} cy={hz - 4} r="14" fill="#0b0907" stroke="none" />
      </g>
    )
  }
  const tone = biome === 'bozor' ? '#a9bbd0' : biome === 'xiyobon' ? '#9b6b80' : '#22305e'
  return (
    <g fill={tone}>
      <rect x="0" y={hz - 14} width={W} height="16" />
      <path d={`M30 ${hz}v-22h26v22zM70 ${hz}v-30h18v30zM300 ${hz}v-26h22v26zM340 ${hz}v-38h20v38z`} />
      {biome === 'bozor' && <path d={`M150 ${hz - 12}a22 20 0 0 1 44 0zM132 ${hz - 8}a10 9 0 0 1 20 0zM196 ${hz - 8}a10 9 0 0 1 20 0z`} />}
      {biome !== 'bozor' && (
        <g>
          <path d={`M252 ${hz}l6-30h4l6 30z`} />
          <rect x="258" y={hz - 84} width="4" height="56" />
          <ellipse cx="260" cy={hz - 64} rx="9" ry="4" />
          <rect x="259" y={hz - 100} width="2" height="18" />
        </g>
      )}
      {biome === 'xiyobon' && [40, 90, 130, 290, 350].map(x => <circle key={x} cx={x} cy={hz - 16} r="13" />)}
      {biome === 'shahar' && [[30, 22], [70, 30], [300, 26], [340, 38]].map(([x, h]) => (
        [0, 1, 2].map(r => <rect key={`${x}${r}`} x={x + 5 + (r % 2) * 8} y={hz - h + 6 + r * 7} width="4" height="3" fill="#ffd27a" opacity=".85" />)
      ))}
    </g>
  )
}

/* a Bekat platform on the right: marble top, saffron edge, a lapis canopy on columns, the sign */
function Platform({ v }) {
  const near = -1
  const far = 42
  return (
    <g>
      <polygon points={[pt(v, 4, 0, near), pt(v, 4, 0.9, near), pt(v, 4, 0.9, far), pt(v, 4, 0, far)].join(' ')} fill="#cfc2ad" />
      <polygon points={[pt(v, 4, 0.9, near), pt(v, 4, 0.9, far), pt(v, 10, 0.9, far), pt(v, 10, 0.9, near)].join(' ')} fill="#F1EADF" />
      <polygon points={[pt(v, 4, 0.92, near), pt(v, 4, 0.92, far), pt(v, 4.35, 0.92, far), pt(v, 4.35, 0.92, near)].join(' ')} fill="#F5B14C" />
      {[3, 11, 19, 27, 35].map(z => {
        const a = project(v, 7, 0.9, z)
        const b = project(v, 7, 4.5, z)
        return <line key={z} x1={a.x} y1={a.y} x2={b.x} y2={b.y} stroke="#2E5AAC" strokeWidth={Math.max(1, 8 * a.k)} />
      })}
      <polygon points={[pt(v, 3.8, 4.5, near), pt(v, 3.8, 4.5, far), pt(v, 10, 4.5, far), pt(v, 10, 4.5, near)].join(' ')} fill="#2E5AAC" />
      <polygon points={[pt(v, 3.8, 4.3, near), pt(v, 3.8, 4.5, near), pt(v, 3.8, 4.5, far), pt(v, 3.8, 4.3, far)].join(' ')} fill="#2BB3C0" />
      {(() => {
        const a = project(v, 4.6, 3.9, 5)
        return (
          <g transform={`translate(${a.x} ${a.y}) scale(${a.k})`}>
            <rect x="-6" y="-2" width="150" height="44" rx="10" fill="#16224A" />
            <circle cx="16" cy="20" r="13" fill="#F5B14C" />
            <text x="16" y="26" textAnchor="middle" fontSize="18" fontWeight="900" fill="#16224A">B</text>
            <text x="38" y="28" fontSize="22" fontWeight="800" fill="#F6EBD9">BEKAT</text>
          </g>
        )
      })()}
    </g>
  )
}

/* the speech-bubble balloon with the item's picture */
function Bubble({ pic }) {
  return (
    <g>
      <path d="M-2 26q-6 8-14 10 10-1 16-8" fill="#FFF8EC" />
      <ellipse cx="0" cy="0" rx="40" ry="31" fill="#FFF8EC" stroke="#2BB3C0" strokeWidth="2.5" />
      {pic ? <ItemArt name={pic} transform="scale(1.35)" /> : [-12, 0, 12].map(x => <circle key={x} cx={x} cy="0" r="4.5" fill="#2E5AAC" />)}
    </g>
  )
}

export default function CardMode({ gameRef }) {
  const boxRef = useRef(null)
  const [v, setV] = useState(() => viewFor(typeof window !== 'undefined' ? window.innerWidth / Math.max(1, window.innerHeight) : 0.5))
  const vRef = useRef(v)
  const [look, setLook] = useState({ biome: 'metro', mood: 'idle', pose: 'rest', walking: false, ride: false, pic: '', archPic: '', station: false, shovqin: false, runner: 'toby', outfit: '' })
  const sleepersRef = useRef([])
  const archRef = useRef(null)
  const archPicRef = useRef(null)
  const runnerRef = useRef(null)
  const lastKey = useRef('')

  // the drawing follows the box's shape
  useLayoutEffect(() => {
    const el = boxRef.current
    if (!el || typeof ResizeObserver === 'undefined') return undefined
    const ro = new ResizeObserver(() => {
      const r = el.getBoundingClientRect()
      if (!r.width || !r.height) return
      const next = viewFor(r.width / r.height)
      if (next.H !== vRef.current.H) { vRef.current = next; setV(next) }
    })
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  useEffect(() => {
    let raf = 0
    let last = 0
    window.__rnStats = { fps: 0, calls: 0, triangles: 0, quality: 0, mode: 'card' }
    const loop = (now) => {
      raf = requestAnimationFrame(loop)
      const dt = last ? (now - last) / 1000 : 0
      last = now
      const g = gameRef.current
      if (!g) return
      if (!g.noWorld && g.status === 'running') g.toCardMode?.()
      g.step(dt)
      const V = vRef.current
      const p = g.player
      // sleepers stream toward the viewer
      const off = g.dist % 2
      sleepersRef.current.forEach((el, i) => {
        if (!el) return
        const z = i * 2 - off
        const a = project(V, -3.9, 0, z)
        const b = project(V, 3.9, 0, z)
        el.setAttribute('x1', a.x.toFixed(1)); el.setAttribute('x2', b.x.toFixed(1))
        el.setAttribute('y1', a.y.toFixed(1)); el.setAttribute('y2', a.y.toFixed(1))
        el.setAttribute('stroke-width', Math.max(0.6, 6 * a.k).toFixed(2))
      })
      // the next arch
      const gate = g.gates.find(q => !q.used && q.s - g.dist > -2 && q.s - g.dist < 90)
      if (archRef.current) {
        if (gate) {
          const z = gate.s - g.dist
          const c = project(V, 0, 0, z)
          archRef.current.setAttribute('transform', `translate(${c.x.toFixed(1)} ${c.y.toFixed(1)}) scale(${(c.k * V.PX / 46).toFixed(3)})`)
          archRef.current.style.opacity = String(Math.min(1, (90 - z) / 20))
          const it = gate.item
          const show = it && hasPicture(it) && !g.listenMode && PICTURE_PT.has(it.pt)
          if (archPicRef.current) archPicRef.current.style.display = show ? '' : 'none'
        } else archRef.current.style.opacity = '0'
      }
      // the runner: lane, lift on a ride
      if (runnerRef.current) {
        const base = project(V, p.x, 0, 1.5)
        const lift = g.phase === 'ride' ? Math.min(1, p.y / 4.5) * V.H * 0.3 : Math.min(30, p.y * 22)
        const s = V.S
        runnerRef.current.setAttribute('transform', `translate(${(base.x - 100 * s).toFixed(1)} ${(base.y - 236 * s - lift).toFixed(1)}) scale(${s})`)
      }
      // React only when the picture changes
      const biome = BIOMES[g.track.biomeAt(g.dist)] || 'metro'
      const ride = g.phase === 'ride'
      const card = g.director?.cardState
      const pic = ride && g.ride.pic && !g.ride.listen && (PICTURE_PT.has(g.ride.pt) || (card?.reveal && !card?.options)) ? g.ride.pic : ''
      const sad = g.phase === 'crash' || g.phase === 'revive' || card?.mode === 'miss'
      const happy = g.clock - p.cheerT < 1.2 || card?.mode === 'ok' || card?.mode === 'close'
      const station = g.phase === 'station' || g.phase === 'brake'
      const running = g.status === 'running' && (g.phase === 'run' || g.phase === 'resume')
      const mood = sad ? 'sad' : happy ? 'happy' : station ? 'listening' : 'idle'
      const pose = ride ? 'cheer' : happy ? 'cheer' : 'rest'
      const archPic = gate?.item?.picture && hasPicture(gate.item) ? gate.item.picture : ''
      const key = `${biome}|${mood}|${pose}|${running}|${ride}|${pic}|${archPic}|${station}|${g.shovqin.on}`
      if (key !== lastKey.current) {
        lastKey.current = key
        setLook({ biome, mood, pose, walking: running, ride, pic, archPic, station, shovqin: g.shovqin.on, runner: g.runner || 'toby', outfit: g.outfit || '' })
      }
    }
    raf = requestAnimationFrame(loop)
    return () => cancelAnimationFrame(raf)
  }, [gameRef])

  const L = LOOK[look.biome] || LOOK.metro
  const acc = look.outfit && look.outfit !== 'doppi' ? look.outfit : null
  const rails = [-2.5, 0, 2.5].flatMap(x => [x - 0.72, x + 0.72])
  const ground = (x, z) => project(v, x, 0, z)
  return (
    <div ref={boxRef} className="absolute inset-0 overflow-hidden" aria-hidden="true" style={{ background: L.sky[1] }}>
      <svg viewBox={`0 0 ${W} ${v.H}`} preserveAspectRatio="xMidYMax slice" className="absolute inset-0 h-full w-full">
        <defs>
          <linearGradient id="rn-card-sky" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor={L.sky[0]} />
            <stop offset="1" stopColor={L.sky[1]} />
          </linearGradient>
          <linearGradient id="rn-card-fade" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor={L.sky[1]} stopOpacity=".9" />
            <stop offset="1" stopColor={L.sky[1]} stopOpacity="0" />
          </linearGradient>
        </defs>
        <rect width={W} height={v.HZ} fill="url(#rn-card-sky)" />
        <Skyline biome={look.biome} v={v} />
        {/* ground: verges, the bed, rails */}
        <path d={`M0 ${v.HZ} H${W} V${v.H} H0Z`} fill={L.side} />
        <path d={`M${ground(-4.2, 200).x} ${v.HZ} L${ground(4.2, 200).x} ${v.HZ} L${ground(4.2, -1).x} ${v.H} L${ground(-4.2, -1).x} ${v.H}Z`} fill={L.ground} />
        <g stroke={L.sleeper} strokeLinecap="round">
          {Array.from({ length: 28 }, (_, i) => <line key={i} ref={(el) => { sleepersRef.current[i] = el }} />)}
        </g>
        <g stroke={L.line} strokeWidth="2.2">
          {rails.map(x => { const a = ground(x, -1); const b = ground(x, 200); return <line key={x} x1={a.x} y1={a.y} x2={b.x} y2={b.y} /> })}
        </g>
        <rect x="0" y={v.HZ} width={W} height="24" fill="url(#rn-card-fade)" />

        {look.station && <Platform v={v} />}

        {/* the So'z shari arch */}
        <g ref={archRef} style={{ opacity: 0 }}>
          <path d="M-202 0V-138A202 202 0 0 1 202 -138V0" fill="none" stroke="#2E5AAC" strokeWidth="26" />
          <path d="M-202 0V-138A202 202 0 0 1 202 -138V0" fill="none" stroke="#2BB3C0" strokeWidth="6" />
          <g transform="translate(0 -359) scale(2.4)">
            <ellipse rx="34" ry="26" fill="#F6EBD9" />
            <path d="M-8 22l-8 14 16-11z" fill="#F6EBD9" />
            <g ref={archPicRef}>{look.archPic ? <ItemArt name={look.archPic} transform="scale(1.2)" /> : null}</g>
          </g>
        </g>

        {/* Shovqin behind the runner */}
        {look.shovqin && <g transform={`translate(${W / 2 - 70} ${v.H - 40}) scale(1.5)`}><ShovqinFigure /></g>}

        {/* the runner (and his balloon on a ride) */}
        <g ref={runnerRef}>
          {look.ride && (
            <g transform="translate(150 -96)">
              <path d="M-24 52q8 40 -14 98" stroke="#9aa3b2" strokeWidth="2.4" fill="none" />
              <g transform="scale(1.7)"><Bubble pic={look.pic} /></g>
            </g>
          )}
          {look.runner === 'lola' || look.runner === 'bek'
            ? <KidFigure who={look.runner} cheer={look.pose === 'cheer'} />
            : <Toby mood={look.mood} pose={look.ride ? 'up' : look.pose} walking={look.walking} acc={acc} pokes={false} />}
        </g>
      </svg>
    </div>
  )
}
