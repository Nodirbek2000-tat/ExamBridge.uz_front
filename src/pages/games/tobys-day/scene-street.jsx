/*
 * TOBY'S DAY — on the way to school: the street (Mr. Brown, the traffic light,
 * the zebra crossing, cars), the bus stop (the bus comes, Toby gets on, it
 * drives off) and inside the bus (the city passes by the window, then school).
 * Room props: { layer, w, uid, acting, action, reduced, speaker, sp }.
 */
import { AnimatePresence, motion as Motion } from 'framer-motion'
import Toby from './Toby'
import { ItemArt } from './items'
import { Driver, Grandma, Kid, Neighbor } from './characters'
import { BW, BX, BY, FONT, SKY } from './world-geo'
import { Birds, Clouds, Floor, Grad, Pop, Sparkles, Wall } from './scene-kit'

/* ── shared: a car (side view, facing right, wheels on y 0) ─────────── */
function Wheel({ cx, spin, reduced }) {
  return (
    <g transform={`translate(${cx} -4)`}>
      <circle r="8.5" fill="#1F2937" />
      <Motion.g animate={spin && !reduced ? { rotate: 360 } : { rotate: 0 }} transition={spin ? { duration: 0.45, repeat: Infinity, ease: 'linear' } : { duration: 0 }}>
        <circle r="4" fill="#CBD5E1" />
        <path d="M-4 0h8M0-4v8" stroke="#64748B" strokeWidth="1.5" />
      </Motion.g>
    </g>
  )
}

function Car({ color = '#EF4444', dark = '#B91C1C', spin, reduced }) {
  return (
    <g>
      <ellipse cx="4" cy="4" rx="42" ry="4" fill="#000" opacity="0.2" />
      <path d="M-34-8q0-10 10-10h10l10-12h22q8 0 12 10l6 2q8 2 8 10v8h-78z" fill={color} stroke={dark} strokeWidth="1.5" />
      <path d="M-11-19l8-9h9v9zM9-28h8q6 0 10 9h-18z" fill="#BAE6FD" />
      <path d="M-34-8h78" stroke={dark} strokeWidth="1.2" opacity="0.5" />
      <rect x="40" y="-14" width="5" height="4" rx="1.5" fill="#FEF08A" />
      <rect x="-36" y="-14" width="4" height="4" rx="1.5" fill="#F87171" />
      <rect x="2" y="-14" width="7" height="2" rx="1" fill={dark} />
      <Wheel cx={-18} spin={spin} reduced={reduced} />
      <Wheel cx={26} spin={spin} reduced={reduced} />
    </g>
  )
}

/* "whoosh" lines behind a moving car */
const SPEED = <path d="M-46-20h-16M-50-12h-22M-46-4h-14" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" opacity="0.6" />

/* ── street ──────────────────────────────────────────────────────────── */
function House({ x, y, w, h, wall, roof, door = '#7C2D12', peak = true }) {
  const cols = Math.max(2, Math.floor(w / 34))
  return (
    <g>
      {peak ? <path d={`M${x - 8} ${y + 4}L${x + w / 2} ${y - 40}L${x + w + 8} ${y + 4}z`} fill={roof} />
        : <rect x={x - 6} y={y - 8} width={w + 12} height="10" rx="3" fill={roof} />}
      <rect x={x} y={y} width={w} height={h} fill={wall} />
      {Array.from({ length: cols }, (_, i) => (
        <rect key={i} x={x + 10 + i * ((w - 20) / cols)} y={y + 12} width={(w - 20) / cols - 10} height="18" rx="2" fill="#BAE6FD" stroke="#fff" strokeWidth="2" />
      ))}
      <rect x={x + w / 2 - 10} y={y + h - 38} width="20" height="38" rx="2" fill={door} />
      <circle cx={x + w / 2 + 5} cy={y + h - 18} r="1.8" fill="#FDE047" />
    </g>
  )
}

