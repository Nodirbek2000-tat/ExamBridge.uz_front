/*
 * TOBY'S PLAY ROOM — the room itself: one 1600 × 1000 SVG.
 *
 * Back → front: the room (wall, window with sky, shelf, clock, lamp, sofa,
 * stage, table with a cake) → Toby → the drum and toys in front of him →
 * effects (notes, hearts, tears, BOOM!) → night dim → Toby's speech bubble.
 *
 * The middle 1000 units (x 300–1300) hold everything that matters, so a phone
 * (square box, "slice") still sees the sofa, Toby, the cake and the drum; a
 * wide desktop box shows the whole room.
 */
import { memo, useEffect, useId } from 'react'
import { AnimatePresence, motion as Motion, useAnimationControls } from 'framer-motion'
import Toby from './Toby'

const ROOM_W = 1600
const ROOM_H = 1000
const S = 1.85                       // Toby's size in the room (he is the star: ~45 % of the room's height)
const SPOTS = {
  center: [800, 880],                // on the stage
  sofa: [455, 700],                  // standing on the sofa seat
  cake: [905, 880],                  // next to the table, paw at the cake
  drum: [1195, 866],                 // behind the drum
}
const FONT = 'system-ui, -apple-system, Segoe UI, sans-serif'
// a point in Toby's own 200 × 240 box → room coordinates
const at = (sp, x, y) => [sp[0] + S * (x - 100), sp[1] + S * (y - 236)]
const HEART = 'M0 6C-12-2-9-12-3-11-1-10.6 0-9 0-8c0-1 1-2.6 3-3 6-1 9 9-3 17z'
const STAR = 'M0-10 2.9-3.1 10.5-3.1 4.3 1.6 6.6 9.1 0 4.6-6.6 9.1-4.3 1.6-10.5-3.1-2.9-3.1z'

/* ── whole-body motions (Toby stays mounted; the wrapper moves) ─────────── */
const REST = { x: 0, y: 0, rotate: 0, scaleX: 1 }
const T0 = { duration: 0.35, ease: 'easeOut' }       // the values a motion does not use settle back to rest
const MOTIONS = {
  hop: { ...REST, y: [0, -190, 0, -96, 0], transition: { default: T0, y: { duration: 1.15, times: [0, 0.3, 0.55, 0.78, 1], ease: 'easeOut' } } },
  // dance: Toby.jsx rocks him (dance pose); the room slides him side to side
  sway: { ...REST, x: [0, -34, 0, 34, 0], transition: { default: T0, x: { duration: 0.92, repeat: Infinity, ease: 'linear' } } },
  run: { ...REST, x: [0, -350, 350, 0], transition: { default: T0, x: { duration: 2.5, times: [0, 0.32, 0.76, 1], ease: 'easeInOut' } } },
  turn: { ...REST, scaleX: [1, -1, 1], transition: { default: T0, scaleX: { duration: 0.95, ease: 'easeInOut' } } },
  shake: { ...REST, y: [0, -12, 0], transition: { default: T0, y: { duration: 0.28, repeat: 8 } } },
  bounce: { ...REST, y: [0, -165, 0], transition: { default: T0, y: { duration: 0.78, repeat: Infinity, times: [0, 0.5, 1], ease: ['easeOut', 'easeIn'] } } },
  zoom: { ...REST, x: [0, -360, 0, 360, 0], transition: { default: T0, x: { duration: 3.4, repeat: Infinity, ease: 'linear' } } },
  drum: { ...REST, y: [0, -9, 0], transition: { default: T0, y: { duration: 0.26, repeat: Infinity } } },
}
const SETTLE = { ...REST, transition: T0 }

/* ── bunting flags along two curves (computed once) ─────────────────────── */
const FLAG_COLORS = ['#F43F5E', '#F59E0B', '#22C55E', '#3B82F6', '#A855F7', '#EC4899']
const FLAGS = (() => {
  const out = []
  const curves = [[[0, 22], [400, 150], [800, 44]], [[800, 44], [1200, 150], [1600, 22]]]
  curves.forEach(([p0, c, p1], ci) => {
    for (let i = 1; i < 8; i++) {
      const t = i / 8
      const x = (1 - t) ** 2 * p0[0] + 2 * (1 - t) * t * c[0] + t * t * p1[0]
      const y = (1 - t) ** 2 * p0[1] + 2 * (1 - t) * t * c[1] + t * t * p1[1]
      out.push({ x, y, c: FLAG_COLORS[(i + ci * 3) % FLAG_COLORS.length] })
    }
  })
  return out
})()

