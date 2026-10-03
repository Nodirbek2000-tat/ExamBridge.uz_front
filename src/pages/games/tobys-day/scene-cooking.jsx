/*
 * TOBY'S DAY — the soup kitchen. Toby stands behind a big kitchen island (in
 * front of him, so what he works on is never hidden): the sink on the left,
 * the chopping board in the middle, the pot on the hob on the right. Mum helps;
 * a friend comes for a bowl at the end. The soup changes step by step
 * (water → carrots → salt → ready).
 * Room props: { layer, w, uid, acting, action, reduced, speaker, sp }.
 */
import { motion as Motion } from 'framer-motion'
import { ItemArt } from './items'
import { Kid, Mum } from './characters'
import { AT0, BW, BX, FONT, SKY, at } from './world-geo'
import { Bubbles, Drops, Floor, Grad, Pop, Sparkles, Steam, Twinkle, Wall } from './scene-kit'

const DY = 36                        // the island is drawn 36 lower than its own numbers say
const POT = { x: 271, y: 214 }      // the soup's surface centre (island numbers)
const BOARD = { x: 170, y: 240 }
const SINK = { x: 74, y: 242 }
const HEART = 'M0 6C-12-2-9-12-3-11-1-10.6 0-9 0-8c0-1 1-2.6 3-3 6-1 9 9-3 17z'

function Slices({ n = 5, x, y }) {
  return Array.from({ length: n }, (_, i) => (
    <g key={i} transform={`translate(${x + (i - (n - 1) / 2) * 9} ${y})`}>
      <ellipse rx="4.2" ry="3" fill="#F97316" />
      <ellipse rx="2" ry="1.3" fill="#FDBA74" />
    </g>
  ))
}

