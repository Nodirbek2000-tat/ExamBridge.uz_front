/*
 * The two fighters, drawn in SVG: the polar bear (you) and the brown bear (the opponent).
 *
 *   <Bear kind="polar" pose="hit" />        poses: idle ready hit block hurt win lose think
 *   <Bear kind="brown" pose="block" flip /> flip = faces left (the right-hand side of the arena)
 *
 * Arms and the head turn around their own joints with CSS transitions (no re-render per frame);
 * the whole bear leans / recoils with framer-motion. Reduced motion keeps the poses, drops the moves.
 */
import { useId } from 'react'
import { motion as Motion } from 'framer-motion'

const PALETTE = {
  polar: {
    fur: '#FFFFFF', shade: '#CFDEEC', deep: '#9FB7CD', inner: '#BCD0E4', muzzle: '#FFFFFF', belly: '#F3F8FC',
    nose: '#1D2330', brow: '#8DA4BC', scarf: '#5CC2FF', scarfDark: '#2C8FD6', cheek: '#FFB8CB', pad: '#C9D9E8',
  },
  brown: {
    fur: '#A46B41', shade: '#734628', deep: '#55331D', inner: '#5B341D', muzzle: '#DDB088', belly: '#C99366',
    nose: '#1B110C', brow: '#3A2213', scarf: '#FF9F43', scarfDark: '#DB7414', cheek: '#E38B6B', pad: '#6B4127',
  },
}

// arm angles in degrees (0 = hanging down; negative swings toward the opponent), head tilt, face, ears
const POSES = {
  idle: { fa: 16, ba: -14, head: 0, eyes: 'open', mouth: 'smile', ears: 0 },
  ready: { fa: -36, ba: -58, head: -3, eyes: 'focus', mouth: 'flat', ears: 0 },
  hit: { fa: 34, ba: -100, head: 5, eyes: 'focus', mouth: 'yell', ears: 0 },
  block: { fa: -122, ba: -150, head: -7, eyes: 'squint', mouth: 'flat', ears: -6 },
  hurt: { fa: 58, ba: 44, head: -12, eyes: 'squeeze', mouth: 'wavy', ears: -16 },
  win: { fa: 158, ba: -162, head: 0, eyes: 'happy', mouth: 'grin', ears: 0 },
  lose: { fa: 4, ba: -2, head: 13, eyes: 'sad', mouth: 'frown', ears: -20 },
  think: { fa: 12, ba: -150, head: -7, eyes: 'up', mouth: 'flat', ears: 0 },
}

const EASE = 'cubic-bezier(.2,.8,.2,1)'
const joint = (x, y, deg, ms = 240) => ({
  transformBox: 'view-box',
  transformOrigin: `${x}px ${y}px`,
  transform: `rotate(${deg}deg)`,
  transition: `transform ${ms}ms ${EASE}`,
})

function Eyes({ kind, c }) {
  const near = [100, 66]
  const far = [125, 62]
  const pair = (fn) => <>{fn(near[0], near[1], 0)}{fn(far[0], far[1], 1)}</>
  if (kind === 'happy') {
    return pair((x, y, i) => <path key={i} d={`M${x - 5} ${y + 2}Q${x} ${y - 5} ${x + 5} ${y + 2}`} stroke={c.nose} strokeWidth="3" fill="none" strokeLinecap="round" />)
  }
  if (kind === 'squeeze') {
    return pair((x, y, i) => <path key={i} d={i ? `M${x - 4} ${y - 4}L${x + 3} ${y}L${x - 4} ${y + 4}` : `M${x + 4} ${y - 4}L${x - 3} ${y}L${x + 4} ${y + 4}`}
      stroke={c.nose} strokeWidth="3" fill="none" strokeLinecap="round" strokeLinejoin="round" />)
  }
  if (kind === 'squint') {
    return pair((x, y, i) => <path key={i} d={`M${x - 5} ${y}Q${x} ${y + 3} ${x + 5} ${y}`} stroke={c.nose} strokeWidth="3.2" fill="none" strokeLinecap="round" />)
  }
  const ry = kind === 'focus' ? 4 : kind === 'sad' ? 4.6 : 5.6
  const dy = kind === 'up' ? -1.6 : kind === 'sad' ? 1 : 0
  return pair((x, y, i) => (
    <g key={i}>
      <ellipse cx={x} cy={y + dy} rx="4.6" ry={ry} fill={c.nose} />
      <circle cx={x + 1.6} cy={y + dy - (kind === 'up' ? 2.4 : 1.8)} r="1.5" fill="#fff" />
    </g>
  ))
}

function Brows({ kind, c }) {
  // the near brow is on the left, the far one on the right
  const d = {
    focus: 'M91 55L106 60M117 58L131 51',
    ready: 'M91 55L106 60M117 58L131 51',
    sad: 'M92 60L105 55M118 52L131 57',
    up: 'M92 52L106 50M117 48L131 49',
    squint: 'M92 56L106 59M117 56L131 52',
  }[kind] || 'M92 54L106 55M117 52L130 50'
  return <path d={d} stroke={c.brow} strokeWidth="3" strokeLinecap="round" fill="none" />
}

