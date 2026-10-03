/*
 * TOBY'S DAY — the classroom: the blackboard (today's date, "6 + 6 = ?" and
 * the answer when Toby says it), the teacher, two classmates, Toby's desk with
 * his book / notebook / pencil, the school bell, and close-up cards for the
 * page, the date he writes and the cat he draws.
 * Room props: { layer, w, uid, acting, action, reduced, speaker, sp, chosen }.
 */
import { motion as Motion } from 'framer-motion'
import { ItemArt } from './items'
import { Kid, Teacher } from './characters'
import { AT0, BW, BX, CHALK, FONT, HAND, at, dateLabel } from './world-geo'
import { Confetti, Floor, Grad, Pop, Rings, Sparkles, Wall, Zoom } from './scene-kit'

const TODAY = dateLabel()
const DESK_TOP = 250

/* the cat Toby draws, stroke by stroke (its own 0–100 box) */
const CAT = [
  'M30 44 26 14 44 30Q50 27 56 30L74 14 70 44',            // ears + top of the head
  'M30 44Q22 62 34 74Q50 84 66 74Q78 62 70 44',             // the face
  'M40 50v6M60 50v6',                                       // eyes
  'M47 62h6l-3 3zM50 65q-3 4-7 2M50 65q3 4 7 2',            // nose + mouth
  'M36 62H18M36 66l-16 5M64 62h18M64 66l16 5',              // whiskers
]

function DrawCard({ reduced }) {
  return (
    <Zoom x={8} y={124} w={136} h={96} tail={[176, 246]} reduced={reduced}>
      <rect x="10" y="8" width="116" height="80" rx="4" fill="#FFFBEB" stroke="#FDE68A" strokeWidth="2" />
      <g transform="translate(18 2) scale(.98)">
        {CAT.map((d, i) => (
          <Motion.path key={i} d={d} stroke="#EA580C" strokeWidth="3.2" fill="none" strokeLinecap="round" strokeLinejoin="round"
            initial={{ pathLength: reduced ? 1 : 0 }} animate={{ pathLength: 1 }} transition={{ duration: 0.55, delay: 0.7 + i * 0.5 }} />
        ))}
      </g>
      <Motion.path d="M100 66l4 4 9-9" stroke="#22C55E" strokeWidth="3" fill="none" strokeLinecap="round"
        initial={{ pathLength: reduced ? 1 : 0 }} animate={{ pathLength: 1 }} transition={{ delay: 3.4, duration: 0.3 }} />
    </Zoom>
  )
}

function DateCard({ uid, reduced }) {
  return (
    <Zoom x={8} y={124} w={140} h={88} tail={[214, 250]} reduced={reduced}>
      <defs>
        <clipPath id={`${uid}ink`}>
          <Motion.rect x="14" y="18" height="60" initial={{ width: reduced ? 120 : 0 }} animate={{ width: 120 }}
            transition={{ duration: 1.8, delay: 0.8, ease: 'linear' }} />
        </clipPath>
      </defs>
      {[30, 48, 66].map(y => <path key={y} d={`M10 ${y}h120`} stroke="#BFDBFE" strokeWidth="1.5" />)}
      <path d="M22 8v74" stroke="#FCA5A5" strokeWidth="1.5" />
      <g clipPath={`url(#${uid}ink)`}>
        <text x="26" y="44" fontSize="12.5" fontWeight="700" fill="#1E3A8A" fontFamily={HAND}>{TODAY}</text>
        <text x="26" y="62" fontSize="11" fontWeight="700" fill="#1E3A8A" fontFamily={HAND}>Classwork</text>
      </g>
      {!reduced && (
        <Motion.g style={AT0} initial={{ x: 26, y: 40 }} animate={{ x: [26, 130, 40, 100], y: [40, 40, 58, 58] }}
          transition={{ duration: 2, delay: 0.8, times: [0, 0.55, 0.6, 1], ease: 'linear' }}>
          <g transform="rotate(-150) translate(0 -26)"><ItemArt name="pencil" /></g>
        </Motion.g>
      )}
    </Zoom>
  )
}