function TrafficLight({ green, acting, action, reduced }) {
  const lamps = [['red', 104, '#EF4444', '#4C1D1D'], ['amber', 118, '#F59E0B', '#44310E'], ['green', 132, '#22C55E', '#12351F']]
  const lit = green ? 'green' : 'red'
  const pulse = acting && (action === 'redlight' || action === 'cross')
  return (
    <g>
      <rect x="243" y="92" width="6" height="200" fill="#475569" />
      <ellipse cx="246" cy="292" rx="12" ry="3" fill="#000" opacity="0.2" />
      <rect x="232" y="90" width="28" height="56" rx="7" fill="#1F2937" />
      <path d="M232 98h-6l6 10M260 98h6l-6 10" fill="#334155" />
      {lamps.map(([k, y, on, off]) => (
        <g key={k}>
          {k === lit && (
            <Motion.circle cx="246" cy={y} r="11" fill={on} opacity="0.35" style={{ originX: 0.5, originY: 0.5 }}
              animate={pulse && !reduced ? { scale: [1, 1.5, 1], opacity: [0.35, 0.6, 0.35] } : { scale: 1 }} transition={{ duration: 0.8, repeat: pulse ? Infinity : 0 }} />
          )}
          <circle cx="246" cy={y} r="5.8" fill={k === lit ? on : off} />
          {k === lit && <circle cx="244" cy={y - 2} r="1.8" fill="#fff" opacity="0.7" />}
        </g>
      ))}
      {/* the walking-man light under it */}
      <rect x="235" y="152" width="22" height="30" rx="4" fill="#1F2937" />
      {green ? (
        <Motion.g animate={pulse && !reduced ? { opacity: [1, 0.35, 1] } : { opacity: 1 }} transition={{ duration: 0.7, repeat: pulse ? Infinity : 0 }}>
          <circle cx="247" cy="158.5" r="2.6" fill="#4ADE80" />
          <path d="M246.5 162l-1.5 8M245 170l-3 6M245 170l4 6M246 164l-4 3M246 164l4 2" stroke="#4ADE80" strokeWidth="2.2" strokeLinecap="round" />
        </Motion.g>
      ) : (
        <g>
          <circle cx="246" cy="158.5" r="2.6" fill="#F87171" />
          <path d="M246 162v8M243 170v6M249 170v6M242 164v6M250 164v6" stroke="#F87171" strokeWidth="2.4" strokeLinecap="round" />
        </g>
      )}
    </g>
  )
}

