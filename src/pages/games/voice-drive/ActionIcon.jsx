/*
 * Drawn icons for the driving commands and the road themes — dashboard
 * tell-tales and road-sign shapes in two tones (currentColor + a soft fill),
 * with real colours only where they carry meaning (the lit traffic lamp).
 */
const S = { fill: 'currentColor' }
const SOFT = { fill: 'currentColor', fillOpacity: 0.22 }
const LINE = { fill: 'none', stroke: 'currentColor', strokeWidth: 3.2, strokeLinecap: 'round', strokeLinejoin: 'round' }

function Turn({ dir = -1 }) {
  // a lane arrow: shaft from the bottom, bending into the turn
  return (
    <g transform={dir > 0 ? 'translate(48 0) scale(-1 1)' : undefined}>
      <path d="M31 42V25c0-6.1-4.9-11-11-11h-3.5" {...LINE} strokeWidth={5.4} strokeLinecap="butt" />
      <path d="M18.5 4.5 7 14l11.5 9.5z" {...S} />
      <path d="M31 42V25" stroke="currentColor" strokeOpacity="0.25" strokeWidth={9} fill="none" />
    </g>
  )
}

function Lights({ lit }) {
  const lamps = [['#ff4d42', 14], ['#ffb224', 24], ['#2fdc74', 34]]
  return (
    <g>
      <rect x="15" y="6" width="18" height="36" rx="6" {...SOFT} />
      <rect x="15" y="6" width="18" height="36" rx="6" {...LINE} strokeWidth={2.6} />
      {lamps.map(([c, y], i) => (
        <circle key={i} cx="24" cy={y} r="4.2" fill={i === lit ? c : 'currentColor'} fillOpacity={i === lit ? 1 : 0.28} />
      ))}
      {lit != null && <circle cx="24" cy={lamps[lit][1]} r="7.5" fill={lamps[lit][0]} fillOpacity="0.25" />}
      <path d="M24 42v4" {...LINE} strokeWidth={2.6} />
    </g>
  )
}