/* ── the room (static apart from day / night) ───────────────────────────── */
function Window({ uid, night, reduced }) {
  return (
    <g>
      {/* curtain rod + curtains */}
      <rect x="560" y="58" width="480" height="12" rx="6" fill="#B45309" />
      <circle cx="560" cy="64" r="12" fill="#92400E" />
      <circle cx="1040" cy="64" r="12" fill="#92400E" />
      <g transform="translate(620 92)">
        <rect x="-18" y="-18" width="396" height="336" rx="28" fill="#FFFFFF" />
        <g clipPath={`url(#${uid}win)`}>
          <rect width="360" height="300" fill={`url(#${uid}sky)`} />
          <Motion.rect width="360" height="300" fill={`url(#${uid}nightsky)`} initial={false}
            animate={{ opacity: night ? 1 : 0 }} transition={{ duration: reduced ? 0 : 1.2 }} />
          {/* sun / moon */}
          <Motion.g initial={false} animate={{ opacity: night ? 0 : 1 }} transition={{ duration: reduced ? 0 : 1 }}>
            <circle cx="290" cy="74" r="46" fill="#FEF08A" opacity="0.55" />
            <circle cx="290" cy="74" r="32" fill="#FDE047" />
          </Motion.g>
          <Motion.g initial={false} animate={{ opacity: night ? 1 : 0 }} transition={{ duration: reduced ? 0 : 1.2 }}>
            <path d="M286 44a34 34 0 1 0 30 50A28 28 0 0 1 286 44z" fill="#FEF9C3" />
            {[[40, 50], [120, 34], [190, 86], [70, 120], [230, 30], [150, 140]].map(([x, y], i) => (
              <path key={i} d={STAR} transform={`translate(${x} ${y}) scale(${0.5 + (i % 3) * 0.2})`} fill="#FFFFFF" />
            ))}
          </Motion.g>
          {/* clouds drift by */}
          <Motion.g animate={reduced ? undefined : { x: [-200, 420] }} transition={{ duration: 46, repeat: Infinity, ease: 'linear' }}>
            <g fill="#FFFFFF" opacity={night ? 0.25 : 0.95}>
              <ellipse cx="60" cy="92" rx="46" ry="20" />
              <ellipse cx="88" cy="78" rx="30" ry="22" />
              <ellipse cx="40" cy="80" rx="22" ry="16" />
            </g>
          </Motion.g>
          <Motion.g initial={{ x: 140 }} animate={reduced ? undefined : { x: [140, 480, -120, 140] }} transition={{ duration: 64, times: [0, 0.36, 0.36, 1], repeat: Infinity, ease: 'linear' }}>
            <g fill="#FFFFFF" opacity={night ? 0.2 : 0.85}>
              <ellipse cx="40" cy="160" rx="36" ry="15" />
              <ellipse cx="62" cy="149" rx="22" ry="16" />
            </g>
          </Motion.g>
          {/* hills, a tree and a little house outside */}
          <path d="M-10 300V232C60 190 130 200 190 236C240 206 310 196 370 226V300Z" fill={night ? '#1E3A5F' : '#4ADE80'} />
          <path d="M-10 300V262C80 236 200 244 370 270V300Z" fill={night ? '#172554' : '#22C55E'} />
          <rect x="276" y="196" width="10" height="34" rx="4" fill="#92400E" />
          <circle cx="281" cy="186" r="24" fill={night ? '#14532D' : '#16A34A'} />
          <g transform="translate(70 196)">
            <rect x="0" y="16" width="46" height="34" fill={night ? '#475569' : '#FFFFFF'} />
            <path d="M-6 18 23-6 52 18z" fill="#EF4444" />
            <rect x="18" y="30" width="12" height="20" fill="#B45309" />
            <rect x="5" y="24" width="9" height="9" fill={night ? '#FDE047' : '#93C5FD'} />
          </g>
        </g>
        {/* window bars + sill */}
        <rect x="176" y="0" width="8" height="300" fill="#FFFFFF" />
        <rect x="0" y="146" width="360" height="8" fill="#FFFFFF" />
        <rect x="-34" y="300" width="428" height="24" rx="10" fill="#FFFFFF" />
        <rect x="-34" y="318" width="428" height="8" rx="4" fill="#E7D3BE" />
        {/* a plant on the sill */}
        <path d="M30 300h40l-6 -30h-28z" fill="#F97316" />
        <path d="M50 272c-18-20-14-40 0-46 14 6 18 26 0 46z" fill="#22C55E" />
        <path d="M50 272c-26-6-36-22-30-34 16-2 28 14 30 34zM50 272c26-6 36-22 30-34-16-2-28 14-30 34z" fill="#16A34A" />
      </g>
      {/* curtains in front of the frame */}
      <path d="M560 70h86c-10 70-6 130 10 196-14 30-12 90-6 150h-90z" fill="#F472B6" />
      <path d="M582 70c-4 90 0 180 4 346M612 70c-6 90-2 190 6 346" stroke="#EC4899" strokeWidth="6" fill="none" opacity="0.6" />
      <path d="M1040 70h-86c10 70 6 130-10 196 14 30 12 90 6 150h90z" fill="#F472B6" />
      <path d="M1018 70c4 90 0 180-4 346M988 70c6 90 2 190-6 346" stroke="#EC4899" strokeWidth="6" fill="none" opacity="0.6" />
      <rect x="560" y="262" width="96" height="16" rx="8" fill="#FDE047" />
      <rect x="944" y="262" width="96" height="16" rx="8" fill="#FDE047" />
    </g>
  )
}

function Sofa({ squish, reduced }) {
  const sq = squish && !reduced
  return (
    <g>
      <rect x="320" y="556" width="270" height="156" rx="48" fill="#8B5CF6" />
      <rect x="336" y="582" width="116" height="106" rx="32" fill="#A78BFA" />
      <rect x="460" y="582" width="116" height="106" rx="32" fill="#A78BFA" />
      <circle cx="394" cy="634" r="7" fill="#7C3AED" />
      <circle cx="518" cy="634" r="7" fill="#7C3AED" />
      <rect x="304" y="684" width="302" height="74" rx="28" fill="#7C3AED" />
      <Motion.rect x="316" y="674" width="278" height="40" rx="18" fill="#C4B5FD"
        style={{ transformBox: 'view-box', originX: '455px', originY: '714px' }}
        animate={sq ? { scaleY: [1, 1, 0.55, 1] } : { scaleY: 1 }}
        transition={sq ? { duration: 0.78, repeat: Infinity, times: [0, 0.8, 0.92, 1] } : { duration: 0.2 }} />
      <rect x="280" y="636" width="64" height="134" rx="30" fill="#6D28D9" />
      <rect x="566" y="636" width="64" height="134" rx="30" fill="#6D28D9" />
      <rect x="312" y="764" width="18" height="28" rx="6" fill="#4C1D95" />
      <rect x="580" y="764" width="18" height="28" rx="6" fill="#4C1D95" />
      {/* teddy on the sofa */}
      <g transform="translate(548 650)">
        <circle cx="-17" cy="-46" r="11" fill="#B45309" />
        <circle cx="17" cy="-46" r="11" fill="#B45309" />
        <ellipse cx="0" cy="0" rx="26" ry="28" fill="#D97706" />
        <circle cx="0" cy="-34" r="25" fill="#D97706" />
        <ellipse cx="0" cy="-27" rx="11" ry="8" fill="#FDE68A" />
        <circle cx="-8" cy="-38" r="3.2" fill="#1F2937" />
        <circle cx="8" cy="-38" r="3.2" fill="#1F2937" />
        <circle cx="0" cy="-30" r="3" fill="#1F2937" />
        <ellipse cx="0" cy="6" rx="14" ry="12" fill="#FDE68A" />
        <path d="M-12-12q12 10 24 0" stroke="#EF4444" strokeWidth="6" fill="none" strokeLinecap="round" />
      </g>
    </g>
  )
}