export function Street({ layer, w, uid, acting, action, reduced, speaker }) {
  const green = !!w.crossed || action === 'cross'
  if (layer === 'front') {
    return (
      <g>
        <rect x="-80" y="276" width="104" height="24" rx="5" fill="#B45309" />
        {[-68, -50, -32, -14, 4].map((x, i) => (
          <g key={x}><circle cx={x} cy="272" r="5" fill={['#F472B6', '#FDE047', '#fff', '#F472B6', '#FB923C'][i]} /><circle cx={x} cy="272" r="2" fill="#F59E0B" /></g>
        ))}
        <rect x="342" y="262" width="26" height="34" rx="4" fill="#22C55E" />
        <rect x="338" y="258" width="34" height="7" rx="3" fill="#16A34A" />
        {acting && action === 'redlight' && <Pop x={322} y={100} text="STOP!" size={16} fill="#fff" stroke="#DC2626" reduced={reduced} delay={0.4} />}
        {acting && action === 'cross' && <Pop x={306} y={100} text="beep beep!" size={13} fill="#BBF7D0" stroke="#15803D" reduced={reduced} delay={0.3} repeat />}
        {acting && action === 'hello' && <Sparkles x={34} y={206} r={30} delay={0.6} reduced={reduced} />}
      </g>
    )
  }
  return (
    <g>
      <defs><Grad id={`${uid}sky`} stops={SKY.day} /></defs>
      <Wall fill={`url(#${uid}sky)`} to={200} />
      <circle cx="40" cy="36" r="16" fill="#FDE047" />
      <circle cx="40" cy="36" r="24" fill="#FEF08A" opacity="0.4" />
      <Clouds reduced={reduced} y={30} />
      <Birds reduced={reduced} y={40} />
      {/* far city */}
      <path d={`M${BX} 172V120h40v-20h30v30h40v-40h36v24h40v-14h50v36h30v-30h44v20h40v-26h36v40h34v-16h40v32h46v-24h38v18h44v-34h40v28h36v-18h40v24h38v-30h40v44h44v-20h40h94V172z`}
        fill="#BFDBFE" opacity="0.8" />
      {/* houses */}
      <House x={-250} y={98} w={110} h={74} wall="#FBCFE8" roof="#DB2777" />
      <House x={-124} y={86} w={100} h={86} wall="#BBF7D0" roof="#16A34A" peak={false} />
      <House x={-6} y={96} w={100} h={76} wall="#FCA5A5" roof="#B91C1C" />
      <House x={106} y={84} w={116} h={88} wall="#FDE68A" roof="#EA580C" peak={false} />
      {/* the bakery */}
      <g>
        <rect x="226" y="66" width="132" height="10" rx="3" fill="#7C3AED" />
        <rect x="232" y="74" width="120" height="98" fill="#C4B5FD" />
        <rect x="246" y="82" width="92" height="20" rx="4" fill="#fff" />
        <text x="292" y="97" textAnchor="middle" fontSize="12" fontWeight="900" fill="#7C3AED" fontFamily={FONT}>BAKERY</text>
        <path d="M238 108h108l-4 12H242z" fill="#F472B6" />
        <path d="M250 108l-2 12M266 108v12M282 108v12M298 108v12M314 108v12M330 108l2 12" stroke="#fff" strokeWidth="5" />
        <rect x="244" y="126" width="56" height="40" rx="3" fill="#E0F2FE" stroke="#fff" strokeWidth="3" />
        <ItemArt name="bread" transform="translate(260 152) scale(.75)" />
        <ItemArt name="cookies" transform="translate(284 154) scale(.6)" />
        <rect x="308" y="128" width="28" height="44" rx="2" fill="#7C2D12" />
      </g>
      <House x={372} y={92} w={104} h={80} wall="#BAE6FD" roof="#0369A1" />
      <House x={490} y={82} w={120} h={90} wall="#FED7AA" roof="#C2410C" peak={false} />
      {/* top pavement, a tree and a lamp post */}
      <rect x={BX} y="172" width={BW} height="24" fill="#E2E8F0" />
      <rect x={BX} y="193" width={BW} height="4" fill="#94A3B8" />
      <rect x="98" y="138" width="6" height="40" rx="2" fill="#92400E" />
      <circle cx="101" cy="132" r="16" fill="#22C55E" />
      <circle cx="92" cy="140" r="9" fill="#16A34A" />
      <rect x="160" y="112" width="4" height="66" fill="#475569" />
      <path d="M162 114q8-8 16-2" stroke="#475569" strokeWidth="3" fill="none" />
      <ellipse cx="178" cy="114" rx="6" ry="3" fill="#FDE68A" />
      {/* road, zebra crossing, stop lines */}
      <rect x={BX} y="197" width={BW} height="65" fill="#475569" />
      <path d={`M${BX} 229H170M270 229H${BX + BW}`} stroke="#F8FAFC" strokeWidth="3" strokeDasharray="18 16" />
      {[200, 210, 220, 230, 240, 250].map(y => {
        const k = (262 - y) * 0.16
        return <rect key={y} x={180 + k} y={y} width={82 - 2 * k} height="6.5" rx="1" fill="#F8FAFC" />
      })}
      <path d="M172 232v28M270 199v28" stroke="#F8FAFC" strokeWidth="3" />
      {/* cars: drive past on red, wait at the lines on green */}
      <AnimatePresence>
        {green ? (
          <Motion.g key="stop" initial={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <Motion.g initial={reduced ? { x: 122 } : { x: -160 }} animate={{ x: 122 }} transition={{ duration: 1.6, ease: 'easeOut' }}>
              <g transform="translate(0 258)"><Car color="#EF4444" dark="#B91C1C" reduced={reduced} /></g>
            </Motion.g>
            <Motion.g initial={reduced ? { x: 316 } : { x: 560 }} animate={{ x: 316 }} transition={{ duration: 1.9, ease: 'easeOut' }}>
              <g transform="translate(0 226) scale(-.82 .82)"><Car color="#3B82F6" dark="#1D4ED8" reduced={reduced} /></g>
            </Motion.g>
          </Motion.g>
        ) : (
          <Motion.g key="go" initial={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.3 }}>
            <Motion.g initial={{ x: -160 }} animate={reduced ? { x: 40 } : { x: 560 }}
              transition={reduced ? { duration: 0 } : { duration: 4.4, repeat: Infinity, ease: 'linear', repeatDelay: 0.6 }}>
              <g transform="translate(0 258)">{SPEED}<Car color="#EF4444" dark="#B91C1C" spin reduced={reduced} /></g>
            </Motion.g>
            <Motion.g initial={{ x: 560 }} animate={reduced ? { x: 320 } : { x: -160 }}
              transition={reduced ? { duration: 0 } : { duration: 5.2, repeat: Infinity, ease: 'linear', delay: 1.4 }}>
              <g transform="translate(0 226) scale(-.82 .82)">{SPEED}<Car color="#3B82F6" dark="#1D4ED8" spin reduced={reduced} /></g>
            </Motion.g>
          </Motion.g>
        )}
      </AnimatePresence>
      {/* our pavement */}
      <rect x={BX} y="262" width={BW} height="5" fill="#94A3B8" />
      <Floor fill="#CBD5E1" y={267} />
      {Array.from({ length: 24 }, (_, i) => <path key={i} d={`M${BX + i * 40} 267v33`} stroke="#B6C2D1" strokeWidth="2" />)}
      {/* Mr. Brown waters his flowers */}
      <g transform="translate(34 290) scale(.8)">
        <Neighbor talking={speaker === 'other'} wave={acting && action === 'hello'} reduced={reduced} />
      </g>
      <g transform="translate(54 22)"><TrafficLight green={green} acting={acting} action={action} reduced={reduced} /></g>
    </g>
  )
}