const ICONS = {
  left: () => <Turn dir={-1} />,
  right: () => <Turn dir={1} />,
  straight: () => (
    <g>
      <path d="M24 44V14" stroke="currentColor" strokeOpacity="0.25" strokeWidth={9} fill="none" />
      <path d="M24 44V16" {...LINE} strokeWidth={5.4} strokeLinecap="butt" />
      <path d="M12.5 18 24 5l11.5 13z" {...S} />
    </g>
  ),
  stop: () => <Lights lit={0} />,
  go: () => <Lights lit={2} />,
  jump: () => (
    <g>
      <path d="M5 40h38" {...LINE} strokeOpacity="0.5" />
      <rect x="18" y="31" width="12" height="9" rx="1.5" {...SOFT} />
      <path d="M18 34h12M18 37.5h12" stroke="currentColor" strokeWidth="1.6" strokeOpacity="0.6" />
      <path d="M8 27c5-13 25-17 33-8" {...LINE} strokeDasharray="1 5.2" />
      <path d="M31.5 9.5h7.8c1.4 0 2.6.8 3.2 2l1.5 3.3V19H29v-4l2.5-5.5z" {...S} />
      <circle cx="32.5" cy="19.5" r="2.4" fill="#0b0b10" stroke="currentColor" strokeWidth="1.8" />
      <circle cx="40.5" cy="19.5" r="2.4" fill="#0b0b10" stroke="currentColor" strokeWidth="1.8" />
    </g>
  ),
  slow: () => <Gauge needle={-58} />,
  fast: () => (
    <g>
      <Gauge needle={52} />
      <path d="M3 21h5M2 27h6M4 33h4" {...LINE} strokeWidth={2.4} strokeOpacity="0.7" />
    </g>
  ),
  honk: () => (
    <g>
      <path d="M6 20.5h6.5L27 10v28L12.5 27.5H6z" {...SOFT} />
      <path d="M6 20.5h6.5L27 10v28L12.5 27.5H6z" {...LINE} strokeWidth={2.8} />
      <path d="M33 18.5c2.2 3.2 2.2 7.8 0 11M38 14c4.4 6 4.4 14 0 20" {...LINE} strokeWidth={2.8} />
    </g>
  ),
  lights: () => (
    <g>
      {/* the dashboard dipped-beam lamp */}
      <path d="M26 11c-8 0-11.5 6-11.5 13S18 37 26 37c2.6 0 3.6-1.7 3.6-4V15c0-2.4-1-4-3.6-4z" {...SOFT} />
      <path d="M26 11c-8 0-11.5 6-11.5 13S18 37 26 37c2.6 0 3.6-1.7 3.6-4V15c0-2.4-1-4-3.6-4z" {...LINE} strokeWidth={2.8} />
      <path d="M34 15.5l9 2.4M34 21.5l9 2.4M34 27.5l9 2.4M34 33.5l9 2.4" {...LINE} strokeWidth={2.8} />
    </g>
  ),
  fuel: () => (
    <g>
      <rect x="8" y="7" width="20" height="35" rx="3.5" {...SOFT} />
      <rect x="8" y="7" width="20" height="35" rx="3.5" {...LINE} strokeWidth={2.8} />
      <rect x="12.5" y="12" width="11" height="8.5" rx="1.5" {...S} />
      <path d="M28 18h4.5c1.4 0 2.5 1.1 2.5 2.5v14c0 1.7 1.3 3 3 3s3-1.3 3-3V17l-5-6" {...LINE} strokeWidth={2.8} />
      <path d="M5 42h26" {...LINE} strokeWidth={2.8} />
    </g>
  ),
  pickup: () => (
    <g>
      <path d="M38 44V6" {...LINE} strokeWidth={2.6} strokeOpacity="0.55" />
      <rect x="32" y="5" width="12" height="9" rx="2" {...S} fillOpacity="0.55" />
      <circle cx="17" cy="9.5" r="4.5" {...S} />
      <path d="M17 16c-4.5 0-7 2.6-7 7v8h3.5l1 13h5l1-13H24v-8c0-1.4-.2-2.6-.6-3.6" {...SOFT} />
      <path d="M17 16c-4.5 0-7 2.6-7 7v8h3.5l1 13h5l1-13H24v-8" {...LINE} strokeWidth={2.6} />
      <path d="M22.5 19.5 28 10" {...LINE} strokeWidth={3.2} />
    </g>
  ),
  turbo: () => (
    <g>
      <path d="M25 4c1.5 7.5 10.5 11.5 10.5 22.5a11.5 11.5 0 0 1-23 0c0-5.6 3-9.4 5.4-11.6.3 3.6 1.6 6 3.8 7.2C21 15.6 22.4 9.3 25 4z" {...SOFT} />
      <path d="M25 4c1.5 7.5 10.5 11.5 10.5 22.5a11.5 11.5 0 0 1-23 0c0-5.6 3-9.4 5.4-11.6.3 3.6 1.6 6 3.8 7.2C21 15.6 22.4 9.3 25 4z" {...LINE} strokeWidth={2.8} />
      <path d="M24 26.5c2.6 2.2 4.8 4.3 4.8 7.2a4.8 4.8 0 0 1-9.6 0c0-2.4 2.2-4.4 4.8-7.2z" {...S} />
    </g>
  ),
  school: () => (
    <g>
      <path d="M24 3 45 41H3z" {...SOFT} />
      <path d="M24 3 45 41H3z" {...LINE} strokeWidth={2.8} />
      <circle cx="19" cy="18.5" r="2.6" {...S} />
      <path d="M19 22.5v7l-3 6.5M19 29.5l3.4 6.5M18.6 24.5l-4 3.5M19.6 24.5l4.6 2.6" {...LINE} strokeWidth={2.4} />
      <circle cx="29" cy="23.5" r="2.1" {...S} />
      <path d="M29 26.6v5l-2.4 4.4M29 31.6l2.6 4.4M28.7 28l-2.8 2.3M29.3 28l3.4 1.7" {...LINE} strokeWidth={2.1} />
    </g>
  ),
}

function Gauge({ needle = 0 }) {
  const a = ((needle - 90) * Math.PI) / 180
  const x = 24 + Math.cos(a) * 13
  const y = 28 + Math.sin(a) * 13
  return (
    <g>
      <path d="M8 34a16 16 0 1 1 32 0" {...LINE} strokeWidth={3} />
      <path d="M8 34a16 16 0 0 1 4.7-11.3" {...LINE} strokeWidth={5} strokeOpacity="0.35" />
      <path d="M35.3 22.7A16 16 0 0 1 40 34" {...LINE} strokeWidth={5} stroke="#ff6b5a" />
      <path d={`M24 28 ${x.toFixed(1)} ${y.toFixed(1)}`} {...LINE} strokeWidth={3.4} />
      <circle cx="24" cy="28" r="3.6" {...S} />
      <path d="M17 40h14" {...LINE} strokeWidth={2.6} strokeOpacity="0.5" />
    </g>
  )
}