function Mouth({ kind, c }) {
  switch (kind) {
    case 'grin':
      return (
        <g>
          <path d="M127 89Q136 104 146 88Q136 93 127 89Z" fill="#5B1F28" />
          <path d="M131 95Q136 100 141 94Q136 96 131 95Z" fill="#FF8FA3" />
        </g>
      )
    case 'yell':
      return <ellipse cx="137" cy="94" rx="5" ry="6" fill="#5B1F28" />
    case 'wavy':
      return <path d="M128 95q3 -3 5 0t5 0t5 0" stroke={c.nose} strokeWidth="2.2" fill="none" strokeLinecap="round" />
    case 'frown':
      return <path d="M129 97Q136 90 143 97" stroke={c.nose} strokeWidth="2.2" fill="none" strokeLinecap="round" />
    case 'flat':
      return <path d="M130 93H142" stroke={c.nose} strokeWidth="2.2" strokeLinecap="round" />
    default:
      return <path d="M136 85V89M128 90Q136 97 144 89" stroke={c.nose} strokeWidth="2.2" fill="none" strokeLinecap="round" />
  }
}

function Arm({ x, y, deg, c, id }) {
  // a short chubby arm: wide at the shoulder, a round paw with a pad
  return (
    <g style={joint(x, y, deg)}>
      <path d={`M${x - 13} ${y - 4}Q${x} ${y - 12} ${x + 13} ${y - 4}L${x + 11} ${y + 30}H${x - 11}Z`} fill={`url(#${id}arm)`}
        stroke={c.shade} strokeWidth="1.2" />
      <circle cx={x} cy={y + 33} r="13.5" fill={c.fur} stroke={c.shade} strokeWidth="1.2" />
      <circle cx={x} cy={y + 33} r="13.5" fill={`url(#${id}paw)`} />
      <ellipse cx={x} cy={y + 37} rx="6.5" ry="4.6" fill={c.pad} />
      <circle cx={x - 6} cy={y + 30} r="2" fill={c.pad} opacity=".8" />
      <circle cx={x} cy={y + 28.5} r="2" fill={c.pad} opacity=".8" />
      <circle cx={x + 6} cy={y + 30} r="2" fill={c.pad} opacity=".8" />
    </g>
  )
}