/* ── bus stop + the bus ──────────────────────────────────────────────── */
const BUILDINGS = [[-300, 90, 150, '#93C5FD'], [-206, 74, 118, '#A5B4FC'], [-128, 84, 168, '#C4B5FD'], [-40, 72, 132, '#FBCFE8'],
  [36, 92, 162, '#BFDBFE'], [132, 74, 120, '#FDE68A'], [210, 100, 176, '#A7F3D0'], [314, 72, 140, '#FBCFE8'], [390, 92, 160, '#C7D2FE'],
  [486, 80, 128, '#FDE68A'], [570, 90, 170, '#BFDBFE']]

function Bus({ uid, open, doorDelay = 0, toby, acc = null, driverTalks, reduced, rolling }) {
  return (
    <g>
      <defs>
        <clipPath id={`${uid}ws`}><rect x="296" y="138" width="24" height="46" rx="4" /></clipPath>
        <clipPath id={`${uid}tw`}><rect x="154" y="140" width="34" height="34" rx="5" /></clipPath>
      </defs>
      <ellipse cx="194" cy="246" rx="140" ry="6" fill="#000" opacity="0.22" />
      <path d="M64 236V140q0-14 14-14h226q14 0 18 14l4 22v74z" fill="#FACC15" stroke="#CA8A04" strokeWidth="2" />
      <rect x="64" y="194" width="262" height="10" fill="#F97316" />
      <rect x="282" y="128" width="38" height="10" rx="2" fill="#111827" />
      <text x="301" y="136" textAnchor="middle" fontSize="6.5" fontWeight="900" fill="#FBBF24" fontFamily={FONT}>7 SCHOOL</text>
      {/* side windows with a few passengers */}
      {[[74, '#86EFAC'], [114, '#FDE68A'], [154, null], [190, '#93C5FD'], [226, '#F9A8D4']].map(([x, c]) => (
        <g key={x}>
          <rect x={x} y="140" width="34" height="34" rx="5" fill="#BAE6FD" />
          {c && (
            <g>
              <circle cx={x + 10} cy="158" r="5" fill={c} /><circle cx={x + 24} cy="158" r="5" fill={c} />
              <ellipse cx={x + 17} cy="168" rx="11" ry="10" fill={c} />
              <circle cx={x + 13} cy="166" r="1.4" fill="#1F2937" /><circle cx={x + 21} cy="166" r="1.4" fill="#1F2937" />
            </g>
          )}
          <path d={`M${x + 4} ${144}l8-0`} stroke="#fff" strokeWidth="2" opacity="0.6" strokeLinecap="round" />
        </g>
      ))}
      {toby && (
        <Motion.g clipPath={`url(#${uid}tw)`} initial={reduced ? false : { opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 1.7, duration: 0.4 }}>
          <g transform="translate(171 196) scale(.27) translate(-100 -236)"><Toby mood="happy" pose="wave" acc={acc} pokes={false} reduced /></g>
        </Motion.g>
      )}
      {/* windscreen + the driver */}
      <rect x="296" y="138" width="24" height="46" rx="4" fill="#BAE6FD" />
      <g clipPath={`url(#${uid}ws)`}>
        <g transform="translate(312 196) scale(.5)"><Driver talking={driverTalks} reduced={reduced} /></g>
      </g>
      <path d="M300 144l8 10" stroke="#fff" strokeWidth="2.5" opacity="0.6" strokeLinecap="round" />
      {/* the front door */}
      <rect x="264" y="146" width="30" height="88" rx="3" fill="#CA8A04" />
      {[0, 1].map(i => (
        <Motion.rect key={i} x={265 + i * 14.5} y="148" width="13.5" height="84" rx="2" fill="#BAE6FD" stroke="#EAB308" strokeWidth="1.5"
          style={{ transformBox: 'view-box', originX: i ? '293px' : '265px', originY: '0px' }} initial={false}
          animate={{ scaleX: open ? 0.25 : 1 }} transition={{ duration: reduced ? 0 : 0.5, delay: reduced ? 0 : doorDelay }} />
      ))}
      <rect x="320" y="206" width="8" height="6" rx="2" fill="#FEF08A" />
      <rect x="62" y="206" width="6" height="8" rx="2" fill="#EF4444" />
      <rect x="60" y="226" width="270" height="8" rx="4" fill="#475569" />
      {[110, 272].map(cx => (
        <g key={cx} transform={`translate(${cx} 234)`}>
          <circle r="16" fill="#1F2937" />
          <Motion.g animate={rolling && !reduced ? { rotate: 360 } : { rotate: 0 }} transition={rolling ? { duration: 0.6, repeat: Infinity, ease: 'linear' } : { duration: 0 }}>
            <circle r="7" fill="#CBD5E1" />
            <path d="M-7 0h14M0-7v14" stroke="#64748B" strokeWidth="2" />
          </Motion.g>
        </g>
      ))}
    </g>
  )
}

