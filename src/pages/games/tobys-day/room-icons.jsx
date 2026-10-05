/*
 * TOBY'S PLAY ROOM — a small drawn picture for each of the 28 commands (no
 * icon font): flat colours in a 32-unit box, reusing items.jsx drawings where
 * one already exists (apple, milk, moon, notes, heart, bed…). "Don't …"
 * commands get a red no-sign over their picture.
 */
import { ItemArt } from './items'

const FUR = '#FFF6EA'
const LINE = '#D9BC9C'

/* a tiny cream Toby-ish figure: head + body (for stand / jump) */
function buddy(y = 0) {
  return (
    <g transform={`translate(0 ${y})`}>
      <path d="M-7-13-6.5-19l4 2.6M7-13l-.5-6-4 2.6" fill={FUR} stroke={LINE} strokeWidth="1" strokeLinejoin="round" />
      <circle cy="-9" r="7.5" fill={FUR} stroke={LINE} strokeWidth="1.1" />
      <circle cx="-2.6" cy="-9.5" r="1.2" fill="#1F2937" />
      <circle cx="2.6" cy="-9.5" r="1.2" fill="#1F2937" />
      <path d="M-1.6-6.4q1.6 1.4 3.2 0" stroke="#9F1239" strokeWidth=".9" fill="none" strokeLinecap="round" />
      <ellipse cy="3" rx="6" ry="5.5" fill="#FF6B6B" />
      <ellipse cx="-3" cy="8.4" rx="2.6" ry="1.6" fill={FUR} stroke={LINE} strokeWidth=".8" />
      <ellipse cx="3" cy="8.4" rx="2.6" ry="1.6" fill={FUR} stroke={LINE} strokeWidth=".8" />
    </g>
  )
}

function noSign() {
  return (
    <g>
      <circle r="14" fill="none" stroke="#EF4444" strokeWidth="2.8" />
      <path d="M-9.9-9.9 9.9 9.9" stroke="#EF4444" strokeWidth="2.8" strokeLinecap="round" />
    </g>
  )
}

function cap(r = 0, tx = 0, ty = 0) {
  return (
    <g transform={`translate(${tx} ${ty}) rotate(${r})`}>
      <path d="M-11 3C-11-10 11-10 11 3z" fill="#EF4444" />
      <path d="M5 1h12q1.6 3-2.4 4.6H3z" fill="#B91C1C" />
      <circle cy="-8" r="2" fill="#B91C1C" />
      <path d="M-5-4a6 6 0 0 1 6-3" stroke="#fff" strokeWidth="1.5" fill="none" opacity=".6" strokeLinecap="round" />
    </g>
  )
}

function pawUp(tx = 0, ty = 0, r = 0) {
  return (
    <g transform={`translate(${tx} ${ty}) rotate(${r})`}>
      <rect x="-5" y="-2" width="10" height="16" rx="5" fill={FUR} stroke={LINE} strokeWidth="1" />
      <circle cy="-4" r="6.5" fill={FUR} stroke={LINE} strokeWidth="1.1" />
      <ellipse cy="-3" rx="2.6" ry="2" fill="#FDA4AF" />
      {[-3.6, -1.2, 1.2, 3.6].map(x => <circle key={x} cx={x} cy="-7.6" r="1.1" fill="#FDA4AF" />)}
    </g>
  )
}

