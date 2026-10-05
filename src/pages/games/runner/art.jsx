/*
 * TOBY RUN — small drawn pictures for the screens around the run (RUNNER_PLAN §B1 "UI art is drawn SVG,
 * not plain icons"): power-up badges (magnit, x2, gilam, varrak), Shovqin, a picture per mission, the
 * teen runners Lola and Bek, Toby's do'ppi (drawn over the Toby's Day SVG), medals, coins, and carpet
 * swatches drawn by the same code as the 3D ornament atlas.
 */
import { useEffect, useId, useRef } from 'react'
import { drawOrnament } from '../../../games/three/ornaments'
import { TobyAvatar } from '../tobys-day/Toby'

const PAL = { lapis: '#2E5AAC', turq: '#2BB3C0', saffron: '#F5B14C', pom: '#D94A5A', cream: '#F6EBD9', ink: '#16161D', violet: '#A98BFF' }

export function Coin({ size = 16, className = '' }) {
  return (
    <svg viewBox="0 0 20 20" width={size} height={size} className={className} aria-hidden="true">
      <circle cx="10" cy="10" r="9" fill="#F5B14C" />
      <circle cx="10" cy="10" r="6.2" fill="none" stroke="#FFE3A6" strokeWidth="1.6" />
      <path d="M10 6.2v7.6" stroke="#B7791F" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  )
}

/* ── power-ups ─────────────────────────────────────────────────────────── */

export function PowerBadge({ kind, size = 28, className = '' }) {
  return (
    <svg viewBox="-20 -20 40 40" width={size} height={size} className={className} aria-hidden="true">
      {kind === 'magnet' && (
        <g>
          <circle r="19" fill="#FFE1E4" />
          <path d="M-9-9v8a9 9 0 0 0 18 0v-8h-6v8a3 3 0 0 1-6 0v-8z" fill={PAL.pom} stroke="#9E2A3C" strokeWidth="1.4" strokeLinejoin="round" />
          <path d="M-9-9h6v4h-6zM3-9h6v4H3z" fill="#E8EDF3" stroke="#9AA3B2" strokeWidth="1" />
          <path d="M-14-12l-3-3M14-12l3-3M0-15v-3" stroke={PAL.saffron} strokeWidth="1.8" strokeLinecap="round" />
        </g>
      )}
      {kind === 'x2' && (
        <g>
          <circle r="19" fill="#D8F5F7" />
          <circle r="14" fill={PAL.turq} />
          <path d="M-9-5l7 10M-2-5l-7 10" stroke="#fff" strokeWidth="2.8" strokeLinecap="round" />
          <path d="M1-4.5q2-2.5 5-2.5t4.5 3q0 3-4 5.5l-5 3.5h9" fill="none" stroke="#fff" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" />
        </g>
      )}
      {kind === 'gilam' && (
        <g>
          <circle r="19" fill="#FFF0D6" />
          <path d="M-14 2q7-6 14-1t14-1l-3 9q-7 4-14-1t-14 1z" fill={PAL.pom} stroke="#9E2A3C" strokeWidth="1.2" strokeLinejoin="round" />
          <path d="M-10 4q5-3 10 0t10-1l-1.6 4.6q-5 2-10-1t-10 1z" fill={PAL.lapis} />
          <circle cx="0" cy="5" r="1.8" fill={PAL.saffron} />
          {[-15, -12, -9].map(x => <path key={x} d={`M${x} ${4 + (x + 15) * 0.4}l-2 2`} stroke={PAL.cream} strokeWidth="1.2" strokeLinecap="round" />)}
          <path d="M-6-10q6-4 12 0" stroke={PAL.saffron} strokeWidth="1.6" fill="none" strokeLinecap="round" />
        </g>
      )}
      {kind === 'varrak' && (
        <g>
          <circle r="19" fill="#E7F0FF" />
          <path d="M0-14l9 9-9 11-9-11z" fill={PAL.pom} stroke="#9E2A3C" strokeWidth="1.2" strokeLinejoin="round" />
          <path d="M0-14v20M-9-5h18" stroke={PAL.cream} strokeWidth="1.2" />
          <path d="M0 6q-3 4 0 7t0 6" stroke="#6d5843" strokeWidth="1.2" fill="none" />
          <path d="M-2 11l-3 1M2 15l3 1" stroke={PAL.saffron} strokeWidth="1.8" strokeLinecap="round" />
        </g>
      )}
    </svg>
  )
}