export function BusStop({ layer, w, uid, acting, action, reduced, speaker, acc = null }) {
  const here = !!w.bus
  const leaving = !!w.onBus && acting
  if (layer === 'front') {
    return (
      <g>
        {acting && action === 'buscome' && <Pop x={336} y={118} text="beep beep!" size={13} fill="#FDE047" stroke="#B45309" reduced={reduced} delay={1.2} />}
        {acting && action === 'ticket' && (
          <Motion.g initial={{ opacity: 0, scale: 0 }} animate={{ opacity: [0, 1, 1, 0], scale: 1 }} style={{ transformBox: 'view-box', originX: '280px', originY: '118px' }}
            transition={{ duration: 1.6, delay: 1, times: [0, 0.2, 0.8, 1] }}>
            <circle cx="280" cy="118" r="11" fill="#22C55E" />
            <path d="M274 118l4 4 8-8" stroke="#fff" strokeWidth="3" fill="none" strokeLinecap="round" strokeLinejoin="round" />
          </Motion.g>
        )}
        {leaving && <Pop x={180} y={110} text="Bye-bye!" size={15} fill="#fff" stroke="#2563EB" reduced={reduced} delay={4.2} />}
      </g>
    )
  }
  return (
    <g>
      <defs>
        <Grad id={`${uid}sky`} stops={SKY.day} />
        <pattern id={`${uid}win`} width="16" height="18" patternUnits="userSpaceOnUse">
          <rect x="4" y="4" width="8" height="9" rx="1.5" fill="#fff" opacity="0.55" />
        </pattern>
      </defs>
      <Wall fill={`url(#${uid}sky)`} to={200} />
      <Clouds reduced={reduced} y={26} />
      {BUILDINGS.map(([x, bw, h, c]) => (
        <g key={x}>
          <rect x={x} y={196 - h} width={bw} height={h} fill={c} />
          <rect x={x + 6} y={204 - h} width={bw - 12} height={h - 14} fill={`url(#${uid}win)`} />
          <rect x={x - 3} y={190 - h} width={bw + 6} height="8" rx="2" fill="#fff" opacity="0.5" />
        </g>
      ))}
      <rect x={BX} y="196" width={BW} height="50" fill="#475569" />
      <path d={`M${BX} 221H${BX + BW}`} stroke="#F8FAFC" strokeWidth="3" strokeDasharray="18 16" />
      {/* the bus: comes from the left, stops, opens; leaves with Toby on board */}
      {here && (
        <Motion.g initial={reduced ? false : { x: -460 }} animate={{ x: leaving && !reduced ? 560 : 0 }}
          transition={leaving ? { duration: 2.4, delay: 3.9, ease: 'easeIn' } : { duration: 2, ease: 'easeOut' }}>
          <Bus uid={uid} open={!leaving} doorDelay={leaving ? 3.2 : 2} toby={!!w.onBus} acc={acc} driverTalks={speaker === 'other'} reduced={reduced}
            rolling={acting && (action === 'buscome' || leaving)} />
        </Motion.g>
      )}
      <rect x={BX} y="246" width={BW} height="5" fill="#94A3B8" />
      <Floor fill="#E2E8F0" y={251} />
      {Array.from({ length: 24 }, (_, i) => <path key={i} d={`M${BX + i * 40} 251v49`} stroke="#CBD5E1" strokeWidth="2" />)}
      {/* the shelter */}
      <rect x="4" y="142" width="116" height="10" rx="3" fill="#0284C7" />
      <rect x="10" y="152" width="98" height="104" fill="#BAE6FD" opacity="0.55" />
      <rect x="8" y="150" width="5" height="140" fill="#64748B" />
      <rect x="106" y="150" width="5" height="140" fill="#64748B" />
      <g>
        <rect x="18" y="162" width="36" height="50" rx="3" fill="#FBCFE8" stroke="#fff" strokeWidth="2" />
        <ItemArt name="icecream" transform="translate(36 190) scale(1.1)" />
        <rect x="64" y="166" width="34" height="42" rx="3" fill="#fff" />
        <text x="81" y="180" textAnchor="middle" fontSize="11" fontWeight="900" fill="#16A34A" fontFamily={FONT}>7</text>
        <path d="M70 186h22M70 192h22M70 198h16" stroke="#94A3B8" strokeWidth="2" />
      </g>
      <rect x="16" y="246" width="88" height="8" rx="3" fill="#B45309" />
      <rect x="24" y="254" width="5" height="20" fill="#78350F" />
      <rect x="92" y="254" width="5" height="20" fill="#78350F" />
      {/* bus stop sign */}
      <rect x="248" y="146" width="5" height="146" fill="#64748B" />
      <ellipse cx="250" cy="292" rx="10" ry="3" fill="#000" opacity="0.2" />
      <circle cx="250" cy="136" r="17" fill="#fff" stroke="#16A34A" strokeWidth="4" />
      <text x="250" y="141" textAnchor="middle" fontSize="12" fontWeight="900" fill="#16A34A" fontFamily={FONT}>BUS</text>
      <rect x="240" y="156" width="21" height="13" rx="2" fill="#16A34A" />
      <text x="250.5" y="166" textAnchor="middle" fontSize="10" fontWeight="900" fill="#fff" fontFamily={FONT}>7</text>
      {/* right (wide): a newspaper kiosk */}
      <g>
        <rect x="420" y="170" width="90" height="80" rx="4" fill="#F43F5E" />
        <path d="M410 170h110l-8-18h-94z" fill="#FDE047" />
        <rect x="432" y="186" width="66" height="36" rx="3" fill="#FFE4E6" />
        <ItemArt name="newspaper" transform="translate(452 204) scale(.9)" />
        <ItemArt name="chocolate" transform="translate(482 206) scale(.7)" />
      </g>
    </g>
  )
}