function Stage({ on, reduced }) {
  const bulbs = Array.from({ length: 11 }, (_, i) => 584 + i * 43.2)
  return (
    <g>
      <path d="M560 872v28a240 38 0 0 0 480 0v-28z" fill="#DB2777" />
      <ellipse cx="800" cy="872" rx="240" ry="38" fill="#F9A8D4" />
      <ellipse cx="800" cy="870" rx="206" ry="29" fill="#FBCFE8" />
      <path d={STAR} transform="translate(800 872) scale(2.4 0.8)" fill="#FDE047" opacity="0.8" />
      {bulbs.map((x, i) => {
        const y = 900 + Math.sqrt(Math.max(0, 1 - ((x - 800) / 240) ** 2)) * 30
        return (
          <Motion.circle key={i} cx={x} cy={y} r="7" fill="#FEF08A"
            animate={on && !reduced ? { opacity: [1, 0.25, 1] } : { opacity: 0.9 }}
            transition={on && !reduced ? { duration: 0.6, repeat: Infinity, delay: (i % 3) * 0.2 } : { duration: 0.2 }} />
        )
      })}
    </g>
  )
}

function Table({ wobble, reduced }) {
  const wb = wobble && !reduced
  return (
    <g>
      <rect x="970" y="806" width="13" height="88" rx="5" fill="#C2410C" />
      <rect x="1097" y="806" width="13" height="88" rx="5" fill="#C2410C" />
      <rect x="952" y="790" width="176" height="18" rx="7" fill="#F97316" />
      <ellipse cx="1040" cy="790" rx="64" ry="9" fill="#FFFFFF" />
      <Motion.g style={{ transformBox: 'view-box', originX: '1040px', originY: '790px' }}
        animate={wb ? { rotate: [-3, 3, -3] } : { rotate: 0 }} transition={wb ? { duration: 0.5, repeat: Infinity } : { duration: 0.2 }}>
        <rect x="990" y="740" width="100" height="50" rx="12" fill="#F9A8D4" />
        <path d="M990 754h100v-4a12 12 0 0 0-12-10h-76a12 12 0 0 0-12 10z" fill="#FFFFFF" />
        <path d="M996 754q6 12 12 0q6 14 12 0q6 10 12 0q6 14 12 0q6 10 12 0q6 14 12 0q6 10 12 0" fill="#FFFFFF" />
        <rect x="1008" y="704" width="64" height="38" rx="10" fill="#FDF2F8" />
        <path d="M1008 716h64" stroke="#F472B6" strokeWidth="5" strokeDasharray="8 6" />
        {[1022, 1040, 1058].map((x, i) => (
          <g key={x}>
            <rect x={x - 3} y="682" width="6" height="23" rx="2" fill={['#60A5FA', '#FDE047', '#4ADE80'][i]} />
            <Motion.ellipse cx={x} cy="676" rx="4.5" ry="8" fill="#FB923C"
              style={{ transformBox: 'view-box', originX: `${x}px`, originY: '684px' }}
              animate={reduced ? undefined : { scaleY: [1, 1.25, 0.9, 1] }} transition={{ duration: 0.9, repeat: Infinity, delay: i * 0.2 }} />
            <ellipse cx={x} cy="678" rx="2" ry="4" fill="#FEF08A" />
          </g>
        ))}
        <circle cx="1040" cy="764" r="6" fill="#EF4444" />
        <circle cx="1016" cy="770" r="5" fill="#EF4444" />
        <circle cx="1064" cy="770" r="5" fill="#EF4444" />
      </Motion.g>
    </g>
  )
}

function Drum({ banging, reduced }) {
  const b = banging && !reduced
  return (
    <Motion.g style={{ transformBox: 'view-box', originX: '1195px', originY: '900px' }}
      animate={b ? { rotate: [-2.5, 2.5, -2.5], y: [0, -4, 0] } : { rotate: 0, y: 0 }}
      transition={b ? { duration: 0.26, repeat: Infinity } : { duration: 0.2 }}>
      <ellipse cx="1195" cy="900" rx="56" ry="10" fill="#000" opacity="0.14" />
      <ellipse cx="1195" cy="892" rx="48" ry="14" fill="#B91C1C" />
      <rect x="1147" y="818" width="96" height="74" fill="#EF4444" />
      <path d="M1147 826l16 58 16-58 16 58 16-58 16 58 16-58 16 58" stroke="#FFFFFF" strokeWidth="5" fill="none" strokeLinejoin="round" />
      <rect x="1145" y="814" width="100" height="12" rx="6" fill="#FDE047" />
      <rect x="1145" y="882" width="100" height="12" rx="6" fill="#FDE047" />
      <ellipse cx="1195" cy="814" rx="48" ry="14" fill="#F8FAFC" stroke="#CBD5E1" strokeWidth="3" />
      {!b && (
        <g stroke="#92400E" strokeWidth="7" strokeLinecap="round">
          <path d="M1162 806l58-26" />
          <path d="M1228 806l-58-26" />
        </g>
      )}
    </Motion.g>
  )
}