export function Bear({ kind = 'polar', pose = 'idle', flip = false, dim = false, className = '', label }) {
  const id = kind + useId().replace(/[^a-zA-Z0-9]/g, '')
  const c = PALETTE[kind] || PALETTE.polar
  const p = POSES[pose] || POSES.idle
  const dir = flip ? -1 : 1
  const move = {
    x: (pose === 'hit' ? 14 : pose === 'hurt' ? -12 : pose === 'block' ? -4 : 0) * dir,
    y: pose === 'win' ? -6 : pose === 'lose' ? 7 : 0,
    rotate: (pose === 'hurt' ? -5 : pose === 'lose' ? 3 : pose === 'hit' ? 3 : 0) * dir,
  }
  return (
    <Motion.div className={`relative ${className}`} animate={move} transition={{ type: 'spring', stiffness: 420, damping: 22 }}
      role={label ? 'img' : undefined} aria-label={label} aria-hidden={label ? undefined : true}>
      <svg viewBox="0 0 200 200" className="block h-auto w-full overflow-visible"
        style={{ transform: flip ? 'scaleX(-1)' : undefined, filter: dim ? 'grayscale(1) brightness(.55)' : undefined, opacity: dim ? 0.55 : 1 }}>
        <defs>
          <linearGradient id={`${id}body`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor={c.fur} />
            <stop offset="1" stopColor={c.shade} />
          </linearGradient>
          <radialGradient id={`${id}head`} cx=".42" cy=".38" r=".75">
            <stop offset=".55" stopColor={c.fur} />
            <stop offset="1" stopColor={c.shade} />
          </radialGradient>
          <linearGradient id={`${id}arm`} x1="0" y1="0" x2="1" y2="0">
            <stop offset="0" stopColor={c.shade} />
            <stop offset=".45" stopColor={c.fur} />
            <stop offset="1" stopColor={c.shade} />
          </linearGradient>
          <radialGradient id={`${id}paw`} cx=".4" cy=".35" r=".8">
            <stop offset=".5" stopColor={c.fur} stopOpacity="0" />
            <stop offset="1" stopColor={c.deep} stopOpacity=".55" />
          </radialGradient>
        </defs>

        <ellipse cx="102" cy="194" rx="62" ry="6.5" fill="#000" opacity=".35" />

        {/* block: a shield of light in front of the bear */}
        <path d="M168 40Q190 100 168 160" stroke={c.scarf} strokeWidth="5" fill="none" strokeLinecap="round"
          style={{ opacity: pose === 'block' ? 0.9 : 0, transition: 'opacity 160ms' }} />
        <path d="M178 58Q194 100 178 142" stroke={c.scarf} strokeWidth="2.5" fill="none" strokeLinecap="round"
          style={{ opacity: pose === 'block' ? 0.45 : 0, transition: 'opacity 160ms' }} />

        {/* body */}
        <path d="M42 198C38 150 62 118 102 116C142 118 166 150 162 198Z" fill={`url(#${id}body)`} />
        <ellipse cx="106" cy="166" rx="33" ry="27" fill={c.belly} opacity=".85" />
        <ellipse cx="74" cy="195" rx="22" ry="8" fill={c.shade} />
        <ellipse cx="132" cy="195" rx="22" ry="8" fill={c.shade} />
        <ellipse cx="74" cy="194" rx="9" ry="3.5" fill={c.pad} opacity=".7" />
        <ellipse cx="132" cy="194" rx="9" ry="3.5" fill={c.pad} opacity=".7" />

        {/* scarf */}
        <path d="M56 114Q102 134 148 112L150 125Q102 146 54 127Z" fill={c.scarf} />
        <path d="M56 120Q102 140 149 118" stroke={c.scarfDark} strokeWidth="2" fill="none" opacity=".5" />
        <path d="M64 124L52 150L64 153L74 128Z" fill={c.scarfDark} />

        {/* head */}
        <g style={joint(102, 116, p.head, 260)}>
          <g style={joint(70, 50, -p.ears, 260)}>
            <circle cx="68" cy="38" r="15" fill={`url(#${id}head)`} />
            <circle cx="69" cy="39" r="7.5" fill={c.inner} />
          </g>
          <g style={joint(130, 46, p.ears, 260)}>
            <circle cx="132" cy="34" r="15" fill={`url(#${id}head)`} />
            <circle cx="131" cy="35" r="7.5" fill={c.inner} />
          </g>
          <ellipse cx="102" cy="74" rx="48" ry="43" fill={`url(#${id}head)`} />
          <ellipse cx="95" cy="86" rx="7" ry="4" fill={c.cheek} opacity=".35" />
          <ellipse cx="124" cy="89" rx="23" ry="17" fill={c.muzzle} />
          <path d="M128 76Q136 72 144 76Q142 83 136 85Q130 83 128 76Z" fill={c.nose} />
          <ellipse cx="134" cy="76.5" rx="3" ry="1.3" fill="#fff" opacity=".45" />
          <Mouth kind={p.mouth} c={c} />
          <Eyes kind={p.eyes} c={c} />
          <Brows kind={p.eyes === 'open' && pose === 'ready' ? 'ready' : p.eyes} c={c} />
        </g>

        {/* arms on top, so a block crosses in front of the face */}
        <Arm x={62} y={138} deg={p.fa} c={c} id={id} />
        <Arm x={142} y={136} deg={p.ba} c={c} id={id} />

        {/* hit: speed lines behind the punch · hurt: stars · win: sparkles */}
        <g stroke={c.scarf} strokeWidth="3" strokeLinecap="round" style={{ opacity: pose === 'hit' ? 0.85 : 0, transition: 'opacity 120ms' }}>
          <path d="M150 112H170M146 124H178M152 136H168" />
        </g>
        <g fill="#FFD166" style={{ opacity: pose === 'hurt' ? 1 : 0, transition: 'opacity 140ms' }}>
          <path d="M62 22l3 6 6 1-5 4 1 6-5-3-5 3 1-6-5-4 6-1z" />
          <path d="M150 14l2 4 4 .6-3 2.6.8 4-3.8-2-3.8 2 .8-4-3-2.6 4-.6z" />
        </g>
        <g fill={c.scarf} style={{ opacity: pose === 'win' ? 1 : 0, transition: 'opacity 200ms' }}>
          <path d="M30 40l2.5 6 6 2.5-6 2.5-2.5 6-2.5-6-6-2.5 6-2.5z" />
          <path d="M172 24l2 4.5 4.5 2-4.5 2-2 4.5-2-4.5-4.5-2 4.5-2z" />
          <path d="M180 92l1.6 3.6 3.6 1.6-3.6 1.6-1.6 3.6-1.6-3.6-3.6-1.6 3.6-1.6z" />
        </g>
      </svg>
    </Motion.div>
  )
}

/* The home-screen face-off: both bears, a VS seal between them. */
export function FaceOff({ className = '', left = 'idle', right = 'idle' }) {
  return (
    <div className={`relative flex items-end justify-center ${className}`} aria-hidden="true">
      <div className="wb-breathe w-[46%] max-w-[230px]"><Bear kind="polar" pose={left} /></div>
      <div className="absolute left-1/2 top-[38%] z-10 flex h-12 w-12 -translate-x-1/2 items-center justify-center rounded-full border border-[#5CC2FF]/40 bg-[#0B0B10] text-[13px] font-black tracking-wider text-white shadow-[0_0_32px_-4px_rgba(92,194,255,.55)] sm:h-14 sm:w-14 sm:text-[15px]">
        VS
      </div>
      <div className="wb-breathe w-[46%] max-w-[230px]" style={{ animationDelay: '-1.3s' }}><Bear kind="brown" pose={right} flip /></div>
    </div>
  )
}