/* ── inside the bus ──────────────────────────────────────────────────── */
// one 480-wide strip of city, drawn twice for a seamless loop
function CityStrip({ dx }) {
  return (
    <g transform={`translate(${dx} 0)`}>
      {[[0, 60, '#FBCFE8'], [70, 46, '#BFDBFE'], [126, 70, '#FDE68A'], [206, 50, '#C4B5FD'], [268, 64, '#A7F3D0'], [344, 52, '#FED7AA'], [408, 66, '#BAE6FD']].map(([x, h, c]) => (
        <g key={x}>
          <rect x={x} y={150 - h} width="58" height={h} fill={c} />
          {[0, 1].map(r => [0, 1, 2].map(k => <rect key={`${r}${k}`} x={x + 8 + k * 16} y={150 - h + 8 + r * 16} width="9" height="9" rx="1.5" fill="#fff" opacity="0.6" />))}
        </g>
      ))}
      {[40, 190, 330].map(x => (
        <g key={x}>
          <rect x={x - 2} y="118" width="4" height="34" fill="#92400E" />
          <circle cx={x} cy="112" r="14" fill="#22C55E" />
        </g>
      ))}
      {[110, 260, 400].map(x => <rect key={x} x={x} y="96" width="3" height="56" fill="#64748B" />)}
    </g>
  )
}

