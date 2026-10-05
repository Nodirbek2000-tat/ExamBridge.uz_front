/*
 * TOBY'S DAY — the pictures for the Birthday Party and At the Doctor zones
 * (merged into items.jsx's ART). Same rules as items.jsx: centred on 0,0 in a
 * ~32-unit box, flat colours with a soft highlight, no text that needs a font.
 */

const SPARK = 'M0-5C.6-1.6 1.6-.6 5 0 1.6.6.6 1.6 0 5-.6 1.6-1.6.6-5 0-1.6-.6-.6-1.6 0-5z'
const FUR = '#FFF6EA'
const FUR_LINE = '#D9BC9C'

function flame(x, y, s = 1) {
  return (
    <g key={`f${x}`} transform={`translate(${x} ${y}) scale(${s})`}>
      <path d="M0-6c3 3 3.4 5.6 0 7.4C-3.4-.6-3-3 0-6z" fill="#FDBA74" />
      <path d="M0-3.6c1.6 1.8 1.8 3.2 0 4.2-1.8-1-1.6-2.4 0-4.2z" fill="#FEF08A" />
    </g>
  )
}

/* a round cream face (Toby-ish) — the base of the "what hurts" pictures */
function face(children, { cheeks = '#FDA4AF', mouth = 'M-3.5 6q3.5-2.4 7 0' } = {}) {
  return (
    <>
      <path d="M-12-7-11-15l6 4M12-7l-1-8-6 4" fill={FUR} stroke={FUR_LINE} strokeWidth="1.2" strokeLinejoin="round" />
      <circle r="12.5" fill={FUR} stroke={FUR_LINE} strokeWidth="1.3" />
      <ellipse cx="-7" cy="3.5" rx="2.6" ry="1.6" fill={cheeks} opacity=".75" />
      <ellipse cx="7" cy="3.5" rx="2.6" ry="1.6" fill={cheeks} opacity=".75" />
      <ellipse cx="-4.3" cy="-1" rx="1.7" ry="2.2" fill="#1F2937" />
      <ellipse cx="4.3" cy="-1" rx="1.7" ry="2.2" fill="#1F2937" />
      <circle cx="-4.8" cy="-1.8" r=".6" fill="#fff" />
      <circle cx="3.8" cy="-1.8" r=".6" fill="#fff" />
      <path d="M-1.2 2.4h2.4L0 3.6z" fill="#F472B6" />
      <path d={mouth} stroke="#9F1239" strokeWidth="1.2" fill="none" strokeLinecap="round" />
      {children}
    </>
  )
}