const Room = memo(function Room({ uid, night, reduced }) {
  return (
    <g>
      {/* wall */}
      <rect width={ROOM_W} height="730" fill={`url(#${uid}wall)`} />
      <rect width={ROOM_W} height="560" fill={`url(#${uid}dots)`} />
      <rect y="560" width={ROOM_W} height="170" fill="#F8C59A" />
      {Array.from({ length: 17 }, (_, i) => (
        <rect key={i} x={20 + i * 96} y="582" width="72" height="118" rx="8" fill="none" stroke="#EDAF80" strokeWidth="4" />
      ))}
      <rect y="552" width={ROOM_W} height="12" fill="#EBA97A" />

      {/* bunting */}
      <path d="M0 22Q400 150 800 44Q1200 150 1600 22" stroke="#92400E" strokeWidth="4" fill="none" />
      {FLAGS.map((f, i) => (
        <path key={i} d={`M${f.x - 24} ${f.y}h48l-24 50z`} fill={f.c} />
      ))}

      <Window uid={uid} night={night} reduced={reduced} />

      {/* rainbow picture over the sofa */}
      <g transform="translate(332 150)">
        <rect width="168" height="136" rx="10" fill="#92400E" />
        <rect x="10" y="10" width="148" height="116" rx="4" fill="#FFFBEB" />
        {['#EF4444', '#F59E0B', '#22C55E', '#3B82F6'].map((c, i) => (
          <path key={c} d={`M${30 + i * 10} 108a${54 - i * 10} ${54 - i * 10} 0 0 1 ${108 - i * 20} 0`} stroke={c} strokeWidth="9" fill="none" />
        ))}
        <circle cx="132" cy="36" r="13" fill="#FDE047" />
      </g>

      {/* clock */}
      <g transform="translate(1180 170)">
        <circle r="58" fill="#F59E0B" />
        <circle r="48" fill="#FFFFFF" />
        {Array.from({ length: 12 }, (_, i) => (
          <circle key={i} cx={Math.sin((i / 12) * Math.PI * 2) * 38} cy={-Math.cos((i / 12) * Math.PI * 2) * 38} r={i % 3 ? 2.5 : 4.5} fill="#78350F" />
        ))}
        <path d="M0 0V-30M0 0l18 8" stroke="#1F2937" strokeWidth="6" strokeLinecap="round" />
        <circle r="5" fill="#EF4444" />
      </g>

      {/* shelf with books, a robot and a plant */}
      <g>
        <rect x="1080" y="356" width="232" height="14" rx="5" fill="#B45309" />
        {[[1094, 70, '#3B82F6'], [1116, 62, '#F43F5E'], [1136, 76, '#22C55E'], [1158, 58, '#A855F7']].map(([x, h, c]) => (
          <rect key={x} x={x} y={356 - h} width="20" height={h} rx="3" fill={c} />
        ))}
        <rect x="1196" y="300" width="40" height="40" rx="8" fill="#94A3B8" />
        <rect x="1203" y="340" width="26" height="16" rx="4" fill="#64748B" />
        <circle cx="1208" cy="318" r="5" fill="#FDE047" />
        <circle cx="1224" cy="318" r="5" fill="#FDE047" />
        <path d="M1216 300v-12" stroke="#64748B" strokeWidth="4" />
        <circle cx="1216" cy="286" r="5" fill="#F43F5E" />
        <path d="M1262 356h34l-5-26h-24z" fill="#F97316" />
        <path d="M1279 332c-14-18-10-36 0-40 10 4 14 22 0 40zM1279 332c-20-4-28-18-22-28 12 0 22 12 22 28z" fill="#16A34A" />
      </g>

      {/* desktop extras: bookcase (left), star picture + toy box (right) */}
      <g>
        <rect x="40" y="320" width="200" height="560" rx="14" fill="#C2410C" />
        <rect x="56" y="336" width="168" height="528" rx="8" fill="#9A3412" />
        {[470, 610, 750].map(y => <rect key={y} x="56" y={y} width="168" height="12" fill="#C2410C" />)}
        {[[66, 404, '#60A5FA'], [92, 380, '#FDE047'], [118, 410, '#F472B6'], [146, 392, '#4ADE80'], [66, 546, '#A78BFA'], [94, 530, '#FB923C'],
          [122, 552, '#38BDF8'], [176, 540, '#F43F5E'], [70, 690, '#22C55E'], [98, 670, '#FDE047'], [150, 686, '#60A5FA']].map(([x, y, c]) => (
          <rect key={`${x}-${y}`} x={x} y={y} width="22" height={(y > 650 ? 750 : y > 500 ? 610 : 470) - y} rx="3" fill={c} />
        ))}
        <circle cx="190" cy="720" r="22" fill="#F43F5E" />
        <g transform="translate(1380 196)">
          <rect width="140" height="120" rx="10" fill="#0EA5E9" />
          <rect x="10" y="10" width="120" height="100" rx="4" fill="#E0F2FE" />
          <path d={STAR} transform="translate(70 60) scale(3.4)" fill="#FACC15" />
        </g>
        <g transform="translate(1340 760)">
          <rect y="36" width="200" height="110" rx="14" fill="#22C55E" />
          <rect y="36" width="200" height="26" rx="10" fill="#16A34A" />
          <circle cx="56" cy="30" r="30" fill="#3B82F6" />
          <path d="M26 30h60" stroke="#FFFFFF" strokeWidth="6" />
          <circle cx="140" cy="22" r="16" fill="#D97706" />
          <circle cx="160" cy="22" r="16" fill="#D97706" />
          <path d={STAR} transform="translate(100 98) scale(2.6)" fill="#FDE047" />
        </g>
      </g>

      {/* floor */}
      <rect y="720" width={ROOM_W} height="280" fill={`url(#${uid}floor)`} />
      <rect y="712" width={ROOM_W} height="18" fill="#EED2B5" />
      <g stroke="#A86A3D" strokeWidth="3" opacity="0.35">
        {[760, 806, 862, 930].map(y => <path key={y} d={`M0 ${y}H${ROOM_W}`} />)}
        {[[180, 730, 760], [620, 730, 760], [1040, 730, 760], [1430, 730, 760], [380, 760, 806], [860, 760, 806], [1260, 760, 806],
          [120, 806, 862], [560, 806, 862], [1120, 806, 862], [320, 862, 930], [980, 862, 930], [1480, 862, 930], [700, 930, 1000]].map(([x, a, b]) => (
          <path key={`${x}-${a}`} d={`M${x} ${a}V${b}`} />
        ))}
      </g>

      {/* floor lamp */}
      <g>
        <ellipse cx="256" cy="880" rx="46" ry="12" fill="#78350F" />
        <rect x="251" y="540" width="10" height="340" fill="#92400E" />
        <path d="M200 548h112l-22-84h-68z" fill={night ? '#FDE68A' : '#FDBA74'} />
        <path d="M200 548h112" stroke="#EA580C" strokeWidth="6" strokeLinecap="round" />
      </g>

      {/* rug */}
      <ellipse cx="800" cy="938" rx="610" ry="64" fill="#60A5FA" />
      <ellipse cx="800" cy="938" rx="560" ry="54" fill="#93C5FD" />
      <ellipse cx="800" cy="938" rx="560" ry="54" fill="none" stroke="#FFFFFF" strokeWidth="4" strokeDasharray="14 12" opacity="0.8" />
      <ellipse cx="800" cy="940" rx="470" ry="40" fill="#BFDBFE" />
    </g>
  )
})

