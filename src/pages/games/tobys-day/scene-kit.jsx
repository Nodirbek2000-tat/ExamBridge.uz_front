/*
 * TOBY'S DAY — small drawing pieces shared by every room: gradients, the wide
 * wall / floor (painted past the 360 × 300 view, see world-geo.js), sparkles,
 * puffs, steam, bubbles, water drops, comic "POP!" words and the close-up card.
 * Effects never animate SVG geometry when a transform will do (cheap on phones).
 */
import { motion as Motion } from 'framer-motion'
import { AT0, BH, BW, BX, BY, FLOOR, FONT } from './world-geo'

export function Grad({ id, stops, x2 = 0, y2 = 1 }) {
  return (
    <linearGradient id={id} x1="0" y1="0" x2={x2} y2={y2}>
      {stops.map((c, i) => <stop key={i} offset={stops.length > 1 ? i / (stops.length - 1) : 0} stopColor={c} />)}
    </linearGradient>
  )
}

/* the back wall, painted wide and tall */
export function Wall({ fill, to = FLOOR }) {
  return <rect x={BX} y={BY} width={BW} height={to - BY} fill={fill} />
}

/* the floor from the wall line down, painted wide */
export function Floor({ fill, y = FLOOR, lines, line = '#0002' }) {
  return (
    <g>
      <rect x={BX} y={y} width={BW} height={BH} fill={fill} />
      {lines && <path d={lines.map(ly => `M${BX} ${ly}H${BX + BW}`).join('')} stroke={line} strokeWidth="2" />}
    </g>
  )
}

/* a full-size tint over everything (night, a dark room) */
export function Dim({ opacity, color = '#1E1B4B', duration = 1.2 }) {
  return (
    <Motion.rect x={BX} y={BY} width={BW} height={BH} fill={color} initial={false} animate={{ opacity }} transition={{ duration }}
      pointerEvents="none" />
  )
}

const SPARK = 'M0-9C1-3 3-1 9 0 3 1 1 3 0 9-1 3-3 1-9 0-3-1-1-3 0-9z'

export function Sparkles({ x, y, delay = 0, r = 22, reduced, n = 6, colors = ['#FDE047', '#F9A8D4', '#A5F3FC'] }) {
  if (reduced) return null
  return Array.from({ length: n }, (_, i) => {
    const a = (i / n) * Math.PI * 2
    return (
      <Motion.g key={i} style={AT0} initial={{ x, y, opacity: 0, scale: 0.3 }}
        animate={{ x: [x, x + Math.cos(a) * r], y: [y, y + Math.sin(a) * r], opacity: [0, 1, 0], scale: [0.3, 1, 0.6] }}
        transition={{ duration: 0.85, delay }}>
        <path d={SPARK} fill={colors[i % colors.length]} transform="scale(.42)" />
      </Motion.g>
    )
  })
}

/* sparkles that keep twinkling around a spot */
export function Twinkle({ x, y, w = 40, h = 30, reduced, n = 4, color = '#FDE047' }) {
  if (reduced) return null
  return Array.from({ length: n }, (_, i) => (
    <Motion.g key={i} style={AT0} initial={{ x: x + ((i * 37) % w) - w / 2, y: y + ((i * 23) % h) - h / 2, scale: 0 }}
      animate={{ scale: [0, 1, 0], rotate: [0, 90] }} transition={{ duration: 1.3, repeat: Infinity, delay: i * 0.33 }}>
      <path d={SPARK} fill={color} transform="scale(.5)" />
    </Motion.g>
  ))
}

/* a white "poof" cloud (dressing up, a quick change) */
export function Puff({ x, y, reduced, color = '#fff' }) {
  if (reduced) return null
  return [[-26, -6, 22], [24, -10, 24], [0, -30, 26], [-16, 18, 20], [18, 16, 20], [0, 4, 30]].map(([dx, dy, r], i) => (
    <Motion.circle key={i} cx={x + dx} cy={y + dy} r={r} fill={color} style={{ originX: 0.5, originY: 0.5 }}
      initial={{ scale: 0, opacity: 0.95 }} animate={{ scale: [0, 1, 1.2], opacity: [0.95, 0.95, 0] }}
      transition={{ duration: 0.9, delay: i * 0.03, times: [0, 0.45, 1] }} />
  ))
}

