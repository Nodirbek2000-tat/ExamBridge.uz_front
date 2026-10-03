/*
 * TOBY'S DAY — the supporting cast, drawn with their feet at 0,0:
 * <Buddy> (one round creature in many colours, dressed by `acc`) and the named
 * people built on it — <Mum>, <Teacher>, <Neighbor> (Mr. Brown), <Driver>,
 * <Kid> (classmates and friends, four looks), <Grandma> (a bus passenger) —
 * plus <Dog> (Biscuit, Toby's dog) and <Duck> (the park lake).
 */
import { motion as Motion } from 'framer-motion'
import { ItemArt } from './items'

const INK = '#1F2937'
const pivot = (x, y) => ({ transformBox: 'view-box', originX: `${x}px`, originY: `${y}px` })

/*
 * acc: one name or a list — apron · glasses · bow · cap · bun · hat · mustache · driver · tie
 * hold: an item in the left paw (moves with the arm) · leftAngle: the left arm's angle (125 = pointing up-left)
 * hair: colour of the bun / fringe
 */
export function Buddy({
  color = '#B197FC', belly = '#EDE9FE', dark = '#7C5CE0', acc, hair = '#7C2D12', apron = '#22C55E',
  hold, leftAngle = 0, talking, wave, eat, cheer, reduced,
}) {
  const has = (k) => (Array.isArray(acc) ? acc.includes(k) : acc === k)
  const bounce = cheer && !reduced ? { y: [0, -14, 0] } : { y: 0 }
  return (
    <g>
      <ellipse cx="0" cy="0" rx="28" ry="5" fill="#000" opacity="0.15" />
      <Motion.g animate={bounce} transition={cheer ? { duration: 0.55, repeat: Infinity } : { duration: 0.2 }}>
        <circle cx="-20" cy="-72" r="10" fill={color} stroke={dark} strokeWidth="2" />
        <circle cx="20" cy="-72" r="10" fill={color} stroke={dark} strokeWidth="2" />
        <circle cx="-20" cy="-72" r="5" fill={belly} />
        <circle cx="20" cy="-72" r="5" fill={belly} />
        <ellipse cx="0" cy="-40" rx="32" ry="40" fill={color} stroke={dark} strokeWidth="2" />
        <ellipse cx="0" cy="-20" rx="20" ry="17" fill={belly} />
        {has('apron') && (
          <g>
            <path d="M-14-44h28v28q0 10-14 10t-14-10z" fill={apron} />
            <path d="M-14-44q14-18 28 0" stroke={dark} strokeWidth="3" fill="none" opacity="0.6" />
            <rect x="-6" y="-30" width="12" height="8" rx="2" fill="#fff" opacity="0.35" />
          </g>
        )}
        {has('tie') && <path d="M-3.5-27h7l-1.5 3.5 2.5 12-4.5 4.5-4.5-4.5 2.5-12z" fill="#DC2626" />}
        {/* left arm: hangs, or points (teacher), holding `hold` */}
        <Motion.g style={pivot(-27, -46)} initial={false} animate={{ rotate: leftAngle }} transition={{ type: 'spring', stiffness: 120, damping: 14 }}>
          {hold && <ItemArt name={hold} transform="translate(-37 -18) rotate(-10) scale(.85)" />}
          <ellipse cx="-31" cy="-34" rx="7" ry="13" fill={color} stroke={dark} strokeWidth="2" transform="rotate(18 -31 -34)" />
        </Motion.g>
        {/* right arm: waves or eats */}
        <Motion.g style={pivot(27, -46)} initial={false}
          animate={wave && !reduced ? { rotate: [-120, -150, -120] } : eat && !reduced ? { rotate: [100, 120, 100] } : { rotate: wave ? -130 : eat ? 110 : 0 }}
          transition={wave || eat ? { duration: wave ? 0.5 : 0.8, repeat: Infinity } : { duration: 0.3 }}>
          <ellipse cx="31" cy="-34" rx="7" ry="13" fill={color} stroke={dark} strokeWidth="2" transform="rotate(-18 31 -34)" />
        </Motion.g>
        {/* face */}
        <Motion.g style={{ originX: 0.5, originY: 0.5 }} animate={reduced ? undefined : { scaleY: [1, 1, 0.1, 1] }}
          transition={{ duration: 3.6, repeat: Infinity, times: [0, 0.9, 0.95, 1], delay: 0.7 }}>
          <ellipse cx="-11" cy="-52" rx="5.5" ry="7" fill={INK} />
          <ellipse cx="11" cy="-52" rx="5.5" ry="7" fill={INK} />
          <circle cx="-13" cy="-55" r="2" fill="#fff" />
          <circle cx="9" cy="-55" r="2" fill="#fff" />
        </Motion.g>
        {has('glasses') && (
          <g stroke="#1E293B" strokeWidth="2" fill="#fff" fillOpacity="0.15">
            <circle cx="-11" cy="-52" r="9" />
            <circle cx="11" cy="-52" r="9" />
            <path d="M-2-53h4" />
          </g>
        )}
        {has('bun') && (
          <g fill={hair}>
            <circle cx="0" cy="-84" r="9" />
            <path d="M-25-63q4-20 25-20t25 20q-8-9-17-8-4 6-8 0-9 0-25 8z" />
            <circle cx="-3" cy="-87" r="2.6" fill="#fff" opacity="0.25" />
          </g>
        )}
        {has('bow') && (
          <g transform="translate(18 -78) rotate(20)">
            <path d="M0 0-12-8v16zM0 0l12-8v16z" fill="#F43F5E" />
            <circle r="3.5" fill="#BE123C" />
          </g>
        )}
        {has('cap') && <path d="M-26-70q26-22 52 0zM20-72h18q2 4-4 5h-14z" fill="#F97316" />}
        {has('hat') && (
          <g>
            <path d="M-19-74q0-21 19-21t19 21z" fill="#78716C" />
            <rect x="-19" y="-80" width="38" height="4.5" fill="#292524" />
            <ellipse cx="0" cy="-74" rx="31" ry="5" fill="#57534E" />
          </g>
        )}
        {has('driver') && (
          <g>
            <path d="M-24-69q24-22 48 0v3h-48z" fill="#1E3A8A" />
            <path d="M-26-66h52q-4 7-26 7t-26-7z" fill="#0F172A" />
            <circle cx="0" cy="-76" r="3.4" fill="#FACC15" stroke="#CA8A04" strokeWidth="1" />
          </g>
        )}
        <ellipse cx="-20" cy="-41" rx="6" ry="4" fill="#FDA4AF" opacity="0.7" />
        <ellipse cx="20" cy="-41" rx="6" ry="4" fill="#FDA4AF" opacity="0.7" />
        {talking ? (
          <Motion.ellipse cx="0" cy="-38" rx="6" fill="#9F1239" initial={{ ry: 3 }}
            animate={reduced ? { ry: 4 } : { ry: [2, 6, 3, 5.5, 2] }} transition={{ duration: 0.7, repeat: Infinity }} />
        ) : eat ? (
          <Motion.ellipse cx="0" cy="-38" rx="5" fill="#9F1239" initial={{ ry: 2 }}
            animate={reduced ? { ry: 2 } : { ry: [1, 4, 1] }} transition={{ duration: 0.4, repeat: Infinity }} />
        ) : cheer ? (
          <path d="M-8-41q8 12 16 0z" fill="#9F1239" />
        ) : (
          <path d="M-7-40q7 7 14 0" stroke="#9F1239" strokeWidth="3" strokeLinecap="round" fill="none" />
        )}
        {has('mustache') && <path d="M0-45c-3-3-9-4-14 0 5 4 10 3 14 0 4 3 9 4 14 0-5-4-11-3-14 0z" fill="#78350F" />}
      </Motion.g>
    </g>
  )
}

