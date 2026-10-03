/*
 * TOBY'S DAY — rooms at home: bedroom (day + night), bathroom, kitchen, living
 * room and the hall with the front door. Each room draws a back layer (behind
 * Toby) and a front layer (furniture in front of him), wider than the 360 view.
 * Room props: { layer, w (world), uid, acting, action, reduced, speaker, night, sp (Toby's spot) }.
 */
import { AnimatePresence, motion as Motion } from 'framer-motion'
import { ItemArt } from './items'
import { Mum } from './characters'
import { AT0, BX, BW, SKY, at } from './world-geo'
import { Bubbles, Dim, Drops, Floor, Grad, Pop, Rings, Sparkles, Steam, Twinkle, Wall } from './scene-kit'

/* ── bedroom ─────────────────────────────────────────────────────────── */
// the blanket's outline per state (also the shape the room's dimness is clipped to)
const BLANKET = {
  in: 'M202 230q0-10 14-10h132q10 0 10 10v28q0 8-8 8H210q-8 0-8-8z',
  made: 'M206 216q0-8 10-8h132q10 0 10 8v40q0 6-6 6H212q-6 0-6-6z',
  messy: 'M206 232q8-18 26-10t30-10 28 12 30-8 32 10l4 28q0 6-6 6H212q-6 0-6-6z',
}

function Blanket({ made, inBed }) {
  if (inBed) {
    return (
      <g>
        <path d={BLANKET.in} fill="#818CF8" />
        <path d="M204 226q2-6 12-6h132q8 0 10 6" stroke="#fff" strokeWidth="9" strokeLinecap="round" fill="none" />
        {[[226, 246], [262, 254], [300, 244], [336, 254]].map(([x, y], i) => <circle key={i} cx={x} cy={y} r="3.4" fill="#C7D2FE" />)}
      </g>
    )
  }
  if (made) {
    return (
      <g>
        <path d={BLANKET.made} fill="#818CF8" />
        <path d="M208 214q2-6 10-6h128q8 0 10 6" stroke="#fff" strokeWidth="8" strokeLinecap="round" fill="none" />
        <path d="M206 236h152" stroke="#6366F1" strokeWidth="2" opacity="0.5" />
        {[[228, 226], [262, 248], [296, 226], [332, 248]].map(([x, y], i) => (
          <path key={i} d={`M${x} ${y - 4}l1.2 2.8 2.8 1.2-2.8 1.2-1.2 2.8-1.2-2.8-2.8-1.2 2.8-1.2z`} fill="#E0E7FF" />
        ))}
      </g>
    )
  }
  return (
    <g>
      <path d={BLANKET.messy} fill="#818CF8" />
      <path d="M232 222q10 10 2 26M292 222q-8 12 4 26M322 216q8 12-2 30" stroke="#6366F1" strokeWidth="2.5" fill="none" opacity="0.55" strokeLinecap="round" />
      {[[248, 240], [306, 246], [340, 236]].map(([x, y], i) => <circle key={i} cx={x} cy={y} r="3" fill="#C7D2FE" />)}
    </g>
  )
}

