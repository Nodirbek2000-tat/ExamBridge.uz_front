/*
 * TOBY'S DAY — little things drawn in SVG: shop goods (apples, milk…), the props
 * Toby holds (toothbrush, cup, basket…) and the picture for every sentence
 * (alarm clock, bus, blackboard, soup…). Every item is centred on 0,0 in a
 * ~32-unit box; "pointing" props (toothbrush, fork, pencil) start at 0,0 and
 * extend downwards so they follow the arm.
 *
 * <ItemArt name> draws one in an SVG; <ItemIcon name> is a standalone icon
 * (an empty <g> for an unknown name, so a card can hide itself). The full list
 * of names is ITEM_NAMES in world-items.js.
 */
import { motion as Motion } from 'framer-motion'
import { ITEM_NAMES } from './world-items'
import { MORE_ART } from './items-more'

const FONT = 'system-ui, -apple-system, Segoe UI, sans-serif'
const CHALK = "'Chalkboard SE', 'Comic Sans MS', 'Segoe Print', cursive"
const PAW = { fill: '#FFF6EA', stroke: '#D9BC9C', strokeWidth: 1.3 }
const SPARK = 'M0-5C.6-1.6 1.6-.6 5 0 1.6.6.6 1.6 0 5-.6 1.6-1.6.6-5 0-1.6-.6-.6-1.6 0-5z'
const STAR = 'M0-8.5l2.5 5.1 5.6.8-4.1 4 1 5.6L0 4.4l-5 2.6 1-5.6-4.1-4 5.6-.8z'

/* ── pieces several items share ── */
const drop = (x, y, s = 1) => <path key={`${x}-${y}`} d={`M${x} ${y - 4 * s}q${4 * s} ${5 * s} 0 ${8 * s}-${4 * s}-${3 * s} 0-${8 * s}z`} fill="#38BDF8" />
const bubble = (x, y, r) => <circle key={`${x}-${y}`} cx={x} cy={y} r={r} fill="#fff" fillOpacity="0.55" stroke="#7DD3FC" strokeWidth="1.1" />

function paw(rot = 0, tx = 0, ty = 0) {
  return (
    <g transform={`translate(${tx} ${ty}) rotate(${rot})`}>
      {[-6, -2, 2, 6].map((x, i) => (
        <rect key={x} x={x - 2} y={i === 0 || i === 3 ? -9 : -12} width="4" height="12" rx="2" {...PAW} />
      ))}
      <rect x="-13" y="1" width="9" height="4" rx="2" transform="rotate(-35 -8.5 3)" {...PAW} />
      <rect x="-8.5" y="-3" width="17" height="16" rx="7" {...PAW} />
      <ellipse cx="0" cy="5" rx="4" ry="3" fill="#FDA4AF" />
    </g>
  )
}

function sneaker(tx, ty, c, dark) {
  return (
    <g transform={`translate(${tx} ${ty})`}>
      <path d="M-10 4V-4q0-3 3-3h4q2 0 3 2l2 3q6 1 7 4v2z" fill={c} stroke={dark} strokeWidth="1" strokeLinejoin="round" />
      <rect x="-10.5" y="3" width="20.5" height="3.4" rx="1.7" fill="#fff" stroke="#CBD5E1" strokeWidth=".8" />
      <path d="M-4.5-4.5l3 2.5M-2.5-6l3 2.5" stroke="#fff" strokeWidth="1.4" strokeLinecap="round" />
      <circle cx="-7" cy="-1" r="1.3" fill="#fff" opacity=".8" />
    </g>
  )
}

function carrot() {
  return (
    <>
      <path d="M0-6q-4-6-6-8M0-6q0-7 1-10M0-6q4-6 7-7" stroke="#22C55E" strokeWidth="2.4" fill="none" strokeLinecap="round" />
      <path d="M-4.5-6q4.5-3 9 0L1 15q-1 1.5-2 0z" fill="#F97316" />
      <path d="M-2.5-1h3M-1.5 5h3M-1.5 10h2" stroke="#C2410C" strokeWidth="1.1" strokeLinecap="round" />
    </>
  )
}

function trafficLight(lit) {
  const lamps = [['red', -9, '#EF4444', '#4C1D1D'], ['amber', -1, '#F59E0B', '#44310E'], ['green', 7, '#22C55E', '#12351F']]
  return (
    <>
      <rect x="-1.8" y="11" width="3.6" height="6" fill="#475569" />
      <rect x="-8" y="-16" width="16" height="28" rx="5" fill="#1F2937" />
      <path d="M-8-14h-3l3 5M8-14h3l-3 5" fill="#334155" />
      {lamps.map(([k, y, on, off]) => (
        <g key={k}>
          {k === lit && <circle cy={y} r="6.5" fill={on} opacity=".35" />}
          <circle cy={y} r="3.8" fill={k === lit ? on : off} />
          {k === lit && <circle cx="-1.3" cy={y - 1.3} r="1.2" fill="#fff" opacity=".7" />}
        </g>
      ))}
    </>
  )
}

