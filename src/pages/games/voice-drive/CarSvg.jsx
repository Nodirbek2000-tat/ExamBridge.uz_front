/*
 * The garage cars as inline SVG: a side view (garage, start, results) and the
 * rear view the road canvas uses (same shapes as art.js). Generic look-alikes:
 * no logos, no badges, no brand names. Upgrades show: engine → rims and the
 * rear bumper strip (grey, chrome, gold) and neon under-glow at the top level;
 * turbo → exhaust flame (blue, then orange).
 */
import { useId } from 'react'
import { CAR_MODELS, RIM_COLORS, carGrads, partFill, shade } from './art'
import { carById } from './cars'

/* Side profiles on a 320 × 140 box, the car facing right, wheels on y ≈ 132. */
const SIDE = {
  klassik: {
    body: 'M24 110L20 88Q20 76 34 74L94 71L124 44Q128 40 136 40L196 40Q204 40 209 45L238 70L288 75Q300 77 302 88L303 104Q303 110 296 110L273 110A25 25 0 0 0 223 110L105 110A25 25 0 0 0 55 110Z',
    windows: ['M104 70L127 46Q130 43 136 43L162 43L162 70Z', 'M168 43L194 43Q200 43 204 47L229 70L168 70Z'],
    seams: ['M165 44L165 108', 'M232 72L232 108', 'M104 72L104 108'],
    handles: [[140, 79], [204, 79]],
    tail: 'M20 79L31 78L31 92L21 93Z', head: 'M289 78L302 82L302 92L289 90Z',
    trim: 'M36 92L292 94L292 97L36 95Z',
    dark: ['M18 97L34 97L34 110L24 110Q18 110 18 104Z', 'M286 97L304 97L304 104Q304 110 298 110L286 110Z'],
    mirror: 'M226 62L236 60L238 66L228 67Z',
    wheels: [[80, 113, 19], [248, 113, 19]], exhaust: [20, 106],
  },
  sedan: {
    body: 'M22 108L20 90Q20 78 34 75L84 70Q108 44 142 38L190 37Q210 38 224 50L246 68L290 74Q304 77 305 90L305 104Q305 110 298 110L276 110A26 26 0 0 0 224 110L108 110A26 26 0 0 0 56 110L30 110Q22 110 22 108Z',
    windows: ['M92 68Q112 47 138 42L164 41L164 68Z', 'M170 41L190 41Q206 42 216 51L236 68L170 68Z'],
    seams: ['M167 42L167 108', 'M240 70L240 108', 'M92 70L92 108'],
    handles: [[140, 80], [206, 80]],
    tail: 'M20 81L35 79L35 92L21 93Z', head: 'M286 76L304 82L304 90L288 86Z',
    trim: 'M40 86Q160 80 300 88L300 90Q160 82 40 88Z',
    dark: ['M20 98L36 98L36 110L28 110Q20 110 20 104Z', 'M288 98L306 98L306 104Q306 110 300 110L288 110Z'],
    mirror: 'M224 60L234 58L236 64L226 65Z',
    wheels: [[82, 113, 20], [250, 113, 20]], exhaust: [22, 106],
  },
  van: {
    body: 'M54 112L52 46Q52 28 68 26L218 24Q231 24 238 36L258 70Q270 74 272 86L272 106Q272 112 266 112L253 112A19 19 0 0 0 217 112L113 112A19 19 0 0 0 77 112L60 112Q54 112 54 110Z',
    windows: ['M62 34L104 33L104 64L62 65Z', 'M110 33L166 32L166 64L110 64Z', 'M172 32L218 31Q227 31 232 40L250 66L172 65Z'],
    seams: ['M107 34L107 110', 'M169 33L169 110', 'M110 70L166 70'],
    handles: [[150, 78], [204, 78]],
    tail: 'M52 74L60 74L60 98L53 98Z', head: 'M262 78L272 82L272 92L262 90Z',
    trim: 'M60 27L216 25L216 28L60 30Z',
    dark: ['M50 100L64 100L64 112L56 112Q50 112 50 106Z', 'M262 100L274 100L274 106Q274 112 268 112L262 112Z'],
    mirror: 'M246 54L256 52L258 60L248 61Z',
    wheels: [[95, 116, 16], [235, 116, 16]], exhaust: [52, 108],
  },
  jip: {
    body: 'M20 104L20 38Q20 28 30 28L206 26Q213 26 216 32L230 60L292 62Q304 62 304 74L304 98Q304 104 298 104L278 104A28 28 0 0 0 222 104L106 104A28 28 0 0 0 50 104L26 104Q20 104 20 104Z',
    windows: ['M30 36L74 35L74 58L30 59Z', 'M80 35L142 34L142 58L80 58Z', 'M148 34L204 33L218 58L148 58Z'],
    seams: ['M77 35L77 102', 'M145 34L145 102', 'M222 62L222 102'],
    handles: [[118, 66], [184, 66]],
    tail: 'M20 68L27 68L27 92L20 92Z', head: null,
    trim: 'M28 20L206 18L206 25L28 27Z',
    dark: ['M8 52Q8 46 14 46L21 46L21 98L14 98Q8 98 8 92Z', 'M46 104A32 32 0 0 1 110 104L104 104A26 26 0 0 0 52 104Z', 'M218 104A32 32 0 0 1 282 104L276 104A26 26 0 0 0 224 104Z', 'M106 104L222 104L220 110L108 110Z', 'M290 88L306 88L306 100Q306 104 300 104L290 104Z'],
    mirror: 'M214 48L226 46L228 56L216 57Z',
    round: [298, 72, 7], blinker: 'M266 56L284 56L284 61L266 61Z',
    wheels: [[78, 110, 23], [250, 110, 23]], exhaust: [24, 104],
  },
  sport: {
    body: 'M16 98L14 86Q16 74 36 71L104 66Q138 47 172 45L196 46Q224 50 248 65L294 75Q310 79 310 90L308 98Q306 104 298 104L279 104A27 27 0 0 0 225 104L113 104A27 27 0 0 0 59 104L24 104Q16 104 16 98Z',
    windows: ['M114 64Q141 50 170 48L194 49Q213 52 231 63Z'],
    seams: ['M171 48L168 64', 'M226 65L226 98'],
    handles: [[196, 72]],
    tail: 'M14 78L27 76L27 84L15 85Z', head: 'M292 77L310 83L308 89L292 85Z',
    trim: 'M40 92L300 94L300 98L40 96Z',
    dark: ['M196 76Q214 74 224 80L222 90Q210 86 198 88Z', 'M8 56L58 54L58 60L10 62Z', 'M28 61L34 61L36 70L30 70Z', 'M108 98L224 98L222 104L110 104Z'],
    mirror: 'M228 61L238 59L240 66L230 67Z',
    wheels: [[86, 110, 22], [252, 110, 22]], exhaust: [14, 96], bigRims: true,
  },
}