export function Steam({ x, y, reduced, n = 3, color = '#fff', h = 1 }) {
  return Array.from({ length: n }, (_, i) => (
    <Motion.path key={i} d={`M${x + (i - (n - 1) / 2) * 7} ${y}q-5-${6 * h} 0-${12 * h}t0-${12 * h}`} stroke={color} strokeWidth="3"
      strokeLinecap="round" fill="none" initial={{ opacity: 0 }}
      animate={reduced ? { opacity: 0.7 } : { opacity: [0, 0.85, 0], y: [4, -10] }}
      transition={{ duration: 1.6, repeat: Infinity, delay: i * 0.45 }} />
  ))
}

/* soap bubbles rising from a spot */
export function Bubbles({ x, y, w = 50, rise = 60, reduced, n = 7, delay = 0 }) {
  if (reduced) {
    return [0, 1, 2].map(i => <circle key={i} cx={x + (i - 1) * 12} cy={y - 8 - i * 6} r={4 + i} fill="#fff" fillOpacity="0.5" stroke="#7DD3FC" />)
  }
  return Array.from({ length: n }, (_, i) => {
    const bx = x + ((i * 29) % w) - w / 2
    const r = 3 + (i % 3) * 1.6
    return (
      <Motion.circle key={i} cx={bx} cy={y} r={r} fill="#fff" fillOpacity="0.5" stroke="#7DD3FC" strokeWidth="1.2"
        initial={{ y: 0, opacity: 0 }} animate={{ y: [0, -rise - (i % 3) * 10], x: [0, (i % 2 ? 6 : -6), 0], opacity: [0, 1, 0] }}
        transition={{ duration: 1.7, repeat: Infinity, delay: delay + i * 0.22, ease: 'easeOut' }} />
    )
  })
}

/* water falling in drops (a tap, a shower) */
export function Drops({ x, y, len = 30, reduced, n = 4, color = '#38BDF8', spread = 0 }) {
  if (reduced) return <path d={`M${x} ${y}v${len}`} stroke={color} strokeWidth="3" strokeLinecap="round" opacity="0.8" />
  return Array.from({ length: n }, (_, i) => (
    <Motion.path key={i} d={`M${x} ${y - 4}q3.6 4.5 0 7.2-3.6-2.7 0-7.2z`} fill={color}
      initial={{ y: 0, opacity: 0 }} animate={{ y: [0, len], x: [0, spread * ((i % 3) - 1)], opacity: [0, 1, 0] }}
      transition={{ duration: 0.6, repeat: Infinity, delay: i * (0.6 / n), ease: 'easeIn' }} />
  ))
}

/* a comic word that pops in ("RING!", "CHOP!", "GOAL!") */
export function Pop({ x, y, text, delay = 0, size = 22, fill = '#FDE047', stroke = '#B45309', rotate = -8, reduced, repeat = false }) {
  return (
    <Motion.g initial={{ x, y, scale: 0, opacity: 0, rotate }} style={AT0}
      animate={reduced ? { scale: 1, opacity: 1 } : repeat ? { scale: [0, 1.25, 1, 1.1, 1], opacity: 1 } : { scale: [0, 1.3, 1], opacity: 1 }}
      transition={{ delay, duration: repeat ? 1 : 0.5, repeat: repeat && !reduced ? Infinity : 0, repeatDelay: 0.4 }}>
      <text x="0" y="0" textAnchor="middle" fontSize={size} fontWeight="900" fill={fill} stroke={stroke} strokeWidth={size / 18}
        paintOrder="stroke" fontFamily={FONT}>{text}</text>
    </Motion.g>
  )
}

/* sound waves around a ringing thing */
export function Rings({ x, y, reduced, color = '#FDE047', r = 16 }) {
  if (reduced) return null
  return [0, 1].map(i => (
    <Motion.g key={i} initial={{ opacity: 0 }} animate={{ opacity: [0, 1, 0] }} transition={{ duration: 0.5, repeat: Infinity, delay: i * 0.25 }}>
      <path d={`M${x - r - i * 6} ${y - 8}q-5 8 0 16M${x + r + i * 6} ${y - 8}q5 8 0 16`} stroke={color} strokeWidth="3" strokeLinecap="round" fill="none" />
    </Motion.g>
  ))
}