const ART = {
  /* ── shop goods ── */
  apples: () => (
    <>
      <circle cx="-5" cy="3" r="8.5" fill="#EF4444" />
      <circle cx="6" cy="4" r="8" fill="#F43F5E" />
      <ellipse cx="-8" cy="0" rx="2" ry="3.2" fill="#fff" opacity="0.45" />
      <path d="M-5 -5q1-4 3-6" stroke="#7C4A1E" strokeWidth="1.8" strokeLinecap="round" fill="none" />
      <path d="M-3-9q6-4 9 1-6 3-9-1z" fill="#22C55E" />
    </>
  ),
  bananas: () => (
    <>
      <path d="M-13-7C-12 7 1 13 14 4c-3-1-4-3-5-5-6 6-14 3-18-8z" fill="#FACC15" stroke="#CA8A04" strokeWidth="1.2" strokeLinejoin="round" />
      <path d="M-11-10c2 12 12 16 23 8-2-1-3-2-3-4-6 6-13 4-16-6z" fill="#FDE047" stroke="#CA8A04" strokeWidth="1.2" strokeLinejoin="round" />
      <path d="M-12-9l-2-4" stroke="#78350F" strokeWidth="2.6" strokeLinecap="round" />
    </>
  ),
  oranges: () => (
    <>
      <circle cx="0" cy="2" r="10.5" fill="#FB923C" />
      <circle cx="-3.5" cy="-1.5" r="3" fill="#fff" opacity="0.35" />
      <path d="M0-8q4-6 10-3-4 4-10 3z" fill="#22C55E" />
      <circle cx="0" cy="-8" r="1.6" fill="#7C4A1E" />
    </>
  ),
  grapes: () => (
    <>
      <path d="M0-11v-3" stroke="#65A30D" strokeWidth="2" strokeLinecap="round" />
      <path d="M1-12q7-4 10 1-6 2-10-1z" fill="#84CC16" />
      {[[-6, -5], [0, -6], [6, -5], [-3, 1], [3, 1], [0, 7], [-7, 2], [7, 2]].map(([x, y], i) => (
        <circle key={i} cx={x} cy={y} r="4.2" fill={i % 2 ? '#7C3AED' : '#8B5CF6'} />
      ))}
      <circle cx="-2" cy="-7" r="1.3" fill="#fff" opacity="0.5" />
    </>
  ),
  bread: () => (
    <>
      <path d="M-14 6c-1-12 6-16 14-16s15 4 14 16z" fill="#E7A65A" />
      <rect x="-14" y="4" width="28" height="7" rx="2.5" fill="#D08B3E" />
      <path d="M-7-6l3 6M0-7l3 6M7-6l3 6" stroke="#B9732C" strokeWidth="1.7" strokeLinecap="round" />
    </>
  ),
  milk: () => (
    <>
      <path d="M-8-6l4-7h8l4 7z" fill="#DBEAFE" stroke="#BFDBFE" strokeWidth="1" />
      <rect x="-8" y="-6" width="16" height="20" rx="2" fill="#fff" stroke="#CBD5E1" strokeWidth="1" />
      <rect x="-8" y="1" width="16" height="7" fill="#3B82F6" />
      <path d="M0-4q3 3 0 4-3-1 0-4z" fill="#60A5FA" />
    </>
  ),
  cheese: () => (
    <>
      <path d="M-13 9h26V-4L-13 2z" fill="#FBBF24" />
      <path d="M-13 2 13-4 5-10z" fill="#FDE68A" />
      <circle cx="-5" cy="5" r="2.2" fill="#D97706" opacity="0.55" />
      <circle cx="5" cy="2.5" r="1.7" fill="#D97706" opacity="0.55" />
      <circle cx="8" cy="6.5" r="1.3" fill="#D97706" opacity="0.55" />
    </>
  ),
  eggs: () => (
    <>
      <ellipse cx="-5" cy="2" rx="7" ry="9" fill="#FFF7ED" stroke="#E7D3BE" strokeWidth="1.2" />
      <ellipse cx="6" cy="4" rx="6.5" ry="8.5" fill="#FDE7C8" stroke="#E7D3BE" strokeWidth="1.2" />
      <ellipse cx="-7" cy="-2" rx="1.6" ry="2.6" fill="#fff" />
    </>
  ),
  water: () => (
    <>
      <rect x="-3.5" y="-15" width="7" height="4" rx="1" fill="#2563EB" />
      <path d="M-3.5-11h7l3 5v18a2 2 0 0 1-2 2h-9a2 2 0 0 1-2-2V-6z" fill="#BAE6FD" stroke="#7DD3FC" strokeWidth="1" />
      <rect x="-6.5" y="0" width="13" height="6" fill="#38BDF8" />
      <path d="M-4-4v12" stroke="#fff" strokeWidth="1.4" opacity="0.7" strokeLinecap="round" />
    </>
  ),
  juice: () => (
    <>
      <path d="M-8-6l4-7h8l4 7z" fill="#FDBA74" />
      <rect x="-8" y="-6" width="16" height="20" rx="2" fill="#F97316" />
      <circle cx="0" cy="4" r="5" fill="#FDBA74" />
      <path d="M0 4l3.5-3.5M0 4l-3.5-3.5M0 4v5" stroke="#F97316" strokeWidth="1" />
      <path d="M4-13l3-5" stroke="#F43F5E" strokeWidth="1.8" strokeLinecap="round" />
    </>
  ),
  chocolate: () => (
    <>
      <rect x="-13" y="-8" width="26" height="16" rx="2" fill="#7C2D12" />
      <path d="M-13 0h15M-6-8V8" stroke="#5B1F0B" strokeWidth="1.3" />
      <rect x="2" y="-9.5" width="12" height="19" rx="2" fill="#DC2626" />
      <path d="M5-9.5v19" stroke="#FCA5A5" strokeWidth="1.2" />
    </>
  ),
  cookies: () => (
    <>
      <rect x="-12" y="-11" width="24" height="22" rx="3" fill="#60A5FA" />
      <rect x="-12" y="-11" width="24" height="5" rx="2" fill="#3B82F6" />
      <circle cx="0" cy="3" r="7" fill="#D6A15E" />
      <circle cx="-2.5" cy="1" r="1.3" fill="#5B3A1E" />
      <circle cx="2.5" cy="2" r="1.2" fill="#5B3A1E" />
      <circle cx="0" cy="6" r="1.3" fill="#5B3A1E" />
    </>
  ),

  /* ── props Toby holds ── */
  toothbrush: () => (
    <>
      <rect x="-2.5" y="-2" width="5" height="25" rx="2.5" fill="#38BDF8" />
      <rect x="-3.5" y="21" width="7" height="9" rx="2" fill="#fff" />
      <rect x="-3.5" y="21" width="7" height="3" rx="1" fill="#A5F3FC" />
    </>
  ),
  fork: () => (
    <>
      <rect x="-2" y="-2" width="4" height="19" rx="2" fill="#CBD5E1" />
      <path d="M-5 17h10v3h-10zM-4.5 20v7M-1.5 20v7M1.5 20v7M4.5 20v7" stroke="#CBD5E1" strokeWidth="1.8" strokeLinecap="round" fill="#CBD5E1" />
    </>
  ),
  pencil: () => (
    <>
      <rect x="-3" y="-4" width="6" height="4" rx="1" fill="#F472B6" />
      <rect x="-3" y="0" width="6" height="20" fill="#FACC15" />
      <path d="M-3 20 0 28l3-8z" fill="#FDE3B5" />
      <path d="M-1.2 24.5 0 28l1.2-3.5z" fill="#334155" />
    </>
  ),
  comb: () => (
    <>
      <rect x="-17" y="-5" width="34" height="7" rx="3.5" fill="#F472B6" />
      <path d="M-14 2v7M-10 2v7M-6 2v7M-2 2v7M2 2v7M6 2v7M10 2v7M14 2v7" stroke="#F472B6" strokeWidth="2.2" strokeLinecap="round" />
    </>
  ),
  cup: () => (
    <>
      <path d="M7-3q8 0 8 5t-8 5" stroke="#F87171" strokeWidth="3" fill="none" />
      <rect x="-9" y="-8" width="17" height="17" rx="4" fill="#F87171" />
      <ellipse cx="-0.5" cy="-7" rx="7" ry="1.8" fill="#92400E" />
      <path d="M-5-2v7" stroke="#fff" strokeWidth="1.6" opacity="0.5" strokeLinecap="round" />
    </>
  ),
  sponge: () => (
    <>
      <rect x="-9" y="-6" width="18" height="12" rx="3" fill="#FDE047" />
      <rect x="-9" y="-6" width="18" height="4" rx="2" fill="#4ADE80" />
      <circle cx="-8" cy="-10" r="3" fill="#fff" opacity="0.85" />
      <circle cx="4" cy="-12" r="2.2" fill="#fff" opacity="0.85" />
    </>
  ),
  bag: () => (
    <>
      <path d="M-6 6q0-10 6-10t6 10" stroke="#B45309" strokeWidth="2.4" fill="none" />
      <path d="M-12 4h24l-2 22h-20z" fill="#FDBA74" />
      <path d="M-12 4h24l-.6 6h-22.8z" fill="#FB923C" />
      <circle cx="0" cy="16" r="4" fill="#fff" opacity="0.8" />
    </>
  ),
  ball: () => (
    <>
      <circle r="7.5" fill="#EF4444" />
      <path d="M-7.5 0h15" stroke="#fff" strokeWidth="2.2" />
      <circle cx="-2.5" cy="-3" r="1.6" fill="#fff" opacity="0.6" />
    </>
  ),
  football: () => (
    <>
      <circle r="9" fill="#fff" stroke="#334155" strokeWidth="1.2" />
      <path d="M0-3.5 3.3-1.1 2 2.8h-4L-3.3-1.1z" fill="#1E293B" />
      <path d="M0-9v5.5M8.5-2.8l-5.2 1.7M5.3 7.3 2 2.8M-5.3 7.3-2 2.8M-8.5-2.8l5.2 1.7" stroke="#334155" strokeWidth="1.1" />
    </>
  ),
  icecream: () => (
    <>
      <path d="M-7-3h14L0 17z" fill="#F4B860" />
      <path d="M-4.5 1 3 8M0-2 5 3M4.5 1-3 8M0-2-5 3" stroke="#D99A3E" strokeWidth="1" />
      <circle cx="-4" cy="-7" r="6.5" fill="#F9A8D4" />
      <circle cx="4" cy="-8" r="6.5" fill="#FDE68A" />
      <circle cx="0" cy="-13" r="6" fill="#A7F3D0" />
      <circle cx="1" cy="-20" r="2.6" fill="#EF4444" />
    </>
  ),
  book: () => (
    <>
      <rect x="-15" y="-12" width="30" height="22" rx="2.5" fill="#6366F1" />
      <rect x="-15" y="-12" width="5" height="22" rx="1.5" fill="#4338CA" />
      <path d="M-4-2l2.4 4.8 5.3.8-3.8 3.7.9 5.3L-4 10.1l-4.7 2.5.9-5.3L-11.6 3.6l5.3-.8z" fill="#FDE047" transform="translate(6 -6) scale(.6)" />
    </>
  ),
  coin: () => (
    <>
      <circle r="8" fill="#FACC15" stroke="#EAB308" strokeWidth="1.6" />
      <circle r="5" fill="none" stroke="#FEF08A" strokeWidth="1.2" />
      <path d="M-1.5-3.5h3v7h-3z" fill="#CA8A04" />
    </>
  ),
  towel: () => (
    <>
      <rect x="-13" y="-11" width="26" height="23" rx="4" fill="#F472B6" />
      <path d="M-13 3h26M-13 7.5h26" stroke="#fff" strokeWidth="2" opacity=".85" />
      <rect x="-13" y="-11" width="26" height="6" rx="3" fill="#F9A8D4" />
      <path d="M-9-1v9M-3 0v9M3-1v9M9 0v9" stroke="#DB2777" strokeWidth=".9" opacity=".35" />
      <path d="M-11 12v3M-7 12v3M-3 12v3M1 12v3M5 12v3M9 12v3" stroke="#F472B6" strokeWidth="1.4" strokeLinecap="round" />
    </>
  ),
  ticket: () => (
    <g transform="rotate(-8)">
      <path d="M-15-8h30v5a3 3 0 0 0 0 6v5h-30v-5a3 3 0 0 0 0-6z" fill="#FDE68A" stroke="#F59E0B" strokeWidth="1.3" strokeLinejoin="round" />
      <path d="M6-8v16" stroke="#F59E0B" strokeWidth="1.2" strokeDasharray="2 2" />
      <text x="-4" y="2.6" textAnchor="middle" fontSize="7.5" fontWeight="900" fill="#B45309" fontFamily={FONT}>BUS</text>
      <path d="M10.5-3.5v7" stroke="#B45309" strokeWidth="1.4" strokeDasharray="1.2 1" />
    </g>
  ),
  backpack: () => (
    <>
      <path d="M-5-11q5-6 10 0" stroke="#1D4ED8" strokeWidth="2.6" fill="none" />
      <rect x="-12" y="-10" width="24" height="26" rx="7" fill="#3B82F6" />
      <rect x="-8" y="3" width="16" height="10" rx="3.5" fill="#60A5FA" />
      <path d="M-8 7h16" stroke="#1D4ED8" strokeWidth="1.3" />
      <rect x="-12" y="-10" width="24" height="9" rx="6" fill="#2563EB" />
      <circle cx="0" cy="-2.5" r="1.8" fill="#FDE047" />
      <path d="M6 9.5l1.5 1.5" stroke="#FDE047" strokeWidth="1.4" strokeLinecap="round" />
    </>
  ),
  list: () => (
    <>
      <rect x="-11" y="-13" width="22" height="28" rx="3" fill="#FEF3C7" stroke="#F59E0B" strokeWidth="1.3" />
      <rect x="-5" y="-16" width="10" height="5" rx="1.5" fill="#94A3B8" />
      {[-5, 1, 7].map((y, i) => (
        <g key={y}>
          {i < 2 ? <path d={`M-7.5 ${y}l2 2 3.2-4`} stroke="#22C55E" strokeWidth="1.7" fill="none" strokeLinecap="round" strokeLinejoin="round" />
            : <rect x="-7.5" y={y - 2.5} width="4" height="4" rx="1" fill="none" stroke="#B45309" strokeWidth="1.1" />}
          <path d={`M-1 ${y}h8`} stroke="#B45309" strokeWidth="1.7" strokeLinecap="round" />
        </g>
      ))}
    </>
  ),
  salt: () => (
    <>
      <path d="M-6-6h12l2 18a2 2 0 0 1-2 2H-6a2 2 0 0 1-2-2z" fill="#fff" stroke="#CBD5E1" strokeWidth="1.3" />
      <path d="M-6-6q0-8 6-8t6 8z" fill="#94A3B8" />
      <circle cx="-2" cy="-10" r=".9" fill="#334155" />
      <circle cx="1.6" cy="-11" r=".9" fill="#334155" />
      <circle cx="2.6" cy="-8.4" r=".9" fill="#334155" />
      <rect x="-7" y="2" width="14" height="5" fill="#38BDF8" opacity=".8" />
      <circle cx="-11" cy="-12" r="1" fill="#fff" stroke="#CBD5E1" strokeWidth=".6" />
      <circle cx="-13" cy="-7" r=".9" fill="#fff" stroke="#CBD5E1" strokeWidth=".6" />
    </>
  ),
  spoon: () => (
    <g transform="rotate(28)">
      <rect x="-1.7" y="-16" width="3.4" height="21" rx="1.7" fill="#94A3B8" />
      <path d="M-7.5 4a7.5 6.5 0 0 0 15 0z" fill="#CBD5E1" stroke="#94A3B8" strokeWidth="1.2" />
      <path d="M-4 6q2 2 5 2" stroke="#fff" strokeWidth="1.2" fill="none" opacity=".7" strokeLinecap="round" />
    </g>
  ),
  knife: () => (
    <g transform="rotate(-30)">
      <path d="M-2.4 2V-11q0-4.5 4.8-3.6V2z" fill="#E2E8F0" stroke="#94A3B8" strokeWidth="1" />
      <rect x="-2.6" y="1.5" width="5.2" height="13" rx="2.6" fill="#22C55E" />
      <circle cx="0" cy="11" r="1" fill="#BBF7D0" />
    </g>
  ),
  bowl: () => (
    <>
      <path d="M-14-2h28q-1 13-14 13t-14-13z" fill="#F472B6" />
      <ellipse cx="0" cy="-2" rx="14" ry="3.6" fill="#FB923C" />
      <circle cx="-5" cy="-2.6" r="1.6" fill="#EA580C" />
      <circle cx="3" cy="-1.5" r="1.4" fill="#EA580C" />
      <path d="M-1-3l2 1M6-3l1.6 1" stroke="#22C55E" strokeWidth="1.3" strokeLinecap="round" />
      <path d="M-10 3q2 5 7 6" stroke="#fff" strokeWidth="1.4" fill="none" opacity=".45" strokeLinecap="round" />
      <rect x="-6" y="10" width="12" height="2.6" rx="1.3" fill="#DB2777" />
      <path d="M7-4l7-10" stroke="#94A3B8" strokeWidth="2.2" strokeLinecap="round" />
    </>
  ),
  sandwich: () => (
    <>
      <path d="M-14 3 0-13 14 3z" fill="#FDE68A" stroke="#D97706" strokeWidth="1.3" strokeLinejoin="round" />
      <path d="M-13 3q3 3 6 0t6 0 6 0 7 0" stroke="#22C55E" strokeWidth="2.6" fill="none" strokeLinecap="round" />
      <rect x="-12" y="5" width="24" height="3" rx="1.5" fill="#F87171" />
      <rect x="-12" y="8" width="24" height="2.5" fill="#FBBF24" />
      <path d="M-14 10.5h28v2a2 2 0 0 1-2 2h-24a2 2 0 0 1-2-2z" fill="#FDE68A" stroke="#D97706" strokeWidth="1.3" />
      <circle cx="-2" cy="-4" r=".9" fill="#D97706" />
      <circle cx="3" cy="-1" r=".9" fill="#D97706" />
    </>
  ),
  carrot: () => <g transform="rotate(35)">{carrot()}</g>,
  'watering-can': () => (
    <>
      <path d="M-8-2q5-9 10 0" stroke="#16A34A" strokeWidth="2.2" fill="none" />
      <path d="M4 3l9-8" stroke="#22C55E" strokeWidth="3" strokeLinecap="round" />
      <ellipse cx="13.5" cy="-6" rx="2.6" ry="3.4" fill="#16A34A" transform="rotate(40 13.5 -6)" />
      <path d="M-11-2h15v12a2 2 0 0 1-2 2h-11a2 2 0 0 1-2-2z" fill="#22C55E" />
      <path d="M-8 2v6" stroke="#fff" strokeWidth="1.4" opacity=".5" strokeLinecap="round" />
    </>
  ),
  newspaper: () => (
    <>
      <rect x="-13" y="-10" width="26" height="20" rx="1.5" fill="#F8FAFC" stroke="#CBD5E1" strokeWidth="1.1" />
      <rect x="-10" y="-7" width="9" height="7" fill="#CBD5E1" />
      <text x="5.5" y="-3.5" textAnchor="middle" fontSize="4.6" fontWeight="900" fill="#334155" fontFamily={FONT}>NEWS</text>
      <path d="M1-1h9M-10 3h20M-10 6h20" stroke="#94A3B8" strokeWidth="1" />
    </>
  ),

  /* ── pictures for the sentences ── */
  'alarm-clock': () => (
    <>
      <path d="M-8 11l-3.5 4.5M8 11l3.5 4.5" stroke="#B91C1C" strokeWidth="3" strokeLinecap="round" />
      <circle cx="-9.5" cy="-10.5" r="5" fill="#FB7185" stroke="#E11D48" strokeWidth="1.5" />
      <circle cx="9.5" cy="-10.5" r="5" fill="#FB7185" stroke="#E11D48" strokeWidth="1.5" />
      <rect x="-2" y="-14.5" width="4" height="4" rx="1" fill="#E11D48" />
      <circle cy="1" r="12.5" fill="#F43F5E" />
      <circle cy="1" r="9.6" fill="#FFF7ED" />
      <path d="M0-6.6v1.8M0 7v1.8M-7.6 1h1.8M5.8 1h1.8" stroke="#FDA4AF" strokeWidth="1.6" strokeLinecap="round" />
      <path d="M0 1V-4.6M0 1l3.6 2.4" stroke="#1F2937" strokeWidth="2" strokeLinecap="round" />
      <circle cy="1" r="1.3" fill="#1F2937" />
      <path d="M-15-4q-2 3 0 6M15-4q2 3 0 6" stroke="#FDE047" strokeWidth="1.8" fill="none" strokeLinecap="round" />
    </>
  ),
  clock: () => (
    <>
      <circle r="14.5" fill="#F59E0B" />
      <circle r="12" fill="#FFFBEB" />
      {[0, 90, 180, 270].map(a => <rect key={a} x="-1" y="-11" width="2" height="3.2" rx="1" fill="#D97706" transform={`rotate(${a})`} />)}
      {[30, 60, 120, 150, 210, 240, 300, 330].map(a => <circle key={a} cy="-9.6" r=".9" fill="#FCD34D" transform={`rotate(${a})`} />)}
      <path d="M0 0L-3.6 6.2" stroke="#1F2937" strokeWidth="2.6" strokeLinecap="round" />
      <path d="M0 0V-8.6" stroke="#1F2937" strokeWidth="1.8" strokeLinecap="round" />
      <circle r="1.7" fill="#EF4444" />
    </>
  ),
  sun: () => (
    <>
      {[0, 45, 90, 135, 180, 225, 270, 315].map(a => (
        <rect key={a} x="-2" y="-16.5" width="4" height="6" rx="2" fill="#FDBA74" transform={`rotate(${a})`} />
      ))}
      <circle r="10.5" fill="#FDE047" stroke="#FACC15" strokeWidth="1.5" />
      <path d="M-5-1.5q1.6-2.2 3.2 0M1.8-1.5q1.6-2.2 3.2 0" stroke="#B45309" strokeWidth="1.5" fill="none" strokeLinecap="round" />
      <path d="M-3.6 3q3.6 3.2 7.2 0" stroke="#B45309" strokeWidth="1.5" fill="none" strokeLinecap="round" />
      <circle cx="-6.5" cy="2.5" r="1.8" fill="#FB923C" opacity=".5" />
      <circle cx="6.5" cy="2.5" r="1.8" fill="#FB923C" opacity=".5" />
    </>
  ),
  moon: () => (
    <>
      <path d="M2-13.5A13.5 13.5 0 1 0 13.5 5 10.5 10.5 0 0 1 2-13.5z" fill="#FDE68A" stroke="#FACC15" strokeWidth="1.2" />
      <path d="M-7.5-1q2.2 2.2 4.4 0" stroke="#B45309" strokeWidth="1.4" fill="none" strokeLinecap="round" />
      <path d="M-6.5 5q2.2 1.8 4.4 0" stroke="#B45309" strokeWidth="1.3" fill="none" strokeLinecap="round" />
      <circle cx="-9.5" cy="3" r="1.5" fill="#FB923C" opacity=".45" />
      <path d={SPARK} fill="#FEF9C3" transform="translate(11 -11) scale(.8)" />
      <path d={SPARK} fill="#FEF9C3" transform="translate(14 -2) scale(.45)" />
    </>
  ),
  curtains: () => (
    <>
      <rect x="-12" y="-11" width="24" height="23" rx="3" fill="#7DD3FC" />
      <circle cx="4" cy="-4" r="4" fill="#FDE047" />
      <path d="M-12 7q6-5 12 0t12-2v7h-24z" fill="#86EFAC" />
      <rect x="-1" y="-11" width="2" height="23" fill="#fff" />
      <rect x="-16" y="-15" width="32" height="3.6" rx="1.8" fill="#9D174D" />
      <path d="M-15-12h8q-3 12 1 26h-9z" fill="#F472B6" />
      <path d="M15-12h-8q3 12-1 26h9z" fill="#EC4899" />
      <path d="M-12-11v24M12-11v24" stroke="#DB2777" strokeWidth="1" opacity=".35" />
    </>
  ),
  bed: () => (
    <>
      <rect x="-16" y="-11" width="5" height="26" rx="2" fill="#D97706" />
      <rect x="12" y="-2" width="4" height="17" rx="2" fill="#D97706" />
      <rect x="-12" y="2" width="25" height="7" rx="2" fill="#fff" />
      <ellipse cx="-6.5" cy="0" rx="5.5" ry="3.6" fill="#fff" stroke="#E2E8F0" strokeWidth="1" />
      <path d="M-2-1h14a2 2 0 0 1 2 2v8h-16z" fill="#818CF8" />
      <path d="M-2 2.5h16" stroke="#C7D2FE" strokeWidth="1.6" />
      <circle cx="3" cy="6" r="1.1" fill="#C7D2FE" />
      <circle cx="9" cy="6" r="1.1" fill="#C7D2FE" />
      <rect x="-14" y="9" width="29" height="3.5" rx="1" fill="#B45309" />
    </>
  ),
  tap: () => (
    <>
      <rect x="-16" y="-12" width="4" height="12" rx="1.5" fill="#CBD5E1" />
      <path d="M-12-6h15a6 6 0 0 1 6 6v3" stroke="#94A3B8" strokeWidth="5" fill="none" strokeLinecap="round" />
      <rect x="-9" y="-13" width="3" height="6" rx="1" fill="#64748B" />
      <rect x="-13" y="-15.5" width="11" height="3.2" rx="1.6" fill="#F43F5E" />
      {drop(9, 8)}
      {drop(9, 15.5, 0.7)}
      {drop(3.5, 13, 0.55)}
    </>
  ),
  tshirt: () => (
    <>
      <path d="M-6-13-15-8l3 7 4-2v18h16V-3l4 2 3-7-9-5q-3 4-6 4t-6-4z" fill="#FF6B6B" stroke="#E0424F" strokeWidth="1.2" strokeLinejoin="round" />
      <path d={STAR} fill="#fff" transform="translate(0 4) scale(.65)" />
      <path d={SPARK} fill="#FDE047" transform="translate(13 -13) scale(.8)" />
    </>
  ),
  pyjamas: () => (
    <>
      <path d="M-6-13-15-8l-1 14h6l2-9v18h16V-3l2 9h6l-1-14-9-5q-3 4-6 4t-6-4z" fill="#8EC5FF" stroke="#5E9BF2" strokeWidth="1.2" strokeLinejoin="round" />
      {[[-4, -3], [3, 1], [-3, 6], [4, 10], [-12, 2], [12, 2]].map(([x, y]) => <circle key={`${x}${y}`} cx={x} cy={y} r="1.3" fill="#fff" opacity=".85" />)}
      <path d="M2-6.5a3.2 3.2 0 1 0 2.6 4.8 2.5 2.5 0 0 1-2.6-4.8z" fill="#FEF08A" />
    </>
  ),
  fridge: () => (
    <>
      <rect x="-10" y="-16" width="20" height="32" rx="3.5" fill="#F8FAFC" stroke="#CBD5E1" strokeWidth="1.5" />
      <path d="M-10-4h20" stroke="#CBD5E1" strokeWidth="1.5" />
      <rect x="5" y="-12" width="2" height="5" rx="1" fill="#94A3B8" />
      <rect x="5" y="0" width="2" height="9" rx="1" fill="#94A3B8" />
      <circle cx="-4" cy="-10" r="2" fill="#F43F5E" />
      <circle cx="1" cy="-8" r="1.6" fill="#3B82F6" />
      <rect x="-6.5" y="2" width="7" height="6" rx="1" fill="#FDE047" transform="rotate(-8 -3 5)" />
      <path d="M-5.5 4h4M-5.5 6h3" stroke="#CA8A04" strokeWidth=".8" transform="rotate(-8 -3 5)" />
    </>
  ),
  heart: () => (
    <>
      <path d="M0 13C-16 3-14-11-6-11c3 0 5 2 6 4 1-2 3-4 6-4 8 0 10 14-6 24z" fill="#F43F5E" />
      <ellipse cx="-6.5" cy="-5" rx="2.4" ry="3.6" fill="#fff" opacity=".5" transform="rotate(-30 -6.5 -5)" />
      <path d={SPARK} fill="#FDE047" transform="translate(12 -12) scale(.75)" />
    </>
  ),
  tea: () => (
    <>
      <ellipse cx="0" cy="12" rx="15" ry="3.5" fill="#E2E8F0" />
      <path d="M8-2q7 0 7 5t-7 5" stroke="#38BDF8" strokeWidth="2.6" fill="none" />
      <path d="M-11-4h20l-2 13q-1 3-4 3h-8q-3 0-4-3z" fill="#38BDF8" />
      <ellipse cx="-1" cy="-4" rx="10" ry="2.6" fill="#B45309" />
      <path d="M-7 0v6" stroke="#fff" strokeWidth="1.5" opacity=".5" strokeLinecap="round" />
      <path d="M-4-8q-3-3 0-6M2-8q-3-3 0-6" stroke="#CBD5E1" strokeWidth="1.8" fill="none" strokeLinecap="round" />
    </>
  ),
  egg: () => (
    <>
      <path d="M-13 0c0-9 8-12 14-10 6-4 14 1 12 8 3 7-5 13-13 11-9 3-15-3-13-9z" fill="#fff" stroke="#E2E8F0" strokeWidth="1.2" />
      <circle cx="0" cy="1" r="6" fill="#FBBF24" />
      <circle cx="-2" cy="-1" r="1.8" fill="#FEF3C7" />
    </>
  ),
  yum: () => (
    <>
      <circle r="13.5" fill="#FDE047" stroke="#FACC15" strokeWidth="1.5" />
      <path d="M-7.5-3q2.5-3.2 5 0M2.5-3q2.5-3.2 5 0" stroke="#78350F" strokeWidth="1.9" fill="none" strokeLinecap="round" />
      <path d="M-6.5 3q6.5 7.5 13 0z" fill="#9F1239" />
      <ellipse cx="3.5" cy="6.2" rx="3" ry="2.4" fill="#FB7185" />
      <circle cx="-9" cy="3" r="2.2" fill="#FB923C" opacity=".5" />
      <circle cx="9" cy="3" r="2.2" fill="#FB923C" opacity=".5" />
      <path d={SPARK} fill="#fff" transform="translate(-6 -9) scale(.5)" />
    </>
  ),
  lunchbox: () => (
    <>
      <path d="M-6-6v-4q0-3 3-3h6q3 0 3 3v4" stroke="#15803D" strokeWidth="2.6" fill="none" />
      <rect x="-14" y="-6" width="28" height="19" rx="4" fill="#22C55E" />
      <rect x="-14" y="-6" width="28" height="6.5" rx="3" fill="#16A34A" />
      <rect x="-3" y="-2" width="6" height="4.5" rx="1" fill="#FDE047" />
      <g transform="translate(-6.5 7) scale(.42)">{ART.apples()}</g>
      <g transform="translate(6.5 7) scale(.42)">{ART.sandwich()}</g>
    </>
  ),
  shoes: () => (
    <>
      {sneaker(-4, -4, '#F87171', '#DC2626')}
      {sneaker(3, 6, '#EF4444', '#B91C1C')}
    </>
  ),
  door: () => (
    <>
      <rect x="-12" y="-16" width="24" height="31" rx="3" fill="#92400E" />
      <rect x="-9.5" y="-13.5" width="19" height="28.5" rx="2" fill="#0D9488" />
      <circle cx="0" cy="-7" r="4" fill="#BAE6FD" stroke="#0F766E" strokeWidth="1.2" />
      <path d="M-3.2-7h6.4M0-10.2v6.4" stroke="#0F766E" strokeWidth=".8" />
      <rect x="-6" y="0" width="12" height="11" rx="1.5" fill="#14B8A6" />
      <circle cx="6.8" cy="-1" r="1.6" fill="#FDE047" />
      <rect x="-15" y="14.5" width="30" height="2.4" rx="1.2" fill="#A16207" />
    </>
  ),
  wave: () => (
    <>
      {paw(-16, -1, 2)}
      <path d="M10-13q4 3 3 8M13.5-16q6 5 4 12M-12-12q-4 3-3 8" stroke="#38BDF8" strokeWidth="1.7" fill="none" strokeLinecap="round" />
    </>
  ),
  hand: () => (
    <>
      {paw(0, 0, 3)}
      <path d={SPARK} fill="#FDE047" transform="translate(-12 -11) scale(.9)" />
      <path d={SPARK} fill="#F9A8D4" transform="translate(12 -8) scale(.6)" />
    </>
  ),
  'traffic-light': () => trafficLight('red'),
  'green-light': () => trafficLight('green'),
  'bus-stop': () => (
    <>
      <rect x="1" y="-2" width="14" height="16" fill="#BAE6FD" opacity=".8" />
      <rect x="0" y="-4.5" width="16" height="3" rx="1.2" fill="#0EA5E9" />
      <rect x="2.5" y="8" width="11" height="2.2" rx="1" fill="#0369A1" />
      <rect x="-9" y="-6" width="3" height="21" fill="#64748B" />
      <circle cx="-7.5" cy="-9" r="7.5" fill="#fff" stroke="#16A34A" strokeWidth="2.4" />
      <text x="-7.5" y="-6.6" textAnchor="middle" fontSize="6.2" fontWeight="900" fill="#16A34A" fontFamily={FONT}>BUS</text>
      <rect x="-16" y="14" width="32" height="2.4" rx="1.2" fill="#94A3B8" />
    </>
  ),
  bus: () => (
    <>
      <rect x="-16" y="-11" width="32" height="20" rx="4" fill="#FACC15" />
      <rect x="-16" y="1.5" width="32" height="3" fill="#F97316" />
      {[-13, -6.5].map(x => <rect key={x} x={x} y="-8" width="5" height="6" rx="1" fill="#BAE6FD" />)}
      <rect x="0" y="-8" width="5" height="13" rx="1" fill="#7DD3FC" stroke="#CA8A04" strokeWidth=".8" />
      <rect x="8" y="-8" width="6.5" height="7.5" rx="1.5" fill="#BAE6FD" />
      <rect x="13.5" y="3.5" width="2.5" height="2.5" rx=".8" fill="#FEF08A" />
      {[-9, 9].map(x => (
        <g key={x}>
          <circle cx={x} cy="9.5" r="4" fill="#1F2937" />
          <circle cx={x} cy="9.5" r="1.6" fill="#94A3B8" />
        </g>
      ))}
    </>
  ),
  window: () => (
    <>
      <rect x="-15" y="-13" width="30" height="26" rx="5" fill="#fff" stroke="#CBD5E1" strokeWidth="1" />
      <rect x="-12.5" y="-10.5" width="25" height="21" rx="3" fill="#7DD3FC" />
      <circle cx="6" cy="-5" r="3" fill="#FDE047" />
      <ellipse cx="-5" cy="-4" rx="5" ry="2.4" fill="#fff" />
      <path d="M-12.5 10.5V3h4v-4h5v6h4V0h5v4h4v-3h3.5v9.5z" fill="#A78BFA" />
      <path d="M-12.5 10.5q6-4 12-1t12-1v2z" fill="#4ADE80" />
      <rect x="-1" y="-10.5" width="2" height="21" fill="#fff" opacity=".9" />
    </>
  ),
  school: () => (
    <>
      <path d="M0-11v-5" stroke="#475569" strokeWidth="1.2" />
      <path d="M0-16h7l-2 1.8 2 1.8H0z" fill="#22C55E" />
      <rect x="-14" y="-1" width="28" height="16" fill="#FDBA74" />
      <path d="M-16 0 0-11 16 0z" fill="#DC2626" />
      <circle cx="0" cy="-4" r="3.1" fill="#fff" stroke="#B91C1C" strokeWidth="1" />
      <path d="M0-4v-2M0-4h1.6" stroke="#1F2937" strokeWidth=".8" strokeLinecap="round" />
      {[-11, 6].map(x => <rect key={x} x={x} y="3" width="5" height="5" rx=".8" fill="#BAE6FD" />)}
      <rect x="-3.5" y="6" width="7" height="9" rx="1.2" fill="#92400E" />
      <rect x="-16" y="14" width="32" height="2.2" rx="1" fill="#94A3B8" />
    </>
  ),
  apple: () => (
    <>
      <path d="M0-6c-4-3-12-2-12 6 0 7 5 13 9 13 1 0 2-1 3-1s2 1 3 1c4 0 9-6 9-13 0-8-8-9-12-6z" fill="#EF4444" />
      <path d="M0-6q0-5 3-8" stroke="#7C4A1E" strokeWidth="2" strokeLinecap="round" fill="none" />
      <path d="M1.5-9.5q6-6 10-1-6 3-10 1z" fill="#22C55E" />
      <ellipse cx="-6" cy="0" rx="2.2" ry="4" fill="#fff" opacity=".45" />
    </>
  ),
  desk: () => (
    <>
      <rect x="-13" y="1" width="3" height="14" fill="#64748B" />
      <rect x="10" y="1" width="3" height="14" fill="#64748B" />
      <rect x="-12" y="1" width="24" height="6" rx="1" fill="#B45309" />
      <rect x="-15" y="-4" width="30" height="5" rx="1.5" fill="#D97706" />
      <rect x="-9" y="-9.5" width="12" height="5.5" rx="1" fill="#6366F1" />
      <rect x="-9" y="-6" width="12" height="1.2" fill="#fff" opacity=".7" />
      <g transform="translate(9 -7) rotate(-70) scale(.45)">{ART.pencil()}</g>
      <path d="M-15 15h30" stroke="#94A3B8" strokeWidth="1.5" />
    </>
  ),
  notebook: () => (
    <>
      <rect x="-10" y="-14" width="22" height="28" rx="2.5" fill="#fff" stroke="#93C5FD" strokeWidth="1.4" />
      <path d="M-5-7h14M-5-2h14M-5 3h14M-5 8h10" stroke="#BFDBFE" strokeWidth="1.1" />
      <path d="M-6.5-14v28" stroke="#FCA5A5" strokeWidth="1.1" />
      {[-10, -5, 0, 5, 10].map(y => <circle key={y} cx="-10" cy={y} r="1.8" fill="none" stroke="#64748B" strokeWidth="1.2" />)}
      <path d="M-4-8.5q1.5-2 3 0t3 0 3 0 3 0" stroke="#1E40AF" strokeWidth="1.2" fill="none" strokeLinecap="round" />
      <path d="M-4-3.5q1.5-2 3 0t3 0 3 0" stroke="#1E40AF" strokeWidth="1.2" fill="none" strokeLinecap="round" />
      <g transform="translate(8 2) rotate(-35) scale(.55)">{ART.pencil()}</g>
    </>
  ),
  blackboard: () => (
    <>
      <rect x="-16" y="-12" width="32" height="23" rx="2" fill="#92400E" />
      <rect x="-14" y="-10" width="28" height="19" rx="1" fill="#166534" />
      <text x="-1.5" y="1.5" textAnchor="middle" fontSize="7" fontWeight="800" fill="#F0FDF4" fontFamily={CHALK}>6+6=12</text>
      <path d="M9.5 5l1.4 1.6 2.6-3.2" stroke="#FDE047" strokeWidth="1.3" fill="none" strokeLinecap="round" />
      <rect x="-12" y="11" width="24" height="2.4" rx="1" fill="#A16207" />
      <rect x="4" y="9.6" width="5" height="1.6" rx=".8" fill="#fff" />
    </>
  ),
  cat: () => (
    <>
      <path d="M-12-2-11-14l7 6q4-1 8 0l7-6 1 12c2 4 1 10-4 13-4 2-12 2-16 0-5-3-6-9-4-13z" fill="#FDBA74" stroke="#C2410C" strokeWidth="1.4" strokeLinejoin="round" />
      <path d="M-10-11l4 3.5M10-11l-4 3.5" stroke="#F9A8D4" strokeWidth="2" strokeLinecap="round" />
      <ellipse cx="-5" cy="1" rx="1.8" ry="2.4" fill="#1F2937" />
      <ellipse cx="5" cy="1" rx="1.8" ry="2.4" fill="#1F2937" />
      <path d="M-1.6 5h3.2L0 6.7z" fill="#F472B6" />
      <path d="M0 6.7q-1.5 2-3 1M0 6.7q1.5 2 3 1" stroke="#7C2D12" strokeWidth=".9" fill="none" />
      <path d="M-3.5 6.5h-8M-3.5 8l-7 2.5M3.5 6.5h8M3.5 8l7 2.5" stroke="#7C2D12" strokeWidth=".7" />
    </>
  ),
  bell: () => (
    <>
      <rect x="-2.5" y="-16" width="5" height="7" rx="2" fill="#92400E" />
      <path d="M0-10c-7 0-9 6-9 12 0 4-3 6-4 8h26c-1-2-4-4-4-8 0-6-2-12-9-12z" fill="#FACC15" stroke="#CA8A04" strokeWidth="1.3" />
      <circle cy="12.5" r="3" fill="#CA8A04" />
      <path d="M-4-5q-2 4-2 9" stroke="#fff" strokeWidth="1.5" opacity=".6" fill="none" strokeLinecap="round" />
      <path d="M-15.5-6q-2 4 0 8M15.5-6q2 4 0 8" stroke="#F59E0B" strokeWidth="1.6" fill="none" strokeLinecap="round" />
    </>
  ),
  notes: () => (
    <>
      <path d="M-6 9V-8l14-4v16" stroke="#7C3AED" strokeWidth="2.4" fill="none" strokeLinejoin="round" />
      <path d="M-6-8l14-4v4.5l-14 4z" fill="#7C3AED" />
      <ellipse cx="-9" cy="9.5" rx="4.2" ry="3.2" fill="#8B5CF6" transform="rotate(-20 -9 9.5)" />
      <ellipse cx="5" cy="4.5" rx="4.2" ry="3.2" fill="#8B5CF6" transform="rotate(-20 5 4.5)" />
      <path d={SPARK} fill="#F9A8D4" transform="translate(-12 -11) scale(.7)" />
    </>
  ),
  'price-tag': () => (
    <g transform="rotate(-18)">
      <path d="M-12-5-6-10h17a2 2 0 0 1 2 2v16a2 2 0 0 1-2 2H-6l-6-5z" fill="#FBBF24" stroke="#D97706" strokeWidth="1.3" strokeLinejoin="round" />
      <circle cx="-7" cy="0" r="2" fill="#fff" stroke="#D97706" strokeWidth="1" />
      <text x="4" y="4" textAnchor="middle" fontSize="11" fontWeight="900" fill="#92400E" fontFamily={FONT}>$8</text>
      <path d="M-9-1q-6-6-4-12" stroke="#94A3B8" strokeWidth="1" fill="none" />
    </g>
  ),
  money: () => (
    <>
      <g transform="rotate(-12)">
        <rect x="-15" y="-10" width="26" height="15" rx="2" fill="#86EFAC" stroke="#16A34A" strokeWidth="1.3" />
        <circle cx="-2" cy="-2.5" r="4.2" fill="#BBF7D0" stroke="#16A34A" strokeWidth="1" />
        <text x="-2" y="0.2" textAnchor="middle" fontSize="6.5" fontWeight="900" fill="#15803D" fontFamily={FONT}>$</text>
      </g>
      <circle cx="9" cy="9" r="6" fill="#FACC15" stroke="#EAB308" strokeWidth="1.3" />
      <circle cx="4" cy="11.5" r="4.6" fill="#FDE047" stroke="#EAB308" strokeWidth="1.2" />
      <path d="M9 6.5v5" stroke="#CA8A04" strokeWidth="1.4" strokeLinecap="round" />
    </>
  ),
  tree: () => (
    <>
      <rect x="-2.5" y="2" width="5" height="14" rx="2" fill="#92400E" />
      <circle cx="0" cy="-5" r="10" fill="#22C55E" />
      <circle cx="-7.5" cy="1" r="7" fill="#16A34A" />
      <circle cx="7.5" cy="1" r="7" fill="#16A34A" />
      <circle cx="-3" cy="-9" r="2.6" fill="#86EFAC" opacity=".7" />
      <circle cx="4" cy="-2" r="1.7" fill="#EF4444" />
      <circle cx="-6" cy="3" r="1.6" fill="#EF4444" />
    </>
  ),
  dog: () => (
    <>
      <circle cy="0" r="11" fill="#F4BE85" />
      <ellipse cx="0" cy="5" rx="6.5" ry="5" fill="#FFE4C7" />
      <ellipse cx="-11" cy="0" rx="4.5" ry="9" fill="#A86A3D" transform="rotate(18 -11 0)" />
      <ellipse cx="11" cy="0" rx="4.5" ry="9" fill="#A86A3D" transform="rotate(-18 11 0)" />
      <circle cx="-4.5" cy="-3" r="1.9" fill="#1F2937" />
      <circle cx="4.5" cy="-3" r="1.9" fill="#1F2937" />
      <circle cx="-5" cy="-3.6" r=".6" fill="#fff" />
      <circle cx="4" cy="-3.6" r=".6" fill="#fff" />
      <ellipse cx="0" cy="2.6" rx="2.8" ry="2" fill="#3A2618" />
      <ellipse cx="0" cy="9" rx="2" ry="2.6" fill="#FB7185" />
      <path d="M-2.6 6q2.6 2 5.2 0" stroke="#3A2618" strokeWidth="1" fill="none" />
      <path d="M-7 10.5q7 4 14 0" stroke="#EF4444" strokeWidth="2.4" fill="none" strokeLinecap="round" />
    </>
  ),
  slide: () => (
    <>
      <path d="M-16 15h32" stroke="#4ADE80" strokeWidth="2.4" strokeLinecap="round" />
      <path d="M-13 15V-9M-7 15V-9" stroke="#3B82F6" strokeWidth="2" />
      <path d="M-13 9h6M-13 3h6M-13-3h6" stroke="#3B82F6" strokeWidth="1.5" />
      <rect x="-14" y="-12" width="10" height="3" rx="1" fill="#2563EB" />
      <path d="M-5-10.5q6 0 10 10t10 13" stroke="#F97316" strokeWidth="5" fill="none" strokeLinecap="round" />
      <path d="M-5-10.5q6 0 10 10t10 13" stroke="#FDBA74" strokeWidth="1.4" fill="none" strokeLinecap="round" />
    </>
  ),
  bike: () => (
    <>
      {[-9, 9].map(x => <circle key={x} cx={x} cy="5" r="6.5" fill="none" stroke="#1E293B" strokeWidth="2.2" />)}
      <path d="M-9 5H0L-3-4ZM-3-4h9L0 5M6-4l3 9M6-4l-1-4" stroke="#22C55E" strokeWidth="2.2" fill="none" strokeLinejoin="round" strokeLinecap="round" />
      <path d="M-6-5.5h5M3-8h5" stroke="#1E293B" strokeWidth="2.2" strokeLinecap="round" />
      <circle cx="0" cy="5" r="1.6" fill="#334155" />
    </>
  ),
  duck: () => (
    <>
      <path d="M-15 13q15 4 30 0" stroke="#38BDF8" strokeWidth="2" fill="none" strokeLinecap="round" />
      <path d="M-15 2q-3-7 3-6" fill="#FACC15" />
      <ellipse cx="-4" cy="5" rx="11.5" ry="7.5" fill="#FACC15" />
      <circle cx="5" cy="-6" r="6.8" fill="#FACC15" />
      <path d="M11-6.5l5.5 1.2-5.5 2.8z" fill="#F97316" />
      <circle cx="7" cy="-8" r="1.5" fill="#1F2937" />
      <circle cx="6.5" cy="-8.6" r=".5" fill="#fff" />
      <path d="M-9 3q5 6 10 1" stroke="#EAB308" strokeWidth="1.6" fill="none" strokeLinecap="round" />
    </>
  ),
  bench: () => (
    <>
      <rect x="-12" y="-12" width="3" height="16" fill="#78350F" />
      <rect x="9" y="-12" width="3" height="16" fill="#78350F" />
      <rect x="-15" y="-10" width="30" height="4" rx="1.5" fill="#B45309" />
      <rect x="-15" y="-4" width="30" height="4" rx="1.5" fill="#B45309" />
      <rect x="-16" y="2" width="32" height="4" rx="2" fill="#D97706" />
      <rect x="-12" y="6" width="3" height="9" fill="#78350F" />
      <rect x="9" y="6" width="3" height="9" fill="#78350F" />
      <path d="M-16 15h32" stroke="#4ADE80" strokeWidth="2" strokeLinecap="round" />
    </>
  ),
  'chef-hat': () => (
    <>
      <circle cx="-7" cy="-4" r="7" fill="#fff" stroke="#E2E8F0" strokeWidth="1.2" />
      <circle cx="7" cy="-4" r="7" fill="#fff" stroke="#E2E8F0" strokeWidth="1.2" />
      <circle cx="0" cy="-9" r="8" fill="#fff" stroke="#E2E8F0" strokeWidth="1.2" />
      <rect x="-10" y="-3" width="20" height="15" rx="2" fill="#fff" stroke="#E2E8F0" strokeWidth="1.2" />
      <path d="M-10 6h20" stroke="#E2E8F0" strokeWidth="1.2" />
      <path d="M-6-3V5M0-3V5M6-3V5" stroke="#F1F5F9" strokeWidth="1.2" />
      <path d={SPARK} fill="#FDE047" transform="translate(12 -13) scale(.7)" />
    </>
  ),
  soap: () => (
    <>
      <rect x="-13" y="-3" width="22" height="14" rx="6" fill="#F9A8D4" stroke="#EC4899" strokeWidth="1.3" />
      <ellipse cx="-3" cy="2" rx="6" ry="2" fill="#fff" opacity=".5" />
      {bubble(8, -8, 4.2)}
      {bubble(13, -1, 2.6)}
      {bubble(-6, -9, 2.4)}
      {bubble(2, -13, 1.8)}
    </>
  ),
  vegetables: () => (
    <>
      <g transform="translate(-7 -2) rotate(-35) scale(.85)">{carrot()}</g>
      <ellipse cx="-3" cy="9" rx="8" ry="5.5" fill="#C08457" />
      <circle cx="-6" cy="8" r=".9" fill="#8B5A2B" />
      <circle cx="0" cy="10" r=".9" fill="#8B5A2B" />
      <circle cx="7" cy="4" r="7.5" fill="#EF4444" />
      <path d="M7-3.5l1.6 2.4 2.6-.6-1.4 2.2 1.2 2.2-2.6-.4L7 .6 5.6-1.2 3 .2 4.2-2l-1.4-2.2 2.6.6z" fill="#22C55E" />
      <ellipse cx="4.5" cy="2" rx="1.6" ry="2.4" fill="#fff" opacity=".4" />
    </>
  ),
  pot: () => (
    <>
      <path d="M-5-12q-3-3 0-6M3-12q-3-3 0-6" stroke="#CBD5E1" strokeWidth="1.8" fill="none" strokeLinecap="round" />
      <rect x="-17" y="-2" width="5" height="3" rx="1.5" fill="#475569" />
      <rect x="12" y="-2" width="5" height="3" rx="1.5" fill="#475569" />
      <rect x="-14" y="-4" width="28" height="17" rx="4" fill="#64748B" />
      <rect x="-15" y="-7" width="30" height="4.5" rx="2.2" fill="#94A3B8" />
      <circle cy="-8.5" r="2" fill="#475569" />
      <path d="M-10 0v9" stroke="#fff" strokeWidth="1.5" opacity=".35" strokeLinecap="round" />
      <rect x="-14" y="13" width="28" height="2.5" rx="1" fill="#F97316" opacity=".8" />
    </>
  ),
  fire: () => (
    <>
      <path d="M0 15c-8 0-12-6-10-12 1-4 4-6 4-11 4 2 6 6 5 9 2-1 3-3 3-6 5 4 8 9 7 13-1 5-4 7-9 7z" fill="#F97316" />
      <path d="M0 15c-4 0-6-3-5-6 1-2 3-3 3-6 3 2 4 4 4 7 1-1 2-2 2-3 2 2 3 4 2 6-1 2-3 2-6 2z" fill="#FDE047" />
      <text x="-9" y="-9" textAnchor="middle" fontSize="6" fontWeight="900" fill="#DC2626" fontFamily={FONT} transform="rotate(-12 -9 -9)">HOT!</text>
    </>
  ),
  soup: () => (
    <>
      <path d="M-6-8q-3-3 0-6t0-6M0-8q-3-3 0-6M6-8q-3-3 0-6t0-6" stroke="#CBD5E1" strokeWidth="1.7" fill="none" strokeLinecap="round" />
      <path d="M-15-2h30q-1 13-15 13t-15-13z" fill="#38BDF8" />
      <ellipse cx="0" cy="-2" rx="15" ry="3.8" fill="#FB923C" />
      <circle cx="-6" cy="-2.6" r="1.7" fill="#EA580C" />
      <circle cx="2" cy="-1.5" r="1.5" fill="#EA580C" />
      <circle cx="8" cy="-2.6" r="1.4" fill="#FDE68A" />
      <path d="M-2-3.4l2 1M5-3l1.8 1" stroke="#22C55E" strokeWidth="1.3" strokeLinecap="round" />
      <path d="M-11 3q2 5 7 6" stroke="#fff" strokeWidth="1.4" fill="none" opacity=".45" strokeLinecap="round" />
      <rect x="-6" y="10.5" width="12" height="2.6" rx="1.3" fill="#0284C7" />
    </>
  ),
  house: () => (
    <>
      <rect x="5" y="-12" width="4.5" height="8" fill="#B91C1C" />
      <rect x="-12" y="-2" width="24" height="17" fill="#FDE68A" />
      <path d="M-15-1 0-13 15-1z" fill="#EF4444" />
      <rect x="-10" y="2" width="6" height="5.5" rx=".8" fill="#FDE047" stroke="#CA8A04" strokeWidth=".8" />
      <rect x="4" y="2" width="6" height="5.5" rx=".8" fill="#FDE047" stroke="#CA8A04" strokeWidth=".8" />
      <rect x="-3" y="6" width="6" height="9" rx="1" fill="#92400E" />
      <circle cx="1.5" cy="10.5" r=".8" fill="#FDE047" />
      <rect x="-16" y="14.5" width="32" height="2" rx="1" fill="#4ADE80" />
    </>
  ),
  books: () => (
    <>
      <rect x="-13" y="6" width="26" height="7" rx="1.5" fill="#3B82F6" />
      <rect x="-11" y="-1" width="23" height="7" rx="1.5" fill="#F43F5E" />
      <rect x="-12" y="-8" width="21" height="7" rx="1.5" fill="#22C55E" />
      <path d="M-10 9.5h20M-8 2.5h18M-9-4.5h16" stroke="#fff" strokeWidth="1" opacity=".6" />
      <g transform="translate(3 -12) scale(.42)">{ART.apples()}</g>
    </>
  ),
  plate: () => (
    <>
      <path d="M-16-9v6M-14-9v6M-12-9v6M-14-3v14" stroke="#94A3B8" strokeWidth="1.4" strokeLinecap="round" />
      <path d="M14-9q3 4 0 9v11" stroke="#94A3B8" strokeWidth="2" fill="none" strokeLinecap="round" />
      <circle r="10.5" fill="#fff" stroke="#E2E8F0" strokeWidth="1.2" />
      <circle r="7.5" fill="none" stroke="#E2E8F0" strokeWidth="1" />
      <path d="M-7 3q0-8 7-8t7 8z" fill="#FCD34D" />
      {[[-3, -1], [2, -2], [4, 1], [-1, 1.5]].map(([x, y]) => <rect key={`${x}${y}`} x={x} y={y} width="2" height="1.4" rx=".6" fill="#F97316" />)}
      <circle cx="-4" cy="2" r="1.3" fill="#92400E" />
      <circle cx="3" cy="-3.5" r="1.2" fill="#92400E" />
    </>
  ),
  tv: () => (
    <>
      <path d="M-6-16l5 4.5M6-16l-5 4.5" stroke="#64748B" strokeWidth="1.5" strokeLinecap="round" />
      <rect x="-15" y="-11.5" width="30" height="21" rx="3" fill="#1F2937" />
      <rect x="-12.5" y="-9" width="25" height="16" rx="1.5" fill="#38BDF8" />
      <rect x="-12.5" y="3" width="25" height="4" fill="#22C55E" />
      <circle cx="-3" cy="-1" r="4.2" fill="#FDE047" />
      <circle cx="-4.4" cy="-1.8" r=".8" fill="#1F2937" />
      <circle cx="-1.6" cy="-1.8" r=".8" fill="#1F2937" />
      <path d="M-4.6.6q1.6 1.6 3.2 0" stroke="#1F2937" strokeWidth=".8" fill="none" />
      <path d={SPARK} fill="#fff" transform="translate(7 -4) scale(.6)" />
      <rect x="-8" y="10" width="16" height="3" rx="1" fill="#475569" />
    </>
  ),
  bath: () => (
    <>
      <path d="M-14-2v-8h4" stroke="#94A3B8" strokeWidth="2" fill="none" strokeLinecap="round" />
      {bubble(-9, -4, 4)}
      {bubble(-3, -6, 5)}
      {bubble(4, -5, 4)}
      {bubble(10, -3, 3.2)}
      <g transform="translate(7 -9) scale(.45)">{ART.duck()}</g>
      <path d="M-16-2h32v4q0 10-10 10h-12q-10 0-10-10z" fill="#fff" stroke="#CBD5E1" strokeWidth="1.3" />
      <path d="M-15 2h30" stroke="#7DD3FC" strokeWidth="1.6" />
      <path d="M-10 12l-2 4M10 12l2 4" stroke="#94A3B8" strokeWidth="2.2" strokeLinecap="round" />
    </>
  ),
  lamp: () => (
    <>
      <circle cy="-6" r="13.5" fill="#FEF08A" opacity=".35" />
      <path d="M-9-2h18l-4-12h-10z" fill="#FDE68A" stroke="#F59E0B" strokeWidth="1.2" strokeLinejoin="round" />
      <rect x="-1.5" y="-2" width="3" height="13" fill="#A16207" />
      <ellipse cx="0" cy="12" rx="8" ry="2.6" fill="#A16207" />
      <path d="M5-2v6" stroke="#64748B" strokeWidth=".9" />
      <circle cx="5" cy="5" r="1.1" fill="#64748B" />
    </>
  ),
  ...MORE_ART,
}