export function Bedroom({ layer, w, night, uid, acting, action, reduced }) {
  const open = night || w.curtains === 'open'
  const dim = night ? (w.asleep ? 0.55 : w.lampOff ? 0.42 : 0.08) : open ? 0 : 0.3
  const lampOn = night && !w.asleep && !w.lampOff
  const made = night || !!w.bedMade
  if (layer === 'front') {
    const making = acting && action === 'makebed'
    return (
      <g>
        <AnimatePresence initial={false}>
          <Motion.g key={w.inBed ? 'in' : made ? 'made' : 'messy'} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            transition={{ duration: reduced ? 0 : 0.6 }}>
            <Blanket made={made} inBed={!!w.inBed} />
          </Motion.g>
        </AnimatePresence>
        <rect x="200" y="256" width="160" height="14" rx="7" fill="#D97706" />
        <rect x="210" y="268" width="9" height="18" rx="3" fill="#B45309" />
        <rect x="340" y="268" width="9" height="18" rx="3" fill="#B45309" />
        {making && <Sparkles x={282} y={228} r={60} n={8} delay={0.5} reduced={reduced} />}
        {making && <Twinkle x={282} y={226} w={130} h={30} reduced={reduced} n={5} color="#fff" />}
        {/* the room's dimness, on the blanket and the bed front only (the rest is dimmed behind Toby) */}
        <defs>
          <clipPath id={`${uid}bed`}>
            <path d={BLANKET[w.inBed ? 'in' : made ? 'made' : 'messy']} />
            <rect x="198" y={w.inBed ? 214 : 202} width="164" height="12" />
            <rect x="200" y="256" width="160" height="14" />
            <rect x="210" y="268" width="9" height="18" />
            <rect x="340" y="268" width="9" height="18" />
          </clipPath>
        </defs>
        <Motion.rect x="190" y="190" width="180" height="110" fill="#1E1B4B" clipPath={`url(#${uid}bed)`} initial={false}
          animate={{ opacity: dim }} transition={{ duration: 1.2 }} pointerEvents="none" />
      </g>
    )
  }
  const ringing = acting && action === 'wake'
  const clicking = acting && action === 'lamp'
  return (
    <g>
      <defs>
        <Grad id={`${uid}wall`} stops={night ? ['#312E81', '#1E1B4B'] : ['#C7D2FE', '#A5B4FC']} />
        <Grad id={`${uid}sky`} stops={night ? SKY.night : SKY.morning} />
        <radialGradient id={`${uid}glow`}><stop offset="0" stopColor="#FEF08A" stopOpacity="0.75" /><stop offset="1" stopColor="#FEF08A" stopOpacity="0" /></radialGradient>
      </defs>
      <Wall fill={`url(#${uid}wall)`} to={240} />
      {[[160, 120], [196, 112], [228, 70], [262, 120], [300, 64], [330, 110], [176, 18], [240, 22], [320, 24], [20, 170],
        [-60, 60], [-140, 120], [-220, 40], [420, 50], [520, 120], [600, 30]].map(([x, y], i) => (
        <path key={i} d={`M${x} ${y - 4}l1.2 2.8 2.8 1.2-2.8 1.2-1.2 2.8-1.2-2.8-2.8-1.2 2.8-1.2z`} fill="#fff" opacity={night ? 0.35 : 0.4} />
      ))}
      <Floor fill={night ? '#5B4B8A' : '#E8B98A'} lines={[256, 278]} line={night ? '#4C3D78' : '#D9A472'} />
      <rect x={BX} y="230" width={BW} height="8" fill="#fff" opacity="0.35" />

      {/* left (wide screens): bookshelf with toys */}
      <g>
        <rect x="-118" y="112" width="92" height="124" rx="6" fill="#B45309" />
        <rect x="-112" y="118" width="80" height="112" rx="3" fill="#92400E" />
        {[150, 192].map(y => <rect key={y} x="-112" y={y} width="80" height="5" fill="#B45309" />)}
        {[['#F43F5E', -108, 124, 22], ['#3B82F6', -100, 128, 18], ['#22C55E', -92, 122, 24], ['#FACC15', -84, 130, 16]].map(([c, x, y, h]) => (
          <rect key={x} x={x} y={y} width="7" height={h} rx="1.5" fill={c} />
        ))}
        <circle cx="-56" cy="140" r="9" fill="#F472B6" />
        <circle cx="-56" cy="140" r="4" fill="#FBCFE8" />
        <g transform="translate(-84 192)">
          <circle cx="-8" cy="-26" r="6" fill="#D97706" /><circle cx="8" cy="-26" r="6" fill="#D97706" />
          <circle cx="0" cy="-16" r="12" fill="#F59E0B" /><ellipse cx="0" cy="-2" rx="11" ry="10" fill="#F59E0B" />
          <circle cx="-4" cy="-18" r="1.6" fill="#1F2937" /><circle cx="4" cy="-18" r="1.6" fill="#1F2937" />
          <ellipse cx="0" cy="-13" rx="4" ry="3" fill="#FDE68A" />
        </g>
        <rect x="-60" y="198" width="30" height="32" rx="3" fill="#60A5FA" />
        <rect x="-54" y="204" width="18" height="10" rx="2" fill="#BFDBFE" />
        <rect x="-250" y="170" width="90" height="66" rx="8" fill="#F472B6" />
        <rect x="-256" y="164" width="102" height="12" rx="6" fill="#EC4899" />
        <circle cx="-205" cy="200" r="10" fill="#FDE047" />
      </g>
      {/* right (wide screens): wardrobe + rocket poster */}
      <g>
        <rect x="384" y="84" width="104" height="152" rx="8" fill="#F59E0B" />
        <path d="M436 90v140" stroke="#D97706" strokeWidth="3" />
        <circle cx="428" cy="160" r="3.5" fill="#92400E" /><circle cx="444" cy="160" r="3.5" fill="#92400E" />
        <rect x="378" y="76" width="116" height="12" rx="6" fill="#D97706" />
        <g transform="translate(540 70)">
          <rect width="56" height="72" rx="5" fill="#FFF7ED" stroke="#38BDF8" strokeWidth="3" />
          <path d="M28 12q10 12 8 34H20q-2-22 8-34z" fill="#F43F5E" />
          <circle cx="28" cy="30" r="5" fill="#BAE6FD" />
          <path d="M20 46l-6 8h8zM36 46l6 8h-8z" fill="#FB923C" />
          <path d="M24 50q4 12 8 0" fill="#FDE047" />
        </g>
        <ellipse cx="560" cy="250" rx="60" ry="9" fill={night ? '#7C3AED' : '#FBCFE8'} opacity="0.6" />
      </g>

      {/* window */}
      <rect x="30" y="40" width="104" height="100" rx="12" fill="#fff" />
      <rect x="38" y="48" width="88" height="84" rx="7" fill={`url(#${uid}sky)`} />
      {night ? (
        <g>
          <Motion.circle cx="104" cy="72" r="18" fill="#FEF9C3" opacity="0.25" style={{ originX: 0.5, originY: 0.5 }}
            animate={reduced ? undefined : { scale: [0.9, 1.15, 0.9] }} transition={{ duration: 3, repeat: Infinity }} />
          <circle cx="104" cy="72" r="11" fill="#FEF9C3" />
          <circle cx="100" cy="70" r="2.2" fill="#FDE68A" />
          <circle cx="107" cy="76" r="1.6" fill="#FDE68A" />
          {[[52, 62], [64, 110], [116, 112], [56, 94], [90, 58]].map(([x, y], i) => (
            <Motion.circle key={i} cx={x} cy={y} r="1.6" fill="#fff" animate={reduced ? undefined : { opacity: [0.3, 1, 0.3] }}
              transition={{ duration: 1.6 + i * 0.3, repeat: Infinity }} />
          ))}
        </g>
      ) : (
        <g>
          <Motion.g initial={false} animate={{ y: open ? 0 : 14 }} transition={{ duration: reduced ? 0 : 2, ease: 'easeOut' }}>
            <circle cx="102" cy="76" r="20" fill="#FEF08A" opacity="0.5" />
            <circle cx="102" cy="76" r="12" fill="#FDE047" />
          </Motion.g>
          <ellipse cx="58" cy="112" rx="14" ry="6" fill="#fff" />
          <ellipse cx="68" cy="108" rx="9" ry="6" fill="#fff" />
          <path d="M38 132v-10q12-8 24-2t26-4 38 6v10z" fill="#86EFAC" />
        </g>
      )}
      <rect x="80" y="48" width="4" height="84" fill="#fff" />
      <rect x="38" y="88" width="88" height="4" fill="#fff" />
      {/* curtains */}
      <rect x="20" y="34" width="124" height="6" rx="3" fill="#9D174D" />
      <Motion.g style={{ originX: 0, originY: 0 }} initial={false} animate={{ scaleX: open ? 0.3 : 1 }} transition={{ duration: reduced ? 0 : 1.1, ease: 'easeInOut' }}>
        <path d="M24 38h58v106q-7 6-14 0t-15 0-14 0-15 0z" fill="#F472B6" />
        <path d="M38 40v98M54 40v100M68 40v98" stroke="#DB2777" strokeWidth="2" opacity="0.35" />
      </Motion.g>
      <Motion.g style={{ originX: 1, originY: 0 }} initial={false} animate={{ scaleX: open ? 0.3 : 1 }} transition={{ duration: reduced ? 0 : 1.1, ease: 'easeInOut' }}>
        <path d="M82 38h58v106q-7 6-14 0t-15 0-14 0-15 0z" fill="#EC4899" />
        <path d="M96 40v98M112 40v100M126 40v98" stroke="#BE185D" strokeWidth="2" opacity="0.35" />
      </Motion.g>
      {/* night: a moonbeam once the lamp is off */}
      {night && w.lampOff && !w.asleep && (
        <Motion.path d="M40 132 126 132 250 300 -10 300z" fill="#C7D2FE" initial={{ opacity: 0 }} animate={{ opacity: 0.16 }} transition={{ duration: 1.4, delay: 0.4 }} />
      )}
      {/* picture */}
      <g transform="translate(168 54)">
        <rect width="44" height="34" rx="4" fill="#FFF7ED" stroke="#F59E0B" strokeWidth="3" />
        <path d="M4 30 16 14l8 10 6-6 10 12z" fill="#34D399" />
        <circle cx="34" cy="10" r="4" fill="#FBBF24" />
      </g>
      {/* nightstand */}
      <rect x="158" y="196" width="46" height="40" rx="6" fill="#FDBA74" />
      <rect x="164" y="210" width="34" height="3" rx="1.5" fill="#EA9A5B" />
      <circle cx="181" cy="222" r="2.5" fill="#C2410C" />
      {night ? (
        <g>
          {lampOn && <circle cx="181" cy="172" r="40" fill={`url(#${uid}glow)`} />}
          <rect x="178" y="176" width="6" height="20" fill="#A16207" />
          <ellipse cx="181" cy="196" rx="12" ry="3" fill="#A16207" />
          <path d="M166 176h30l-6-20h-18z" fill={lampOn ? '#FDE68A' : '#94A3B8'} />
          {clicking && <Pop x={181} y={146} text="click!" size={13} fill="#fff" stroke="#4338CA" reduced={reduced} delay={0.5} />}
        </g>
      ) : (
        <Motion.g style={{ originX: 0.5, originY: 1 }} animate={ringing && !reduced ? { rotate: [-12, 12, -12] } : { rotate: 0 }}
          transition={ringing ? { duration: 0.12, repeat: 14 } : { duration: 0.2 }}>
          <circle cx="172" cy="170" r="5.5" fill="#EF4444" />
          <circle cx="190" cy="170" r="5.5" fill="#EF4444" />
          <circle cx="181" cy="182" r="13" fill="#F87171" />
          <circle cx="181" cy="182" r="10" fill="#fff" />
          <path d="M181 182v-7M181 182l-3.5 6" stroke="#1F2937" strokeWidth="2" strokeLinecap="round" />
          <path d="M173 194l-3 3M189 194l3 3" stroke="#B91C1C" strokeWidth="2.5" strokeLinecap="round" />
        </Motion.g>
      )}
      {ringing && <Rings x={181} y={176} r={18} reduced={reduced} />}
      {ringing && <Pop x={150} y={150} text="RING!" size={16} rotate={-12} reduced={reduced} />}
      {/* bed */}
      <rect x="212" y="150" width="140" height="92" rx="20" fill="#F59E0B" />
      <rect x="226" y="162" width="112" height="44" rx="12" fill="#FBBF24" opacity="0.6" />
      <rect x="206" y="212" width="150" height="30" rx="10" fill="#fff" />
      <Motion.ellipse cx="272" cy="200" rx="42" ry="14" fill="#fff" stroke="#E2E8F0" strokeWidth="2" initial={false}
        animate={{ rotate: made || w.inBed ? 0 : -8 }} style={{ originX: 0.5, originY: 0.5 }} transition={{ duration: 0.6 }} />
      <ellipse cx="118" cy="274" rx="74" ry="13" fill={night ? '#7C3AED' : '#F9A8D4'} opacity="0.7" />
      <Dim opacity={dim} />
    </g>
  )
}