/* ── Shovqin, the grumpy noise cloud ───────────────────────────────────── */

export function ShovqinArt({ size = 48, className = '' }) {
  return (
    <svg viewBox="-30 -26 60 50" width={size} height={size * 50 / 60} className={className} aria-hidden="true">
      <ShovqinFigure />
    </svg>
  )
}

/* the same, as a <g> centred on 0,0 (≈ 60 × 50) to place inside another drawing */
export function ShovqinFigure() {
  return (
    <g>
      <g fill="#7C5BEF">
        <circle cx="-14" cy="4" r="11" /><circle cx="14" cy="4" r="11" /><circle cx="0" cy="-2" r="15" />
        <circle cx="-7" cy="-12" r="8" fill="#8B6CF6" /><circle cx="8" cy="-12" r="7.5" fill="#8B6CF6" />
        <rect x="-22" y="2" width="44" height="12" rx="6" />
      </g>
      <path d="M-20-6a20 18 0 0 1 40 0" fill="none" stroke={PAL.ink} strokeWidth="2.6" />
      <rect x="-25" y="-8" width="7" height="11" rx="3" fill={PAL.saffron} />
      <rect x="18" y="-8" width="7" height="11" rx="3" fill={PAL.saffron} />
      <path d="M-10-5l6 2M10-5l-6 2" stroke="#3b2a7a" strokeWidth="2" strokeLinecap="round" />
      <circle cx="-6" cy="1" r="3" fill="#fff" /><circle cx="6" cy="1" r="3" fill="#fff" />
      <circle cx="-5.6" cy="1.6" r="1.5" fill={PAL.ink} /><circle cx="6.4" cy="1.6" r="1.5" fill={PAL.ink} />
      <path d="M-4 8q4-2 8 0" stroke="#3b2a7a" strokeWidth="1.8" fill="none" strokeLinecap="round" />
    </g>
  )
}

/* ── a picture per mission ─────────────────────────────────────────────── */

const MISSION_BG = { speak: '#2A2440', run: '#1E2A33' }