/* Toby's mum: pink, a brown bun, an apron */
export function Mum(props) {
  return <Buddy color="#F9A8D4" belly="#FCE7F3" dark="#DB2777" acc={['apron', 'bun']} apron="#fff" hair="#92400E" {...props} />
}

/* the teacher: lavender, glasses, a bun; points at the board with a stick */
export function Teacher({ point, ...props }) {
  return <Buddy color="#C4B5FD" belly="#EDE9FE" dark="#7C3AED" acc={['glasses', 'bun']} hair="#4C1D95" hold="pencil" leftAngle={point ? 128 : 0} {...props} />
}

/* Mr. Brown next door: a hat, a moustache and a watering can */
export function Neighbor(props) {
  return <Buddy color="#FDBA74" belly="#FFEDD5" dark="#C2410C" acc={['hat', 'mustache']} hold="watering-can" {...props} />
}

/* the bus driver: a peaked cap and a red tie */
export function Driver(props) {
  return <Buddy color="#93C5FD" belly="#DBEAFE" dark="#2563EB" acc={['driver', 'tie']} {...props} />
}

const KIDS = [
  { color: '#86EFAC', belly: '#DCFCE7', dark: '#16A34A', acc: 'cap' },
  { color: '#FDE68A', belly: '#FEF9C3', dark: '#CA8A04', acc: 'bow' },
  { color: '#93C5FD', belly: '#DBEAFE', dark: '#2563EB', acc: 'glasses' },
  { color: '#FDBA74', belly: '#FFEDD5', dark: '#EA580C', acc: null },
]
/* classmates and friends: v = 0 green cap · 1 yellow bow · 2 blue glasses · 3 orange */
export function Kid({ v = 0, ...props }) {
  return <Buddy {...KIDS[v % KIDS.length]} {...props} />
}