/* toys in front of everything */
function FrontToys() {
  return (
    <g>
      {[['A', '#F43F5E', 362], ['B', '#3B82F6', 410], ['C', '#22C55E', 386]].map(([l, c, x], i) => (
        <g key={l} transform={`translate(${x} ${i === 2 ? 900 : 944})`}>
          <rect x="-22" y="-22" width="44" height="44" rx="8" fill={c} />
          <text y="13" textAnchor="middle" fontSize="34" fontWeight="900" fill="#FFFFFF" fontFamily={FONT}>{l}</text>
        </g>
      ))}
      <g transform="translate(700 972)">
        <ellipse cy="20" rx="30" ry="6" fill="#000" opacity="0.12" />
        <circle r="26" fill="#F59E0B" />
        <path d="M-26 0h52M0-26v52" stroke="#FFFFFF" strokeWidth="5" />
        <circle cx="-9" cy="-10" r="5" fill="#FFFFFF" opacity="0.6" />
      </g>
    </g>
  )
}

/* ── effects ─────────────────────────────────────────────────────────────── */
function Burst({ x, y, text, color = '#FDE047', size = 54, delay = 0, rotate = -8 }) {
  return (
    <Motion.text x={x} y={y} textAnchor="middle" fontSize={size} fontWeight="900" fill={color} stroke="#7C2D12" strokeWidth="3"
      paintOrder="stroke" fontFamily={FONT} style={{ transformBox: 'view-box', originX: `${x}px`, originY: `${y}px` }}
      initial={{ scale: 0, opacity: 0, rotate }} animate={{ scale: [0, 1.25, 1], opacity: [0, 1, 1], rotate }}
      transition={{ duration: 0.45, delay }}>{text}</Motion.text>
  )
}

function Sparks({ x, y, n = 8, r = 80, delay = 0 }) {
  return Array.from({ length: n }, (_, i) => {
    const a = (i / n) * Math.PI * 2
    return (
      <Motion.path key={i} d={STAR} fill={['#FDE047', '#F9A8D4', '#A5F3FC', '#86EFAC'][i % 4]}
        initial={{ x, y, scale: 0, opacity: 1 }} animate={{ x: x + Math.cos(a) * r, y: y + Math.sin(a) * r, scale: [0, 2.2, 0.6], opacity: [1, 1, 0] }}
        transition={{ duration: 0.9, delay }} />
    )
  })
}

function Floaters({ x, y, glyph, colors, n = 5, spread = 170 }) {
  return Array.from({ length: n }, (_, i) => {
    const dx = (i - (n - 1) / 2) * (spread / Math.max(1, n - 1)) * 2
    const c = colors[i % colors.length]
    return glyph === 'heart' ? (
      <Motion.path key={i} d={HEART} fill={c} initial={{ x: x + dx, y, scale: 0, opacity: 0 }}
        animate={{ y: [y, y - 150], scale: [0, 2.6, 2.2], opacity: [0, 1, 0] }}
        transition={{ duration: 1.8, delay: i * 0.22, repeat: 1 }} />
    ) : (
      <Motion.text key={i} x={x + dx} y={y} textAnchor="middle" fontSize="60" fontWeight="900" fill={c} fontFamily={FONT}
        initial={{ opacity: 0, y: 0 }} animate={{ y: [0, -170], opacity: [0, 1, 0], rotate: [-10, 10] }}
        transition={{ duration: 1.7, delay: i * 0.3, repeat: 2 }}>{i % 2 ? '♫' : '♪'}</Motion.text>
    )
  })
}

function Cap({ x, y }) {
  return (
    <g transform={`translate(${x} ${y})`}>
      <path d="M-62 4C-62-46 62-46 62 4z" fill="#EF4444" />
      <path d="M-62 4C-30-6 30-6 62 4" stroke="#B91C1C" strokeWidth="6" fill="none" />
      <path d="M30 0h70q6 10-8 16H26z" fill="#B91C1C" />
      <circle cy="-40" r="7" fill="#B91C1C" />
      <path d="M-14-30a20 20 0 0 1 24-10" stroke="#FFFFFF" strokeWidth="5" fill="none" opacity="0.6" strokeLinecap="round" />
    </g>
  )
}