export function MissionArt({ id, kind = 'speak', size = 48, className = '' }) {
  const s = id
  return (
    <svg viewBox="-24 -24 48 48" width={size} height={size} className={className} aria-hidden="true">
      <rect x="-24" y="-24" width="48" height="48" rx="14" fill={MISSION_BG[kind] || MISSION_BG.speak} />
      {s === 'say8' && (
        <g>
          <path d="M-14-11h28a4 4 0 0 1 4 4v12a4 4 0 0 1-4 4h-16l-7 6v-6h-5a4 4 0 0 1-4-4v-12a4 4 0 0 1 4-4z" fill={PAL.cream} />
          {[-7, 0, 7].map(x => <circle key={x} cx={x} cy="-1" r="2.3" fill={PAL.lapis} />)}
          <path d="M13-17l1.6 3.2 3.5.5-2.5 2.5.6 3.5-3.2-1.7-3.2 1.7.6-3.5-2.5-2.5 3.5-.5z" fill={PAL.saffron} />
        </g>
      )}
      {s === 'fix3' && (
        <g>
          <rect x="-16" y="-14" width="22" height="11" rx="5.5" fill={PAL.pom} />
          <path d="M-12-8.5h14" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeDasharray="3 2" />
          <path d="M-2 14l12-12a5.5 5.5 0 1 1 4 4l-12 12z" fill="#C9D1DC" stroke="#8A94A6" strokeWidth="1.2" />
          <circle cx="14" cy="-2" r="2" fill={MISSION_BG.speak} />
          <path d="M-14 6l4 4 7-8" stroke="#34D3A0" strokeWidth="2.6" fill="none" strokeLinecap="round" strokeLinejoin="round" />
        </g>
      )}
      {s === 'bekat2' && (
        <g>
          <rect x="-17" y="-15" width="34" height="18" rx="5" fill="#16224A" />
          <circle cx="-9" cy="-6" r="5" fill={PAL.saffron} />
          <path d="M-11-9h3a2 2 0 0 1 0 3h-3zm0 3h3.5a2 2 0 0 1 0 3h-3.5z" fill="#16224A" />
          <path d="M-1-9h13M-1-4h9" stroke={PAL.cream} strokeWidth="2" strokeLinecap="round" />
          <rect x="-19" y="8" width="38" height="5" rx="2" fill={PAL.cream} />
          <rect x="-19" y="8" width="38" height="1.6" fill={PAL.saffron} />
          {[-6, 6].map(x => <path key={x} d={`M${x} 15l1.4 2.8 3.1.4-2.2 2.2.5 3-2.8-1.5-2.8 1.5.5-3-2.2-2.2 3.1-.4z`} transform="translate(0 -3)" fill={PAL.saffron} />)}
        </g>
      )}
      {s === 'revive1' && (
        <g>
          <path d="M0 15S-16 5-16-5a8 8 0 0 1 16-3 8 8 0 0 1 16 3C16 5 0 15 0 15z" fill={PAL.pom} />
          <rect x="-3.5" y="-9" width="7" height="12" rx="3.5" fill="#fff" />
          <path d="M-7-1a7 7 0 0 0 14 0M0 6v3" stroke="#fff" strokeWidth="1.8" fill="none" strokeLinecap="round" />
        </g>
      )}
      {(s === 'fast5' || s === 'pass10') && (
        <g>
          <circle cy="3" r="14" fill={PAL.cream} />
          <circle cy="3" r="11" fill="#fff" stroke={PAL.lapis} strokeWidth="2" />
          <rect x="-3" y="-15" width="6" height="4" rx="1.5" fill={PAL.lapis} />
          {s === 'fast5'
            ? <path d="M2-5l-6 9h5l-2 8 7-10h-5z" fill={PAL.saffron} stroke="#B7791F" strokeWidth="0.8" strokeLinejoin="round" />
            : <path d="M-5 3l4 4 7-8" stroke="#34D3A0" strokeWidth="3" fill="none" strokeLinecap="round" strokeLinejoin="round" />}
        </g>
      )}
      {s === 'puff2' && (
        <g transform="translate(-3 2) scale(0.62)">
          <g fill="#7C5BEF"><circle cx="-12" cy="4" r="10" /><circle cx="10" cy="4" r="10" /><circle cy="-3" r="13" /><rect x="-20" y="2" width="40" height="11" rx="5.5" /></g>
          <path d="M-6 0l4 1M6 0l-4 1" stroke="#3b2a7a" strokeWidth="2.4" strokeLinecap="round" />
          <path d="M24-8q8 0 12 6M26 2q8 2 10 8M22 12q6 4 6 10" stroke={PAL.cream} strokeWidth="3" fill="none" strokeLinecap="round" />
        </g>
      )}
      {s === 'learn5' && (
        <g>
          <path d="M-17-10q8-4 17 0v22q-9-4-17 0z" fill={PAL.cream} />
          <path d="M17-10q-8-4-17 0v22q9-4 17 0z" fill="#E9DCC4" />
          <path d="M-13-4h9M-13 1h9M4-4h9M4 1h6" stroke={PAL.lapis} strokeWidth="1.6" strokeLinecap="round" />
          <path d="M14-18l1.4 3 3.1.4-2.2 2.2.5 3-2.8-1.5-2.8 1.5.5-3-2.2-2.2 3.1-.4z" fill={PAL.saffron} />
        </g>
      )}
      {s === 'run2000' && (
        <g>
          <path d="M-18 18L-3-12h6L18 18z" fill="#3A3F4F" />
          <path d="M-8 18L-1-12M8 18L1-12" stroke="#C9D1DC" strokeWidth="1.4" />
          {[-6, 0, 6, 12].map((y, i) => <path key={y} d={`M${-6 - i * 2.4} ${y}h${12 + i * 4.8}`} stroke="#6B7080" strokeWidth="1.2" />)}
          <path d="M6-18v14" stroke={PAL.cream} strokeWidth="1.6" />
          <path d="M6-18h10l-3 3.5 3 3.5H6z" fill={PAL.pom} />
        </g>
      )}
      {s === 'coins300' && (
        <g>
          {[10, 5, 0].map((y, i) => <g key={y}><ellipse cx={-4 + i * 2} cy={y} rx="11" ry="4" fill="#B7791F" /><ellipse cx={-4 + i * 2} cy={y - 2} rx="11" ry="4" fill={PAL.saffron} /></g>)}
          <circle cx="9" cy="-8" r="8" fill={PAL.saffron} stroke="#FFE3A6" strokeWidth="1.6" />
          <path d="M9-12v8" stroke="#B7791F" strokeWidth="1.8" strokeLinecap="round" />
        </g>
      )}
      {s === 'roll10' && (
        <g>
          <path d="M-16 16V-10M16 16V-10" stroke="#9AA3B2" strokeWidth="2.4" />
          <rect x="-18" y="-14" width="36" height="9" rx="2" fill={PAL.pom} />
          <path d="M-10-9.5h20" stroke="#fff" strokeWidth="2.6" strokeDasharray="4 3" />
          <circle cx="0" cy="10" r="6" fill={PAL.cream} />
          <path d="M-9 4a10 10 0 0 1 16-2" stroke={PAL.saffron} strokeWidth="2" fill="none" strokeLinecap="round" />
          <path d="M8 0l-1 3.5-3.4-1" stroke={PAL.saffron} strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round" />
        </g>
      )}
      {s === 'roof200' && (
        <g>
          <rect x="-19" y="-2" width="38" height="15" rx="3" fill={PAL.lapis} />
          <rect x="-19" y="4" width="38" height="2" fill={PAL.cream} />
          {[-14, -6, 2, 10].map(x => <rect key={x} x={x} y="-0.5" width="5" height="4" rx="1" fill="#16202C" />)}
          <circle cx="-11" cy="15" r="2.6" fill={PAL.ink} /><circle cx="11" cy="15" r="2.6" fill={PAL.ink} />
          <path d="M-12-8h22" stroke={PAL.saffron} strokeWidth="2.4" strokeLinecap="round" />
          <path d="M6-12l5 4-5 4" stroke={PAL.saffron} strokeWidth="2.4" fill="none" strokeLinecap="round" strokeLinejoin="round" />
        </g>
      )}
      {s === 'magnet3' && <g transform="scale(0.95)"><PowerBadgeInner kind="magnet" /></g>}
    </svg>
  )
}

