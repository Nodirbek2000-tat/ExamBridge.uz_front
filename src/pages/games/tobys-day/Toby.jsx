/*
 * Toby — a round, cream, kitten-ish friend drawn in SVG.
 *
 * <Toby> draws him in his own 200 × 240 box with his feet at (100, 236), so a
 * scene can place him with one translate/scale. <TobyAvatar> wraps him in an
 * <svg> for cards and screens.
 *
 * mood:  idle · listening · happy · proud · confused · sad · sleep · stir · yawn ·
 *        laugh · love · chew · lick · relax · cry · angry · surprised · sing · shy ·
 *        cool · dizzy · sleepy · wink · sick · blow · breath  (unknown → idle)
 * pose:  rest · up · wave · mouth · brush · face · shrug · read · belly · write ·
 *        throw · kick · ride · comb · lick · give · scrub · sit · dance · clap ·
 *        raise · point · hug · shh · cheer · highfive · stir · think · spin · lie
 *                                                              (unknown → rest)
 * acc:   cap · crown · glasses · bow · scarf · headphones · party · null
 *
 * He is alive on his own: breathes, sways his head a little, blinks, twitches an
 * ear, looks around, swishes his tail, yawns and stretches after ~12 s of
 * standing idle, hops now and then. Soft shading: a fur gradient, a shade on the
 * head, glossy eyes and a soft contact shadow.
 * Poking him (a click / tap on him) cycles giggle → surprised → love, and many
 * fast pokes make him dizzy — only while he is idle / laughing / confused / sad
 * (pokes={false} turns this off when the parent wants to choose the reaction).
 * `reduced` turns all of that off.
 */
import { useEffect, useId, useRef, useState } from 'react'
import { motion as Motion, useAnimationControls } from 'framer-motion'
import { ItemArt } from './items'

const C = {
  fur: '#FFF6EA',
  furFlat: '#FFF9F1',      // lids drawn over the eyes (close to the gradient there)
  line: '#D9BC9C',
  muzzle: '#FFFFFF',
  pink: '#FDA4AF',
  nose: '#F472B6',
  ink: '#1F2937',
  mouth: '#9F1239',
  tongue: '#FB7185',
  whisker: '#DCC3A8',
  brow: '#C9A27C',
  tear: '#7DD3FC',
}
const OUTFITS = {
  tshirt: { main: '#FF6B6B', dark: '#E0424F' },
  pyjamas: { main: '#8EC5FF', dark: '#5E9BF2' },
}
const SPRING = { type: 'spring', stiffness: 170, damping: 16 }

// [base angle, wiggle] per arm. A positive angle swings a hanging arm toward
// the viewer's left. `once` poses play their wiggle a single time.
// ll / rl: that arm reaches further (raised paws clear the big head) · paw (right):
// 'big' (palm to the viewer) | 'finger' · body: how the whole body moves · tilt: extra head tilt
const POSES = {
  rest: { l: 12, r: -12 },
  up: { l: 128, r: -128, lw: 10, rw: 10, dur: 1.1 },
  wave: { l: 12, r: -138, rw: 16, dur: 0.55 },
  mouth: { l: 12, r: 134, rw: 7, dur: 0.8 },
  brush: { l: 12, r: 124, rw: 8, dur: 0.3 },
  face: { l: -156, r: 156, lw: 5, rw: 5, dur: 0.42 },
  shrug: { l: 64, r: -64 },
  read: { l: -36, r: 36 },
  belly: { l: -30, r: 30, lw: 8, rw: 8, dur: 0.6 },
  write: { l: -22, r: 30, rw: 5, dur: 0.3 },
  throw: { l: 12, r: 12, rw: [0, -185, -70, 0], dur: 0.9, once: true },
  kick: { l: 52, r: -52 },
  ride: { l: -28, r: 28 },
  comb: { l: 12, r: -152, rw: 7, dur: 0.5 },
  lick: { l: 12, r: 104, rw: 6, dur: 0.9 },
  give: { l: 12, r: -72, rw: 6, dur: 0.7 },
  scrub: { l: -96, r: 100, lw: 8, rw: 12, dur: 0.4 },
  sit: { l: 36, r: -36, body: 'sit' },
  dance: { l: 100, r: -100, lw: 40, rw: 40, dur: 0.46, body: 'sway', ll: 6, rl: 6 },
  clap: { l: -58, r: 58, lw: 12, rw: -12, dur: 0.3 },
  raise: { l: 12, r: -142, rw: 6, dur: 0.9, rl: 20 },
  point: { l: 12, r: -94, rw: 3, dur: 1.2, rl: 8, paw: 'finger' },
  hug: { l: -80, r: 80, lw: 4, rw: -4, dur: 0.9, body: 'squeeze' },
  shh: { l: 12, r: 134, rl: 12 },
  cheer: { l: 146, r: -146, lw: 12, rw: -12, dur: 0.42, body: 'bounce', ll: 18, rl: 18 },
  highfive: { l: 12, r: -122, rw: 4, dur: 0.7, rl: 10, paw: 'big' },
  stir: { l: 12, r: 50, rw: 18, dur: 0.5 },
  think: { l: -40, r: 124, rl: 3, tilt: -7 },
  spin: { l: 78, r: -78, body: 'spin' },
  lie: { l: 24, r: -24, body: 'lie' },
}
// items that follow the arm; every other item stays upright in the paw
const POINTING = new Set(['toothbrush', 'fork', 'pencil'])
// held items are drawn a bit bigger than their 30-unit icon box: [scale, dy, dx] from the paw
const HELD = { basket: [1.35, 6], bag: [1.3, 6], book: [1.45, -4, -14], glass: [1.2, -2], cup: [1.2, 0], icecream: [1.25, -4], coin: [1.2, 0], sponge: [1.2, 0] }

// face parts per mood
const MOODS = {
  idle: { eyes: 'open', mouth: 'smile', brows: 'calm' },
  listening: { eyes: 'wide', mouth: 'o', brows: 'up', tilt: -7, look: [3, -3] },
  happy: { eyes: 'happy', mouth: 'open', brows: 'up', fx: 'sparkle' },
  proud: { eyes: 'open', mouth: 'open', brows: 'up' },
  confused: { eyes: 'confused', mouth: 'wavy', brows: 'confused', tilt: 9, fx: 'question', look: [-3, 0] },
  sad: { eyes: 'open', mouth: 'frown', brows: 'sad', tilt: 5, look: [0, 3] },
  sleep: { eyes: 'closed', mouth: 'sleep', brows: 'calm', tilt: 6, fx: 'zzz' },
  stir: { eyes: 'closed', mouth: 'o', brows: 'up', tilt: -5, fx: 'zzz' },
  yawn: { eyes: 'squeeze', mouth: 'yawn', brows: 'up' },
  laugh: { eyes: 'squeeze', mouth: 'open', brows: 'up', fx: 'haha', cheeks: 'blush' },
  love: { eyes: 'hearts', mouth: 'open', brows: 'up', fx: 'hearts', cheeks: 'blush' },
  chew: { eyes: 'happy', mouth: 'chew', brows: 'up' },
  lick: { eyes: 'happy', mouth: 'tongue', brows: 'up', fx: 'hearts' },
  relax: { eyes: 'happy', mouth: 'smile', brows: 'calm', fx: 'notes' },
  cry: { eyes: 'cry', mouth: 'cry', brows: 'sad', tilt: 4, face: 'tears' },
  angry: { eyes: 'angry', mouth: 'grr', brows: 'angry', cheeks: 'red', fx: 'steam' },
  surprised: { eyes: 'big', mouth: 'gasp', brows: 'high', fx: 'bang' },
  sing: { eyes: 'happy', mouth: 'sing', brows: 'up', tilt: -6, fx: 'notes' },
  shy: { eyes: 'open', mouth: 'small', brows: 'sad', tilt: 8, look: [5, 4], small: true, cheeks: 'blush' },
  cool: { eyes: 'shades', mouth: 'smirk', brows: 'calm', fx: 'glint' },
  dizzy: { eyes: 'spiral', mouth: 'wavy', brows: 'confused', tilt: 6, fx: 'stars' },
  sleepy: { eyes: 'half', mouth: 'small', brows: 'calm', tilt: 5, fx: 'z' },
  wink: { eyes: 'wink', mouth: 'open', brows: 'up', fx: 'wink' },
  sick: { eyes: 'half', mouth: 'wavy', brows: 'sad', tilt: 5, cheeks: 'fever', fx: 'sweat', look: [0, 2] },
  blow: { eyes: 'closed', mouth: 'blow', brows: 'up', fx: 'puff' },
  breath: { eyes: 'closed', mouth: 'o', brows: 'up', tilt: -4, fx: 'puff' },
}