/* ── bathroom ────────────────────────────────────────────────────────── */
function Tub({ front }) {
  if (front) {
    return (
      <g>
        <path d="M232 214h140v6q0 26-26 26h-88q-26 0-26-26z" fill="#fff" stroke="#CBD5E1" strokeWidth="2" />
        <path d="M240 222h124" stroke="#E0F2FE" strokeWidth="4" strokeLinecap="round" />
        <path d="M252 244l-6 10M352 244l6 10" stroke="#94A3B8" strokeWidth="4" strokeLinecap="round" />
      </g>
    )
  }
  return (
    <g>
      <rect x="236" y="196" width="134" height="46" rx="20" fill="#fff" stroke="#CBD5E1" strokeWidth="2" />
      <path d="M248 205h110" stroke="#7DD3FC" strokeWidth="5" strokeLinecap="round" />
    </g>
  )
}

function RubberDuck({ x, y, reduced, bob }) {
  return (
    <Motion.g initial={{ x, y }} animate={bob && !reduced ? { x, y: [y, y - 3, y], rotate: [-6, 6, -6] } : { x, y }}
      transition={{ duration: 1.4, repeat: bob ? Infinity : 0 }}>
      <ellipse cx="0" cy="4" rx="11" ry="7" fill="#FACC15" />
      <circle cx="6" cy="-4" r="6" fill="#FACC15" />
      <path d="M11-4l6 1.5-6 2z" fill="#F97316" />
      <circle cx="7.5" cy="-5.5" r="1.2" fill="#1F2937" />
    </Motion.g>
  )
}