function BookCard({ reduced }) {
  return (
    <Zoom x={8} y={124} w={140} h={88} tail={[156, 248]} reduced={reduced}>
      <path d="M12 14q28-8 58 2v62q-30-10-58-2z" fill="#fff" stroke="#C7D2FE" strokeWidth="2" />
      <path d="M128 14q-28-8-58 2v62q30-10 58-2z" fill="#fff" stroke="#C7D2FE" strokeWidth="2" />
      {[28, 36, 44, 52, 60].map(y => <path key={y} d={`M20 ${y}h40`} stroke="#E2E8F0" strokeWidth="2" />)}
      <g transform="translate(36 40) scale(.8)"><ItemArt name="apple" /></g>
      <Motion.text x="99" y="58" textAnchor="middle" fontSize="30" fontWeight="900" fill="#6366F1" fontFamily={FONT}
        initial={reduced ? false : { scale: 0, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} style={{ transformBox: 'fill-box', originX: 0.5, originY: 0.5 }}
        transition={{ delay: 0.9, type: 'spring', stiffness: 300, damping: 12 }}>10</Motion.text>
      <text x="99" y="74" textAnchor="middle" fontSize="8" fontWeight="800" fill="#94A3B8" fontFamily={FONT}>page</text>
    </Zoom>
  )
}

/* the desks in front (Toby's in the middle, a classmate's on each side) */
function Desk({ x, w, top, color = '#F59E0B', dark = '#D97706' }) {
  return (
    <g>
      <rect x={x} y={top + 8} width={w} height={300 - top} fill={dark} />
      <rect x={x + 10} y={top + 20} width={w - 20} height="22" rx="4" fill={color} opacity="0.6" />
      <rect x={x - 4} y={top} width={w + 8} height="10" rx="4" fill={color} />
    </g>
  )
}

export function Classroom({ layer, w, uid, acting, action, reduced, speaker, sp, chosen }) {
  const act = chosen?.act || action
  const ringing = acting && action === 'bell'
  const cheer = acting && (action === 'answer' || action === 'bell' || act === 'sing' || act === 'play')
  if (layer === 'front') {
    const pencilOut = w.pencil && !(acting && (action === 'pencil' || action === 'date' || action === 'draw'))
    return (
      <g>
        {/* a school bag and books on the floor, Toby's desk in the middle */}
        <g transform="translate(316 270) rotate(8) scale(1.7)"><ItemArt name="backpack" /></g>
        <g transform="translate(40 284) rotate(-6) scale(1.3)"><ItemArt name="books" /></g>
        <Desk x={116} w={150} top={DESK_TOP} color="#FBBF24" dark="#EA9A2B" />
        {/* on Toby's desk */}
        {w.bookOpen ? (
          <g>
            <path d="M126 250q14-6 28 0v-8q-14-6-28 0z" fill="#fff" stroke="#C7D2FE" strokeWidth="1.5" />
            <path d="M154 250q14-6 28 0v-8q-14-6-28 0z" fill="#fff" stroke="#C7D2FE" strokeWidth="1.5" />
            <text x="168" y="248" textAnchor="middle" fontSize="6" fontWeight="900" fill="#6366F1" fontFamily={FONT}>10</text>
          </g>
        ) : <rect x="132" y="243" width="38" height="8" rx="2" fill="#6366F1" />}
        <rect x="190" y="243" width="36" height="8" rx="1.5" fill="#fff" stroke="#93C5FD" strokeWidth="1.5" />
        {w.wrote && <path d="M196 247h8M207 247h12" stroke="#1E40AF" strokeWidth="1.5" strokeLinecap="round" />}
        {pencilOut && <g transform="translate(232 244) rotate(-80) scale(.5)"><ItemArt name="pencil" /></g>}
        <rect x="236" y="240" width="24" height="10" rx="4" fill={pencilOut ? '#F472B6' : '#EC4899'} />
        {!w.pencil && <rect x="240" y="236" width="3" height="6" fill="#FACC15" />}
        {/* close-ups */}
        {acting && action === 'openbook' && <BookCard reduced={reduced} />}
        {acting && action === 'date' && <DateCard uid={uid} reduced={reduced} />}
        {acting && action === 'draw' && <DrawCard reduced={reduced} />}
        {acting && action === 'pencil' && <Sparkles x={at(sp, 150, 120)[0]} y={at(sp, 150, 120)[1]} r={26} delay={0.5} reduced={reduced} />}
        {/* break time */}
        {acting && act === 'pack' && !reduced && ['book', 'notebook', 'pencil'].map((it, i) => {
          const [bx, by] = at(sp, 56, 214)
          return (
            <Motion.g key={it} style={AT0} initial={{ x: 150 + i * 40, y: 246, opacity: 0, scale: 0.8 }}
              animate={{ x: [150 + i * 40, (150 + i * 40 + bx) / 2, bx], y: [246, 190, by], opacity: [0, 1, 0], scale: [0.8, 0.9, 0.4] }}
              transition={{ duration: 0.8, delay: 0.5 + i * 0.35 }}>
              <ItemArt name={it} transform={it === 'pencil' ? 'rotate(-60) translate(0 -12)' : undefined} />
            </Motion.g>
          )
        })}
        {acting && act === 'play' && !reduced && (() => {
          const [hx, hy] = at(sp, 160, 150)
          return (
            <Motion.g style={AT0} initial={{ x: hx, y: hy }} animate={{ x: [hx, 236, 262, 236, hx], y: [hy, 110, 196, 110, hy] }}
              transition={{ duration: 2.2, delay: 0.3, repeat: 1, ease: 'easeInOut' }}>
              <ItemArt name="ball" transform="scale(1.3)" />
            </Motion.g>
          )
        })()}
        {acting && act === 'snack' && <ItemArt name="lunchbox" transform="translate(212 236) scale(.9)" />}
        {acting && act === 'sing' && !reduced && [0, 1, 2, 3, 4].map(i => (
          <Motion.text key={i} x={[150, 96, 262, 210, 120][i]} y={196} fontSize="20" fill={['#A78BFA', '#F472B6', '#38BDF8', '#FDE047', '#4ADE80'][i]}
            textAnchor="middle" fontFamily={FONT} initial={{ opacity: 0 }} animate={{ opacity: [0, 1, 0], y: [0, -70], x: [0, i % 2 ? 12 : -12] }}
            transition={{ duration: 2, repeat: Infinity, delay: 0.3 + i * 0.4 }}>{i % 2 ? '♫' : '♪'}</Motion.text>
        ))}
        {ringing && <Confetti x={180} y={150} n={16} delay={0.4} reduced={reduced} />}
        {acting && action === 'answer' && <Confetti x={180} y={70} n={12} delay={0.9} reduced={reduced} />}
      </g>
    )
  }
  const answered = !!w.answered
  const teacherPoints = acting && (action === 'openbook' || action === 'date' || action === 'raise')
  return (
    <g>
      <defs>
        <Grad id={`${uid}wall`} stops={['#F7FEE7', '#ECFCCB']} />
        <Grad id={`${uid}out`} stops={['#7DD3FC', '#E0F2FE']} />
      </defs>
      <Wall fill={`url(#${uid}wall)`} />
      <rect x={BX} y="176" width={BW} height="60" fill="#D9F99D" />
      <rect x={BX} y="172" width={BW} height="5" rx="2" fill="#84CC16" />
      {/* bunting with letters */}
      <path d={`M${BX} 4Q-150 18 0 6T300 6T600 8`} stroke="#94A3B8" strokeWidth="1.5" fill="none" />
      {'ABCDEFGHIJKLMNOP'.split('').map((ch, i) => {
        const x = -134 + i * 36
        const c = ['#F43F5E', '#F59E0B', '#22C55E', '#3B82F6', '#A855F7'][i % 5]
        return (
          <g key={ch}>
            <path d={`M${x - 11} 7h22l-11 18z`} fill={c} />
            <text x={x} y="17" textAnchor="middle" fontSize="8" fontWeight="900" fill="#fff" fontFamily={FONT}>{ch}</text>
          </g>
        )
      })}
      {/* left (wide): bookshelf, globe, ABC poster */}
      <g>
        <rect x="-230" y="110" width="110" height="126" rx="6" fill="#B45309" />
        {[146, 186].map(y => <rect key={y} x="-224" y={y} width="98" height="5" fill="#92400E" />)}
        {[['#F43F5E', -220], ['#3B82F6', -210], ['#22C55E', -200], ['#FACC15', -190], ['#A855F7', -170], ['#F97316', -160]].map(([c, x], i) => (
          <rect key={x} x={x} y={i < 4 ? 120 : 160} width="8" height="26" rx="2" fill={c} />
        ))}
        <circle cx="-150" cy="128" r="14" fill="#38BDF8" />
        <path d="M-158 122q6-4 10 2t8 0M-160 132q8 4 14-2" stroke="#22C55E" strokeWidth="4" fill="none" />
        <rect x="-100" y="40" width="64" height="78" rx="5" fill="#fff" stroke="#F59E0B" strokeWidth="3" />
        <text x="-68" y="72" textAnchor="middle" fontSize="20" fontWeight="900" fill="#F43F5E" fontFamily={FONT}>ABC</text>
        <text x="-68" y="100" textAnchor="middle" fontSize="14" fontWeight="900" fill="#3B82F6" fontFamily={FONT}>123</text>
      </g>
      {/* right (wide): windows to the playground */}
      <g>
        {[380, 500].map(x => (
          <g key={x}>
            <rect x={x} y="40" width="96" height="104" rx="8" fill="#fff" />
            <rect x={x + 6} y="46" width="84" height="92" rx="5" fill={`url(#${uid}out)`} />
            <circle cx={x + 64} cy="70" r="9" fill="#FDE047" />
            <path d={`M${x + 6} 138v-22q24-14 42-4t42-4v30z`} fill="#4ADE80" />
            <rect x={x + 46} y="46" width="4" height="92" fill="#fff" />
          </g>
        ))}
      </g>
      {/* the door Toby comes in through */}
      <rect x="2" y="92" width="58" height="146" rx="4" fill="#B45309" />
      <rect x="8" y="98" width="46" height="138" fill="#FDE68A" />
      <Motion.g style={{ transformBox: 'view-box', originX: '8px', originY: '0px' }} initial={false} animate={{ scaleX: w.here ? 1 : 0.2 }}
        transition={{ duration: reduced ? 0 : 0.7 }}>
        <rect x="8" y="98" width="46" height="138" rx="2" fill="#F59E0B" />
        <rect x="16" y="108" width="30" height="26" rx="3" fill="#BAE6FD" />
        <circle cx="46" cy="170" r="3.5" fill="#92400E" />
      </Motion.g>
      {/* clock */}
      <circle cx="31" cy="52" r="20" fill="#fff" stroke="#3B82F6" strokeWidth="4" />
      <path d="M31 52V39M31 52l8 5" stroke="#1F2937" strokeWidth="2.5" strokeLinecap="round" />
      <circle cx="31" cy="52" r="2" fill="#EF4444" />
      {/* blackboard */}
      <rect x="74" y="20" width="212" height="108" rx="6" fill="#92400E" />
      <rect x="80" y="26" width="200" height="94" rx="3" fill="#166534" />
      <path d="M90 36l20 10M240 34q16 4 30 0" stroke="#fff" strokeWidth="1" opacity="0.08" />
      <text x="88" y="44" fontSize="11" fontWeight="700" fill="#F0FDF4" fontFamily={CHALK}>{TODAY}</text>
      <text x={answered ? 160 : 168} y="90" textAnchor="middle" fontSize="26" fontWeight="700" fill="#F0FDF4" fontFamily={CHALK}>6 + 6 =</text>
      {answered ? (
        <g>
          <Motion.text x="224" y="90" textAnchor="middle" fontSize="28" fontWeight="800" fill="#FDE047" fontFamily={CHALK}
            initial={reduced ? false : { scale: 0, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} style={{ transformBox: 'fill-box', originX: 0.5, originY: 0.5 }}
            transition={{ type: 'spring', stiffness: 260, damping: 11, delay: acting ? 0.6 : 0 }}>12</Motion.text>
          <Motion.path d="M244 78l6 7 12-14" stroke="#4ADE80" strokeWidth="4" fill="none" strokeLinecap="round" strokeLinejoin="round"
            initial={{ pathLength: reduced || !acting ? 1 : 0 }} animate={{ pathLength: 1 }} transition={{ delay: 1.2, duration: 0.4 }} />
        </g>
      ) : (
        <Motion.text x="236" y="90" textAnchor="middle" fontSize="28" fontWeight="800" fill="#FDE047" fontFamily={CHALK}
          animate={reduced || !w.asked ? undefined : { opacity: [1, 0.3, 1] }} transition={{ duration: 1, repeat: Infinity }}>?</Motion.text>
      )}
      {/* a chalk sun in the corner */}
      <circle cx="262" cy="44" r="7" fill="none" stroke="#FDE047" strokeWidth="1.5" opacity="0.8" />
      <path d="M262 32v-4M262 56v4M250 44h-4M274 44h4M254 36l-3-3M270 52l3 3M270 36l3-3M254 52l-3 3" stroke="#FDE047" strokeWidth="1.5" opacity="0.8" />
      {/* the cat drawing, taped to the board */}
      {w.drew && (
        <Motion.g initial={reduced ? false : { scale: 0, rotate: -20 }} animate={{ scale: 1, rotate: 6 }} style={{ transformBox: 'view-box', originX: '252px', originY: '108px' }}
          transition={{ type: 'spring', stiffness: 200, damping: 14 }}>
          <rect x="232" y="95" width="40" height="28" rx="2" fill="#FFFBEB" />
          <g transform="translate(252 110) scale(.68)"><ItemArt name="cat" /></g>
          <rect x="246" y="92" width="12" height="5" fill="#FDE68A" opacity="0.8" />
        </Motion.g>
      )}
      <rect x="84" y="124" width="192" height="6" rx="3" fill="#A16207" />
      <rect x="110" y="120" width="10" height="4" rx="2" fill="#fff" />
      <rect x="124" y="120" width="8" height="4" rx="2" fill="#FDE047" />
      <rect x="240" y="118" width="20" height="7" rx="2" fill="#475569" />
      {/* the school bell */}
      <Motion.g style={{ transformBox: 'view-box', originX: '336px', originY: '28px' }}
        animate={ringing && !reduced ? { rotate: [-18, 18] } : { rotate: 0 }}
        transition={ringing ? { duration: 0.1, repeat: 20, repeatType: 'mirror' } : { duration: 0.2 }}>
        <rect x="330" y="22" width="12" height="8" rx="2" fill="#475569" />
        <path d="M336 30c-12 0-15 9-15 18h30c0-9-3-18-15-18z" fill="#EF4444" stroke="#B91C1C" strokeWidth="2" />
        <circle cx="336" cy="50" r="3.5" fill="#B91C1C" />
      </Motion.g>
      {ringing && <Rings x={336} y={42} r={20} reduced={reduced} />}
      {ringing && <Pop x={292} y={80} text="RING RING!" size={17} reduced={reduced} delay={0.3} />}
      {/* the teacher */}
      <g transform="translate(314 236) scale(1.05)">
        <Teacher talking={speaker === 'other'} wave={acting && (action === 'greet' || action === 'bell')} point={teacherPoints}
          cheer={acting && action === 'answer'} reduced={reduced} />
      </g>
      <Floor fill="#E7B98A" lines={[262, 284]} line="#D9A472" />
      {/* classmates at the back, behind little desks */}
      {[[96, 0], [262, 1]].map(([x, v]) => (
        <g key={v}>
          <g transform={`translate(${x} 238) scale(.62)`}>
            <Kid v={v} cheer={cheer} eat={acting && act === 'snack'} wave={acting && action === 'greet'} reduced={reduced} />
          </g>
          <rect x={x - 28} y="220" width="56" height="7" rx="3" fill="#FBBF24" />
          <rect x={x - 24} y="226" width="48" height="16" fill="#EA9A2B" />
          <rect x={x - 22} y="242" width="4" height="10" fill="#B45309" />
          <rect x={x + 18} y="242" width="4" height="10" fill="#B45309" />
        </g>
      ))}
    </g>
  )
}