function Wheel({ cx, cy, r, rim, big }) {
  const rr = r * (big ? 0.68 : 0.6)
  const spokes = [0, 72, 144, 216, 288]
  return (
    <g>
      <circle cx={cx} cy={cy} r={r} fill="#0b0f1a" />
      <circle cx={cx} cy={cy} r={r - 2.5} fill="none" stroke="#1f2937" strokeWidth="1.5" />
      <circle cx={cx} cy={cy} r={rr} fill={rim} />
      {spokes.map(a => {
        const rad = (a * Math.PI) / 180
        return <line key={a} x1={cx} y1={cy} x2={cx + Math.cos(rad) * rr * 0.92} y2={cy + Math.sin(rad) * rr * 0.92} stroke="rgba(0,0,0,0.35)" strokeWidth={r * 0.13} strokeLinecap="round" />
      })}
      <circle cx={cx} cy={cy} r={r * 0.2} fill="#1f2937" />
      <circle cx={cx - rr * 0.35} cy={cy - rr * 0.35} r={rr * 0.22} fill="rgba(255,255,255,0.35)" />
    </g>
  )
}

function Side({ model, color, up, locked, uid }) {
  const s = SIDE[model] || SIDE.klassik
  const [engine, turbo] = up
  const sil = '#0b1020'
  const rim = RIM_COLORS[Math.max(0, Math.min(2, engine - 1))]
  const [ex, ey] = s.exhaust
  return (
    <>
      <defs>
        <linearGradient id={`${uid}-b`} x1="0" y1="20" x2="0" y2="112" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor={shade(color, 0.35)} />
          <stop offset="0.5" stopColor={color} />
          <stop offset="1" stopColor={shade(color, -0.45)} />
        </linearGradient>
        <linearGradient id={`${uid}-g`} x1="0" y1="26" x2="0" y2="70" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor="#e0f2fe" />
          <stop offset="0.55" stopColor="#38bdf8" />
          <stop offset="1" stopColor="#0c4a6e" />
        </linearGradient>
        <radialGradient id={`${uid}-n`} cx="0.5" cy="0.5" r="0.5">
          <stop offset="0" stopColor="#22d3ee" stopOpacity="0.9" />
          <stop offset="1" stopColor="#22d3ee" stopOpacity="0" />
        </radialGradient>
        <linearGradient id={`${uid}-f`} x1="1" y1="0" x2="0" y2="0">
          <stop offset="0" stopColor="#fff7ed" />
          <stop offset="0.35" stopColor={turbo >= 3 ? '#fb923c' : '#38bdf8'} />
          <stop offset="1" stopColor={turbo >= 3 ? '#dc2626' : '#6366f1'} stopOpacity="0" />
        </linearGradient>
      </defs>
      <ellipse cx="160" cy="133" rx="140" ry="6" fill="rgba(0,0,0,0.35)" />
      {!locked && engine >= 3 && <ellipse cx="164" cy="128" rx="150" ry="12" fill={`url(#${uid}-n)`} />}
      {!locked && turbo >= 2 && (
        <path d={`M${ex} ${ey}q-${turbo >= 3 ? 30 : 18} -7 -${turbo >= 3 ? 44 : 26} 0q${turbo >= 3 ? 14 : 8} 7 ${turbo >= 3 ? 44 : 26} 0Z`}
          fill={`url(#${uid}-f)`} className="motion-safe:animate-pulse" />
      )}
      <path d={s.body} fill={locked ? sil : `url(#${uid}-b)`} />
      {!locked && (
        <>
          {s.trim && <path d={s.trim} fill={model === 'jip' ? '#0b0d10' : 'rgba(255,255,255,0.22)'} />}
          {s.windows.map((d, i) => <path key={i} d={d} fill={`url(#${uid}-g)`} />)}
          {s.windows.map((d, i) => <path key={`s${i}`} d={d} fill="none" stroke="rgba(15,23,42,0.55)" strokeWidth="2" />)}
          {s.seams.map((d, i) => <path key={i} d={d} stroke="rgba(0,0,0,0.3)" strokeWidth="1.4" fill="none" />)}
          {s.handles.map(([x, y], i) => <rect key={i} x={x} y={y} width="11" height="3" rx="1.5" fill="rgba(0,0,0,0.4)" />)}
          {s.dark.map((d, i) => <path key={i} d={d} fill="#1f2328" />)}
          {s.mirror && <path d={s.mirror} fill={shade(color, -0.25)} />}
          <path d={s.tail} fill="#dc2626" />
          {s.head && <path d={s.head} fill="#fef9c3" />}
          {s.round && (
            <>
              <circle cx={s.round[0]} cy={s.round[1]} r={s.round[2] + 2} fill="#9ca3af" />
              <circle cx={s.round[0]} cy={s.round[1]} r={s.round[2]} fill="#fef9c3" />
              <path d={s.blinker} fill="#f59e0b" />
            </>
          )}
        </>
      )}
      {s.wheels.map(([cx, cy, r], i) => (
        locked ? <circle key={i} cx={cx} cy={cy} r={r} fill={sil} />
          : <Wheel key={i} cx={cx} cy={cy} r={r} rim={rim} big={s.bigRims} />
      ))}
    </>
  )
}