export function Bathroom({ layer, w, uid, acting, action, reduced, sp }) {
  const inTub = !!w.bathed
  if (layer === 'front') {
    if (!inTub) return null
    return (
      <g>
        <Tub front />
        {[[246, 212, 9], [262, 206, 11], [282, 210, 9], [318, 206, 10], [338, 211, 9], [356, 208, 8]].map(([x, y, r], i) => (
          <circle key={i} cx={x} cy={y} r={r} fill="#fff" stroke="#E0F2FE" strokeWidth="1.5" />
        ))}
        <RubberDuck x={344} y={198} reduced={reduced} bob />
        {acting && action === 'bath' && <Bubbles x={300} y={196} w={90} rise={90} n={9} reduced={reduced} delay={0.4} />}
        {acting && action === 'bath' && <Pop x={210} y={150} text="splash!" size={15} fill="#BAE6FD" stroke="#0369A1" reduced={reduced} delay={0.3} />}
      </g>
    )
  }
  const water = acting && action === 'wash'
  const drying = acting && action === 'towel'
  return (
    <g>
      <defs>
        <pattern id={`${uid}tile`} width="30" height="30" patternUnits="userSpaceOnUse">
          <rect width="30" height="30" fill="#CFFAFE" />
          <path d="M30 0V30H0" stroke="#fff" strokeWidth="2" fill="none" />
        </pattern>
      </defs>
      <Wall fill={`url(#${uid}tile)`} to={240} />
      <rect x={BX} y="150" width={BW} height="5" fill="#67E8F9" opacity="0.6" />
      <Floor fill="#A5F3FC" />
      {Array.from({ length: 32 }, (_, i) => <rect key={i} x={BX + i * 30 + (i % 2 ? 0 : 15)} y={i % 2 ? 252 : 274} width="15" height="15" fill="#fff" opacity="0.35" />)}
      {/* left (wide): shower with a curtain */}
      <g>
        <rect x="-150" y="40" width="110" height="196" rx="6" fill="#E0F2FE" stroke="#fff" strokeWidth="4" />
        <path d="M-150 44h110" stroke="#94A3B8" strokeWidth="4" />
        <path d="M-146 46v186q8 4 16 0t16 0 16 0V46z" fill="#A78BFA" opacity="0.9" />
        <circle cx="-70" cy="70" r="10" fill="#94A3B8" />
        {[0, 1, 2].map(i => <circle key={i} cx={-74 + i * 4} cy={86 + i * 6} r="1.6" fill="#38BDF8" />)}
      </g>
      {/* right (wide): laundry basket + plant */}
      <g>
        <path d="M392 236l-6-48h60l-6 48z" fill="#FDE68A" stroke="#F59E0B" strokeWidth="2" />
        <path d="M392 204h48M394 220h44" stroke="#F59E0B" strokeWidth="1.5" />
        <path d="M398 188q8-10 16-2 10-8 20 2" fill="#F9A8D4" />
        <rect x="500" y="200" width="30" height="36" rx="5" fill="#F472B6" />
        <path d="M515 200q-20-30-6-44M515 200q4-34 22-40M515 200q-26-12-34-30" stroke="#22C55E" strokeWidth="5" fill="none" strokeLinecap="round" />
      </g>
      {/* mirror */}
      <rect x="34" y="30" width="82" height="104" rx="41" fill="#fff" />
      <rect x="40" y="36" width="70" height="92" rx="35" fill="#E0F2FE" />
      <path d="M60 56l-8 14M72 50 56 78" stroke="#fff" strokeWidth="4" strokeLinecap="round" />
      {/* sink */}
      <rect x="70" y="146" width="10" height="16" rx="3" fill="#94A3B8" />
      <path d="M75 148h13v8" stroke="#94A3B8" strokeWidth="5" strokeLinecap="round" fill="none" />
      {water && <Drops x={88} y={162} len={16} n={3} reduced={reduced} />}
      <path d="M22 160h106q6 0 5 7-5 25-58 25T17 167q-1-7 5-7z" fill="#fff" stroke="#CBD5E1" strokeWidth="2" />
      <path d="M64 190h22l-3 46h-16z" fill="#F8FAFC" stroke="#CBD5E1" strokeWidth="2" />
      <rect x="106" y="142" width="14" height="18" rx="3" fill="#F472B6" />
      <path d="M110 142l-3-12M116 142l3-12" stroke="#38BDF8" strokeWidth="3" strokeLinecap="round" />
      <ellipse cx="36" cy="157" rx="8" ry="4" fill="#FDE68A" />
      {/* towel rail: the towel goes to Toby while he dries his face */}
      <rect x="268" y="86" width="72" height="5" rx="2.5" fill="#94A3B8" />
      <Motion.g initial={false} animate={{ opacity: drying ? 0 : 1, y: drying ? -10 : 0 }} transition={{ duration: 0.4 }}>
        <path d="M278 88h52v70q0 6-6 6h-40q-6 0-6-6z" fill="#F472B6" />
        <path d="M278 140h52M278 148h52" stroke="#fff" strokeWidth="4" opacity="0.8" />
      </Motion.g>
      {drying && <Sparkles x={at(sp, 100, 110)[0]} y={at(sp, 100, 110)[1]} r={46} n={7} delay={0.6} reduced={reduced} colors={['#fff', '#F9A8D4', '#A5F3FC']} />}
      {/* bath + duck */}
      <Tub />
      {!inTub && <RubberDuck x={320} y={190} reduced={reduced} />}
      {!inTub && [[250, 198], [262, 194], [276, 198], [348, 196]].map(([x, y], i) => <circle key={i} cx={x} cy={y} r={4 + (i % 2) * 2} fill="#fff" stroke="#E0F2FE" />)}
      {inTub && <Steam x={300} y={150} n={3} reduced={reduced} />}
    </g>
  )
}