function PowerBadgeInner({ kind }) {
  if (kind !== 'magnet') return null
  return (
    <g>
      <path d="M-10-10v9a10 10 0 0 0 20 0v-9h-6.5v9a3.5 3.5 0 0 1-7 0v-9z" fill={PAL.pom} />
      <path d="M-10-10h6.5v4.5H-10zM3.5-10H10v4.5H3.5z" fill="#E8EDF3" />
      <path d="M-15-13l-3-3M15-13l3-3M0-16v-3" stroke={PAL.saffron} strokeWidth="2" strokeLinecap="round" />
    </g>
  )
}

/* ── the teen runners ──────────────────────────────────────────────────── */

const KIDS = {
  lola: { skin: '#EDBE95', hair: '#3B2418', shirt: PAL.turq, collar: PAL.saffron, pants: PAL.lapis, shoe: PAL.cream, sole: PAL.pom },
  bek: { skin: '#E0AE84', hair: '#231812', shirt: PAL.saffron, collar: PAL.pom, pants: '#2E3A5C', shoe: '#FFFFFF', sole: PAL.turq },
}

/* Lola / Bek in a 200 × 240 box like Toby's (feet at y ≈ 236) */
export function KidArt({ who = 'lola', className = '', cheer = false }) {
  return (
    <svg viewBox="-14 -16 228 262" className={className} aria-hidden="true">
      <KidFigure who={who} cheer={cheer} />
    </svg>
  )
}