export function BusInside({ layer, w, uid, acting, action, reduced, speaker }) {
  const arrived = !!w.arrived
  if (layer === 'front') {
    return (
      <g>
        {acting && action === 'getoff' && <Pop x={300} y={96} text="ding!" size={16} fill="#FDE047" stroke="#B45309" reduced={reduced} delay={0.2} />}
        {acting && action === 'window' && <Sparkles x={150} y={100} r={54} n={8} delay={0.9} reduced={reduced} />}
      </g>
    )
  }
  const scrolling = !arrived && !reduced
  return (
    <g>
      <defs>
        <Grad id={`${uid}out`} stops={['#7DD3FC', '#E0F2FE']} />
        <clipPath id={`${uid}glass`}><rect x={BX} y="48" width={BW} height="104" /></clipPath>
        <clipPath id={`${uid}mirror`}><rect x="306" y="56" width="50" height="26" rx="13" /></clipPath>
      </defs>
      <Wall fill="#DBEAFE" />
      <rect x={BX} y={BY} width={BW} height={22 - BY} fill="#93C5FD" />
      {/* the view: the city rolls by, then school stops in the window */}
      <g clipPath={`url(#${uid}glass)`}>
        <rect x={BX} y="48" width={BW} height="104" fill={`url(#${uid}out)`} />
        <Clouds reduced={reduced} y={64} opacity={0.9} />
        <AnimatePresence>
          {arrived ? (
            <Motion.g key="school" initial={reduced ? false : { x: 280 }} animate={{ x: 0 }} transition={{ duration: 1.6, ease: 'easeOut' }}>
              <rect x={BX} y="138" width={BW} height="14" fill="#4ADE80" />
              <rect x="60" y="76" width="168" height="76" fill="#FDBA74" />
              <path d="M52 80 144 46 236 80z" fill="#DC2626" />
              <circle cx="144" cy="68" r="9" fill="#fff" stroke="#B91C1C" strokeWidth="2" />
              <rect x="92" y="90" width="104" height="14" rx="3" fill="#fff" />
              <text x="144" y="101" textAnchor="middle" fontSize="10" fontWeight="900" fill="#B91C1C" fontFamily={FONT}>SCHOOL</text>
              {[72, 104, 170, 202].map(x => <rect key={x} x={x} y="112" width="18" height="14" rx="2" fill="#BAE6FD" />)}
              <rect x="130" y="114" width="28" height="38" rx="3" fill="#92400E" />
              <path d="M144 46V28" stroke="#475569" strokeWidth="2" />
              <path d="M144 28h16l-4 4 4 4h-16z" fill="#22C55E" />
              <g transform="translate(34 150) scale(.45)"><Kid v={1} wave reduced={reduced} /></g>
              <g transform="translate(-40 150) scale(.45)"><Kid v={3} cheer reduced={reduced} /></g>
            </Motion.g>
          ) : (
            <Motion.g key="city" exit={{ opacity: 0 }}>
              <Motion.g animate={scrolling ? { x: [0, -480] } : { x: 0 }} transition={{ duration: 5, repeat: Infinity, ease: 'linear' }}>
                {[-480, 0, 480, 960].map(dx => <CityStrip key={dx} dx={dx - 300} />)}
              </Motion.g>
            </Motion.g>
          )}
        </AnimatePresence>
      </g>
      {/* window frames */}
      <rect x={BX} y="44" width={BW} height="6" fill="#fff" />
      <rect x={BX} y="150" width={BW} height="8" fill="#fff" />
      {Array.from({ length: 9 }, (_, i) => <rect key={i} x={-270 + i * 120} y="44" width="10" height="114" rx="2" fill="#fff" />)}
      {/* rail + straps that sway with the bus */}
      <rect x={BX} y="26" width={BW} height="5" rx="2.5" fill="#FACC15" />
      <Motion.g style={{ transformBox: 'view-box', originX: '0px', originY: '28px' }}
        animate={reduced ? undefined : arrived ? { skewX: 0 } : { skewX: [-7, 7, -7] }} transition={{ duration: 2.4, repeat: arrived ? 0 : Infinity, ease: 'easeInOut' }}>
        {Array.from({ length: 16 }, (_, i) => (
          <g key={i}>
            <path d={`M${-240 + i * 56} 30v14`} stroke="#94A3B8" strokeWidth="2.5" />
            <circle cx={-240 + i * 56} cy="50" r="6" fill="none" stroke="#F97316" strokeWidth="3" />
          </g>
        ))}
      </Motion.g>
      {/* seats under the windows (the door takes the place of one) */}
      {[0, 1, 2, 3, 5, 6, 7].map(i => {
        const x = -270 + i * 120
        return (
          <g key={i}>
            <rect x={x + 14} y="160" width="92" height="52" rx="12" fill="#3B82F6" />
            <rect x={x + 22} y="168" width="76" height="8" rx="4" fill="#60A5FA" />
            <rect x={x + 8} y="206" width="104" height="18" rx="8" fill="#1D4ED8" />
            <rect x={x + 56} y="224" width="8" height="12" fill="#64748B" />
          </g>
        )
      })}
      {/* poles */}
      {[-150, 36, 222, 470].map(x => <rect key={x} x={x} y="22" width="6" height="214" rx="3" fill="#FACC15" />)}
      <Floor fill="#64748B" />
      <rect x={BX} y="236" width={BW} height="4" fill="#94A3B8" />
      <path d={`M${BX} 280H${BX + BW}`} stroke="#FACC15" strokeWidth="3" strokeDasharray="14 10" />
      {/* the folding door; STOP lights up when we arrive */}
      <rect x="232" y="40" width="92" height="196" rx="4" fill="#CBD5E1" />
      {arrived && <rect x="238" y="46" width="80" height="190" fill="#86EFAC" />}
      {[0, 1].map(k => (
        <Motion.g key={k} style={{ transformBox: 'view-box', originX: k ? '318px' : '238px', originY: '0px' }} initial={false}
          animate={{ scaleX: arrived ? 0.22 : 1 }} transition={{ duration: reduced ? 0 : 0.6, delay: arrived && !reduced ? 1.4 : 0 }}>
          <rect x={238 + k * 40} y="46" width="40" height="190" rx="3" fill="#BAE6FD" stroke="#94A3B8" strokeWidth="3" />
          <path d={`M${244 + k * 40} 60l12 18`} stroke="#fff" strokeWidth="3" opacity="0.6" strokeLinecap="round" />
        </Motion.g>
      ))}
      <rect x="252" y="4" width="52" height="18" rx="4" fill={arrived ? '#DC2626' : '#7F1D1D'} />
      <text x="278" y="17" textAnchor="middle" fontSize="11" fontWeight="900" fill={arrived ? '#fff' : '#FCA5A5'} fontFamily={FONT}>STOP</text>
      {/* the driver: his mirror (phones) and the driver himself (wide screens) */}
      <path d="M331 22v34" stroke="#334155" strokeWidth="3" />
      <rect x="304" y="54" width="54" height="30" rx="15" fill="#334155" />
      <rect x="306" y="56" width="50" height="26" rx="13" fill="#E0F2FE" />
      <g clipPath={`url(#${uid}mirror)`}>
        <g transform="translate(331 100) scale(.62)"><Driver talking={speaker === 'other'} reduced={reduced} /></g>
      </g>
      <g transform="translate(470 236)">
        <rect x="-30" y="-60" width="60" height="60" rx="10" fill="#1D4ED8" />
        <Driver talking={speaker === 'other'} wave={acting && action === 'getoff'} reduced={reduced} />
        <circle cx="-34" cy="-46" r="16" fill="none" stroke="#334155" strokeWidth="5" />
      </g>
      {/* a grandma reading the paper */}
      <g transform="translate(30 222)"><Grandma reduced={reduced} /></g>
    </g>
  )
}