// moods a poke may interrupt (he is not busy doing something)
const POKEABLE = new Set(['idle', 'laugh', 'confused', 'sad'])
const POKE_CYCLE = ['laugh', 'surprised', 'love']
// what Toby does on his own while standing idle: [mood, pose, ms]
const FIDGETS = [['yawn', 'up', 2600], ['hop', null, 900], ['happy', 'wave', 1700], ['hop', null, 900]]

const pivot = (x, y) => ({ transformBox: 'view-box', originX: `${x}px`, originY: `${y}px` })

/* ── arms ─────────────────────────────────────────────────────────────── */
function Arm({ side, angle, wiggle, dur, once, poseKey, cloth, sleeveLong, item, itemProps, reduced, furFill, len = 0, paw = null }) {
  const sx = side === 'l' ? 64 : 136
  const sy = 172
  const py = 208 + len
  let keys = 0
  if (!reduced && wiggle) keys = Array.isArray(wiggle) ? wiggle : [-wiggle, wiggle, -wiggle]
  const back = Array.isArray(keys) ? keys.map(v => -v) : 0
  const t = once ? { duration: dur, ease: 'easeInOut' } : { duration: dur, repeat: Infinity, ease: 'easeInOut' }
  const big = paw === 'big'
  return (
    <Motion.g style={pivot(sx, sy)} initial={false} animate={{ rotate: angle }} transition={SPRING}>
      <Motion.g key={poseKey} style={pivot(sx, sy)} animate={{ rotate: keys }} transition={t}>
        <rect x={sx - 8.5} y={sy - 8} width="17" height={44 + len} rx="8.5" fill={sleeveLong ? cloth : furFill} stroke={C.line} strokeWidth="2.5" />
        {!sleeveLong && <rect x={sx - 9} y={sy - 9} width="18" height="20" rx="9" fill={cloth} />}
        {item && POINTING.has(item) && <ItemArt name={item} transform={`translate(${sx} ${py + 2}) scale(1.3)`} {...itemProps} />}
        {item && !POINTING.has(item) && (
          <Motion.g style={pivot(sx, py)} initial={false} animate={{ rotate: -angle }} transition={SPRING}>
            <Motion.g key={poseKey} style={pivot(sx, py)} animate={{ rotate: back }} transition={t}>
              <ItemArt name={item} transform={`translate(${sx + (HELD[item]?.[2] || 0)} ${py + (HELD[item]?.[1] || 0)}) scale(${HELD[item]?.[0] || 1.2})`} {...itemProps} />
            </Motion.g>
          </Motion.g>
        )}
        {paw === 'finger' && <rect x={sx - 3.5} y={py + 3} width="7" height="15" rx="3.5" fill={furFill} stroke={C.line} strokeWidth="2" />}
        <circle cx={sx} cy={py} r={big ? 16 : 10} fill={furFill} stroke={C.line} strokeWidth="2.5" />
        {big && (
          <g fill={C.pink}>
            <ellipse cx={sx} cy={py - 3} rx="6.5" ry="5" />
            <circle cx={sx - 8} cy={py + 5} r="2.6" />
            <circle cx={sx - 2.8} cy={py + 9} r="2.6" />
            <circle cx={sx + 2.8} cy={py + 9} r="2.6" />
            <circle cx={sx + 8} cy={py + 5} r="2.6" />
          </g>
        )}
      </Motion.g>
    </Motion.g>
  )
}

/* ── face ─────────────────────────────────────────────────────────────── */
/* a glossy eye: a deep iris gradient, a soft lower glow, two catch-lights */
function Eye({ cx, look = [0, 0], scale = 1, iris = C.ink }) {
  return (
    <g transform={`translate(${cx + look[0]} ${94 + look[1]}) scale(${scale})`}>
      <ellipse rx="13" ry="16" fill={iris} />
      <ellipse cx="0" cy="6" rx="8.5" ry="6.5" fill="#6D5BD0" opacity="0.45" />
      <circle cx="-4.5" cy="-6" r="5.2" fill="#fff" />
      <circle cx="4.5" cy="5.5" r="2.2" fill="#fff" opacity="0.85" />
      <ellipse cx="0" cy="-13.2" rx="7" ry="1.6" fill="#fff" opacity="0.12" />
    </g>
  )
}

const BLINK = { duration: 4.2, repeat: Infinity, times: [0, 0.92, 0.96, 1] }
const LOOK_X = [0, 0, 3.5, 3.5, 0, -3.5, -3.5, 0, 0]
const LOOK_T = { duration: 9, repeat: Infinity, times: [0, 0.3, 0.34, 0.48, 0.52, 0.7, 0.74, 0.86, 1], ease: 'easeInOut' }
// an Archimedes-ish spiral from half circles (dizzy eyes)
const SPIRAL = 'M0 0a2 2 0 0 1 4 0a4 4 0 0 1-8 0a6 6 0 0 1 12 0a8 8 0 0 1-16 0a10 10 0 0 1 20 0'
const HEART = 'M0 6C-12-2-9-12-3-11-1-10.6 0-9 0-8c0-1 1-2.6 3-3 6-1 9 9-3 17z'