/*
 * A close-up card that pops out of the scene (the notebook page, the drawing):
 * a white rounded card at (x, y) of w × h, children drawn in its own box.
 */
export function Zoom({ x, y, w, h, tail, reduced, children, fill = '#fff', rotate = -3 }) {
  return (
    <Motion.g initial={reduced ? false : { opacity: 0, scale: 0.4 }} animate={{ opacity: 1, scale: 1 }}
      style={{ transformBox: 'view-box', originX: `${tail ? tail[0] : x + w / 2}px`, originY: `${tail ? tail[1] : y + h}px` }}
      transition={{ type: 'spring', stiffness: 260, damping: 18, delay: 0.35 }}>
      <g transform={`rotate(${rotate} ${x + w / 2} ${y + h / 2})`}>
        <rect x={x + 3} y={y + 5} width={w} height={h} rx="14" fill="#000" opacity="0.18" />
        {tail && <path d={`M${x + w * 0.55} ${y + h - 2}L${tail[0]} ${tail[1]}L${x + w * 0.75} ${y + h - 2}z`} fill={fill} />}
        <rect x={x} y={y} width={w} height={h} rx="14" fill={fill} stroke="#E2E8F0" strokeWidth="2" />
        <g transform={`translate(${x} ${y})`}>{children}</g>
      </g>
    </Motion.g>
  )
}

/* drifting clouds (sky scenes) */
export function Clouds({ reduced, y = 40, opacity = 1 }) {
  return (
    <Motion.g opacity={opacity} animate={reduced ? undefined : { x: [0, 24, 0] }} transition={{ duration: 18, repeat: Infinity, ease: 'easeInOut' }}>
      {[[-180, y + 10, 1], [70, y, 1.1], [220, y + 28, 0.8], [420, y + 6, 1], [560, y + 20, 0.9]].map(([cx, cy, s], i) => (
        <g key={i} transform={`translate(${cx} ${cy}) scale(${s})`}>
          <ellipse cx="0" cy="6" rx="28" ry="10" fill="#fff" />
          <ellipse cx="12" cy="-2" rx="16" ry="12" fill="#fff" />
          <ellipse cx="-10" cy="0" rx="12" ry="9" fill="#fff" />
        </g>
      ))}
    </Motion.g>
  )
}

/* two little birds flapping across the sky */
export function Birds({ reduced, y = 50 }) {
  if (reduced) return null
  return [0, 1].map(i => (
    <Motion.g key={i} initial={{ x: -60 - i * 30, y: y + i * 14 }} animate={{ x: 460, y: [y + i * 14, y - 10 + i * 14, y + i * 14] }}
      transition={{ duration: 14 + i * 3, repeat: Infinity, delay: i * 2.5, ease: 'linear' }}>
      <Motion.path d="M-7 0q3.5-5 7 0q3.5-5 7 0" stroke="#334155" strokeWidth="2" fill="none" strokeLinecap="round"
        animate={{ scaleY: [1, -0.4, 1] }} transition={{ duration: 0.5, repeat: Infinity }} />
    </Motion.g>
  ))
}

/* simple confetti burst (a big moment: the bell, the answer) */
export function Confetti({ x, y, reduced, n = 12, delay = 0 }) {
  if (reduced) return null
  const colors = ['#FDE047', '#F472B6', '#60A5FA', '#4ADE80', '#FB923C']
  return Array.from({ length: n }, (_, i) => {
    const a = -Math.PI / 2 + ((i / (n - 1)) - 0.5) * 2.4
    const d = 60 + (i % 3) * 22
    return (
      <Motion.rect key={i} x="-3" y="-2" width="6" height="4" rx="1" fill={colors[i % colors.length]} style={AT0}
        initial={{ x, y, opacity: 0, rotate: 0 }}
        animate={{ x: x + Math.cos(a) * d, y: [y, y + Math.sin(a) * d, y + Math.sin(a) * d + 50], opacity: [0, 1, 0], rotate: 360 + i * 40 }}
        transition={{ duration: 1.5, delay: delay + (i % 4) * 0.05, ease: 'easeOut' }} />
    )
  })
}