/* A glass of orange juice that empties while Toby drinks */
function Glass({ drain, reduced }) {
  return (
    <>
      <Motion.rect x="-5.6" y="-8" width="11.2" height="19" rx="1.5" fill="#FB923C" style={{ originY: 1 }}
        initial={false} animate={{ scaleY: drain ? 0.12 : 1 }} transition={{ duration: reduced ? 0 : 2.2, ease: 'easeInOut', delay: drain ? 0.5 : 0 }} />
      <path d="M-7.5-12h15l-1.8 24H-5.7z" fill="#fff" fillOpacity="0.28" stroke="#fff" strokeWidth="1.6" strokeLinejoin="round" />
      <path d="M-4.5-8v15" stroke="#fff" strokeWidth="1.4" opacity="0.6" strokeLinecap="round" />
    </>
  )
}

/* The shop basket with what Toby has picked so far (the newest drops in) */
const SLOTS = [[-8, 3], [8, 3], [0, 0], [-1, 6]]
function Basket({ items = [], fresh, reduced }) {
  return (
    <>
      <path d="M-13 9Q0-14 13 9" stroke="#B45309" strokeWidth="3" fill="none" strokeLinecap="round" />
      {items.slice(0, 4).map((name, i) => {
        const [x, y] = SLOTS[i]
        const isNew = fresh && i === items.length - 1
        return (
          <Motion.g key={`${name}-${i}`} initial={isNew && !reduced ? { y: -70, opacity: 0, scale: 1.4 } : false}
            animate={{ y: 0, opacity: 1, scale: 1 }} transition={{ delay: 0.15, type: 'spring', stiffness: 260, damping: 15 }}>
            <g transform={`translate(${x} ${y + 2}) scale(.55)`}>{ART[name]?.()}</g>
          </Motion.g>
        )
      })}
      <path d="M-17 9h34l-4 19h-26z" fill="#F59E0B" />
      <path d="M-15 15h30M-14 21h28M-8 9l1 19M0 9v19M8 9l-1 19" stroke="#D97706" strokeWidth="1.4" />
      <path d="M-17 9h34" stroke="#B45309" strokeWidth="3" strokeLinecap="round" />
    </>
  )
}