/* The arrow / traffic light / horn … that stands for a driving command. */
export default function ActionIcon({ action, size = 24, className = '' }) {
  const Draw = ICONS[action] || ICONS.straight
  return (
    <svg viewBox="0 0 48 48" width={size} height={size} className={className} aria-hidden="true">
      <Draw />
    </svg>
  )
}

const THEME_ICONS = {
  day: () => (
    <g>
      <circle cx="24" cy="24" r="9" {...S} />
      {Array.from({ length: 8 }, (_, i) => {
        const a = (i * Math.PI) / 4
        return <path key={i} d={`M${24 + Math.cos(a) * 14} ${24 + Math.sin(a) * 14}L${24 + Math.cos(a) * 19} ${24 + Math.sin(a) * 19}`} {...LINE} strokeWidth={3} />
      })}
    </g>
  ),
  sunset: () => (
    <g>
      <path d="M11 32a13 13 0 0 1 26 0z" {...S} />
      <path d="M4 32h40M9 38h30M15 44h18" {...LINE} strokeWidth={3} />
      <path d="M24 6v6M8.5 15.5l4 4M39.5 15.5l-4 4" {...LINE} strokeWidth={3} />
    </g>
  ),
  night: () => (
    <g>
      <path d="M30 6a17 17 0 1 0 12 26A15 15 0 0 1 30 6z" {...S} />
      <path d="M12 9l1.2 2.8L16 13l-2.8 1.2L12 17l-1.2-2.8L8 13l2.8-1.2z" {...S} fillOpacity="0.6" />
    </g>
  ),
  desert: () => (
    <g>
      <circle cx="36" cy="11" r="5" {...S} fillOpacity="0.55" />
      <path d="M20 44V12a4 4 0 0 1 8 0v32M20 30h-5a3 3 0 0 1-3-3v-7M28 25h5a3 3 0 0 0 3-3v-5" {...LINE} strokeWidth={3.4} />
      <path d="M6 44h36" {...LINE} strokeWidth={3} />
    </g>
  ),
  snow: () => (
    <g>
      {[0, 60, 120].map(d => (
        <g key={d} transform={`rotate(${d} 24 24)`}>
          <path d="M24 4v40M18 9l6 5 6-5M18 39l6-5 6 5" {...LINE} strokeWidth={3} />
        </g>
      ))}
    </g>
  ),
  rain: () => (
    <g>
      <path d="M14 30a9 9 0 0 1 1.4-17.9A12 12 0 0 1 38 15a7.5 7.5 0 0 1-1 15z" {...SOFT} />
      <path d="M14 30a9 9 0 0 1 1.4-17.9A12 12 0 0 1 38 15a7.5 7.5 0 0 1-1 15z" {...LINE} strokeWidth={2.8} />
      <path d="M16 36l-2 6M25 36l-2 6M34 36l-2 6" {...LINE} strokeWidth={3} />
    </g>
  ),
}

/* Sun, moon, cactus, snowflake… for the "new road" banner. */
export function ThemeIcon({ theme, size = 24, className = '' }) {
  const Draw = THEME_ICONS[theme] || THEME_ICONS.day
  return (
    <svg viewBox="0 0 48 48" width={size} height={size} className={className} aria-hidden="true">
      <Draw />
    </svg>
  )
}

/* A gold coin. */
export function CoinIcon({ size = 18, className = '' }) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} className={className} aria-hidden="true">
      <circle cx="12" cy="12" r="10" fill="#ffc53d" />
      <circle cx="12" cy="12" r="10" fill="none" stroke="#b7791f" strokeWidth="1.4" />
      <circle cx="12" cy="12" r="6.6" fill="none" stroke="#e8a317" strokeWidth="1.4" />
      <path d="M12 7.6v8.8" stroke="#a86a12" strokeWidth="2" strokeLinecap="round" />
      <path d="M8 8.5a5.5 5.5 0 0 1 3-2" stroke="#fff3c4" strokeWidth="1.4" strokeLinecap="round" fill="none" />
    </svg>
  )
}