/* ── kitchen (breakfast) ─────────────────────────────────────────────── */
export function Kitchen({ layer, w, uid, acting, action, reduced, speaker }) {
  if (layer === 'front') {
    const show = !w.clean
    const lunch = acting && action === 'lunch'
    const bagOnTable = (w.packed || action === 'lunch') && !(acting && action === 'bag')
    return (
      <g>
        <rect x="100" y="240" width="10" height="60" fill="#92400E" />
        <rect x="250" y="240" width="10" height="60" fill="#92400E" />
        <path d="M86 230h188v18q0 6-6 6H92q-6 0-6-6z" fill="#FB7185" />
        <rect x="86" y="226" width="188" height="8" rx="4" fill="#FDA4AF" />
        {[100, 124, 148, 172, 196, 220, 244, 262].map(x => <rect key={x} x={x} y="246" width="10" height="8" fill="#fff" opacity="0.5" />)}
        <AnimatePresence>
          {show && w.ate && (
            <Motion.g key="plate" exit={{ opacity: 0 }}>
              <ellipse cx="148" cy="228" rx="24" ry="6" fill="#fff" stroke="#E2E8F0" strokeWidth="2" />
              <circle cx="142" cy="226" r="1.4" fill="#E7A65A" />
              <circle cx="155" cy="227" r="1.2" fill="#FACC15" />
            </Motion.g>
          )}
          {show && w.tea && (
            <Motion.g key="tea" initial={{ scale: 0 }} animate={{ scale: 1 }} exit={{ opacity: 0 }} style={{ originX: 0.5, originY: 1 }}>
              <ItemArt name="cup" transform="translate(246 216) scale(1.45)" />
              {acting && action === 'tea' && <Steam x={245} y={198} reduced={reduced} />}
            </Motion.g>
          )}
          {show && w.juice && !(acting && action === 'drink') && (
            <Motion.g key="glass" exit={{ opacity: 0 }}>
              <ItemArt name="glass" drain reduced transform="translate(212 212) scale(1.35)" />
            </Motion.g>
          )}
          {bagOnTable && (
            <Motion.g key="backpack" initial={reduced ? false : { y: 30, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ opacity: 0, y: -20 }}
              transition={{ type: 'spring', stiffness: 200, damping: 16 }}>
              <Motion.g style={{ transformBox: 'view-box', originX: '232px', originY: '230px' }}
                animate={lunch && !reduced ? { scaleY: [1, 1, 0.86, 1.06, 1] } : { scaleY: 1 }}
                transition={{ duration: 0.6, delay: 1.5, times: [0, 0.1, 0.4, 0.7, 1] }}>
                <ItemArt name="backpack" transform="translate(232 210) scale(1.25)" />
              </Motion.g>
            </Motion.g>
          )}
        </AnimatePresence>
        {lunch && !reduced && (
          <Motion.g style={AT0} initial={{ x: 104, y: 150, opacity: 0 }} animate={{ x: [104, 170, 232], y: [150, 96, 200], opacity: [0, 1, 1], scale: [1, 1, 0.6] }}
            transition={{ duration: 1.2, delay: 0.4, times: [0, 0.5, 1] }}>
            <ItemArt name="lunchbox" transform="scale(1.1)" />
          </Motion.g>
        )}
        {lunch && <Sparkles x={232} y={206} r={30} delay={1.6} reduced={reduced} />}
      </g>
    )
  }
  const boiling = acting && action === 'tea'
  const mumWaves = acting && (action === 'hellomum' || action === 'bag')
  return (
    <g>
      <defs>
        <Grad id={`${uid}wall`} stops={['#FEF3C7', '#FDE68A']} />
        <Grad id={`${uid}sky`} stops={SKY.day} />
      </defs>
      <Wall fill={`url(#${uid}wall)`} />
      {/* window */}
      <rect x="138" y="30" width="92" height="76" rx="10" fill="#fff" />
      <rect x="145" y="37" width="78" height="62" rx="6" fill={`url(#${uid}sky)`} />
      <circle cx="200" cy="56" r="9" fill="#FDE047" />
      <rect x="182" y="37" width="4" height="62" fill="#fff" />
      <rect x="132" y="104" width="104" height="6" rx="3" fill="#fff" />
      <path d="M150 104l3-12h14l3 12z" fill="#F97316" />
      <path d="M160 92q-8-14 0-20 4 8 0 20zM160 92q6-16 14-14-4 10-14 14z" fill="#22C55E" />
      {/* left (wide): calendar + pantry door */}
      <g>
        <rect x="-96" y="40" width="44" height="52" rx="4" fill="#fff" />
        <rect x="-96" y="40" width="44" height="12" rx="4" fill="#F43F5E" />
        {[0, 1, 2, 3].map(r => [0, 1, 2, 3].map(c => <rect key={`${r}${c}`} x={-91 + c * 10} y={57 + r * 8} width="6" height="5" rx="1" fill={r === 1 && c === 2 ? '#F43F5E' : '#E2E8F0'} />))}
        <rect x="-240" y="70" width="90" height="166" rx="6" fill="#B45309" />
        <rect x="-232" y="80" width="74" height="70" rx="4" fill="#C2410C" opacity="0.5" />
        <rect x="-232" y="160" width="74" height="66" rx="4" fill="#C2410C" opacity="0.5" />
        <circle cx="-164" cy="160" r="4" fill="#FDE047" />
      </g>
      {/* fridge */}
      <rect x="6" y="60" width="70" height="176" rx="12" fill="#F8FAFC" stroke="#CBD5E1" strokeWidth="3" />
      <path d="M6 120h70" stroke="#CBD5E1" strokeWidth="3" />
      <rect x="62" y="82" width="5" height="26" rx="2.5" fill="#94A3B8" />
      <rect x="62" y="130" width="5" height="36" rx="2.5" fill="#94A3B8" />
      <circle cx="24" cy="80" r="4" fill="#F43F5E" />
      <circle cx="40" cy="94" r="3.5" fill="#3B82F6" />
      <rect x="18" y="136" width="20" height="16" rx="2" fill="#FDE047" transform="rotate(-6 28 144)" />
      {/* counter: tiles, then Mum behind it, then the worktop */}
      <rect x="76" y="150" width={590} height="32" fill="#fff" opacity="0.5" />
      <path d="M106 150v32M136 150v32M166 150v32M196 150v32M226 150v32M256 150v32M286 150v32M316 150v32M346 150v32" stroke="#FDE68A" strokeWidth="2" />
      <g transform="translate(104 194) scale(.82)">
        <Mum talking={speaker === 'other'} wave={mumWaves} cheer={acting && action === 'yum'} reduced={reduced} />
      </g>
      <rect x="76" y="180" width={590} height="10" rx="3" fill="#E2E8F0" />
      <rect x="76" y="190" width={590} height="46" fill="#5EEAD4" />
      <path d="M136 190v46M196 190v46M256 190v46M316 190v46M376 190v46M436 190v46M496 190v46M556 190v46M616 190v46" stroke="#2DD4BF" strokeWidth="2" />
      {[126, 186, 246, 306, 366, 426, 486, 546, 606].map(x => <circle key={x} cx={x} cy="206" r="2.5" fill="#0F766E" />)}
      {/* shelf + jars */}
      <rect x="250" y="76" width="100" height="6" rx="3" fill="#B45309" />
      {[[262, '#F87171'], [292, '#FBBF24'], [322, '#60A5FA']].map(([x, c]) => (
        <g key={x}>
          <rect x={x - 9} y="54" width="18" height="22" rx="4" fill="#fff" opacity="0.85" />
          <rect x={x - 9} y="62" width="18" height="14" rx="3" fill={c} opacity="0.8" />
          <rect x={x - 10} y="50" width="20" height="6" rx="2" fill={c} />
        </g>
      ))}
      {/* right (wide): oven + hanging pans */}
      <g>
        <rect x="420" y="120" width="80" height="60" rx="6" fill="#E2E8F0" />
        <rect x="430" y="130" width="60" height="38" rx="4" fill="#334155" />
        <path d="M520 60h120" stroke="#94A3B8" strokeWidth="4" strokeLinecap="round" />
        {[540, 580, 620].map((x, i) => (
          <g key={x}>
            <path d={`M${x} 62v10`} stroke="#94A3B8" strokeWidth="2" />
            <circle cx={x} cy={84 + i * 2} r={12 - i * 2} fill={['#F97316', '#64748B', '#EF4444'][i]} />
          </g>
        ))}
      </g>
      {/* hob + kettle */}
      <rect x="276" y="174" width="72" height="8" rx="3" fill="#334155" />
      <Motion.g style={{ originX: 0.5, originY: 1 }} animate={boiling && !reduced ? { rotate: [-4, 4, -4] } : { rotate: 0 }}
        transition={boiling ? { duration: 0.2, repeat: 10 } : { duration: 0.2 }}>
        <path d="M296 174q-2-24 16-26 18 2 16 26z" fill="#F43F5E" />
        <circle cx="312" cy="146" r="3.5" fill="#BE123C" />
        <path d="M298 162l-10-8" stroke="#F43F5E" strokeWidth="6" strokeLinecap="round" />
        <path d="M302 150q10-14 20 0" stroke="#BE123C" strokeWidth="4" fill="none" />
      </Motion.g>
      {boiling && <Steam x={288} y={150} reduced={reduced} />}
      <Floor fill="#FED7AA" />
      <path d={`M${BX} 262H${BX + BW}`} stroke="#FDBA74" strokeWidth="2" />
      {Array.from({ length: 13 }, (_, i) => <path key={i} d={`M${-260 + i * 80} 236v64`} stroke="#FDBA74" strokeWidth="2" />)}
    </g>
  )
}