function Eyes({ kind, look, small, reduced, roam, iris }) {
  const arc = (d) => <path d={d} stroke={C.ink} strokeWidth="5" strokeLinecap="round" strokeLinejoin="round" fill="none" />
  if (kind === 'happy') return <>{arc('M60 98Q72 82 84 98')}{arc('M116 98Q128 82 140 98')}</>
  if (kind === 'closed') return <>{arc('M60 94Q72 105 84 94')}{arc('M116 94Q128 105 140 94')}</>
  if (kind === 'squeeze') return <>{arc('M61 86 82 95 61 103')}{arc('M139 86 118 95 139 103')}</>
  if (kind === 'cry') return <>{arc('M60 98Q72 90 84 98')}{arc('M116 98Q128 90 140 98')}</>
  if (kind === 'hearts') {
    return (
      <>
        {[72, 128].map(x => (
          <g key={x} transform={`translate(${x} 92) scale(1.25)`}>
            <Motion.path d={HEART} fill="#F43F5E"
              animate={reduced ? undefined : { scale: [1, 1.15, 1] }} style={{ originX: 0.5, originY: 0.5 }}
              transition={{ duration: 0.6, repeat: Infinity }} />
          </g>
        ))}
      </>
    )
  }
  if (kind === 'spiral') {
    return (
      <>
        {[72, 128].map((x, i) => (
          <g key={x} transform={`translate(${x} 94)`}>
            <circle r="15" fill="#fff" stroke={C.ink} strokeWidth="2.5" />
            <Motion.path d={SPIRAL} stroke={C.ink} strokeWidth="2.6" strokeLinecap="round" fill="none"
              style={pivot(0, 0)} animate={reduced ? undefined : { rotate: i ? -360 : 360 }}
              transition={{ duration: 1.1, repeat: Infinity, ease: 'linear' }} />
          </g>
        ))}
      </>
    )
  }
  if (kind === 'shades') {
    return (
      <g>
        <path d="M44 82h112" stroke="#0F172A" strokeWidth="4" strokeLinecap="round" />
        <path d="M47 81h47v9q0 19-21 19h-5q-21 0-21-19z" fill="#0F172A" />
        <path d="M106 81h47v9q0 19-21 19h-5q-21 0-21-19z" fill="#0F172A" />
        <path d="M94 86h12" stroke="#0F172A" strokeWidth="4" />
        <path d="M56 86l10 0M60 92l18-8M115 86h10M119 92l18-8" stroke="#fff" strokeWidth="2.6" strokeLinecap="round" opacity="0.45" />
      </g>
    )
  }
  if (kind === 'wink') {
    return (
      <>
        <Motion.g animate={reduced ? undefined : { scaleY: [1, 1, 0.08, 1] }} style={{ originX: 0.5, originY: 0.5 }} transition={BLINK}>
          <Eye cx={72} iris={iris} />
        </Motion.g>
        {arc('M116 97Q128 85 140 97')}
      </>
    )
  }
  const lidL = kind === 'half' ? 'M54 74h36v20Q72 100 54 94z' : kind === 'angry' ? 'M54 74h36v18L54 80z' : null
  const lidR = kind === 'half' ? 'M110 74h36v20Q128 100 110 94z' : kind === 'angry' ? 'M146 74h-36v18L146 80z' : null
  const scale = kind === 'big' ? 1.14 : small || kind === 'angry' ? 0.86 : 1
  return (
    <Motion.g animate={roam && !reduced ? { x: LOOK_X } : { x: 0 }} transition={roam ? LOOK_T : { duration: 0.3 }}>
      <Motion.g style={{ originX: 0.5, originY: 0.5 }}
        animate={reduced ? undefined : { scaleY: [1, 1, 0.08, 1] }}
        transition={kind === 'half' ? { ...BLINK, duration: 2.6 } : BLINK}>
        <Eye cx={72} look={look} scale={scale} iris={iris} />
        <Eye cx={128} look={look} scale={kind === 'confused' ? 0.78 : scale} iris={iris} />
        {(kind === 'wide' || kind === 'big') && <><circle cx="80" cy="84" r="1.8" fill="#fff" /><circle cx="136" cy="84" r="1.8" fill="#fff" /></>}
      </Motion.g>
      {lidL && (
        <g>
          <path d={lidL} fill={C.furFlat} />
          <path d={lidR} fill={C.furFlat} />
          {kind === 'half' && <path d="M57 94Q72 99 87 94M113 94Q128 99 143 94" stroke={C.ink} strokeWidth="3.2" strokeLinecap="round" fill="none" />}
        </g>
      )}
    </Motion.g>
  )
}

const BROWS = {
  calm: ['M61 70Q72 64 83 70', 'M117 70Q128 64 139 70'],
  up: ['M61 66Q72 58 83 65', 'M117 65Q128 58 139 66'],
  confused: ['M61 71Q72 67 83 72', 'M117 62Q128 52 139 60'],
  // worried: the inner ends (near the nose) are the high ones — the other way round reads as angry
  sad: ['M61 72Q73 70 83 63', 'M117 63Q127 70 139 72'],
  angry: ['M58 70 86 82', 'M114 82 142 70'],
  high: ['M61 59Q72 48 83 56', 'M117 56Q128 48 139 59'],
}

function Mouth({ kind, talking, reduced }) {
  if (talking && kind !== 'sleep') {
    return (
      <Motion.ellipse cx="100" cy="137" rx="9" fill={C.mouth} initial={{ ry: 4 }}
        animate={reduced ? { ry: 6 } : { ry: [3, 9, 4.5, 8, 3] }} transition={{ duration: 0.7, repeat: Infinity }} />
    )
  }
  const line = (d) => <path d={d} stroke={C.mouth} strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" fill="none" />
  switch (kind) {
    case 'open':
      return (
        <>
          <path d="M84 130Q100 160 116 130Z" fill={C.mouth} />
          <path d="M91 146Q100 139 109 146Q100 153 91 146Z" fill={C.tongue} />
        </>
      )
    case 'o': return <ellipse cx="100" cy="138" rx="6" ry="7" fill={C.mouth} />
    case 'blow':
      return (
        <g>
          <ellipse cx="88" cy="132" rx="9" ry="7" fill="#FFE4E6" opacity="0.7" />
          <ellipse cx="112" cy="132" rx="9" ry="7" fill="#FFE4E6" opacity="0.7" />
          <ellipse cx="104" cy="138" rx="4.6" ry="5" fill={C.mouth} />
        </g>
      )
    case 'wavy': return line('M87 139Q93 133 100 139T113 139')
    case 'frown': return line('M88 142Q100 131 112 142')
    case 'yawn':
      return (
        <>
          <ellipse cx="100" cy="141" rx="13" ry="16" fill={C.mouth} />
          <ellipse cx="100" cy="150" rx="8" ry="5" fill={C.tongue} />
        </>
      )
    case 'sleep': return line('M93 137Q100 141 107 137')
    case 'small': return line('M94 137Q100 141 106 137')
    case 'smirk': return line('M88 137Q102 144 114 131')
    case 'chew':
      return (
        <Motion.ellipse cx="100" cy="137" rx="8" fill={C.mouth} initial={{ ry: 2 }}
          animate={reduced ? { ry: 3 } : { ry: [1.5, 5, 1.5] }} transition={{ duration: 0.4, repeat: Infinity }} />
      )
    case 'sing':
      return (
        <Motion.ellipse cx="100" cy="139" rx="8" fill={C.mouth} initial={{ ry: 6 }}
          animate={reduced ? { ry: 8 } : { ry: [5, 10, 6, 10, 5] }} transition={{ duration: 1.2, repeat: Infinity }} />
      )
    case 'gasp':
      return (
        <>
          <ellipse cx="100" cy="141" rx="8.5" ry="11" fill={C.mouth} />
          <ellipse cx="100" cy="147" rx="5" ry="3.5" fill={C.tongue} />
        </>
      )
    case 'cry':
      return (
        <Motion.g style={pivot(100, 140)} animate={reduced ? undefined : { scaleY: [1, 0.85, 1] }} transition={{ duration: 0.35, repeat: Infinity }}>
          <path d="M84 148Q100 126 116 148Q100 141 84 148Z" fill={C.mouth} />
          <path d="M93 146Q100 141 107 146Q100 147 93 146Z" fill={C.tongue} />
        </Motion.g>
      )
    case 'grr':
      return (
        <g>
          <rect x="85" y="131" width="30" height="13" rx="5" fill="#fff" stroke={C.mouth} strokeWidth="3" />
          <path d="M85 137.5h30M93 131v13M100 131v13M107 131v13" stroke={C.mouth} strokeWidth="1.6" />
        </g>
      )
    case 'tongue':
      return (
        <>
          <path d="M87 131Q100 152 113 131Z" fill={C.mouth} />
          <Motion.ellipse cx="100" cy="147" rx="7" ry="8" fill={C.tongue}
            animate={reduced ? undefined : { y: [-2, 3, -2] }} transition={{ duration: 0.5, repeat: Infinity }} />
        </>
      )
    default: return line('M86 133Q100 146 114 133')
  }
}

