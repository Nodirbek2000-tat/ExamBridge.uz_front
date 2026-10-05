/*
 * TOBY'S DAY — action props & effects for the home / shop / park steps that
 * are drawn around Toby rather than by the room itself: sun rays when he
 * stretches, toothpaste foam, splashes, breakfast on the plate, coins, the
 * fetch ball, the football goal, the ice-cream cart, the dinner table, the TV,
 * letters from the book, and so on. The newer rooms (hall, street, bus,
 * classroom, cooking) draw their own effects.
 * Props: { layer: 'back' | 'front', step, w, sp, acting, reduced }.
 */
import { motion as Motion } from 'framer-motion'
import { ItemArt } from './items'
import { Buddy, Mum } from './characters'
import { DOG_S, LEFT_PAW, at } from './world-geo'
import { Pop, Puff, Sparkles, Steam } from './scene-kit'

export default function ActionFx({ layer, step, w, sp, acting, reduced, talker = null }) {
  const a = step.action
  if (layer === 'back') {
    if (a === 'stretch' && acting && !reduced) {
      const [x, y] = at(sp, 100, 98)
      const R = 130
      return (
        <Motion.g style={{ transformBox: 'view-box', originX: `${x}px`, originY: `${y}px` }} initial={{ opacity: 0, scale: 0.4, rotate: 0 }}
          animate={{ opacity: 0.65, scale: 1, rotate: 25 }} transition={{ duration: 2.4, ease: 'easeOut' }}>
          {Array.from({ length: 10 }, (_, i) => {
            const a1 = (i / 10) * Math.PI * 2
            const a2 = a1 + 0.24
            return (
              <path key={i} d={`M${x} ${y}L${x + Math.cos(a1) * R} ${y + Math.sin(a1) * R}L${x + Math.cos(a2) * R} ${y + Math.sin(a2) * R}z`}
                fill="#FEF08A" opacity="0.45" />
            )
          })}
        </Motion.g>
      )
    }
    if (a === 'curtains' && acting) {
      return (
        <g>
          <Motion.path d="M40 132 126 132 250 300 0 300z" fill="#FEF08A" initial={{ opacity: 0 }} animate={{ opacity: 0.35 }} transition={{ duration: 1.2, delay: 0.6 }} />
          {!reduced && (
            <Motion.path d="M0 0q5-6 10 0q5-6 10 0" stroke="#1E293B" strokeWidth="2.5" fill="none" strokeLinecap="round"
              initial={{ x: 30, y: 70 }} animate={{ x: [30, 130], y: [70, 56, 66] }} transition={{ duration: 2.2, delay: 0.8 }} />
          )}
        </g>
      )
    }
    if (a === 'kick') {
      return (
        <g>
          <path d="M286 262V214h66v48" stroke="#fff" strokeWidth="5" fill="none" strokeLinejoin="round" />
          <path d="M292 220h54M292 232h54M292 244h54M292 256h54M302 216v46M318 216v46M334 216v46" stroke="#fff" strokeWidth="1.2" opacity="0.6" />
          <g transform="translate(266 294) scale(.52)"><Buddy color="#86EFAC" belly="#DCFCE7" dark="#16A34A" acc="cap" cheer={acting} reduced={reduced} /></g>
          <g transform="translate(352 300) scale(.5)"><Buddy color="#93C5FD" belly="#DBEAFE" dark="#2563EB" cheer={acting} reduced={reduced} /></g>
        </g>
      )
    }
    if (a === 'icecream') {
      return (
        <g>
          <rect x="300" y="168" width="4" height="50" fill="#94A3B8" />
          <path d="M256 172q46-40 94 0z" fill="#F472B6" />
          <path d="M280 172q10-30 22-34M326 172q-10-30-24-34" stroke="#fff" strokeWidth="6" fill="none" opacity="0.8" />
          <rect x="266" y="214" width="76" height="42" rx="8" fill="#fff" stroke="#F9A8D4" strokeWidth="3" />
          <text x="304" y="240" textAnchor="middle" fontSize="10" fontWeight="900" fill="#DB2777" fontFamily="system-ui, sans-serif">ICE CREAM</text>
          <circle cx="278" cy="262" r="7" fill="#475569" />
          <circle cx="330" cy="262" r="7" fill="#475569" />
          <ItemArt name="icecream" transform="translate(304 206) scale(.8)" />
        </g>
      )
    }
    if (a === 'dinner') {
      return (
        <g>
          <g transform="translate(98 250) scale(.62)"><Mum eat={acting && talker !== 'mum'} talking={talker === 'mum'} reduced={reduced} /></g>
          <g transform="translate(264 252) scale(.66)"><Buddy color="#93C5FD" belly="#DBEAFE" dark="#2563EB" acc={['glasses', 'mustache']} eat={acting} reduced={reduced} /></g>
        </g>
      )
    }
    return null
  }

  if (layer === 'front') {
    switch (a) {
      case 'getup': {
        if (!acting || reduced) return null
        const [x, y] = at(sp, 100, 236)
        return [-1, 1].map(d => (
          <Motion.circle key={d} cx={x} cy={y - 4} r="9" fill="#fff" style={{ originX: 0.5, originY: 0.5 }} initial={{ x: 0, scale: 0, opacity: 0.8 }}
            animate={{ x: d * 40, scale: [0, 1, 0], opacity: [0.8, 0.6, 0] }} transition={{ duration: 0.7, delay: 0.55 }} />
        ))
      }
      case 'brush':
      case 'pajamas': {
        if (!acting) return null
        const [x, y] = at(sp, 100, 140)
        return (
          <g>
            {a === 'pajamas' && <Puff x={at(sp, 100, 170)[0]} y={at(sp, 100, 170)[1]} reduced={reduced} />}
            {[[-14, 2, 5], [12, 4, 6], [-4, 12, 4], [18, -6, 4], [-20, -8, 3.5]].map(([dx, dy, r], i) => (
              <Motion.circle key={i} cx={x + dx} cy={y + dy} r={r} fill="#fff" stroke="#BAE6FD" strokeWidth="1"
                initial={{ scale: 0 }} animate={reduced ? { scale: 1 } : { scale: [0, 1, 0.7, 1], y: [0, -6, 0] }} style={{ originX: 0.5, originY: 0.5 }}
                transition={{ duration: 0.9, repeat: Infinity, delay: 0.4 + i * 0.15 }} />
            ))}
          </g>
        )
      }
      case 'wash': {
        if (!acting || reduced) return null
        const [x, y] = at(sp, 100, 118)
        return Array.from({ length: 8 }, (_, i) => {
          const ang = -Math.PI + (i / 7) * Math.PI
          return (
            <Motion.path key={i} d="M0-5q4 5 0 8-4-3 0-8z" fill="#38BDF8"
              initial={{ x, y, opacity: 0 }} animate={{ x: [x, x + Math.cos(ang) * 60], y: [y, y + Math.sin(ang) * 46 + 20], opacity: [0, 1, 0] }}
              transition={{ duration: 0.9, repeat: Infinity, delay: i * 0.1 }} />
          )
        })
      }
      case 'comb': {
        if (!acting) return null
        const [x, y] = at(sp, 104, 26)
        return <Sparkles x={x} y={y} delay={0.6} r={30} reduced={reduced} />
      }
      case 'dress':
      case 'basket':
      case 'pick': {
        if (!acting) return null
        if (a === 'dress') { const [x, y] = at(sp, 100, 160); return <Puff x={x} y={y} reduced={reduced} /> }
        const [x, y] = at(sp, LEFT_PAW[0], LEFT_PAW[1] + 18)
        return <Sparkles x={x} y={y} delay={a === 'pick' ? 0.55 : 0.1} r={26} reduced={reduced} />
      }
      case 'yum': {
        if (!acting) return null
        const [x, y] = at(sp, 100, 40)
        return <Pop x={x} y={y - 6} text="Yummy!" size={17} fill="#FBCFE8" stroke="#BE185D" delay={0.5} reduced={reduced} />
      }
      case 'eat': {
        if (!w.ate || acting) {
          return (
            <g>
              {!w.ate && <ellipse cx="148" cy="228" rx="24" ry="6" fill="#fff" stroke="#E2E8F0" strokeWidth="2" />}
              <Motion.g style={{ originX: 0.5, originY: 1 }} initial={false} animate={{ scale: acting ? 0 : 1 }}
                transition={{ duration: reduced ? 0 : 2, delay: acting ? 0.5 : 0, ease: 'easeIn' }}>
                <path d="M128 226q-4-8 6-9 6-6 12 0 8 1 4 9z" fill="#fff" />
                <circle cx="139" cy="221" r="4" fill="#FBBF24" />
                <path d="M146 226q-2-9 8-9 8 1 6 9z" fill="#fff" />
                <circle cx="153" cy="221" r="3.6" fill="#FBBF24" />
                <rect x="158" y="214" width="14" height="13" rx="3" fill="#E7A65A" stroke="#B9732C" strokeWidth="1.5" />
              </Motion.g>
            </g>
          )
        }
        return null
      }
      case 'drink':
        return !w.juice ? <ItemArt name="glass" transform="translate(212 212) scale(1.35)" /> : null
      case 'dishes': {
        if (!acting || reduced) return null
        return Array.from({ length: 9 }, (_, i) => (
          <Motion.circle key={i} cx={130 + i * 14} cy={222} r={4 + (i % 3) * 2} fill="#fff" fillOpacity="0.55" stroke="#BAE6FD" strokeWidth="1.5"
            initial={{ opacity: 0 }} animate={{ opacity: [0, 1, 0], y: [0, -72 - (i % 4) * 12] }} transition={{ duration: 1.8, repeat: Infinity, delay: i * 0.18 }} />
        ))
      }
      case 'pay': {
        if (!acting || reduced) return null
        const [x, y] = at(sp, 172, 186)
        return [0, 1, 2].map(i => (
          <Motion.g key={i} initial={{ x, y, opacity: 0 }} animate={{ x: [x, (x + 268) / 2, 268], y: [y, y - 50, 168], opacity: [0, 1, 0] }}
            transition={{ duration: 0.9, delay: 0.4 + i * 0.22, times: [0, 0.5, 1] }}>
            <ItemArt name="coin" />
          </Motion.g>
        ))
      }
      case 'fetch': {
        if (!acting) return null
        const [hx, hy] = at(sp, 150, 150)
        const dx = sp.x - 80 + 42 * DOG_S
        const dy = 292 - 31 * DOG_S
        return (
          <Motion.g initial={{ x: hx, y: hy }} animate={reduced ? { x: dx, y: dy } : { x: [hx, (hx + dx) / 2, dx], y: [hy, hy - 90, dy] }}
            transition={{ duration: 1.05, delay: 0.25, times: [0, 0.5, 1], ease: 'easeOut' }}>
            <Motion.g animate={reduced ? undefined : { rotate: 540 }} transition={{ duration: 1.05, delay: 0.25 }}><ItemArt name="ball" /></Motion.g>
          </Motion.g>
        )
      }
      case 'kick': {
        const [bx, by] = at(sp, 148, 228)
        return (
          <g>
            <Motion.g initial={false} animate={acting && !reduced ? { x: [bx, 260, 318], y: [by, by - 46, 238] } : { x: acting ? 318 : bx, y: acting ? 238 : by }}
              transition={acting ? { duration: 0.75, delay: 0.3, times: [0, 0.5, 1] } : { duration: 0 }}>
              <Motion.g animate={acting && !reduced ? { rotate: 720 } : { rotate: 0 }} transition={{ duration: 0.8, delay: 0.3 }}><ItemArt name="football" /></Motion.g>
            </Motion.g>
            {acting && <Pop x={300} y={198} text="GOAL!" size={26} delay={1.05} reduced={reduced} rotate={0} />}
          </g>
        )
      }
      case 'bench': {
        if (!acting || reduced) return null
        return [[90, 170, '#F472B6'], [150, 190, '#A78BFA']].map(([x, y, c], i) => (
          <Motion.g key={i} initial={{ x, y }} animate={{ x: [x, x + 40, x - 10, x], y: [y, y - 30, y - 10, y] }} transition={{ duration: 4, repeat: Infinity, delay: i }}>
            <Motion.g animate={{ scaleX: [1, 0.3, 1] }} transition={{ duration: 0.25, repeat: Infinity }}>
              <ellipse cx="-5" cy="0" rx="6" ry="4" fill={c} />
              <ellipse cx="5" cy="0" rx="6" ry="4" fill={c} />
            </Motion.g>
            <rect x="-1" y="-4" width="2" height="8" rx="1" fill="#1F2937" />
          </Motion.g>
        ))
      }
      case 'homework': {
        return (
          <g>
            {acting && <path d="M108 206 70 300h96z" fill="#FEF08A" opacity="0.3" />}
            <path d="M92 240h176l10 12H82z" fill="#D97706" />
            <rect x="82" y="252" width="196" height="48" fill="#B45309" />
            <rect x="150" y="264" width="60" height="22" rx="4" fill="#92400E" />
            <circle cx="180" cy="275" r="2.5" fill="#FDE047" />
            {/* lamp */}
            <ellipse cx="108" cy="244" rx="12" ry="3.5" fill="#334155" />
            <path d="M108 244l-6-26 12-12" stroke="#334155" strokeWidth="3.5" fill="none" strokeLinecap="round" />
            <path d="M104 204l18-6 6 14z" fill={acting ? '#FDE047' : '#64748B'} />
            {/* paper + books */}
            <path d="M170 242h38l4 8h-38z" fill="#fff" />
            <path d="M176 245h24M178 248h20" stroke="#CBD5E1" strokeWidth="1" />
            {acting && [0, 1, 2].map(i => (
              <Motion.path key={i} d={`M${182 + i * 9} 244l2 3 4-5`} stroke="#22C55E" strokeWidth="2" fill="none" strokeLinecap="round"
                initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ delay: 0.6 + i * 0.5, duration: 0.3 }} />
            ))}
            <rect x="232" y="232" width="34" height="8" rx="2" fill="#3B82F6" />
            <rect x="234" y="224" width="30" height="8" rx="2" fill="#F43F5E" />
            <rect x="236" y="216" width="26" height="8" rx="2" fill="#22C55E" />
          </g>
        )
      }
      case 'dinner': {
        return (
          <g>
            <path d="M70 240h220l12 12H58z" fill="#E0F2FE" />
            <rect x="58" y="252" width="244" height="48" fill="#60A5FA" />
            <path d="M58 262h244" stroke="#fff" strokeWidth="4" opacity="0.5" />
            {[[118, 244], [180, 246], [242, 244]].map(([x, y], i) => (
              <g key={i}>
                <path d={`M${x - 16} ${y - 4}q16 16 32 0z`} fill="#fff" />
                <ellipse cx={x} cy={y - 4} rx="16" ry="3.5" fill={['#FB923C', '#FACC15', '#F87171'][i]} />
                {acting && <Steam x={x} y={y - 10} reduced={reduced} n={2} />}
              </g>
            ))}
          </g>
        )
      }
      case 'tv': {
        return (
          <g>
            <rect x="264" y="246" width="82" height="10" rx="4" fill="#78350F" />
            <rect x="272" y="256" width="6" height="20" fill="#78350F" />
            <rect x="332" y="256" width="6" height="20" fill="#78350F" />
            <rect x="256" y="178" width="98" height="68" rx="10" fill="#1F2937" />
            {acting ? (
              <g>
                <Motion.rect x="262" y="184" width="86" height="56" rx="6" initial={{ fill: '#38BDF8' }}
                  animate={reduced ? { fill: '#38BDF8' } : { fill: ['#38BDF8', '#A78BFA', '#F472B6', '#38BDF8'] }} transition={{ duration: 3, repeat: Infinity }} />
                <rect x="262" y="226" width="86" height="14" fill="#22C55E" />
                <Motion.g animate={reduced ? undefined : { y: [0, -16, 0], x: [0, 14, 28, 14, 0] }} transition={{ duration: 1.2, repeat: Infinity }}>
                  <circle cx="284" cy="216" r="10" fill="#FDE047" />
                  <circle cx="281" cy="214" r="1.6" fill="#1F2937" />
                  <circle cx="288" cy="214" r="1.6" fill="#1F2937" />
                  <path d="M280 219q4 4 8 0" stroke="#1F2937" strokeWidth="1.5" fill="none" />
                </Motion.g>
              </g>
            ) : (
              <g>
                <rect x="262" y="184" width="86" height="56" rx="6" fill="#0F172A" />
                <path d="M272 192l16 0-20 20z" fill="#fff" opacity="0.08" />
              </g>
            )}
          </g>
        )
      }
      case 'read': {
        if (!acting || reduced) return null
        const [x, y] = at(sp, 112, 176)
        return ['a', 'b', 'c'].map((ch, i) => (
          <Motion.text key={ch} x={x} y={y} fontSize="13" fontWeight="900" fill={['#FDE047', '#F9A8D4', '#A5F3FC'][i]} fontFamily="system-ui, sans-serif"
            initial={{ opacity: 0 }} animate={{ opacity: [0, 1, 0], y: [0, -40], x: [0, (i - 1) * 18] }} transition={{ duration: 1.8, repeat: Infinity, delay: 0.6 + i * 0.5 }}>{ch}</Motion.text>
        ))
      }
      case 'sleep': {
        if (!acting || reduced) return null
        return (
          <Motion.path d="M0 0l-26 10" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" initial={{ x: 124, y: 52, opacity: 0 }}
            animate={{ x: [124, 52], y: [52, 84], opacity: [0, 1, 0] }} transition={{ duration: 1.1, delay: 1.2 }} />
        )
      }
      default:
        return null
    }
  }
  return null
}