/* ── living room (evening) ───────────────────────────────────────────── */
export function Living({ layer, w, uid, reduced }) {
  if (layer === 'front') return null
  const open = !w.here
  return (
    <g>
      <defs>
        <Grad id={`${uid}wall`} stops={['#FED7AA', '#FBCFE8']} />
        <Grad id={`${uid}sky`} stops={SKY.dusk} />
        <radialGradient id={`${uid}lamp`}><stop offset="0" stopColor="#FEF08A" stopOpacity="0.6" /><stop offset="1" stopColor="#FEF08A" stopOpacity="0" /></radialGradient>
      </defs>
      <Wall fill={`url(#${uid}wall)`} />
      {/* left (wide): plant + bookcase */}
      <g>
        <rect x="-200" y="96" width="96" height="140" rx="6" fill="#92400E" />
        {[124, 166, 208].map(y => <rect key={y} x="-194" y={y} width="84" height="5" fill="#B45309" />)}
        {[['#22C55E', -190, 100], ['#3B82F6', -180, 104], ['#F43F5E', -170, 98], ['#FACC15', -158, 140], ['#A855F7', -148, 144], ['#F97316', -186, 184]].map(([c, x, y]) => (
          <rect key={`${x}${y}`} x={x} y={y} width="8" height="24" rx="2" fill={c} />
        ))}
        <rect x="-70" y="200" width="34" height="36" rx="6" fill="#F97316" />
        <path d="M-53 200q-22-34-4-56M-53 200q6-40 26-46M-53 200q-30-14-40-36" stroke="#16A34A" strokeWidth="6" fill="none" strokeLinecap="round" />
      </g>
      {/* right (wide): floor lamp + armchair */}
      <g>
        <circle cx="400" cy="90" r="60" fill={`url(#${uid}lamp)`} />
        <path d="M380 92h40l-8-30h-24z" fill="#FDE68A" />
        <rect x="398" y="92" width="4" height="144" fill="#78350F" />
        <ellipse cx="400" cy="236" rx="16" ry="4" fill="#78350F" />
        <rect x="460" y="168" width="100" height="44" rx="16" fill="#0EA5E9" />
        <rect x="452" y="200" width="116" height="36" rx="12" fill="#0284C7" />
      </g>
      {/* window with sunset */}
      <rect x="230" y="38" width="104" height="88" rx="10" fill="#fff" />
      <rect x="237" y="45" width="90" height="74" rx="6" fill={`url(#${uid}sky)`} />
      <circle cx="282" cy="112" r="14" fill="#FDE047" />
      <path d="M237 119v-14h10v-8h12v12h8v-18h14v20h10v-10h12v6h12v12h12v-6h0v6z" fill="#4C1D95" />
      <rect x="280" y="45" width="4" height="74" fill="#fff" />
      {/* door */}
      <rect x="16" y="90" width="82" height="148" rx="6" fill="#78350F" />
      <rect x="22" y="96" width="70" height="140" fill="#1E3A8A" />
      {[[34, 116], [70, 130], [50, 160], [80, 104]].map(([x, y], i) => <circle key={i} cx={x} cy={y} r="1.6" fill="#fff" opacity="0.8" />)}
      <Motion.g style={{ originX: 0, originY: 0.5 }} initial={false} animate={{ scaleX: open ? 0.16 : 1 }} transition={{ duration: reduced ? 0 : 0.8, ease: 'easeInOut' }}>
        <rect x="22" y="96" width="70" height="140" rx="3" fill="#B45309" />
        <rect x="30" y="106" width="54" height="52" rx="4" fill="#C2410C" opacity="0.5" />
        <rect x="30" y="168" width="54" height="58" rx="4" fill="#C2410C" opacity="0.5" />
        <circle cx="82" cy="170" r="4" fill="#FDE047" />
      </Motion.g>
      {/* family photo */}
      <g transform="translate(144 46)">
        <rect width="54" height="42" rx="4" fill="#FFF7ED" stroke="#D97706" strokeWidth="3" />
        <circle cx="16" cy="22" r="8" fill="#F9A8D4" />
        <circle cx="38" cy="22" r="8" fill="#93C5FD" />
        <circle cx="27" cy="27" r="6" fill="#FFF6EA" stroke="#D9BC9C" />
        <path d="M6 38h42" stroke="#FDE68A" strokeWidth="4" />
      </g>
      {/* sofa */}
      <rect x="112" y="168" width="120" height="48" rx="16" fill="#8B5CF6" />
      <rect x="104" y="204" width="136" height="32" rx="12" fill="#7C3AED" />
      <rect x="96" y="188" width="22" height="48" rx="10" fill="#6D28D9" />
      <rect x="226" y="188" width="22" height="48" rx="10" fill="#6D28D9" />
      <rect x="126" y="180" width="30" height="24" rx="8" fill="#FDE047" opacity="0.85" />
      <Floor fill="#D6A06A" lines={[258, 280]} line="#C48A55" />
      <ellipse cx="180" cy="274" rx="104" ry="15" fill="#FDE68A" opacity="0.75" />
    </g>
  )
}