export const MORE_ART = {
  /* ── birthday ── */
  cake: () => (
    <>
      <ellipse cx="0" cy="14" rx="15" ry="2.6" fill="#E2E8F0" />
      <path d="M-13 4h26v8q0 2-2 2h-22q-2 0-2-2z" fill="#F9A8D4" />
      <path d="M-13 4h26v3q-3.2 3-6.5 0-3.2 3-6.5 0-3.2 3-6.5 0-3.2 3-6.5 0z" fill="#fff" />
      <path d="M-9-4h18v8h-18z" fill="#FBCFE8" />
      <path d="M-9-4h18v2.6q-3 2.6-6 0-3 2.6-6 0-3 2.6-6 0z" fill="#fff" />
      {[-5, 0, 5].map(x => <rect key={x} x={x - 1} y="-11" width="2" height="7" rx="1" fill={x ? '#60A5FA' : '#FDE047'} />)}
      {[-5, 0, 5].map(x => flame(x, -12, 0.75))}
      {[-8, -2, 4, 10].map(x => <circle key={x} cx={x} cy="9" r="1" fill="#F43F5E" />)}
      <path d="M-11 6v5" stroke="#fff" strokeWidth="1.4" opacity=".55" strokeLinecap="round" />
    </>
  ),
  'cake-slice': () => (
    <>
      <path d="M-13 8 9-10l4 4v12l-24 6z" fill="#FDE68A" />
      <path d="M-13 8 9-10l4 4L-11 12z" fill="#F9A8D4" />
      <path d="M-11 12 13-6v4L-11 16z" fill="#F472B6" opacity=".55" />
      <path d="M-13 8l2 4v4l-2-1z" fill="#FBCFE8" />
      <circle cx="6" cy="-10" r="3.4" fill="#EF4444" />
      <path d="M6-13.4q1-2 3-2" stroke="#16A34A" strokeWidth="1.3" fill="none" strokeLinecap="round" />
      <circle cx="5" cy="-11" r=".9" fill="#fff" opacity=".7" />
    </>
  ),
  balloons: () => (
    <>
      <path d="M-7 3q2 7 1 13M1 1q-1 8 0 15M8 4q-3 6-2 12" stroke="#94A3B8" strokeWidth=".9" fill="none" />
      <ellipse cx="-7" cy="-5" rx="6.5" ry="8" fill="#F43F5E" />
      <ellipse cx="8" cy="-3" rx="6" ry="7.5" fill="#38BDF8" />
      <ellipse cx="1" cy="-9" rx="6.5" ry="8" fill="#FACC15" />
      <path d="M-7 3l-1.4 1.6h2.8zM8 4.5l-1.4 1.6h2.8zM1-1l-1.4 1.6h2.8z" fill="#64748B" />
      <ellipse cx="-9" cy="-8" rx="1.6" ry="2.6" fill="#fff" opacity=".55" />
      <ellipse cx="-1" cy="-12" rx="1.6" ry="2.6" fill="#fff" opacity=".55" />
      <ellipse cx="6" cy="-6" rx="1.4" ry="2.4" fill="#fff" opacity=".55" />
    </>
  ),
  present: () => (
    <>
      <rect x="-13" y="-3" width="26" height="17" rx="2" fill="#A78BFA" />
      <rect x="-14.5" y="-8" width="29" height="7" rx="2" fill="#8B5CF6" />
      <rect x="-2.5" y="-8" width="5" height="22" fill="#FDE047" />
      <path d="M0-8C-4-15-12-14-9-9-7-7-3-8 0-8zM0-8c4-7 12-6 9-1-2 2-6 1-9 1z" fill="#FDE047" stroke="#EAB308" strokeWidth="1" strokeLinejoin="round" />
      <path d="M-11 0v11" stroke="#fff" strokeWidth="1.4" opacity=".45" strokeLinecap="round" />
    </>
  ),
  candles: () => (
    <>
      <ellipse cx="0" cy="14" rx="14" ry="2.6" fill="#FBCFE8" />
      {[[-8, 10, '#60A5FA'], [0, 14, '#F472B6'], [8, 10, '#34D399']].map(([x, h, c]) => (
        <g key={x}>
          <rect x={x - 2.4} y={13 - h} width="4.8" height={h} rx="1.4" fill={c} />
          <path d={`M${x - 2.4} ${15 - h}l4.8 3M${x - 2.4} ${20 - h}l4.8 3`} stroke="#fff" strokeWidth="1.1" opacity=".7" />
          <path d={`M${x} ${13 - h}v-2`} stroke="#334155" strokeWidth=".9" />
          {flame(x, 9 - h, 0.95)}
        </g>
      ))}
    </>
  ),
  'party-hat': () => (
    <>
      <path d="M0-15 11 12Q0 16-11 12z" fill="#22D3EE" />
      <path d="M-4.5-4 6.5 1M-8 5l15 4.5M-2-11l4 2" stroke="#F472B6" strokeWidth="2.6" strokeLinecap="round" />
      <path d="M-11 12Q0 16 11 12" stroke="#0E7490" strokeWidth="2" fill="none" strokeLinecap="round" />
      <circle cy="-15" r="3.6" fill="#FDE047" stroke="#EAB308" strokeWidth="1" />
      <path d={SPARK} fill="#FDE047" transform="translate(-11 -8) scale(.8)" />
    </>
  ),
  seven: () => (
    <>
      <path d="M2 13q-1 4 2 6" stroke="#94A3B8" strokeWidth=".9" fill="none" />
      <path d="M-10-14h20q3 0 2 3L3 12q-1 2-3 1l-3-1q-2-1-1-3L5-7h-15q-3 0-3-3.5t3-3.5z" fill="#FACC15" stroke="#D97706" strokeWidth="1.3" strokeLinejoin="round" />
      <path d="M-9-11.5h15" stroke="#FEF9C3" strokeWidth="1.6" strokeLinecap="round" opacity=".9" />
      <path d={SPARK} fill="#fff" transform="translate(-10 4) scale(.75)" />
      <path d={SPARK} fill="#F9A8D4" transform="translate(11 6) scale(.6)" />
    </>
  ),

  /* ── at the doctor ── */
  thermometer: () => (
    <g transform="rotate(-35)">
      <rect x="-3" y="-15" width="6" height="24" rx="3" fill="#fff" stroke="#94A3B8" strokeWidth="1.2" />
      <rect x="-1" y="-6" width="2" height="15" rx="1" fill="#EF4444" />
      <circle cy="11" r="4.6" fill="#EF4444" stroke="#B91C1C" strokeWidth="1" />
      <path d="M1.6-12h2M1.6-9h1.4M1.6-6h2M1.6-3h1.4M1.6 0h2" stroke="#94A3B8" strokeWidth=".8" />
      <circle cx="-1.4" cy="10" r="1.2" fill="#fff" opacity=".6" />
    </g>
  ),
  stethoscope: () => (
    <>
      <path d="M-9-14v6q0 9 9 9t9-9v-6" stroke="#334155" strokeWidth="2.4" fill="none" strokeLinecap="round" />
      <circle cx="-9" cy="-14" r="1.8" fill="#64748B" />
      <circle cx="9" cy="-14" r="1.8" fill="#64748B" />
      <path d="M0 1v5q0 7 7 7" stroke="#334155" strokeWidth="2.4" fill="none" strokeLinecap="round" />
      <circle cx="9" cy="12" r="5" fill="#94A3B8" stroke="#475569" strokeWidth="1.4" />
      <circle cx="9" cy="12" r="2.4" fill="#E2E8F0" />
    </>
  ),
  medicine: () => (
    <>
      <rect x="-12" y="-9" width="14" height="22" rx="3" fill="#FB923C" />
      <rect x="-13" y="-14" width="16" height="6" rx="1.6" fill="#fff" stroke="#CBD5E1" strokeWidth="1" />
      <rect x="-10" y="-2" width="10" height="9" rx="1.5" fill="#fff" />
      <path d="M-5 0v5M-7.5 2.5h5" stroke="#EF4444" strokeWidth="1.8" strokeLinecap="round" />
      <path d="M-10-6v16" stroke="#fff" strokeWidth="1.3" opacity=".5" strokeLinecap="round" />
      <path d="M5 13 13-3" stroke="#CBD5E1" strokeWidth="2.6" strokeLinecap="round" />
      <ellipse cx="13" cy="-5" rx="3.8" ry="2.6" fill="#E2E8F0" stroke="#94A3B8" strokeWidth="1" transform="rotate(-62 13 -5)" />
      <ellipse cx="13" cy="-5" rx="2" ry="1.3" fill="#F97316" transform="rotate(-62 13 -5)" />
    </>
  ),
  plaster: () => (
    <g transform="rotate(-28)">
      <rect x="-15" y="-5.5" width="30" height="11" rx="5.5" fill="#FBBF77" stroke="#D97706" strokeWidth="1" />
      <rect x="-5.5" y="-5.5" width="11" height="11" fill="#FDE6C8" />
      {[[-3, -2.5], [0, -2.5], [3, -2.5], [-3, 0.5], [0, 0.5], [3, 0.5], [-1.5, 3], [1.5, 3]].map(([x, y], i) => (
        <circle key={i} cx={x} cy={y} r=".6" fill="#D97706" opacity=".6" />
      ))}
      <path d="M-12-2h4M8-2h4" stroke="#fff" strokeWidth="1.2" opacity=".6" strokeLinecap="round" />
    </g>
  ),
  headache: () => face(
    <>
      <path d="M-12-5q12-6 24 0v4q-12-6-24 0z" fill="#fff" stroke="#CBD5E1" strokeWidth="1" />
      <path d="M2-6.2l2 2.4M5-6.6l2 2.4" stroke="#F87171" strokeWidth=".9" />
      <path d="M13-14l3 2-2 2 3 2M-13-14l-3 2 2 2-3 2" stroke="#F59E0B" strokeWidth="1.5" fill="none" strokeLinecap="round" strokeLinejoin="round" />
    </>,
    { mouth: 'M-3.5 7q3.5-3 7 0' },
  ),
  throat: () => face(
    <>
      <path d="M-10 9q10 8 20 0l1 5q-11 8-22 0z" fill="#3B82F6" />
      <path d="M-6 12v3M0 13.5v3M6 12v3" stroke="#BFDBFE" strokeWidth="1.3" />
      <circle cx="13" cy="-9" r="3" fill="#fff" stroke="#CBD5E1" strokeWidth=".9" />
      <circle cx="16.5" cy="-14" r="1.6" fill="#fff" stroke="#CBD5E1" strokeWidth=".9" />
    </>,
    { cheeks: '#F87171', mouth: 'M-2.2 5.2a2.2 2.6 0 1 0 4.4 0a2.2 2.6 0 1 0-4.4 0' },
  ),
  tummy: () => (
    <>
      <ellipse cx="0" cy="2" rx="14" ry="13" fill="#FF6B6B" />
      <ellipse cx="0" cy="4" rx="9.5" ry="8.5" fill={FUR} stroke={FUR_LINE} strokeWidth="1" />
      <path d="M0 4m-5 0a5 5 0 1 0 5-5a3 3 0 1 0 3 3" stroke="#F97316" strokeWidth="1.5" fill="none" strokeLinecap="round" />
      <circle cx="-11" cy="-8" r="4.2" fill={FUR} stroke={FUR_LINE} strokeWidth="1.1" />
      <circle cx="11" cy="-8" r="4.2" fill={FUR} stroke={FUR_LINE} strokeWidth="1.1" />
      <path d="M-16 12l-3 2M16 12l3 2M-17 6h-3M17 6h3" stroke="#F59E0B" strokeWidth="1.4" strokeLinecap="round" />
    </>
  ),
  sick: () => face(
    <>
      <g transform="translate(5 7) rotate(-20)">
        <rect x="0" y="-1.3" width="13" height="2.6" rx="1.3" fill="#fff" stroke="#94A3B8" strokeWidth=".8" />
        <circle cx="13" cy="0" r="2" fill="#EF4444" />
      </g>
      <path d="M11-10q2 3 0 4.6-2-1.6 0-4.6z" fill="#7DD3FC" />
    </>,
    { cheeks: '#F87171', mouth: 'M-3 6.5q1.5-1.6 3 0' },
  ),
  doctor: () => (
    <>
      <path d="M-6-9v-3q0-3 3-3h6q3 0 3 3v3" stroke="#334155" strokeWidth="2.4" fill="none" />
      <rect x="-15" y="-9" width="30" height="22" rx="5" fill="#475569" />
      <rect x="-15" y="-9" width="30" height="7" rx="3.5" fill="#334155" />
      <circle cx="0" cy="3.5" r="6.6" fill="#fff" />
      <path d="M0-.4v7.8M-3.9 3.5h7.8" stroke="#EF4444" strokeWidth="2.6" strokeLinecap="round" />
      <path d="M-12-4v13" stroke="#fff" strokeWidth="1.2" opacity=".25" strokeLinecap="round" />
    </>
  ),
}