/* a grandma on the bus, reading the paper */
export function Grandma(props) {
  return <Buddy color="#E9D5FF" belly="#FAF5FF" dark="#9333EA" acc={['bun', 'glasses']} hair="#E5E7EB" hold="newspaper" leftAngle={40} {...props} />
}

/* Biscuit the dog, facing right. collar ≈ (14, −28) */
export function Dog({ happy, walking, jump, ball, sit, reduced }) {
  const fur = '#F4BE85'
  const legs = walking && !reduced
  return (
    <g>
      <ellipse cx="0" cy="0" rx="30" ry="4.5" fill="#000" opacity="0.15" />
      <Motion.g key={`d${jump || 0}`} initial={{ y: 0 }}
        animate={jump && !reduced ? { y: [0, -34, 0] } : { y: 0 }} transition={{ duration: 0.7, delay: 0.45, ease: 'easeOut' }}>
        <Motion.g animate={legs ? { y: [0, -3, 0] } : { y: 0 }} transition={{ duration: 0.3, repeat: legs ? Infinity : 0 }}>
          {/* tail */}
          <Motion.path d="M-24-28q-14-6-12-22" stroke={fur} strokeWidth="7" strokeLinecap="round" fill="none" style={pivot(-24, -28)}
            animate={reduced ? undefined : { rotate: happy || walking ? [-18, 18, -18] : [-6, 6, -6] }}
            transition={{ duration: happy || walking ? 0.3 : 1.4, repeat: Infinity }} />
          {/* legs */}
          {sit ? (
            <>
              <ellipse cx="-14" cy="-6" rx="14" ry="7" fill="#E9A86A" />
              <rect x="6" y="-16" width="7" height="16" rx="3.5" fill={fur} />
              <rect x="16" y="-16" width="7" height="16" rx="3.5" fill={fur} />
            </>
          ) : [[-20, '#E9A86A', 0], [-9, fur, 1], [8, '#E9A86A', 1], [18, fur, 0]].map(([x, c, ph], i) => (
            <Motion.rect key={i} x={x} y="-15" width="7" height="15" rx="3.5" fill={c} style={pivot(x + 3.5, -15)}
              animate={legs ? { rotate: ph ? [18, -18, 18] : [-18, 18, -18] } : { rotate: 0 }}
              transition={{ duration: 0.3, repeat: legs ? Infinity : 0 }} />
          ))}
          {/* body */}
          <ellipse cx="0" cy={sit ? -20 : -22} rx="26" ry="15" fill={fur} transform={sit ? 'rotate(-14 0 -20)' : undefined} />
          <ellipse cx="-8" cy="-26" rx="9" ry="6" fill="#E39A58" />
          <ellipse cx="6" cy="-14" rx="11" ry="6" fill="#FFE4C7" />
          {/* head */}
          <circle cx="24" cy="-42" r="16" fill={fur} />
          <ellipse cx="13" cy="-42" rx="6" ry="12" fill="#A86A3D" transform="rotate(22 13 -42)" />
          <ellipse cx="37" cy="-37" rx="9.5" ry="7" fill="#FFE4C7" />
          <ellipse cx="44.5" cy="-40" rx="3.6" ry="2.8" fill="#3A2618" />
          <Motion.g style={{ originX: 0.5, originY: 0.5 }} animate={reduced ? undefined : { scaleY: [1, 1, 0.1, 1] }}
            transition={{ duration: 3, repeat: Infinity, times: [0, 0.9, 0.95, 1] }}>
            <circle cx="27" cy="-47" r="3.3" fill={INK} />
            <circle cx="26" cy="-48.3" r="1.1" fill="#fff" />
          </Motion.g>
          {happy && !ball && <ellipse cx="38" cy="-29.5" rx="3.2" ry="4.6" fill="#FB7185" />}
          <path d="M33-32q4 3 8 0" stroke="#3A2618" strokeWidth="1.6" strokeLinecap="round" fill="none" />
          {/* collar */}
          <path d="M9-32q6-9 13-12" stroke="#EF4444" strokeWidth="5" strokeLinecap="round" fill="none" />
          <circle cx="14" cy="-28" r="2.8" fill="#FACC15" />
          {ball && (
            <g>
              <circle cx="42" cy="-31" r="7.5" fill="#EF4444" />
              <path d="M34.5-31h15" stroke="#fff" strokeWidth="2.2" />
            </g>
          )}
        </Motion.g>
      </Motion.g>
    </g>
  )
}