/* Lola / Bek as a <g> in Toby's 200 × 240 box (to place inside another drawing) */
export function KidFigure({ who = 'lola', cheer = false }) {
  const c = KIDS[who] || KIDS.lola
  const uid = useId().replace(/[^a-zA-Z0-9_-]/g, '')
  const lola = who === 'lola'
  return (
    <g>
      <defs>
        <radialGradient id={`${uid}s`} cx=".4" cy=".35" r=".7">
          <stop offset="0" stopColor="#ffffff" stopOpacity=".28" />
          <stop offset="1" stopColor="#ffffff" stopOpacity="0" />
        </radialGradient>
      </defs>
      <ellipse cx="100" cy="236" rx="46" ry="7" fill="#000" opacity=".25" />
      {/* legs and shoes */}
      {[-1, 1].map(sx => (
        <g key={sx}>
          <rect x={100 + sx * 18 - 10} y="176" width="20" height="46" rx="9" fill={c.pants} />
          <path d={`M${100 + sx * 18 - 14} 220h28a6 6 0 0 1 6 6v4h-40v-4a6 6 0 0 1 6-6z`} fill={c.shoe} />
          <rect x={100 + sx * 18 - 14} y="228" width="34" height="4" rx="2" fill={c.sole} />
        </g>
      ))}
      {/* body */}
      <path d="M62 186q-4-46 38-50 42 4 38 50z" fill={c.shirt} />
      <path d="M84 138q16 10 32 0" stroke={c.collar} strokeWidth="7" fill="none" strokeLinecap="round" />
      {lola && <path d="M70 172l60 0" stroke={PAL.saffron} strokeWidth="4" strokeDasharray="8 6" opacity=".9" />}
      {!lola && <path d="M100 146v34M92 150v8M108 150v8" stroke="#ffffff" strokeWidth="3" strokeLinecap="round" opacity=".7" />}
      {/* arms */}
      {cheer ? (
        <g>
          <path d="M66 150q-18-24-14-50" stroke={c.shirt} strokeWidth="16" fill="none" strokeLinecap="round" />
          <path d="M134 150q18-24 14-50" stroke={c.shirt} strokeWidth="16" fill="none" strokeLinecap="round" />
          <circle cx="52" cy="96" r="9" fill={c.skin} /><circle cx="148" cy="96" r="9" fill={c.skin} />
        </g>
      ) : (
        <g>
          <path d="M66 150q-12 14-10 34" stroke={c.shirt} strokeWidth="16" fill="none" strokeLinecap="round" />
          <path d="M134 150q12 14 10 34" stroke={c.shirt} strokeWidth="16" fill="none" strokeLinecap="round" />
          <circle cx="56" cy="188" r="9" fill={c.skin} /><circle cx="144" cy="188" r="9" fill={c.skin} />
        </g>
      )}
      {/* head */}
      {lola && [-1, 1].map(sx => (
        <g key={sx}>
          {[0, 1, 2, 3].map(i => <circle key={i} cx={100 + sx * 58} cy={104 + i * 15} r={11 - i} fill={c.hair} />)}
          <circle cx={100 + sx * 58} cy="166" r="5" fill={PAL.pom} />
        </g>
      ))}
      <circle cx="100" cy="88" r="62" fill={c.skin} />
      <circle cx="100" cy="88" r="62" fill={`url(#${uid}s)`} />
      {[-1, 1].map(sx => <ellipse key={sx} cx={100 + sx * 62} cy="94" rx="8" ry="11" fill={c.skin} />)}
      {lola ? (
        <path d="M38 86q-2-64 62-66 64 2 62 66-14-28-44-34-20 18-52 16-18 2-28 18z" fill={c.hair} />
      ) : (
        <path d="M40 80q0-58 60-60 60 2 60 60-8-20-30-26-8 10-30 10-30 0-38 0-16 4-22 16z" fill={c.hair} />
      )}
      {!lola && <path d="M104 22q22-8 30 6-14-2-24 6z" fill={c.hair} />}
      {/* face */}
      {[-1, 1].map(sx => (
        <g key={sx}>
          <ellipse cx={100 + sx * 22} cy="94" rx="8" ry="10" fill="#1F2937" />
          <circle cx={100 + sx * 22 + 3} cy="90" r="3" fill="#fff" />
          <path d={`M${100 + sx * 22 - 9} 76q9-5 18 0`} stroke={c.hair} strokeWidth="4" fill="none" strokeLinecap="round" />
          <ellipse cx={100 + sx * 38} cy="110" rx="9" ry="5" fill="#F3A0A0" opacity=".6" />
        </g>
      ))}
      <path d="M86 116q14 12 28 0" stroke="#B5534F" strokeWidth="4" fill="none" strokeLinecap="round" />
    </g>
  )
}