function Fx({ kind, sp }) {
  const head = at(sp, 100, 40)
  const nose = at(sp, 100, 113)
  const mouth = at(sp, 100, 138)
  const chest = at(sp, 100, 186)
  const feet = at(sp, 100, 236)
  switch (kind) {
    case 'notes':
      return <Floaters x={head[0]} y={head[1] + 40} glyph="note" colors={['#A78BFA', '#F472B6', '#38BDF8', '#FDE047']} />
    case 'hearts':
      return <Floaters x={head[0]} y={head[1] + 60} glyph="heart" colors={['#F43F5E', '#FB7185', '#EC4899']} n={4} spread={150} />
    case 'clap':
      return <g><Sparks x={chest[0]} y={chest[1] - 40} r={110} /><Burst x={chest[0] + 170} y={chest[1] - 120} text="CLAP!" /></g>
    case 'boop':
      return <g><Sparks x={nose[0]} y={nose[1]} n={6} r={60} /><Burst x={nose[0] + 150} y={nose[1] - 50} text="boop!" color="#F9A8D4" size={46} /></g>
    case 'shh':
      return (
        <Motion.text x={mouth[0] - 130} y={mouth[1]} textAnchor="middle" fontSize="48" fontWeight="900" fill="#E0E7FF" stroke="#4338CA" strokeWidth="2.5"
          paintOrder="stroke" fontFamily={FONT} initial={{ opacity: 0, x: 0 }} animate={{ opacity: [0, 1, 0], x: [0, -60] }} transition={{ duration: 2.2 }}>
          Shhh…
        </Motion.text>
      )
    case 'calm':
      return [0, 1].map(i => (
        <Motion.ellipse key={i} cx={chest[0]} cy={chest[1] - 60} fill="none" stroke="#A5F3FC" strokeWidth="8"
          initial={{ rx: 120, ry: 150, opacity: 0 }} animate={{ rx: [120, 300], ry: [150, 330], opacity: [0.8, 0] }}
          transition={{ duration: 2.2, delay: i * 1.1, repeat: 1 }} />
      ))
    case 'five': {
      const paw = at(sp, 176, 146)                     // the raised paw of the 'highfive' pose
      return (
        <g>
          <Motion.g initial={{ x: 520, opacity: 0 }} animate={{ x: [520, 0, 0, 260], opacity: [0, 1, 1, 0] }} transition={{ duration: 1.8, times: [0, 0.3, 0.7, 1] }}>
            <g transform={`translate(${paw[0] + 86} ${paw[1]})`}>
              <rect x="-6" y="-38" width="120" height="76" rx="34" fill="#FDBA74" />
              {[-30, -10, 10, 30].map(y => <rect key={y} x="-52" y={y - 8} width="62" height="18" rx="9" fill="#FDBA74" />)}
              <rect x="10" y="-68" width="22" height="50" rx="11" fill="#FDBA74" transform="rotate(-30 20 -40)" />
              <rect x="70" y="-40" width="60" height="80" rx="12" fill="#3B82F6" />
            </g>
          </Motion.g>
          <Sparks x={paw[0] + 30} y={paw[1]} delay={0.5} r={100} />
          <Burst x={paw[0] + 40} y={paw[1] - 110} text="SLAP!" delay={0.5} rotate={8} />
        </g>
      )
    }
    case 'hatOn':
      return (
        <Motion.g initial={{ y: -700, opacity: 1 }} animate={{ y: [-700, 0, 0], opacity: [1, 1, 0] }} transition={{ duration: 1.3, times: [0, 0.55, 1], ease: 'easeIn' }}>
          <Cap x={head[0]} y={head[1]} />
        </Motion.g>
      )
    case 'hatOff':
      return (
        <Motion.g initial={{ x: 0, y: 0, opacity: 1 }} animate={{ x: [0, 260], y: [0, -380], rotate: [0, 70], opacity: [1, 0] }}
          style={{ transformBox: 'view-box', originX: `${head[0]}px`, originY: `${head[1]}px` }} transition={{ duration: 1.1, ease: 'easeOut' }}>
          <Cap x={head[0]} y={head[1]} />
        </Motion.g>
      )
    case 'dust':
      return [0, 1, 2, 3, 4, 5].map(i => (
        <Motion.circle key={i} cx={feet[0] + (i % 2 ? 1 : -1) * (40 + i * 30)} cy={feet[1] - 10} fill="#FFFFFF"
          initial={{ r: 0, opacity: 0.8 }} animate={{ r: [0, 30, 40], opacity: [0.8, 0.6, 0] }} transition={{ duration: 0.8, delay: i * 0.3 }} />
      ))
    case 'crumbs':
      return [0, 1, 2, 3, 4].map(i => (
        <Motion.circle key={i} cx={mouth[0] - 30 + i * 16} cy={mouth[1] + 20} r="6" fill="#FCA5A5"
          initial={{ y: 0, opacity: 0 }} animate={{ y: [0, 160], opacity: [0, 1, 0] }} transition={{ duration: 1, delay: 0.4 + i * 0.25, repeat: 1 }} />
      ))
    case 'puff':
      return [[-120, -150, 70], [120, -170, 76], [0, -330, 80], [-150, -40, 60], [150, -50, 60], [0, -90, 100]].map(([dx, dy, r], i) => (
        <Motion.circle key={i} cx={feet[0] + dx} cy={feet[1] + dy} fill="#FFFFFF" initial={{ r: 0, opacity: 0.95 }}
          animate={{ r: [0, r, r * 1.2], opacity: [0.95, 0.9, 0] }} transition={{ duration: 0.9, delay: i * 0.03 }} />
      ))
    default:
      return null
  }
}