/* a duck on the water line (y 0), facing right; `peck` = eating crumbs */
export function Duck({ peck, reduced, color = '#FACC15' }) {
  return (
    <g>
      <ellipse cx="-3" cy="1" rx="16" ry="2.6" fill="#fff" opacity="0.45" />
      <Motion.g animate={reduced ? undefined : { y: [0, -1.5, 0], rotate: [-2, 2, -2] }} transition={{ duration: 1.8, repeat: Infinity, ease: 'easeInOut' }}>
        <path d="M-15-6q-4-7 2-7" fill={color} />
        <ellipse cx="-4" cy="-5" rx="12" ry="7" fill={color} />
        <path d="M-9-6q5 6 10 1" stroke="#EAB308" strokeWidth="1.6" fill="none" strokeLinecap="round" />
        <Motion.g style={pivot(4, -10)} animate={peck && !reduced ? { rotate: [0, 40, 0] } : { rotate: 0 }}
          transition={peck ? { duration: 0.45, repeat: Infinity, repeatDelay: 0.2 } : { duration: 0.2 }}>
          <circle cx="6" cy="-15" r="6.5" fill={color} />
          <path d="M12-15.5l5.5 1.2-5.5 2.8z" fill="#F97316" />
          <circle cx="8" cy="-17" r="1.5" fill={INK} />
          <circle cx="7.5" cy="-17.6" r=".5" fill="#fff" />
        </Motion.g>
      </Motion.g>
    </g>
  )
}