/* A paper shopping bag with the goods peeking out of the top */
const BAG_SLOTS = [[-6, -11, -12], [5, -12, 10], [0, -8, 0]]
function ShopBag({ items }) {
  const goods = (items?.length ? items : ['bread', 'apples', 'milk']).slice(-3)
  return (
    <>
      {goods.map((name, i) => {
        const [x, y, r] = BAG_SLOTS[i]
        return <g key={`${name}-${i}`} transform={`translate(${x} ${y}) rotate(${r}) scale(.6)`}>{ART[name]?.()}</g>
      })}
      <path d="M-12-6h24l2 22h-28z" fill="#D6A56A" />
      <path d="M-12-6h24l.4 4h-24.8z" fill="#C08A4B" />
      <path d="M-6-6l-1 22M6-6l1 22" stroke="#C08A4B" strokeWidth=".8" opacity=".6" />
      <circle cx="0" cy="7" r="4.2" fill="#FDE68A" />
      <path d="M-2 7l1.4 1.4L2.4 5.6" stroke="#B45309" strokeWidth="1.2" fill="none" strokeLinecap="round" />
    </>
  )
}

const KNOWN = new Set(ITEM_NAMES)

export function ItemArt({ name, basket, fresh, drain, reduced, ...rest }) {
  let body = null
  if (name === 'basket') body = <Basket items={basket} fresh={fresh} reduced={reduced} />
  else if (name === 'glass') body = <Glass drain={drain} reduced={reduced} />
  else if (name === 'shopbag') body = <ShopBag items={basket} />
  else if (KNOWN.has(name)) body = ART[name]?.() || null
  return <g {...rest}>{body}</g>
}

// items whose drawing is not centred on 0,0 (they hang from Toby's paw) → centred for an icon
const ICON_FIT = {
  toothbrush: 'rotate(38) translate(0 -14)',
  fork: 'rotate(38) translate(0 -12.5)',
  pencil: 'rotate(38) translate(0 -12)',
  bag: 'translate(0 -10)',
  basket: 'translate(0 -10) scale(.92)',
  icecream: 'translate(0 2)',
  comb: 'scale(.9)',
  'cake-slice': 'translate(0 1)',
}

/* An item as a standalone icon for HTML cards — an empty <g> when it has no drawing */
export function ItemIcon({ name, size = 40, className = '' }) {
  const known = KNOWN.has(name) && (ART[name] || name === 'basket' || name === 'glass' || name === 'shopbag')
  return (
    <svg viewBox="-17 -17 34 34" width={size} height={size} className={className} aria-hidden>
      {known ? <ItemArt name={name} transform={ICON_FIT[name]} basket={name === 'basket' ? ['apples', 'milk', 'bread'] : undefined} /> : <g />}
    </svg>
  )
}