function Island({ uid, w, acting, action, reduced, sp }) {
  const soup = w.ready || w.salt ? '#FB923C' : w.inPot ? '#FDBA74' : '#7DD3FC'
  const vegAtSink = acting && action === 'washveg'
  const vegInBasket = !w.vegWashed && !vegAtSink
  const cutting = acting && action === 'cut'
  const wholeOnBoard = w.vegWashed && !vegAtSink && (!w.cut || cutting)
  const slicesOnBoard = w.cut && !w.inPot
  const toPot = acting && action === 'intopot'
  const stirring = acting && action === 'stir'
  const salting = acting && action === 'salt'
  const water = acting && (action === 'washhands' || action === 'washveg')
  const [px, py0] = at(sp, 160, 145)   // the paw in the 'wave' pose (salt), scene → island numbers
  const py = py0 - DY
  return (
    <g>
      {/* worktop + cupboards */}
      <rect x="-80" y="236" width="520" height="14" rx="5" fill="#FDE68A" />
      <rect x="-80" y="246" width="520" height="60" fill="#14B8A6" />
      <path d="M-80 248h520" stroke="#0F766E" strokeWidth="3" />
      {[-40, 40, 120, 200, 280, 360].map(x => (
        <g key={x}>
          <rect x={x - 34} y="256" width="68" height="40" rx="5" fill="#2DD4BF" opacity="0.55" />
          <rect x={x - 8} y="262" width="16" height="4" rx="2" fill="#0F766E" />
        </g>
      ))}
      {/* sink + tap */}
      <ellipse cx={SINK.x} cy={SINK.y} rx="40" ry="6" fill="#94A3B8" />
      <ellipse cx={SINK.x} cy={SINK.y + 1} rx="34" ry="4" fill="#475569" />
      <path d="M104 240v-30q0-12-12-12h-6" stroke="#CBD5E1" strokeWidth="6" fill="none" strokeLinecap="round" />
      <rect x="98" y="226" width="14" height="5" rx="2" fill="#F43F5E" />
      {water && <Drops x={86} y={204} len={34} n={5} reduced={reduced} />}
      {water && <Bubbles x={SINK.x} y={232} w={50} rise={50} n={6} reduced={reduced} delay={0.3} />}
      <rect x="18" y="222" width="12" height="18" rx="3" fill="#F9A8D4" />
      <path d="M24 222v-6h6" stroke="#EC4899" strokeWidth="2.5" fill="none" />
      {vegAtSink && (
        <g>
          <path d="M52 236q22 14 44 0z" fill="#E2E8F0" />
          <g transform="translate(66 232) scale(.8)"><ItemArt name="vegetables" /></g>
          <Twinkle x={70} y={226} w={40} h={16} reduced={reduced} color="#fff" />
        </g>
      )}
      {/* chopping board */}
      <rect x="130" y="236" width="82" height="9" rx="4" fill="#D97706" />
      <rect x="134" y="234" width="74" height="5" rx="2.5" fill="#FBBF24" />
      {wholeOnBoard && (
        <Motion.g initial={false} animate={{ opacity: cutting ? 0 : 1 }} transition={{ duration: 0.3, delay: cutting ? 2.3 : 0 }}>
          <g transform="translate(158 229) rotate(55) scale(.8)"><ItemArt name="carrot" /></g>
          <g transform="translate(186 231) rotate(62) scale(.8)"><ItemArt name="carrot" /></g>
        </Motion.g>
      )}
      {cutting && Array.from({ length: 5 }, (_, i) => (
        <Motion.g key={i} initial={reduced ? false : { scale: 0, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
          style={{ transformBox: 'fill-box', originX: 0.5, originY: 0.5 }} transition={{ delay: 0.6 + i * 0.4, type: 'spring', stiffness: 400, damping: 14 }}>
          <Slices n={1} x={152 + i * 9} y={234} />
        </Motion.g>
      ))}
      {slicesOnBoard && !cutting && !toPot && <Slices x={BOARD.x} y={234} />}
      {toPot && !reduced && Array.from({ length: 5 }, (_, i) => (
        <Motion.g key={i} style={AT0} initial={{ x: 152 + i * 9, y: 234 }}
          animate={{ x: [152 + i * 9, 220 + i * 6, POT.x - 12 + i * 6], y: [234, 160 - (i % 2) * 12, POT.y + 2], opacity: [1, 1, 0] }}
          transition={{ duration: 0.8, delay: 0.5 + i * 0.25, times: [0, 0.5, 1] }}>
          <ellipse rx="4.2" ry="3" fill="#F97316" />
        </Motion.g>
      ))}
      {toPot && <Pop x={POT.x} y={176} text="splash!" size={14} fill="#BAE6FD" stroke="#0369A1" delay={1.4} reduced={reduced} />}
      {/* veg basket */}
      {vegInBasket && (
        <g transform="translate(356 0)">
          <path d="M-17 226h34l-4 14h-26z" fill="#B45309" />
          <g transform="translate(0 222) scale(.72)"><ItemArt name="vegetables" /></g>
          <path d="M-17 226h34" stroke="#92400E" strokeWidth="3" strokeLinecap="round" />
        </g>
      )}
      {/* hob + pot */}
      <rect x="232" y="240" width="80" height="6" rx="2" fill="#1F2937" />
      <ellipse cx={POT.x} cy="244" rx="30" ry="2" fill="#F97316" opacity={w.inPot ? 0.9 : 0.4} />
      <rect x="236" y="214" width="8" height="5" rx="2" fill="#475569" />
      <rect x="298" y="214" width="8" height="5" rx="2" fill="#475569" />
      <path d="M244 210h54v24q0 8-8 8h-38q-8 0-8-8z" fill="#64748B" />
      <ellipse cx={POT.x} cy="211" rx="28" ry="5" fill="#94A3B8" />
      <ellipse cx={POT.x} cy="212" rx="24" ry="3.6" fill={soup} />
      {w.inPot && !toPot && [[-12, 0], [-3, 1], [6, -1], [14, 1]].map(([dx, dy], i) => (
        <ellipse key={i} cx={POT.x + dx} cy={212 + dy} rx="3" ry="1.5" fill="#EA580C" />
      ))}
      <path d="M250 216v18" stroke="#fff" strokeWidth="2" opacity="0.3" strokeLinecap="round" />
      {(w.inPot || toPot) && <Steam x={POT.x} y={204} n={3} reduced={reduced} h={w.ready ? 1.4 : 1} />}
      {w.ready && (
        <circle cx={POT.x} cy="204" r="34" fill={`url(#${uid}glow)`} />
      )}
      {stirring && (
        <Motion.ellipse cx={POT.x} cy="212" rx="17" ry="2.4" fill="none" stroke="#FED7AA" strokeWidth="1.6" strokeDasharray="7 5"
          animate={reduced ? undefined : { strokeDashoffset: [0, -24] }} transition={{ duration: 0.6, repeat: Infinity, ease: 'linear' }} />
      )}
      {stirring && (
        <Motion.g style={AT0} initial={{ x: POT.x, y: 212 }}
          animate={reduced ? { x: POT.x, y: 212 } : { x: [POT.x - 10, POT.x + 10, POT.x - 10], rotate: [-14, 14, -14] }}
          transition={{ duration: 1.1, repeat: Infinity, ease: 'easeInOut' }}>
          <rect x="-2" y="-46" width="4" height="46" rx="2" fill="#94A3B8" />
          <path d="M-7 0a7 4 0 0 0 14 0z" fill="#CBD5E1" />
        </Motion.g>
      )}
      {stirring && <Pop x={210} y={172} text="swirl!" size={13} fill="#FED7AA" stroke="#C2410C" delay={0.6} reduced={reduced} />}
      {salting && !reduced && Array.from({ length: 10 }, (_, i) => (
        <Motion.circle key={i} r="1.4" fill="#fff" stroke="#CBD5E1" strokeWidth=".6" initial={{ x: px, y: py + 6, opacity: 0 }}
          animate={{ x: [px, px + ((i % 5) - 2) * 3], y: [py + 6, POT.y], opacity: [0, 1, 0] }}
          transition={{ duration: 0.6, delay: 0.7 + i * 0.12, repeat: 2 }} />
      ))}
      {salting && <Sparkles x={POT.x} y={208} r={24} delay={2} reduced={reduced} colors={['#fff', '#E0F2FE', '#FDE047']} />}
      {/* the salt shaker waits by the board */}
      {!salting && <g transform="translate(121 229) scale(.62)"><ItemArt name="salt" /></g>}
    </g>
  )
}

export function CookingRoom({ layer, w, uid, acting, action, reduced, speaker, sp }) {
  if (layer === 'front') {
    const tasting = acting && action === 'taste'
    const ready = acting && action === 'ready'
    const serving = acting && action === 'serve'
    const [mx, my] = at(sp, 110, 130)
    const [gx, gy] = at(sp, 170, 183)     // the paw in the 'give' pose
    return (
      <g>
        <defs>
          <radialGradient id={`${uid}glow`}><stop offset="0" stopColor="#FEF08A" stopOpacity="0.7" /><stop offset="1" stopColor="#FEF08A" stopOpacity="0" /></radialGradient>
        </defs>
        <g transform={`translate(0 ${DY})`}>
          <Island uid={uid} w={w} acting={acting} action={action} reduced={reduced} sp={sp} />
        </g>
        {acting && action === 'washhands' && <Pop x={60} y={176} text="scrub scrub!" size={13} fill="#E0F2FE" stroke="#0369A1" delay={0.5} reduced={reduced} />}
        {acting && action === 'cut' && <Pop x={168} y={196 + DY} text="chop! chop!" size={14} fill="#FDE047" stroke="#C2410C" delay={0.6} reduced={reduced} repeat />}
        {acting && action === 'letscook' && <Sparkles x={at(sp, 100, 60)[0]} y={at(sp, 100, 60)[1]} r={50} n={8} delay={0.4} reduced={reduced} />}
        {tasting && (
          <g>
            <Pop x={mx - 46} y={my - 30} text="HOT!" size={20} fill="#FDE047" stroke="#DC2626" delay={0.5} reduced={reduced} repeat />
            {!reduced && [0, 1, 2].map(i => (
              <Motion.g key={i} style={AT0} initial={{ x: mx + 10 + i * 10, y: my, opacity: 0, scale: 0.4 }}
                animate={{ y: [my, my - 40 - i * 8], opacity: [0, 1, 0], scale: [0.4, 0.8] }} transition={{ duration: 1, delay: 0.6 + i * 0.25, repeat: 2 }}>
                <ItemArt name="fire" />
              </Motion.g>
            ))}
            <Steam x={mx} y={my - 6} n={3} reduced={reduced} />
          </g>
        )}
        {ready && !reduced && [0, 1, 2, 3].map(i => (
          <Motion.g key={i} style={AT0} initial={{ x: POT.x - 18 + i * 12, y: 196 + DY, opacity: 0, scale: 0.5 }}
            animate={{ y: [196 + DY, 140 - (i % 2) * 18], x: [POT.x - 18 + i * 12, POT.x - 18 + i * 12 + (i % 2 ? 10 : -10)], opacity: [0, 1, 0], scale: [0.5, 1.1] }}
            transition={{ duration: 1.8, repeat: Infinity, delay: 0.4 + i * 0.45 }}>
            <path d={HEART} fill={['#F472B6', '#FB7185', '#F9A8D4', '#F43F5E'][i]} />
          </Motion.g>
        ))}
        {ready && <Pop x={POT.x} y={150} text="Mmm!" size={18} fill="#FBCFE8" stroke="#BE185D" delay={0.3} reduced={reduced} />}
        {serving && (
          <Motion.g style={AT0} initial={{ x: gx, y: gy, opacity: 0 }} animate={reduced ? { x: 306, y: 228 + DY, opacity: 1 } : { x: [gx, gx, 306], y: [gy, gy, 228 + DY], opacity: [0, 1, 1] }}
            transition={reduced ? { duration: 0 } : { duration: 2.2, times: [0, 0.5, 1], delay: 0.2 }}>
            <ItemArt name="bowl" transform="scale(1.3)" />
          </Motion.g>
        )}
        {w.served && !serving && <ItemArt name="bowl" transform={`translate(306 ${228 + DY}) scale(1.3)`} />}
        {serving && <Sparkles x={306} y={220 + DY} r={30} delay={2.4} reduced={reduced} />}
      </g>
    )
  }
  const helping = action === 'cut'
  const friend = action === 'serve' || w.served
  const mumX = friend ? 40 : helping ? 236 : 318
  return (
    <g>
      <defs>
        <Grad id={`${uid}sky`} stops={SKY.day} />
        <pattern id={`${uid}tile`} width="22" height="22" patternUnits="userSpaceOnUse">
          <rect width="22" height="22" fill="#FFEDD5" />
          <path d="M22 0V22H0" stroke="#fff" strokeWidth="2" fill="none" />
        </pattern>
      </defs>
      <Wall fill="#FED7AA" />
      <rect x={BX} y="120" width={BW} height="116" fill={`url(#${uid}tile)`} />
      {/* window */}
      <rect x="52" y="24" width="112" height="86" rx="10" fill="#fff" />
      <rect x="59" y="31" width="98" height="72" rx="6" fill={`url(#${uid}sky)`} />
      <circle cx="130" cy="52" r="10" fill="#FDE047" />
      <path d="M59 103v-16q20-10 40-2t58-6v24z" fill="#86EFAC" />
      <rect x="106" y="31" width="4" height="72" fill="#fff" />
      <path d="M46 22h124" stroke="#DB2777" strokeWidth="5" strokeLinecap="round" />
      <path d="M50 24h26q-6 40 0 84H50zM166 24h-26q6 40 0 84h26z" fill="#F9A8D4" opacity="0.9" />
      <rect x="62" y="104" width="92" height="6" rx="3" fill="#fff" />
      <path d="M78 104l2-10h12l2 10z" fill="#F97316" />
      <path d="M86 94q-8-12 0-18 4 8 0 18zM86 94q6-14 14-12-4 9-14 12z" fill="#22C55E" />
      {/* utensils rail */}
      <path d="M190 30h110" stroke="#94A3B8" strokeWidth="4" strokeLinecap="round" />
      {[[206, 'ladle'], [232, 'pan'], [260, 'whisk'], [284, 'spatula']].map(([x, k]) => (
        <g key={k}>
          <path d={`M${x} 32v8`} stroke="#94A3B8" strokeWidth="2" />
          {k === 'ladle' && <g><rect x={x - 1.5} y="40" width="3" height="34" fill="#94A3B8" /><path d={`M${x - 8} 74a8 6 0 0 0 16 0z`} fill="#CBD5E1" /></g>}
          {k === 'pan' && <g><rect x={x - 2} y="40" width="4" height="22" fill="#78350F" /><circle cx={x} cy="76" r="14" fill="#334155" /><circle cx={x} cy="76" r="10" fill="#475569" /></g>}
          {k === 'whisk' && <g><rect x={x - 1.5} y="40" width="3" height="16" fill="#F43F5E" /><path d={`M${x} 56q-8 14 0 22 8-8 0-22z`} stroke="#94A3B8" strokeWidth="2" fill="none" /></g>}
          {k === 'spatula' && <g><rect x={x - 1.5} y="40" width="3" height="24" fill="#22C55E" /><rect x={x - 6} y="64" width="12" height="14" rx="3" fill="#CBD5E1" /></g>}
        </g>
      ))}
      {/* shelf with jars */}
      <rect x="190" y="104" width="140" height="6" rx="3" fill="#B45309" />
      {[[204, '#F87171', 'jam'], [232, '#FBBF24', 'honey'], [260, '#A3E635', 'tea'], [290, '#FDE68A', 'rice'], [316, '#FB923C', 'spice']].map(([x, c]) => (
        <g key={x}>
          <rect x={x - 9} y="82" width="18" height="22" rx="4" fill="#fff" opacity="0.85" />
          <rect x={x - 9} y="90" width="18" height="14" rx="3" fill={c} opacity="0.8" />
          <rect x={x - 10} y="78" width="20" height="6" rx="2" fill={c} />
        </g>
      ))}
      {/* a clock + a recipe card */}
      <circle cx="350" cy="60" r="18" fill="#fff" stroke="#F97316" strokeWidth="4" />
      <path d="M350 60V48M350 60l9 4" stroke="#1F2937" strokeWidth="2.5" strokeLinecap="round" />
      <g transform="rotate(4 20 70)">
        <rect x="-4" y="40" width="44" height="56" rx="4" fill="#FFFBEB" stroke="#FDE68A" strokeWidth="2" />
        <text x="18" y="54" textAnchor="middle" fontSize="7" fontWeight="900" fill="#C2410C" fontFamily={FONT}>SOUP</text>
        <path d="M4 62h28M4 70h24M4 78h28M4 86h18" stroke="#FDBA74" strokeWidth="2" />
      </g>
      {/* left (wide): oven / right (wide): fridge */}
      <g>
        <rect x="-220" y="96" width="120" height="140" rx="8" fill="#E2E8F0" />
        <rect x="-206" y="140" width="92" height="70" rx="6" fill="#334155" />
        <rect x="-196" y="150" width="72" height="44" rx="4" fill="#F97316" opacity="0.35" />
        {[-200, -178, -156, -134].map(x => <circle key={x} cx={x} cy="116" r="5" fill="#94A3B8" />)}
        <rect x="400" y="50" width="96" height="186" rx="10" fill="#F8FAFC" stroke="#CBD5E1" strokeWidth="3" />
        <path d="M400 120h96" stroke="#CBD5E1" strokeWidth="3" />
        <rect x="482" y="70" width="5" height="30" rx="2.5" fill="#94A3B8" />
        <rect x="482" y="136" width="5" height="40" rx="2.5" fill="#94A3B8" />
        <circle cx="430" cy="80" r="5" fill="#F43F5E" />
        <rect x="420" y="140" width="24" height="18" rx="2" fill="#FDE047" transform="rotate(-6 432 149)" />
      </g>
      {/* back counter with a stack of bowls */}
      <rect x={BX} y="180" width={BW} height="56" fill="#FDBA74" />
      <rect x={BX} y="174" width={BW} height="8" rx="3" fill="#FFF7ED" />
      {[0, 1, 2].map(i => <path key={i} d={`M186 ${172 - i * 5}h26q-1 6-13 6t-13-6z`} fill={['#F472B6', '#F9A8D4', '#FBCFE8'][i]} />)}
      {/* Mum (and later a hungry friend) behind the island */}
      <Motion.g initial={false} animate={{ x: mumX }} transition={reduced ? { duration: 0 } : { type: 'spring', stiffness: 60, damping: 14 }}>
        <g transform="translate(0 272) scale(1.15)">
          <Mum talking={speaker === 'other' && action !== 'serve'} cheer={acting && (action === 'ready' || action === 'letscook')}
            wave={acting && action === 'washhands'} leftAngle={helping ? 60 : 0} reduced={reduced} />
        </g>
      </Motion.g>
      {friend && (
        <Motion.g initial={reduced ? { x: 326 } : { x: 460 }} animate={{ x: 326 }} transition={{ type: 'spring', stiffness: 60, damping: 14 }}>
          <g transform="translate(0 276) scale(1.08)">
            <Kid v={2} talking={speaker === 'other'} eat={!!w.served} wave={action === 'serve' && !w.served} reduced={reduced} />
          </g>
        </Motion.g>
      )}
      <Floor fill="#FCA5A5" />
      {Array.from({ length: 24 }, (_, i) => <rect key={i} x={BX + i * 40} y={i % 2 ? 260 : 280} width="20" height="20" fill="#fff" opacity="0.3" />)}
    </g>
  )
}