/* ── Toby with an outfit (the Toby's Day SVG) — plus the do'ppi it cannot draw ── */

export function Doppi() {
  return (
    <g>
      <path d="M58 52Q100 36 142 52L134 20Q100 6 66 20Z" fill="#16161D" />
      <path d="M58 52Q100 36 142 52" stroke="#2b2b36" strokeWidth="3" fill="none" />
      <path d="M100 12V44M66 20L74 48M134 20L126 48" stroke="#3a3a46" strokeWidth="1.6" />
      {[[82, 30, -14], [118, 30, 14], [100, 22, 0]].map(([x, y, r]) => (
        <path key={x} transform={`translate(${x} ${y}) rotate(${r})`} d="M0-7q6 4 0 13q-6-9 0-13z" fill="#F6EBD9" />
      ))}
    </g>
  )
}

export function TobyLook({ outfit = '', className = '', mood = 'happy', pose = 'rest' }) {
  const acc = outfit && outfit !== 'doppi' ? outfit : null
  return (
    <div className={`relative ${className}`}>
      <TobyAvatar className="h-full w-full" mood={mood} pose={pose} acc={acc} reduced pokes={false} />
      {outfit === 'doppi' && (
        <svg viewBox="-14 -16 228 262" className="pointer-events-none absolute inset-0 h-full w-full" aria-hidden="true"><Doppi /></svg>
      )}
    </div>
  )
}

/* the runner the learner picked, drawn */
export function RunnerLook({ runner = 'toby', outfit = '', className = '', cheer = false }) {
  if (runner === 'lola' || runner === 'bek') return <KidArt who={runner} className={className} cheer={cheer} />
  return <TobyLook outfit={outfit} className={className} pose={cheer ? 'cheer' : 'rest'} />
}

/* ── medals and swatches ───────────────────────────────────────────────── */

export function Medal({ rank, size = 30 }) {
  const col = rank === 1 ? ['#F5B14C', '#FFE3A6'] : rank === 2 ? ['#C9D1DC', '#F1F4F8'] : ['#D08A5A', '#F3C8A6']
  return (
    <svg viewBox="-16 -18 32 36" width={size} height={size * 36 / 32} aria-hidden="true">
      <path d="M-9-18l5 13h8l5-13z" fill={rank === 1 ? PAL.pom : rank === 2 ? PAL.lapis : PAL.turq} />
      <circle cy="6" r="11" fill={col[0]} />
      <circle cy="6" r="7.5" fill="none" stroke={col[1]} strokeWidth="1.8" />
      <text y="10.5" textAnchor="middle" fontSize="11" fontWeight="900" fill="#16161D" fontFamily="system-ui, sans-serif">{rank}</text>
    </svg>
  )
}

/* a carpet (or any ornament) drawn into a small canvas */
export function Swatch({ ornament, size = 64, className = '' }) {
  const ref = useRef(null)
  useEffect(() => {
    const c = ref.current
    if (!c) return
    const px = Math.round(size * Math.min(2, window.devicePixelRatio || 1))
    c.width = px
    c.height = px
    drawOrnament(c.getContext('2d'), ornament, 0, 0, px)
  }, [ornament, size])
  return <canvas ref={ref} className={className} style={{ width: size, height: size }} aria-hidden="true" />
}