function Cheeks({ kind, reduced }) {
  if (kind === 'red') {
    return (
      <Motion.g style={pivot(100, 121)} animate={reduced ? undefined : { scale: [1, 1.08, 1] }} transition={{ duration: 0.5, repeat: Infinity }}>
        <ellipse cx="48" cy="120" rx="15" ry="10" fill="#F87171" opacity="0.85" />
        <ellipse cx="152" cy="120" rx="15" ry="10" fill="#F87171" opacity="0.85" />
      </Motion.g>
    )
  }
  if (kind === 'fever') {
    return (
      <g>
        <ellipse cx="49" cy="120" rx="14" ry="9" fill="#F87171" opacity="0.6" />
        <ellipse cx="151" cy="120" rx="14" ry="9" fill="#F87171" opacity="0.6" />
      </g>
    )
  }
  if (kind === 'blush') {
    return (
      <g>
        <ellipse cx="49" cy="120" rx="14" ry="9" fill="#FB7185" opacity="0.55" />
        <ellipse cx="151" cy="120" rx="14" ry="9" fill="#FB7185" opacity="0.55" />
        <path d="M42 124l4-7M49 125l4-7M56 124l4-7M140 124l4-7M147 125l4-7M154 124l4-7" stroke="#F43F5E" strokeWidth="2" strokeLinecap="round" opacity="0.6" />
      </g>
    )
  }
  return (
    <>
      <ellipse cx="50" cy="121" rx="11" ry="7" fill={C.pink} opacity="0.65" />
      <ellipse cx="150" cy="121" rx="11" ry="7" fill={C.pink} opacity="0.65" />
    </>
  )
}

/* tears run down from the eyes (inside the head, so they tilt with it) */
function Tears({ reduced }) {
  if (reduced) {
    return <path d="M62 102q-4 14 0 24M138 102q4 14 0 24" stroke={C.tear} strokeWidth="5" strokeLinecap="round" fill="none" opacity="0.8" />
  }
  return [[60, -1], [140, 1]].flatMap(([x, d]) => [0, 1, 2].map(i => (
    <Motion.path key={`${x}${i}`} d="M0-5q4 5 0 8-4-3 0-8z" fill={C.tear} transform={`translate(${x} 104) scale(1.4)`}
      initial={{ opacity: 0 }} animate={{ opacity: [0, 1, 1, 0], y: [0, 10, 24, 32], x: [0, d * 2, d * 5, d * 7] }}
      transition={{ duration: 1.1, repeat: Infinity, delay: i * 0.36, ease: 'easeIn' }} />
  )))
}