const ART = {
  stand: () => (
    <g>
      {buddy(2)}
      <path d="M12 6V-8M8.5-4.5 12-8l3.5 3.5" stroke="#38BDF8" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round" />
    </g>
  ),
  sit: () => (
    <g>
      <rect x="-10" y="-14" width="20" height="14" rx="4" fill="#A78BFA" />
      <rect x="-12" y="-2" width="24" height="8" rx="3" fill="#8B5CF6" />
      <path d="M-10 6v8M10 6v8" stroke="#6D28D9" strokeWidth="2.6" strokeLinecap="round" />
      <path d="M-7-10h10" stroke="#fff" strokeWidth="1.4" opacity=".4" strokeLinecap="round" />
    </g>
  ),
  jump: () => (
    <g>
      <ellipse cy="14" rx="9" ry="2.2" fill="#000" opacity=".25" />
      {buddy(-2)}
      <path d="M-13 4l-3 3M13 4l3 3M-14-2h-3M14-2h3" stroke="#FDE047" strokeWidth="1.8" strokeLinecap="round" />
    </g>
  ),
  dance: () => (
    <g>
      <path d="M0-16v4" stroke="#94A3B8" strokeWidth="1.4" />
      <circle cy="0" r="11" fill="#CBD5E1" />
      <path d="M-11 0h22M-9.5-5.5h19M-9.5 5.5h19M0-11v22M-6-9.5q-3 9.5 0 19M6-9.5q3 9.5 0 19" stroke="#94A3B8" strokeWidth=".9" fill="none" />
      <path d="M-5-6l3 0 0 3-3 0zM3 2l3 0 0 3-3 0z" fill="#fff" opacity=".8" />
      <path d="M-14 9l-2 4M14 9l2 4M15-4h3M-15-4h-3" stroke="#F472B6" strokeWidth="1.8" strokeLinecap="round" />
    </g>
  ),
  turn: () => (
    <g>
      <path d="M10.4-6A12 12 0 1 0 12 2" stroke="#38BDF8" strokeWidth="3.2" fill="none" strokeLinecap="round" />
      <path d="M12.6-13.5 11.4-4.2 3-7.6z" fill="#38BDF8" />
      <circle r="3.4" fill="#FDE047" />
    </g>
  ),
  run: () => (
    <g>
      <path d="M-9 8V0q0-3 3-3h4q2 0 3 2l2 3q6 1 7 4v2z" fill="#F43F5E" />
      <rect x="-9.5" y="7" width="20" height="3.4" rx="1.7" fill="#fff" />
      <path d="M-3.5-1.5l3 2.5M-1.5-3l3 2.5" stroke="#fff" strokeWidth="1.3" strokeLinecap="round" />
      <path d="M-16-2h6M-17 3h6M-15 8h4" stroke="#94A3B8" strokeWidth="1.8" strokeLinecap="round" />
    </g>
  ),
  lie: () => <ItemArt name="bed" />,
  raise: () => (
    <g>
      {pawUp(0, 2)}
      <path d="M-11-10q-3 4 0 8M11-10q3 4 0 8" stroke="#FDE047" strokeWidth="1.8" fill="none" strokeLinecap="round" />
    </g>
  ),
  clap: () => (
    <g>
      {pawUp(-5, 4, 18)}
      {pawUp(5, 4, -18)}
      <path d="M0-15v-2M-6-13l-1.5-1.5M6-13l1.5-1.5" stroke="#FDE047" strokeWidth="1.8" strokeLinecap="round" />
    </g>
  ),
  five: () => <ItemArt name="hand" />,
  hello: () => <ItemArt name="wave" />,
  nose: () => (
    <g>
      <path d="M-7-4q7-6 14 0-2 8-7 9-5-1-7-9z" fill="#F472B6" />
      <ellipse cx="-2.4" cy="-3" rx="2.2" ry="1.2" fill="#fff" opacity=".7" />
      <path d="M-9 4h-7M-9 8l-6 3M9 4h7M9 8l6 3" stroke="#D9BC9C" strokeWidth="1.6" strokeLinecap="round" />
    </g>
  ),
  eat: () => <ItemArt name="apple" />,
  drink: () => <ItemArt name="milk" />,
  sleep: () => <ItemArt name="moon" />,
  wake: () => <ItemArt name="alarm-clock" />,
  hat_on: () => (
    <g>
      {cap(0, 0, 4)}
      <path d="M0-14v6M-3-11 0-8l3-3" stroke="#34D399" strokeWidth="1.8" fill="none" strokeLinecap="round" strokeLinejoin="round" />
    </g>
  ),
  hat_off: () => (
    <g>
      {cap(-18, 2, -2)}
      <path d="M-15 8h8M-13 12h10M-16 4h5" stroke="#94A3B8" strokeWidth="1.6" strokeLinecap="round" />
    </g>
  ),
  sing: () => <ItemArt name="notes" />,
  laugh: () => (
    <g>
      <circle r="12.5" fill="#FDE047" stroke="#FACC15" strokeWidth="1.4" />
      <path d="M-8-4l4 2-4 2M8-4l-4 2 4 2" stroke="#78350F" strokeWidth="1.6" fill="none" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M-7 3q7 9 14 0z" fill="#9F1239" />
      <path d="M-11-1q-3 3-1 6M11-1q3 3 1 6" stroke="#7DD3FC" strokeWidth="1.8" fill="none" strokeLinecap="round" />
    </g>
  ),
  good: () => (
    <g>
      <rect x="-9" y="-2" width="15" height="14" rx="4" fill={FUR} stroke={LINE} strokeWidth="1.1" />
      <path d="M-4-2V-11q0-3 3-3t3 3v9" fill={FUR} stroke={LINE} strokeWidth="1.1" />
      <path d="M6 1h2M6 5h2M6 9h2" stroke={LINE} strokeWidth="1.2" strokeLinecap="round" />
      <path d="M11-12l1 2.2 2.4.3-1.8 1.6.5 2.4-2.1-1.2-2.1 1.2.5-2.4-1.8-1.6 2.4-.3z" fill="#FDE047" />
    </g>
  ),
  love: () => <ItemArt name="heart" />,
  calm: () => (
    <g>
      <path d="M-13-4q4-4 8 0t8 0 8 0M-13 3q4-4 8 0t8 0 8 0M-13 10q4-4 8 0t8 0 8 0" stroke="#38BDF8" strokeWidth="2.2" fill="none" strokeLinecap="round" />
      <path d="M-4-14q4-4 8 0-4 4-8 0z" fill="#34D399" />
    </g>
  ),
  stop: () => (
    <g>
      <path d="M-5.8-14h11.6L14-5.8V5.8L5.8 14H-5.8L-14 5.8V-5.8z" fill="#EF4444" stroke="#fff" strokeWidth="1.6" />
      <rect x="-8" y="-2" width="16" height="4" rx="1.5" fill="#fff" />
    </g>
  ),
  quiet: () => (
    <g>
      <path d="M-12-4h5l7-6v20l-7-6h-5z" fill="#94A3B8" />
      <path d="M5-5l8 8M13-5l-8 8" stroke="#EF4444" strokeWidth="2.4" strokeLinecap="round" />
    </g>
  ),
  dont_cry: () => (
    <g>
      <path d="M0-11c6 7 8 11 8 14a8 8 0 0 1-16 0c0-3 2-7 8-14z" fill="#7DD3FC" />
      <ellipse cx="-3" cy="2" rx="1.6" ry="2.6" fill="#fff" opacity=".6" />
      {noSign()}
    </g>
  ),
  dont_jump: () => (
    <g>
      <g transform="scale(.8)">{buddy(0)}</g>
      {noSign()}
    </g>
  ),
  dont_eat: () => (
    <g>
      <g transform="scale(.82)"><ItemArt name="cake-slice" /></g>
      {noSign()}
    </g>
  ),
}

/* one command's picture as an inline <svg> (an empty star-ish dot for an unknown key) */
export function CommandArt({ k, size = 28, className = '' }) {
  const draw = ART[k]
  return (
    <svg viewBox="-17 -17 34 34" width={size} height={size} className={className} aria-hidden>
      {draw ? draw() : <circle r="6" fill="#FFB020" />}
    </svg>
  )
}