/* what Toby gets up to on his own */
function Mischief({ kind, sp, reduced }) {
  if (kind === 'cry') {
    const eyes = [at(sp, 64, 104), at(sp, 136, 104)]
    return (
      <g>
        <Motion.ellipse cx={sp[0]} cy={sp[1] + 6} rx="0" ry="0" fill="#7DD3FC" opacity="0.7" initial={{ rx: 0, ry: 0 }}
          animate={{ rx: 130, ry: 16 }} transition={{ duration: reduced ? 0 : 6 }} />
        {!reduced && eyes.flatMap(([x, y], e) => [0, 1, 2].map(i => (
          <Motion.path key={`${e}-${i}`} d="M0-14C6-4 9 2 9 6a9 9 0 0 1-18 0c0-4 3-10 9-20z" fill="#38BDF8"
            initial={{ x: x + (e ? 20 : -20), y, opacity: 0 }}
            animate={{ x: x + (e ? 70 : -70), y: [y, y + 40, sp[1]], opacity: [0, 1, 0.8, 0] }}
            transition={{ duration: 1.1, repeat: Infinity, delay: i * 0.37 + e * 0.18, ease: 'easeIn' }} />
        )))}
        <Burst x={sp[0] + 250} y={sp[1] - 380} text="Waaah!" color="#7DD3FC" size={58} rotate={-6} />
      </g>
    )
  }
  if (kind === 'sofa') return <Burst x={sp[0] + 40} y={sp[1] - 470} text="Boing!" color="#FDE047" size={56} rotate={6} />
  if (kind === 'cake') return <Burst x={1040} y={640} text="Mmm!" color="#F9A8D4" size={52} rotate={-4} />
  if (kind === 'drum') {
    return (
      <g>
        {[[1110, 720, -10], [1290, 690, 8], [1200, 620, -4]].map(([x, y, r], i) => (
          <Motion.text key={i} x={x} y={y} textAnchor="middle" fontSize={60 + i * 6} fontWeight="900" fill="#FDE047" stroke="#B91C1C" strokeWidth="4"
            paintOrder="stroke" fontFamily={FONT} style={{ transformBox: 'view-box', originX: `${x}px`, originY: `${y}px` }}
            initial={{ scale: 0, rotate: r }} animate={reduced ? { scale: 1, rotate: r } : { scale: [0, 1.3, 0], rotate: r }}
            transition={{ duration: 0.8, repeat: reduced ? 0 : Infinity, delay: i * 0.27 }}>BOOM!</Motion.text>
        ))}
      </g>
    )
  }
  if (kind === 'zoom') return <Burst x={sp[0]} y={sp[1] - 480} text="Zoom!" color="#A5F3FC" size={56} />
  return null
}

/* lights for singing / dancing */
function StageLights({ kind, uid, reduced }) {
  if (kind === 'spot') {
    return (
      <Motion.path d="M720 0h160l170 900H550z" fill={`url(#${uid}beam)`} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} />
    )
  }
  return (
    <Motion.g initial={{ y: -260 }} animate={{ y: 0 }} exit={{ y: -260 }} transition={{ type: 'spring', stiffness: 120, damping: 14 }}>
      {['#F472B6', '#60A5FA', '#FDE047', '#4ADE80'].map((c, i) => (
        <Motion.path key={c} d="M800 170 640 1000h70z" fill={c} opacity="0.22"
          style={{ transformBox: 'view-box', originX: '800px', originY: '170px' }}
          animate={reduced ? { rotate: i * 30 - 45 } : { rotate: [i * 30 - 60, i * 30 + 10, i * 30 - 60] }}
          transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }} />
      ))}
      <path d="M800 0v124" stroke="#CBD5E1" strokeWidth="4" />
      <circle cx="800" cy="170" r="48" fill="#E2E8F0" />
      <path d="M752 170h96M760 146h80M760 194h80M800 122v96M776 126v88M824 126v88" stroke="#94A3B8" strokeWidth="3" />
      <circle cx="784" cy="156" r="10" fill="#FFFFFF" />
    </Motion.g>
  )
}

/* Toby's speech bubble (one short line) */
function Bubble({ text, sp }) {
  const size = 46
  const w = Math.max(200, Math.round(text.length * size * 0.56 + 70))
  const h = 92
  const cx = Math.min(1300 - 14 - w / 2, Math.max(300 + 14 + w / 2, sp[0] + 40))
  const top = Math.max(16, sp[1] - 236 * S - 124)        // above his ears
  const tailX = Math.min(cx + w / 2 - 40, Math.max(cx - w / 2 + 40, sp[0] + 30))
  return (
    <Motion.g initial={{ opacity: 0, scale: 0.6 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.8 }}
      style={{ transformBox: 'view-box', originX: `${tailX}px`, originY: `${top + h + 24}px` }} transition={{ type: 'spring', stiffness: 380, damping: 22 }}>
      <rect x={cx - w / 2} y={top} width={w} height={h} rx="40" fill="#FFFFFF" stroke="#1E1B4B" strokeOpacity="0.12" strokeWidth="4" />
      <path d={`M${tailX - 22} ${top + h - 4}L${tailX - 6} ${top + h + 30}L${tailX + 18} ${top + h - 4}z`} fill="#FFFFFF" />
      <text x={cx} y={top + h / 2 + size * 0.36} textAnchor="middle" fontSize={size} fontWeight="900" fill="#1E293B" fontFamily={FONT}>{text}</text>
    </Motion.g>
  )
}

/*
 * toby:     props for <Toby> (mood, pose, right, outfit, cap, acc, talking, walking…)
 * spot:     'center' | 'sofa' | 'cake' | 'drum'
 * motion:   { kind, id } — hop · sway · run · turn · shake · bounce · zoom · drum
 * fx:       { kind, id } — notes · hearts · clap · boop · shh · calm · five · hatOn · hatOff · dust · crumbs · puff
 * mischief: cry · sofa · cake · drum · zoom
 */