/* ── little effects around Toby ──────────────────────────────────────── */
const SPARKLE = 'M0-9C1-3 3-1 9 0 3 1 1 3 0 9-1 3-3 1-9 0-3-1-1-3 0-9z'
const NOTE = 'M-4.5 0a4.5 3.5-20 1 0 9 0a4.5 3.5-20 1 0-9 0zM3.6-1.5V-19q6 1 8 8'
function Fx({ kind, reduced }) {
  if (!kind) return null
  if (kind === 'sparkle' || kind === 'wink') {
    const spots = kind === 'wink' ? [[160, 70, '#FDE047'], [176, 92, '#fff']] : [[16, 70, '#FDE047'], [186, 84, '#F9A8D4'], [24, 168, '#A5F3FC'], [180, 170, '#FDE047'], [104, -6, '#fff']]
    return spots.map(([x, y, c], i) => (
      <g key={i} transform={`translate(${x} ${y})`}>
        <Motion.path d={SPARKLE} fill={c} style={{ originX: 0.5, originY: 0.5 }}
          initial={{ scale: 0 }} animate={reduced ? { scale: 1 } : { scale: [0, 1.3, 0.8, 1.2, 0], rotate: [0, 45, 90] }}
          transition={{ duration: 1.5, repeat: reduced ? 0 : Infinity, delay: i * 0.18 }} />
      </g>
    ))
  }
  if (kind === 'question') {
    return (
      <Motion.g initial={{ scale: 0, opacity: 0 }} animate={{ scale: 1, opacity: 1, y: reduced ? 0 : [0, -5, 0] }} style={{ originX: 0.5, originY: 0.5 }}
        transition={{ scale: { type: 'spring', stiffness: 300, damping: 14 }, y: { duration: 1.4, repeat: Infinity } }}>
        <circle cx="184" cy="30" r="19" fill="#fff" stroke="#E9D5FF" strokeWidth="3" />
        <circle cx="164" cy="56" r="5" fill="#fff" />
        <text x="184" y="40" textAnchor="middle" fontSize="28" fontWeight="900" fill="#7C3AED" fontFamily="system-ui, sans-serif">?</text>
      </Motion.g>
    )
  }
  if (kind === 'bang') {
    return (
      <Motion.g initial={{ scale: 0, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} style={pivot(182, 28)}
        transition={{ type: 'spring', stiffness: 420, damping: 12 }}>
        <path d="M182 4l6 12 13-3-7 11 10 9-13 2 1 13-10-8-10 8 1-13-13-2 10-9-7-11 13 3z" fill="#FDE047" stroke="#F59E0B" strokeWidth="2" strokeLinejoin="round" />
        <rect x="179" y="13" width="6" height="15" rx="3" fill="#B91C1C" />
        <circle cx="182" cy="33.5" r="3.2" fill="#B91C1C" />
      </Motion.g>
    )
  }
  if (kind === 'zzz' || kind === 'z') {
    const n = kind === 'z' ? 1 : 3
    return Array.from({ length: n }, (_, i) => (
      <Motion.text key={i} x={150 + i * 12} y={40 - i * 4} fontSize={18 + i * 5} fontWeight="900" fill="#C7D2FE" fontFamily="system-ui, sans-serif"
        initial={{ opacity: 0, y: 0 }} animate={reduced ? { opacity: 0.9 } : { opacity: [0, 1, 0], y: [8, -26], x: [0, 10] }}
        transition={{ duration: kind === 'z' ? 3.2 : 2.4, repeat: Infinity, delay: i * 0.8, ease: 'easeOut' }}>z</Motion.text>
    ))
  }
  if (kind === 'hearts' || kind === 'notes') {
    const spots = [[30, 60, '#FB7185'], [172, 52, '#F472B6'], [186, 110, '#FDA4AF']]
    return spots.map(([x, y, c], i) => (
      <g key={i} transform={`translate(${x} ${y})`}>
        <Motion.g initial={{ opacity: 0 }} animate={reduced ? { opacity: 1 } : { opacity: [0, 1, 0], y: [6, -22], rotate: [-10, 10] }}
          transition={{ duration: 1.8, repeat: Infinity, delay: i * 0.5 }}>
          {kind === 'hearts'
            ? <path d={HEART} fill={c} transform="scale(0.95)" />
            : <path d={NOTE} fill="#A78BFA" stroke="#8B5CF6" strokeWidth="2.4" strokeLinecap="round" />}
        </Motion.g>
      </g>
    ))
  }
  if (kind === 'haha') {
    return (
      <Motion.text x="176" y="44" fontSize="20" fontWeight="900" fill="#FDE047" textAnchor="middle" fontFamily="system-ui, sans-serif"
        stroke="#B45309" strokeWidth="0.8" initial={{ opacity: 0 }}
        animate={reduced ? { opacity: 1 } : { opacity: [0, 1, 1, 0], rotate: [-8, 8, -8] }} style={{ originX: 0.5, originY: 0.5 }}
        transition={{ duration: 1.2, repeat: Infinity }}>ha ha</Motion.text>
    )
  }
  if (kind === 'steam') {
    return [[34, 34, -1], [166, 34, 1]].flatMap(([x, y, d]) => [0, 1].map(i => (
      <g key={`${x}${i}`} transform={`translate(${x} ${y})`}>
        <Motion.path d="M-7 0a7 7 0 0 1 7-7a8 8 0 0 1 12 4a6 6 0 0 1-2 11h-14a6 6 0 0 1-3-8z" fill="#fff" stroke="#E2E8F0" strokeWidth="1.5"
          initial={{ opacity: 0, scale: 0.4 }}
          animate={reduced ? { opacity: 0.9, scale: 1 } : { opacity: [0, 1, 0], scale: [0.4, 1, 1.3], x: [0, d * 10, d * 16], y: [0, -14, -26] }}
          transition={{ duration: 1.1, repeat: Infinity, delay: i * 0.55, ease: 'easeOut' }} />
      </g>
    )))
  }
  if (kind === 'stars') {
    // three stars orbiting above his head (a squashed circle)
    return (
      <g transform="translate(100 26) scale(1 0.34)">
        <Motion.g style={pivot(0, 0)} animate={reduced ? undefined : { rotate: 360 }} transition={{ duration: 1.6, repeat: Infinity, ease: 'linear' }}>
          {[0, 120, 240].map(a => (
            <g key={a} transform={`rotate(${a}) translate(62 0) scale(1 2.9)`}>
              <path d={SPARKLE} fill="#FDE047" stroke="#F59E0B" strokeWidth="1" transform="scale(1.1)" />
            </g>
          ))}
        </Motion.g>
      </g>
    )
  }
  if (kind === 'sweat') {
    return (
      <Motion.path d="M0-6q5 6 0 9.5-5-3.5 0-9.5z" fill={C.tear} transform="translate(150 52) scale(1.5)"
        initial={{ opacity: 0 }} animate={reduced ? { opacity: 0.9 } : { opacity: [0, 1, 1, 0], y: [0, 4, 12, 18] }}
        transition={{ duration: 2.2, repeat: Infinity, repeatDelay: 0.6, ease: 'easeIn' }} />
    )
  }
  if (kind === 'puff') {
    // little clouds of air leaving the mouth (blowing out candles, a deep breath)
    return [0, 1, 2].map(i => (
      <Motion.circle key={i} cx="118" cy="138" r={4 + i * 1.5} fill="#fff" stroke="#E0F2FE" strokeWidth="1.5"
        initial={{ opacity: 0 }} animate={reduced ? { opacity: 0.8, x: 14 + i * 12 } : { opacity: [0, 0.95, 0], x: [0, 26 + i * 10, 52 + i * 12], y: [0, -2, -6] }}
        transition={{ duration: 1.1, repeat: Infinity, delay: i * 0.22, ease: 'easeOut' }} />
    ))
  }
  if (kind === 'glint') {
    return (
      <g transform="translate(150 80)">
        <Motion.path d={SPARKLE} fill="#fff" style={pivot(0, 0)} initial={{ scale: 0 }}
          animate={reduced ? { scale: 0.8 } : { scale: [0, 1, 0, 0], rotate: [0, 90, 90, 90] }}
          transition={{ duration: 2.4, repeat: Infinity, times: [0, 0.15, 0.3, 1] }} />
      </g>
    )
  }
  return null
}

/* ── accessories ──────────────────────────────────────────────────────── */
const HATS = new Set(['cap', 'crown', 'party'])

/* on top of the head (drawn after the face so it sits over it) */
function HeadAcc({ acc }) {
  switch (acc) {
    case 'crown':
      return (
        <g transform="rotate(-5 100 30)">
          <path d="M70 42 66 11 84 26 100 1l16 25 18-15-4 31Q100 50 70 42z" fill="#FACC15" stroke="#CA8A04" strokeWidth="2.5" strokeLinejoin="round" />
          <path d="M70 42Q100 50 130 42l-1-8Q100 42 71 34z" fill="#F59E0B" />
          <circle cx="100" cy="37" r="4.2" fill="#F43F5E" />
          <circle cx="84" cy="36.5" r="3" fill="#38BDF8" />
          <circle cx="116" cy="36.5" r="3" fill="#22C55E" />
          {[[66, 11], [100, 1], [134, 11]].map(([x, y]) => <circle key={x} cx={x} cy={y} r="3.6" fill="#FDE047" stroke="#CA8A04" strokeWidth="1.5" />)}
          <path d="M79 20l2 11" stroke="#FEF9C3" strokeWidth="2.6" strokeLinecap="round" opacity="0.85" />
        </g>
      )
    case 'cap':
      return (
        <g>
          <path d="M42 58C42 10 158 10 158 58Q100 44 42 58z" fill="#EF4444" stroke="#B91C1C" strokeWidth="2.5" strokeLinejoin="round" />
          <path d="M100 16v34M70 22q-8 14-6 32M130 22q8 14 6 32" stroke="#DC2626" strokeWidth="2" fill="none" />
          <circle cx="100" cy="15" r="4.5" fill="#B91C1C" />
          <path d="M100 26l2.4 4.8 5.3.8-3.8 3.7.9 5.3-4.8-2.5-4.8 2.5.9-5.3-3.8-3.7 5.3-.8z" fill="#fff" />
          <path d="M38 56Q100 40 162 56Q164 66 150 68Q100 54 50 68Q36 66 38 56z" fill="#B91C1C" />
          <path d="M52 60Q100 48 148 60" stroke="#F87171" strokeWidth="2" fill="none" opacity="0.7" />
        </g>
      )
    case 'party':
      return (
        <g transform="rotate(16 114 40)">
          <path d="M94 42 115 -6 136 42Q115 50 94 42z" fill="#A78BFA" stroke="#7C3AED" strokeWidth="2" strokeLinejoin="round" />
          <path d="M103 22 128 26M98 34 133 38M109 9 122 11" stroke="#FDE047" strokeWidth="4" strokeLinecap="round" />
          {[[112, 30, '#F472B6'], [122, 18, '#38BDF8'], [106, 40, '#34D399']].map(([x, y, c]) => <circle key={x} cx={x} cy={y} r="2.4" fill={c} />)}
          <circle cx="115" cy="-7" r="6.5" fill="#FDE047" stroke="#F59E0B" strokeWidth="1.5" />
        </g>
      )
    case 'bow':
      return (
        <g transform="rotate(18 132 34)">
          <path d="M132 34C114 14 104 44 132 34z" fill="#F472B6" stroke="#DB2777" strokeWidth="2" strokeLinejoin="round" />
          <path d="M132 34C150 14 160 44 132 34z" fill="#F472B6" stroke="#DB2777" strokeWidth="2" strokeLinejoin="round" />
          <path d="M118 30q4 2 8 3M146 30q-4 2-8 3" stroke="#FBCFE8" strokeWidth="2" strokeLinecap="round" />
          <circle cx="132" cy="34" r="5.5" fill="#EC4899" stroke="#DB2777" strokeWidth="1.5" />
        </g>
      )
    case 'headphones':
      return (
        <g>
          <path d="M30 96C24 2 176 2 170 96" stroke="#334155" strokeWidth="9" fill="none" strokeLinecap="round" />
          <path d="M34 80C34 18 166 18 166 80" stroke="#64748B" strokeWidth="2.5" fill="none" opacity="0.8" />
          <rect x="15" y="76" width="25" height="42" rx="11" fill="#F43F5E" stroke="#BE123C" strokeWidth="2.5" />
          <rect x="160" y="76" width="25" height="42" rx="11" fill="#F43F5E" stroke="#BE123C" strokeWidth="2.5" />
          <path d="M21 86v22M179 86v22" stroke="#FDA4AF" strokeWidth="2.5" strokeLinecap="round" />
        </g>
      )
    default:
      return null
  }
}

function Glasses() {
  return (
    <g>
      <circle cx="72" cy="94" r="19" fill="#fff" fillOpacity="0.14" stroke="#1E293B" strokeWidth="4" />
      <circle cx="128" cy="94" r="19" fill="#fff" fillOpacity="0.14" stroke="#1E293B" strokeWidth="4" />
      <path d="M91 90Q100 84 109 90M53 89 33 83M147 89l20-6" stroke="#1E293B" strokeWidth="4" strokeLinecap="round" fill="none" />
      <path d="M61 86q4-6 10-6M117 86q4-6 10-6" stroke="#fff" strokeWidth="2.4" strokeLinecap="round" fill="none" opacity="0.8" />
    </g>
  )
}

function Scarf() {
  return (
    <g>
      <path d="M56 156Q100 178 144 156l2 14Q100 194 54 170z" fill="#22C55E" stroke="#15803D" strokeWidth="2" strokeLinejoin="round" />
      <path d="M72 165l3 14M92 170l1 14M112 170l-1 14M130 165l-3 14" stroke="#BBF7D0" strokeWidth="3" />
      <path d="M118 172l3 32q1 4 5 4l9-1q4-1 3-5l-6-31z" fill="#16A34A" stroke="#15803D" strokeWidth="2" strokeLinejoin="round" />
      <path d="M120 186l12-2M121 196l12-2" stroke="#BBF7D0" strokeWidth="2.5" />
      <path d="M123 208v6M128 208v6M133 207v6" stroke="#15803D" strokeWidth="2" strokeLinecap="round" />
    </g>
  )
}

/* ── bits of the body ─────────────────────────────────────────────────── */
function Hair({ kind, fill }) {
  const d = kind === 'messy'
    ? 'M84 42C76 26 84 14 94 22C92 8 108 2 110 18C116 8 130 12 122 28C116 36 98 38 84 42Z'
    : 'M90 40C88 26 98 16 112 18C124 20 126 30 119 35C113 28 102 28 99 39Z'
  return <path d={d} fill={fill} stroke={C.line} strokeWidth="2.5" strokeLinejoin="round" />
}

function NightCap() {
  return (
    <g>
      <path d="M112 30C140 14 172 26 180 62C168 50 152 42 134 44Z" fill="#6D7CFF" />
      <path d="M56 56C56 18 144 18 144 56C120 47 80 47 56 56Z" fill="#7C8BFF" />
      <path d="M78 26 74 50M100 22v26M122 26l4 24" stroke="#fff" strokeWidth="3" opacity="0.35" strokeLinecap="round" />
      <path d="M56 56C80 47 120 47 144 56" stroke="#fff" strokeWidth="8" strokeLinecap="round" fill="none" />
      <circle cx="181" cy="65" r="9" fill="#fff" stroke="#E2E8F0" strokeWidth="2" />
    </g>
  )
}

function Bike({ moving, reduced }) {
  const wheel = (cx) => (
    <Motion.g style={{ originX: 0.5, originY: 0.5 }} animate={moving && !reduced ? { rotate: 360 } : { rotate: 0 }}
      transition={moving ? { duration: 0.5, repeat: Infinity, ease: 'linear' } : { duration: 0.2 }}>
      <circle cx={cx} cy="216" r="22" fill="none" stroke="#1E293B" strokeWidth="6" />
      <circle cx={cx} cy="216" r="22" fill="none" stroke="#64748B" strokeWidth="2" />
      <path d={`M${cx - 20} 216h40M${cx} 196v40M${cx - 14} 202l28 28M${cx + 14} 202l-28 28`} stroke="#94A3B8" strokeWidth="1.5" />
      <circle cx={cx} cy="216" r="3.5" fill="#334155" />
    </Motion.g>
  )
  return (
    <g>
      {wheel(44)}
      {wheel(156)}
      <path d="M44 216 84 184h56l16 32M84 184l16 32 40-32M140 184l-6-22" stroke="#22C55E" strokeWidth="6" strokeLinecap="round" strokeLinejoin="round" fill="none" />
      <path d="M120 162h24" stroke="#1E293B" strokeWidth="6" strokeLinecap="round" />
    </g>
  )
}

/* feet while sitting: soles to the viewer */
function SitFeet({ fur }) {
  return (
    <g>
      {[72, 128].map(x => (
        <g key={x}>
          <ellipse cx={x} cy="236" rx="15" ry="13" fill={fur} stroke={C.line} strokeWidth="2.5" />
          <ellipse cx={x} cy="239" rx="6" ry="4.5" fill={C.pink} />
          <circle cx={x - 6} cy="231" r="2.3" fill={C.pink} />
          <circle cx={x} cy="229" r="2.3" fill={C.pink} />
          <circle cx={x + 6} cy="231" r="2.3" fill={C.pink} />
        </g>
      ))}
    </g>
  )
}

/* whole-body movement for a pose: sway (dance), squeeze (hug), lie (on his side) */
function bodyMotion(mode, reduced) {
  const lie = mode === 'lie'
  const still = { rotate: lie ? -80 : 0, x: lie ? 88 : 0, y: lie ? -35 : 0, scaleX: 1, scaleY: 1 }
  if (reduced || lie || !mode) return [still, SPRING]
  if (mode === 'sway') return [{ ...still, rotate: [-8, 8, -8] }, { duration: 0.92, repeat: Infinity, ease: 'easeInOut' }]
  if (mode === 'squeeze') return [{ ...still, scaleX: [1, 0.94, 1], scaleY: [1, 1.03, 1] }, { duration: 0.9, repeat: Infinity, ease: 'easeInOut' }]
  return [still, SPRING]
}

/* ── Toby ─────────────────────────────────────────────────────────────── */
export default function Toby({
  mood = 'idle', pose = 'rest', left = null, right = null, leftProps, rightProps,
  outfit = 'tshirt', hair = 'neat', cap = false, talking = false, walking = false, vehicle = null,
  jump = 0, kick = 0, reduced = false, acc = null, pokes: canPoke = true,
}) {
  const uid = useId().replace(/[^a-zA-Z0-9_-]/g, '')
  const fur = `url(#${uid}fur)`
  const [poke, setPoke] = useState(null)        // a reaction mood after a poke
  const [fidget, setFidget] = useState(null)    // [mood, pose] he does on his own while idle
  const [hop, setHop] = useState(0)
  const pokes = useRef({ n: 0, times: [], timer: 0 })
  const hopper = useAnimationControls()
  const spinner = useAnimationControls()

  const calm = mood === 'idle' && pose === 'rest' && !talking && !walking && !vehicle && !reduced
  const reacting = poke && canPoke && POKEABLE.has(mood) && !reduced ? poke : null
  const idleAct = calm && !reacting ? fidget : null
  const moodKey = reacting || idleAct?.[0] || mood
  const poseKey = idleAct?.[1] || pose
  const m = MOODS[moodKey] || MOODS.idle
  const p = POSES[poseKey] || POSES.rest
  const o = OUTFITS[outfit] || OUTFITS.tshirt
  const pj = outfit === 'pyjamas'
  const sit = p.body === 'sit'
  const lie = p.body === 'lie'
  let bob = false
  let bobT
  if (!reduced) {
    if (walking) { bob = { y: [0, -6, 0] }; bobT = { duration: 0.36, repeat: Infinity } }
    else if (p.body === 'bounce') { bob = { y: [0, -9, 0] }; bobT = { duration: 0.42, repeat: Infinity, ease: 'easeOut' } }
    else if (p.body === 'sway') { bob = { y: [0, -5, 0] }; bobT = { duration: 0.46, repeat: Infinity, ease: 'easeInOut' } }
    else { bob = { y: [0, -2.5, 0] }; bobT = { duration: 2.6, repeat: Infinity, ease: 'easeInOut' } }
  }
  const [bodyAnim, bodyT] = bodyMotion(p.body, reduced)
  const lift = { y: sit ? 10 : 0 }
  const fast = moodKey === 'happy' || moodKey === 'love' || p.body === 'sway' || p.body === 'bounce'
  const sway = !reduced && (moodKey === 'idle' || moodKey === 'listening' || moodKey === 'sick') && !walking && !vehicle && p.body !== 'lie'
  const hatsOff = cap                    // the night cap replaces any hat
  const shades = m.eyes === 'shades'

  // a hop: from outside (jump counter) or on his own (idle)
  useEffect(() => {
    if (reduced || (!jump && !hop)) return
    hopper.start({ y: [0, -30, 0, -12, 0], transition: { duration: 0.85, ease: 'easeOut' } })
  }, [jump, hop, reduced, hopper])

  // spin: one whole-body flip each time the pose starts
  useEffect(() => {
    if (poseKey !== 'spin' || reduced) return
    spinner.set({ rotate: 0 })
    spinner.start({ rotate: 360, y: [0, -26, 0], transition: { duration: 0.9, ease: 'easeInOut' } })
  }, [poseKey, reduced, spinner])

  // idle life: after ~12 s of standing still he yawns and stretches, then hops / waves now and then
  useEffect(() => {
    if (!calm) return undefined
    let n = 0
    let t = 0
    const plan = () => {
      t = setTimeout(() => {
        const [fm, fp, ms] = FIDGETS[n % FIDGETS.length]
        n += 1
        if (fm === 'hop') setHop(h => h + 1)
        else setFidget([fm, fp])
        t = setTimeout(() => { setFidget(null); plan() }, ms)
      }, n === 0 ? 12000 : 6500 + (n % 3) * 1500)
    }
    plan()
    return () => { clearTimeout(t); setFidget(null) }
  }, [calm])

  useEffect(() => () => clearTimeout(pokes.current.timer), [])

  /* poke: giggle → surprised → love …; five quick pokes → dizzy */
  const onPoke = () => {
    if (reduced || !canPoke || !POKEABLE.has(mood)) return
    const s = pokes.current
    const now = Date.now()
    s.times = [...s.times.filter(x => now - x < 2500), now]
    let next
    let ms = 1300
    if (s.times.length >= 5) { next = 'dizzy'; ms = 2400; s.times = [] }
    else { next = POKE_CYCLE[s.n % POKE_CYCLE.length]; s.n += 1 }
    clearTimeout(s.timer)
    setPoke(next)
    s.timer = setTimeout(() => setPoke(null), ms)
  }

  return (
    <g onClick={onPoke}>
      <defs>
        <radialGradient id={`${uid}fur`} cx="0.36" cy="0.28" r="0.9">
          <stop offset="0" stopColor="#FFFFFF" />
          <stop offset="0.45" stopColor={C.fur} />
          <stop offset="0.85" stopColor="#F3E1CB" />
          <stop offset="1" stopColor="#EBD3B7" />
        </radialGradient>
        {/* soft shade on the lower right of the head: it reads as round, not flat */}
        <radialGradient id={`${uid}shade`} cx="0.34" cy="0.26" r="0.95">
          <stop offset="0.55" stopColor="#C49A6C" stopOpacity="0" />
          <stop offset="1" stopColor="#C49A6C" stopOpacity="0.26" />
        </radialGradient>
        <radialGradient id={`${uid}iris`} cx="0.42" cy="0.36" r="0.75">
          <stop offset="0" stopColor="#3A3170" />
          <stop offset="0.6" stopColor="#1E1B3A" />
          <stop offset="1" stopColor="#111122" />
        </radialGradient>
        <radialGradient id={`${uid}ground`}>
          <stop offset="0" stopColor="#000" stopOpacity="0.3" />
          <stop offset="0.6" stopColor="#000" stopOpacity="0.14" />
          <stop offset="1" stopColor="#000" stopOpacity="0" />
        </radialGradient>
        <linearGradient id={`${uid}cloth`} x1="0" y1="0" x2="0.3" y2="1">
          <stop offset="0" stopColor={o.main} />
          <stop offset="1" stopColor={o.dark} />
        </linearGradient>
      </defs>

      {/* a soft contact shadow stays on the ground */}
      <ellipse cx="100" cy="238" rx={vehicle ? 86 : lie ? 94 : sit ? 66 : 60} ry="10" fill={`url(#${uid}ground)`} />

      <Motion.g initial={{ y: 0 }} animate={hopper}>
        <Motion.g animate={bob || undefined} transition={bobT}>
          {vehicle === 'bike' && <Bike moving={walking} reduced={reduced} />}

          <Motion.g style={pivot(100, 140)} initial={{ rotate: 0 }} animate={spinner}>
            <Motion.g style={pivot(100, 230)} initial={false} animate={bodyAnim} transition={bodyT}>
              <Motion.g initial={false} animate={lift} transition={SPRING}>
                {/* tail */}
                <Motion.g style={pivot(134, 214)} animate={reduced ? undefined : { rotate: fast ? [-10, 14, -10] : [-4, 5, -4] }}
                  transition={{ duration: fast ? 0.5 : 2.2, repeat: Infinity, ease: 'easeInOut' }}>
                  <path d="M134 214C162 214 178 196 170 172" stroke={C.line} strokeWidth="15" strokeLinecap="round" fill="none" />
                  <path d="M134 214C162 214 178 196 170 172" stroke={fur} strokeWidth="10" strokeLinecap="round" fill="none" />
                </Motion.g>

                {/* body / clothes */}
                <Motion.g style={pivot(100, 234)} animate={reduced || walking ? undefined : { scaleY: [1, 1.025, 1] }}
                  transition={{ duration: 2.6, repeat: Infinity, ease: 'easeInOut' }}>
                  <ellipse cx="100" cy="196" rx="44" ry="38" fill={`url(#${uid}cloth)`} stroke={o.dark} strokeWidth="2.5" />
                  <ellipse cx="84" cy="178" rx="17" ry="9" fill="#fff" opacity="0.16" transform="rotate(-24 84 178)" />
                  {pj ? (
                    <g fill="#fff" opacity="0.75">
                      {[[78, 182], [118, 178], [96, 206], [72, 210], [126, 212], [104, 222], [86, 224]].map(([x, y], i) => <circle key={i} cx={x} cy={y} r="3.2" />)}
                    </g>
                  ) : (
                    <path d="M100 186l3.8 7.7 8.5 1.2-6.2 6 1.5 8.4-7.6-4-7.6 4 1.5-8.4-6.2-6 8.5-1.2z" fill="#fff" opacity="0.95" />
                  )}
                </Motion.g>
              </Motion.g>

              {/* feet */}
              {sit ? <SitFeet fur={fur} /> : (
                <>
                  {/* steps move the feet with a translate, not the cy attribute (attribute keyframes
                      can be written as cy="undefined" when a walk is interrupted) */}
                  <Motion.ellipse cx="78" cy="230" rx="16" ry="9" fill={fur} stroke={C.line} strokeWidth="2.5" initial={false}
                    animate={walking && !reduced ? { y: [0, -4, 0] } : { y: 0 }} transition={{ duration: 0.36, repeat: walking ? Infinity : 0 }} />
                  <Motion.g key={`k${kick}`} style={pivot(122, 222)} initial={{ rotate: 0, x: 0 }}
                    animate={kick && !reduced ? { rotate: [0, -48, 0], x: [0, 6, 0] } : { rotate: 0 }} transition={{ duration: 0.6 }}>
                    <Motion.ellipse cx="122" cy="230" rx="16" ry="9" fill={fur} stroke={C.line} strokeWidth="2.5" initial={false}
                      animate={walking && !reduced ? { y: [-4, 0, -4] } : { y: 0 }} transition={{ duration: 0.36, repeat: walking ? Infinity : 0 }} />
                  </Motion.g>
                </>
              )}

              <Motion.g initial={false} animate={lift} transition={SPRING}>
                {/* head */}
                <Motion.g style={pivot(100, 160)} initial={false} animate={{ rotate: (m.tilt || 0) + (p.tilt || 0) }} transition={SPRING}>
                 {/* a slow, gentle head sway while he just stands there */}
                 <Motion.g style={pivot(100, 160)} initial={false} animate={sway ? { rotate: [-1.8, 1.8, -1.8] } : { rotate: 0 }}
                   transition={sway ? { duration: 6.4, repeat: Infinity, ease: 'easeInOut' } : { duration: 0.5, ease: 'easeOut' }}>
                  {/* ears: perk up while listening, twitch now and then */}
                  <Motion.g style={pivot(60, 56)}
                    animate={reduced ? { rotate: 0 } : moodKey === 'listening' ? { rotate: [0, -10, 0] } : { rotate: [0, 0, -11, 3, 0] }}
                    transition={moodKey === 'listening' ? { duration: 0.8, repeat: Infinity } : { duration: 6.5, repeat: Infinity, times: [0, 0.86, 0.9, 0.95, 1] }}>
                    <path d="M34 72C28 42 32 16 46 9C60 12 76 26 88 42Z" fill={fur} stroke={C.line} strokeWidth="2.5" strokeLinejoin="round" />
                    <path d="M45 56C42 40 45 26 51 22C59 26 67 33 74 42Z" fill={C.pink} />
                  </Motion.g>
                  <Motion.g style={pivot(140, 56)}
                    animate={reduced ? { rotate: 0 } : moodKey === 'listening' ? { rotate: [0, 10, 0] } : { rotate: [0, 0, 11, -3, 0] }}
                    transition={moodKey === 'listening' ? { duration: 0.8, repeat: Infinity, delay: 0.2 } : { duration: 8.3, repeat: Infinity, times: [0, 0.8, 0.84, 0.9, 1], delay: 1.5 }}>
                    <path d="M166 72C172 42 168 16 154 9C140 12 124 26 112 42Z" fill={fur} stroke={C.line} strokeWidth="2.5" strokeLinejoin="round" />
                    <path d="M155 56C158 40 155 26 149 22C141 26 133 33 126 42Z" fill={C.pink} />
                  </Motion.g>

                  <ellipse cx="100" cy="98" rx="72" ry="66" fill={fur} stroke={C.line} strokeWidth="3" />
                  <ellipse cx="100" cy="98" rx="70.5" ry="64.5" fill={`url(#${uid}shade)`} />
                  {cap ? <NightCap /> : <Hair kind={hair} fill={fur} />}

                  {/* cheeks, muzzle, whiskers */}
                  <Cheeks kind={m.cheeks} reduced={reduced} />
                  <ellipse cx="100" cy="126" rx="30" ry="21" fill={C.muzzle} />
                  <g stroke={C.whisker} strokeWidth="2" strokeLinecap="round">
                    <path d="M66 120H44M66 127l-21 5M134 120h22M134 127l21 5" />
                  </g>
                  <path d="M92 112Q100 106 108 112Q105 120 100 121Q95 120 92 112Z" fill={C.nose} />
                  <ellipse cx="97" cy="111" rx="2.5" ry="1.4" fill="#fff" opacity="0.7" />

                  <Eyes kind={m.eyes} look={m.look} small={m.small} reduced={reduced} roam={moodKey === 'idle'} iris={`url(#${uid}iris)`} />
                  {BROWS[m.brows] && BROWS[m.brows].map((d, i) => (
                    <path key={i} d={d} stroke={C.brow} strokeWidth="4" strokeLinecap="round" fill="none" />
                  ))}
                  <Mouth kind={m.mouth} talking={talking} reduced={reduced} />
                  {m.face === 'tears' && <Tears reduced={reduced} />}

                  {acc === 'glasses' && !shades && <Glasses />}
                  {acc && !(hatsOff && HATS.has(acc)) && <HeadAcc acc={acc} />}

                  {/* comb glides over the hair */}
                  {poseKey === 'comb' && (
                    <Motion.g animate={reduced ? undefined : { x: [-22, 22, -22] }} transition={{ duration: 1, repeat: Infinity, ease: 'easeInOut' }}>
                      <ItemArt name="comb" transform="translate(102 30) rotate(-6)" />
                    </Motion.g>
                  )}
                 </Motion.g>
                </Motion.g>

                {acc === 'scarf' && <Scarf />}

                {/* arms (in front of the head so paws can reach the mouth) */}
                <Arm side="l" angle={p.l} wiggle={p.lw} dur={p.dur} once={p.once} poseKey={poseKey} cloth={`url(#${uid}cloth)`}
                  sleeveLong={pj} item={left} itemProps={leftProps} reduced={reduced} furFill={fur} len={p.ll} />
                <Arm side="r" angle={p.r} wiggle={p.rw} dur={p.dur} once={p.once} poseKey={poseKey} cloth={`url(#${uid}cloth)`}
                  sleeveLong={pj} item={right} itemProps={rightProps} reduced={reduced} furFill={fur} len={p.rl} paw={p.paw} />
              </Motion.g>
            </Motion.g>
          </Motion.g>
        </Motion.g>
      </Motion.g>

      <Fx key={moodKey} kind={m.fx} reduced={reduced} />
    </g>
  )
}

/* Toby on his own (map, end screen). */
export function TobyAvatar({ className = '', ...props }) {
  return (
    <svg viewBox="-14 -16 228 262" className={className} overflow="visible" aria-hidden>
      <Toby {...props} />
    </svg>
  )
}