/* ── hall: shoes, coats and the front door ───────────────────────────── */
const SHOE_FRONT = 'M-17 3q0-13 17-13t17 13v3q0 5-5 5h-24q-5 0-5-5z'
function WornShoe({ x, y, s, delay, reduced }) {
  return (
    <Motion.g style={{ transformBox: 'view-box', originX: '0px', originY: '0px' }}
      initial={reduced ? { x, y, scale: s, opacity: 1 } : { x: 60, y: 200, scale: s * 0.6, opacity: 0, rotate: -40 }}
      animate={{ x, y, scale: s, opacity: 1, rotate: 0 }}
      transition={{ duration: reduced ? 0 : 0.7, delay: reduced ? 0 : delay, ease: 'easeOut' }}>
      <path d={SHOE_FRONT} fill="#EF4444" stroke="#B91C1C" strokeWidth="2" />
      <ellipse cx="0" cy="4" rx="10" ry="4.5" fill="#fff" />
      <rect x="-17" y="6.5" width="34" height="4.5" rx="2.2" fill="#fff" stroke="#CBD5E1" strokeWidth="1" />
      <path d="M-5-6l3 2M1-7l3 2" stroke="#fff" strokeWidth="2" strokeLinecap="round" />
    </Motion.g>
  )
}

export function Hall({ layer, w, uid, acting, action, reduced, sp }) {
  const open = !!w.outside
  if (layer === 'front') {
    const shoes = acting && action === 'shoes'
    if (!shoes) return null
    const [lx, ly] = at(sp, 78, 232)
    const [rx, ry] = at(sp, 122, 232)
    return (
      <g>
        <WornShoe x={lx} y={ly} s={sp.s} delay={0.9} reduced={reduced} />
        <WornShoe x={rx} y={ry} s={sp.s} delay={1.15} reduced={reduced} />
        <Sparkles x={(lx + rx) / 2} y={ly} r={34} n={7} delay={1.6} reduced={reduced} />
      </g>
    )
  }
  const shoesOnRack = !w.shoes && !(acting && action === 'shoes')
  return (
    <g>
      <defs>
        <Grad id={`${uid}wall`} stops={['#FFF7ED', '#FEF3C7']} />
        <Grad id={`${uid}out`} stops={['#7DD3FC', '#E0F2FE']} />
        <pattern id={`${uid}paper`} width="24" height="24" patternUnits="userSpaceOnUse">
          <rect width="24" height="24" fill={`url(#${uid}wall)`} />
          <rect width="12" height="24" fill="#FDE68A" opacity="0.28" />
          <circle cx="18" cy="6" r="1.6" fill="#F59E0B" opacity="0.35" />
        </pattern>
      </defs>
      <Wall fill={`url(#${uid}paper)`} />
      <rect x={BX} y="176" width={BW} height="60" fill="#FDE68A" />
      <rect x={BX} y="172" width={BW} height="6" rx="3" fill="#F59E0B" />
      <Floor fill="#D6A06A" lines={[258, 280]} line="#C48A55" />
      <ellipse cx="170" cy="276" rx="96" ry="14" fill="#F472B6" opacity="0.55" />
      <ellipse cx="170" cy="276" rx="80" ry="9" fill="none" stroke="#fff" strokeWidth="2" strokeDasharray="5 6" opacity="0.7" />

      {/* left (wide): a bench and a big plant */}
      <g>
        <rect x="-200" y="200" width="120" height="12" rx="5" fill="#B45309" />
        <rect x="-192" y="212" width="8" height="24" fill="#92400E" />
        <rect x="-96" y="212" width="8" height="24" fill="#92400E" />
        <rect x="-60" y="196" width="36" height="40" rx="6" fill="#0EA5E9" />
        <path d="M-42 196q-24-40-6-70M-42 196q8-46 30-52M-42 196q-34-16-44-44" stroke="#16A34A" strokeWidth="7" fill="none" strokeLinecap="round" />
        <rect x="-250" y="70" width="60" height="44" rx="5" fill="#fff" stroke="#D97706" strokeWidth="3" />
        <path d="M-244 108l14-18 10 10 8-8 16 16z" fill="#4ADE80" />
      </g>
      {/* right (wide): window to the garden */}
      <g>
        <rect x="380" y="56" width="110" height="90" rx="10" fill="#fff" />
        <rect x="388" y="64" width="94" height="74" rx="6" fill={`url(#${uid}out)`} />
        <circle cx="460" cy="86" r="10" fill="#FDE047" />
        <path d="M388 138v-18q20-12 40-4t54-4v26z" fill="#4ADE80" />
        <rect x="433" y="64" width="4" height="74" fill="#fff" />
        <rect x="520" y="180" width="40" height="56" rx="4" fill="#F59E0B" />
        <rect x="514" y="176" width="52" height="8" rx="3" fill="#D97706" />
      </g>

      {/* coat hooks */}
      <rect x="22" y="86" width="104" height="8" rx="4" fill="#92400E" />
      {[38, 74, 108].map(x => <circle key={x} cx={x} cy="96" r="3.5" fill="#FDE047" />)}
      <path d="M30 98h20l8 70q-18 6-36 0z" fill="#FACC15" />
      <path d="M40 98v66" stroke="#EAB308" strokeWidth="2" />
      <circle cx="36" cy="120" r="1.8" fill="#CA8A04" /><circle cx="36" cy="136" r="1.8" fill="#CA8A04" />
      <path d="M68 98q6 30-2 62M80 98q-6 30 4 62" stroke="#3B82F6" strokeWidth="7" fill="none" strokeLinecap="round" />
      <path d="M96 100q12-14 24 0v6h-24z" fill="#EF4444" />
      <path d="M118 106h10" stroke="#B91C1C" strokeWidth="3" strokeLinecap="round" />
      {/* shoe rack */}
      <rect x="18" y="194" width="104" height="42" rx="4" fill="#B45309" />
      <rect x="22" y="198" width="96" height="16" fill="#92400E" />
      <rect x="22" y="218" width="96" height="16" fill="#92400E" />
      <AnimatePresence>
        {shoesOnRack && (
          <Motion.g key="sneakers" exit={{ opacity: 0, y: -10 }} transition={{ duration: 0.3 }}>
            <ItemArt name="shoes" transform="translate(52 204) scale(.9)" />
          </Motion.g>
        )}
      </AnimatePresence>
      {/* rain boots + Mum's shoes */}
      <path d="M86 214v-14h8v10h6v4z" fill="#FACC15" />
      <path d="M100 214v-14h8v10h6v4z" fill="#FDE047" />
      <path d="M30 234q2-8 12-8l8 4v4zM54 234q2-8 12-8l8 4v4z" fill="#F472B6" />
      <path d="M86 234q0-8 10-8h10l4 8z" fill="#475569" />
      {/* umbrella stand */}
      <rect x="132" y="206" width="22" height="30" rx="4" fill="#64748B" />
      <path d="M143 206V170" stroke="#1E293B" strokeWidth="2.5" />
      <path d="M135 196q8-30 16 0z" fill="#22C55E" />
      <path d="M143 170q-4-6 2-8" stroke="#1E293B" strokeWidth="2" fill="none" />
      {/* round mirror + a key hook */}
      <circle cx="186" cy="104" r="26" fill="#FDBA74" />
      <circle cx="186" cy="104" r="21" fill="#E0F2FE" />
      <path d="M176 92l-6 10M184 88l-12 20" stroke="#fff" strokeWidth="3" strokeLinecap="round" />
      <rect x="170" y="148" width="32" height="6" rx="3" fill="#92400E" />
      <circle cx="180" cy="160" r="4" fill="none" stroke="#FACC15" strokeWidth="2" />
      <path d="M180 164v6" stroke="#FACC15" strokeWidth="2" />
      {/* front door: the outside shows when it opens */}
      <rect x="232" y="64" width="92" height="174" rx="8" fill="#78350F" />
      <rect x="240" y="72" width="76" height="166" fill={`url(#${uid}out)`} />
      <circle cx="292" cy="98" r="10" fill="#FDE047" />
      <path d="M240 206q20-14 40-6t36-4v42h-76z" fill="#4ADE80" />
      <path d="M262 238l14-40h6l14 40z" fill="#E7D3BE" />
      <circle cx="254" cy="176" r="14" fill="#22C55E" />
      <rect x="252" y="186" width="4" height="20" fill="#92400E" />
      <Motion.g style={{ transformBox: 'view-box', originX: '316px', originY: '0px' }} initial={false}
        animate={{ scaleX: open ? 0.14 : 1 }} transition={{ duration: reduced ? 0 : 0.9, ease: 'easeInOut' }}>
        <rect x="240" y="72" width="76" height="166" rx="3" fill="#0D9488" />
        <circle cx="278" cy="104" r="15" fill="#BAE6FD" stroke="#0F766E" strokeWidth="4" />
        <path d="M278 89v30M263 104h30" stroke="#0F766E" strokeWidth="2" />
        <rect x="252" y="134" width="52" height="40" rx="5" fill="#14B8A6" />
        <rect x="252" y="184" width="52" height="44" rx="5" fill="#14B8A6" />
        <rect x="264" y="146" width="28" height="6" rx="2" fill="#FDE68A" />
        <circle cx="306" cy="164" r="4.5" fill="#FDE047" />
      </Motion.g>
      {open && <Motion.path d="M240 238h76l60 62H190z" fill="#FEF08A" initial={{ opacity: 0 }} animate={{ opacity: 0.4 }} transition={{ duration: 0.8, delay: 0.3 }} />}
      <ellipse cx="278" cy="246" rx="44" ry="7" fill="#A16207" />
      <path d="M244 246h68" stroke="#CA8A04" strokeWidth="1.5" strokeDasharray="3 4" />
      {acting && action === 'door' && <Pop x={268} y={58} text="Hello, sun!" size={13} fill="#FDE047" stroke="#B45309" reduced={reduced} delay={0.8} />}
    </g>
  )
}