function RoomScene({ toby, spot = 'center', motion, fx, mischief, night = false, stage = null, bubble, onPoke, reduced = false }) {
  const uid = useId().replace(/[^a-zA-Z0-9_-]/g, '')
  const sp = SPOTS[spot] || SPOTS.center
  const ctrl = useAnimationControls()
  const motionKind = motion?.kind || null
  const motionId = motion?.id || 0

  useEffect(() => {
    if (reduced || !motionKind || !MOTIONS[motionKind]) ctrl.start(SETTLE)
    else ctrl.start(MOTIONS[motionKind])
  }, [ctrl, motionKind, motionId, reduced])

  return (
    <svg viewBox={`0 0 ${ROOM_W} ${ROOM_H}`} preserveAspectRatio="xMidYMax slice" className="absolute inset-0 h-full w-full select-none"
      role="img" aria-label="Toby’ning o‘yin xonasi">
      <defs>
        <linearGradient id={`${uid}wall`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#FFE9D2" />
          <stop offset="1" stopColor="#FCD6B4" />
        </linearGradient>
        <pattern id={`${uid}dots`} width="80" height="80" patternUnits="userSpaceOnUse">
          <circle cx="20" cy="20" r="5" fill="#F9C597" opacity="0.55" />
          <path d={STAR} transform="translate(60 60) scale(0.7)" fill="#FBBF8A" opacity="0.5" />
        </pattern>
        <linearGradient id={`${uid}floor`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#E3A877" />
          <stop offset="1" stopColor="#C47E4A" />
        </linearGradient>
        <linearGradient id={`${uid}sky`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#38BDF8" />
          <stop offset="1" stopColor="#E0F2FE" />
        </linearGradient>
        <linearGradient id={`${uid}nightsky`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#0B1033" />
          <stop offset="1" stopColor="#3730A3" />
        </linearGradient>
        <linearGradient id={`${uid}beam`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#FFFFFF" stopOpacity="0.65" />
          <stop offset="1" stopColor="#FEF9C3" stopOpacity="0.08" />
        </linearGradient>
        <radialGradient id={`${uid}glow`}>
          <stop offset="0" stopColor="#FDE68A" stopOpacity="0.6" />
          <stop offset="1" stopColor="#FDE68A" stopOpacity="0" />
        </radialGradient>
        <clipPath id={`${uid}win`}><rect width="360" height="300" rx="16" /></clipPath>
      </defs>

      <Room uid={uid} night={night} reduced={reduced} />
      <Sofa squish={mischief === 'sofa'} reduced={reduced} />
      <Stage on={!!stage} reduced={reduced} />
      <Table wobble={mischief === 'cake'} reduced={reduced} />

      <AnimatePresence>
        {stage && <StageLights key={stage} kind={stage} uid={uid} reduced={reduced} />}
      </AnimatePresence>

      {/* Toby: position (spot) → whole-body motion → his own 200 × 240 box */}
      <Motion.g initial={false} animate={{ x: sp[0] - 800, y: sp[1] - 880 }} transition={{ duration: reduced ? 0 : 0.8, ease: 'easeInOut' }}>
        <Motion.g animate={ctrl} style={{ transformBox: 'view-box', originX: '800px', originY: '880px' }}>
          <g transform={`translate(${800 - 100 * S} ${880 - 236 * S}) scale(${S})`} onClick={onPoke} style={{ cursor: onPoke ? 'pointer' : undefined }}>
            <Toby {...toby} reduced={reduced} />
          </g>
        </Motion.g>
      </Motion.g>

      <Drum banging={mischief === 'drum'} reduced={reduced} />
      <FrontToys />

      {mischief && <Mischief key={mischief} kind={mischief} sp={sp} reduced={reduced} />}
      {fx && !reduced && <Fx key={fx.id} kind={fx.kind} sp={sp} />}

      {/* night: the room dims, the lamp glows */}
      <Motion.rect width={ROOM_W} height={ROOM_H} fill="#0B1033" initial={false} pointerEvents="none"
        animate={{ opacity: night ? 0.5 : 0 }} transition={{ duration: reduced ? 0 : 1.2 }} />
      <Motion.circle cx="256" cy="560" r="330" fill={`url(#${uid}glow)`} initial={false} pointerEvents="none"
        animate={{ opacity: night ? 1 : 0 }} transition={{ duration: reduced ? 0 : 1.2 }} />

      <AnimatePresence>
        {bubble?.text && <Bubble key={bubble.id} text={bubble.text} sp={sp} />}
      </AnimatePresence>
    </svg>
  )
}

// the screen re-renders with the mic level many times a second: the room only when its props change
export default memo(RoomScene)

/* the room on its own, for the map's Play Room card (no Toby, no effects) */
export function RoomBackdrop({ className = '' }) {
  const uid = useId().replace(/[^a-zA-Z0-9_-]/g, '')
  return (
    <svg viewBox="300 300 1000 700" preserveAspectRatio="xMidYMax slice" className={className} aria-hidden>
      <defs>
        <linearGradient id={`${uid}wall`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#FFE9D2" />
          <stop offset="1" stopColor="#FCD6B4" />
        </linearGradient>
        <pattern id={`${uid}dots`} width="80" height="80" patternUnits="userSpaceOnUse">
          <circle cx="20" cy="20" r="5" fill="#F9C597" opacity="0.55" />
        </pattern>
        <linearGradient id={`${uid}floor`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#E3A877" />
          <stop offset="1" stopColor="#C47E4A" />
        </linearGradient>
        <linearGradient id={`${uid}sky`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#38BDF8" />
          <stop offset="1" stopColor="#E0F2FE" />
        </linearGradient>
        <linearGradient id={`${uid}nightsky`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#0B1033" />
          <stop offset="1" stopColor="#3730A3" />
        </linearGradient>
        <clipPath id={`${uid}win`}><rect width="360" height="300" rx="16" /></clipPath>
      </defs>
      <Room uid={uid} night={false} reduced />
      <Sofa reduced />
      <Stage reduced />
      <Table reduced />
      <Drum reduced />
      <FrontToys />
    </svg>
  )
}