function Rear({ model, color, up, locked, uid }) {
  const m = CAR_MODELS[model] || CAR_MODELS.klassik
  const grads = carGrads(model, color)
  const sil = '#0b1020'
  const rim = RIM_COLORS[Math.max(0, Math.min(2, up[0] - 1))]
  return (
    <>
      <defs>
        {Object.entries(grads).map(([id, g]) => (
          <linearGradient key={id} id={`${uid}-${id}`} gradientUnits="userSpaceOnUse" x1={g.x1} y1={g.y1} x2={g.x2} y2={g.y2}>
            {g.stops.map(([o, c]) => <stop key={o} offset={o} stopColor={c} />)}
          </linearGradient>
        ))}
      </defs>
      {m.parts.map((p, i) => {
        if (locked) return p.fill ? <path key={i} d={p.d} fill={sil} /> : null
        return (
          <path key={i} d={p.d}
            fill={p.fill ? (p.fill.startsWith('grad:') ? `url(#${uid}-${p.fill.slice(5)})` : partFill(p.fill, color)) : 'none'}
            stroke={p.stroke} strokeWidth={p.width} />
        )
      })}
      {!locked && up[0] >= 2 && m.trim && <rect x={m.trim[0]} y={m.trim[1]} width={m.trim[2]} height={m.trim[3]} fill={rim} />}
      {!locked && m.plate && (
        <text x={m.plate.x} y={m.plate.y} textAnchor="middle" dominantBaseline="middle"
          fontSize={m.plate.size} fontWeight="800" fill="#0f172a" fontFamily="system-ui, sans-serif">{m.plate.text}</text>
      )}
    </>
  )
}

/*
 * <CarSvg model="jip" view="side" up={[2, 3]} />
 * view: 'side' | 'rear'; flip mirrors the side view; locked draws a dark silhouette.
 */
export default function CarSvg({ model = 'klassik', view = 'side', color, up = [1, 1], locked = false, flip = false, className = '' }) {
  const uid = `car${useId().replace(/[^a-zA-Z0-9_-]/g, '')}`
  const col = color || carById(model).color
  const ups = Array.isArray(up) ? up : [1, 1]
  if (view === 'rear') {
    const m = CAR_MODELS[model] || CAR_MODELS.klassik
    return (
      <svg viewBox={`0 0 ${m.w} ${m.h}`} className={className} aria-hidden="true">
        <Rear model={model} color={col} up={ups} locked={locked} uid={uid} />
      </svg>
    )
  }
  return (
    <svg viewBox="0 0 320 140" className={className} aria-hidden="true">
      <g transform={flip ? 'translate(320 0) scale(-1 1)' : undefined}>
        <Side model={model} color={col} up={ups} locked={locked} uid={uid} />
      </g>
    </svg>
  )
}
