/*
 * TOBY'S DAY — the shop (Toby Mart) and the park, painted wider than the
 * 360 view. Room props: { layer, w, uid, acting, action, reduced, speaker, sp }.
 */
import { AnimatePresence, motion as Motion } from 'framer-motion'
import { ItemArt } from './items'
import { Buddy, Duck } from './characters'
import { AT0, BW, BX, LEFT_PAW, SKY, at } from './world-geo'
import { Clouds, Birds, Floor, Grad, Pop, Sparkles, Wall } from './scene-kit'

/* ── shop ────────────────────────────────────────────────────────────── */
export function Shop({ layer, w, uid, acting, action, speaker, reduced, sp }) {
  const packing = acting && action === 'packbag'
  if (layer === 'front') {
    const bagOnCounter = packing
    return (
      <g>
        <rect x="236" y="198" width="130" height="62" rx="8" fill="#A855F7" />
        <rect x="232" y="190" width="134" height="12" rx="6" fill="#C084FC" />
        <path d="M262 206v50M300 206v50M338 206v50" stroke="#9333EA" strokeWidth="2" />
        <rect x="366" y="198" width="200" height="62" rx="8" fill="#9333EA" />
        <rect x="366" y="190" width="204" height="12" rx="6" fill="#A855F7" />
        <rect x="242" y="158" width="52" height="34" rx="6" fill="#475569" />
        <rect x="248" y="164" width="40" height="14" rx="2" fill="#0F172A" />
        {w.priced && (
          <Motion.text x="268" y="175" textAnchor="middle" fontSize="10.5" fontWeight="800" fill="#4ADE80" fontFamily="ui-monospace, monospace"
            initial={{ opacity: 0 }} animate={{ opacity: reduced ? 1 : [0, 1, 0.4, 1] }} transition={{ duration: 0.8 }}>$8.00</Motion.text>
        )}
        {[0, 1, 2].map(i => <rect key={i} x={250 + i * 13} y="182" width="9" height="5" rx="1.5" fill="#94A3B8" />)}
        {bagOnCounter && (
          <Motion.g initial={reduced ? false : { y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ duration: 0.4 }}>
            <ItemArt name="shopbag" basket={[]} transform="translate(320 170) scale(1.5)" />
          </Motion.g>
        )}
        {packing && !reduced && (w.basket || []).slice(-4).map((name, i) => {
          const [x0, y0] = at(sp, LEFT_PAW[0], LEFT_PAW[1] + 14)
          return (
            <Motion.g key={`${name}${i}`} style={AT0} initial={{ x: x0, y: y0, opacity: 0, scale: 0.9 }}
              animate={{ x: [x0, (x0 + 320) / 2, 320, 320], y: [y0, 110, 160, 168], opacity: [0, 1, 1, 0], scale: [0.9, 1.1, 0.7, 0.5] }}
              transition={{ duration: 0.9, delay: 0.5 + i * 0.35, times: [0, 0.45, 0.85, 1] }}>
              <ItemArt name={name} />
            </Motion.g>
          )
        })}
        {packing && <Sparkles x={320} y={160} r={30} delay={2} reduced={reduced} />}
      </g>
    )
  }
  const shelves = [
    { y: 92, items: ['apples', 'oranges', 'bananas', 'grapes', 'apples', 'oranges'] },
    { y: 140, items: ['milk', 'juice', 'water', 'milk', 'juice', 'water'] },
    { y: 188, items: ['bread', 'cheese', 'cookies', 'chocolate', 'bread', 'eggs'] },
  ]
  const entering = acting && action === 'enter'
  return (
    <g>
      <defs><Grad id={`${uid}wall`} stops={['#FAE8FF', '#E9D5FF']} /></defs>
      <Wall fill={`url(#${uid}wall)`} />
      {/* left (wide): the glass door and a drinks fridge */}
      <g>
        <rect x="-74" y="64" width="78" height="172" rx="6" fill="#7E22CE" />
        <rect x="-66" y="72" width="62" height="164" fill="#E0F2FE" opacity="0.85" />
        <path d="M-56 90l30 40M-40 90l20 26" stroke="#fff" strokeWidth="4" strokeLinecap="round" opacity="0.8" />
        <rect x="-250" y="70" width="150" height="166" rx="10" fill="#E2E8F0" />
        {[0, 1, 2].map(r => (
          <g key={r}>
            <rect x="-242" y={80 + r * 50} width="134" height="44" rx="4" fill="#BAE6FD" />
            {['water', 'juice', 'milk', 'water', 'juice'].map((it, i) => <ItemArt key={i} name={it} transform={`translate(${-228 + i * 26} ${102 + r * 50}) scale(.8)`} />)}
          </g>
        ))}
      </g>
      {/* right (wide): fruit crates and a SALE sign */}
      <g>
        <rect x="392" y="40" width="96" height="34" rx="8" fill="#F43F5E" />
        <text x="440" y="64" textAnchor="middle" fontSize="18" fontWeight="900" fill="#fff" fontFamily="system-ui, sans-serif">SALE</text>
        {[['apples', 400], ['oranges', 452], ['bananas', 504], ['grapes', 556]].map(([it, x]) => (
          <g key={it}>
            <rect x={x - 22} y="120" width="44" height="40" rx="4" fill="#D97706" />
            {[-12, 0, 12].map(dx => <ItemArt key={dx} name={it} transform={`translate(${x + dx} 116) scale(.7)`} />)}
            <path d={`M${x - 22} 134h44M${x - 22} 148h44`} stroke="#B45309" strokeWidth="2" />
          </g>
        ))}
      </g>
      <rect x="116" y="8" width="128" height="30" rx="15" fill="#DB2777" />
      <text x="180" y="29" textAnchor="middle" fontSize="15" fontWeight="900" fill="#fff" letterSpacing="1.5" fontFamily="system-ui, sans-serif">TOBY MART</text>
      {/* the OPEN sign by the door, and its bell */}
      <path d="M20 6v8" stroke="#94A3B8" strokeWidth="2" />
      <rect x="2" y="14" width="40" height="18" rx="4" fill="#fff" stroke="#22C55E" strokeWidth="2" />
      <text x="22" y="27" textAnchor="middle" fontSize="10" fontWeight="900" fill="#16A34A" fontFamily="system-ui, sans-serif">OPEN</text>
      <Motion.g style={{ transformBox: 'view-box', originX: '-8px', originY: '40px' }}
        animate={entering && !reduced ? { rotate: [-25, 25, -18, 14, 0] } : { rotate: 0 }} transition={{ duration: 1, delay: 0.2 }}>
        <path d="M-8 40v6" stroke="#94A3B8" strokeWidth="1.5" />
        <path d="M-15 56q0-11 7-11t7 11z" fill="#FACC15" />
        <circle cx="-8" cy="58" r="2" fill="#CA8A04" />
      </Motion.g>
      {entering && <Pop x={30} y={70} text="ding-dong!" size={13} fill="#FDE047" stroke="#7E22CE" reduced={reduced} delay={0.3} />}
      <rect x="6" y="46" width="228" height="152" rx="10" fill="#fff" opacity="0.45" />
      {shelves.map(s => (
        <g key={s.y}>
          {s.items.map((it, i) => <ItemArt key={i} name={it} transform={`translate(${28 + i * 37} ${s.y - 14}) scale(.95)`} />)}
          <rect x="6" y={s.y} width="228" height="6" rx="3" fill="#A16207" />
        </g>
      ))}
      <Floor fill="#F5D0FE" />
      {Array.from({ length: 32 }, (_, i) => <rect key={i} x={BX + i * 30 + (i % 2 ? 0 : 15)} y={i % 2 ? 254 : 278} width="15" height="15" fill="#E879F9" opacity="0.18" />)}
      <g transform="translate(316 198) scale(.92)">
        <Buddy color="#C4B5FD" belly="#EDE9FE" dark="#8B5CF6" acc="apron" talking={speaker === 'other'}
          wave={acting && (action === 'bye' || action === 'basket' || action === 'enter')} cheer={acting && (action === 'pay' || action === 'packbag')} reduced={reduced} />
      </g>
    </g>
  )
}

/* ── park ────────────────────────────────────────────────────────────── */
function Slide({ reduced, sliding }) {
  return (
    <g>
      <rect x="306" y="156" width="5" height="136" fill="#2563EB" />
      <rect x="328" y="156" width="5" height="136" fill="#2563EB" />
      {[176, 196, 216, 236, 256, 276].map(y => <rect key={y} x="306" y={y} width="27" height="4" rx="2" fill="#60A5FA" />)}
      <rect x="286" y="150" width="50" height="10" rx="4" fill="#1D4ED8" />
      <path d="M290 150v-14h44v14" stroke="#F43F5E" strokeWidth="4" fill="none" strokeLinejoin="round" />
      <path d="M292 156C258 168 250 270 200 284" stroke="#EA580C" strokeWidth="22" fill="none" strokeLinecap="round" />
      <path d="M292 156C258 168 250 270 200 284" stroke="#FB923C" strokeWidth="14" fill="none" strokeLinecap="round" />
      <path d="M290 154C262 166 252 262 206 278" stroke="#FED7AA" strokeWidth="3" fill="none" strokeLinecap="round" opacity="0.8" />
      {sliding && <Pop x={240} y={190} text="Wheee!" size={18} fill="#FDE047" stroke="#C2410C" delay={2.6} reduced={reduced} />}
    </g>
  )
}

export function Park({ layer, w, uid, acting, action, reduced, sp }) {
  const feeding = acting && action === 'ducks'
  if (layer === 'front') {
    return (
      <g>
        {w.sitting && <rect x="18" y="240" width="116" height="9" rx="4" fill="#D97706" />}
        {feeding && !reduced && Array.from({ length: 7 }, (_, i) => {
          const [hx, hy] = at(sp, 150, 150)
          const tx = 246 + (i % 4) * 12
          return (
            <Motion.circle key={i} r="2.4" fill="#E7A65A" initial={{ x: hx, y: hy, opacity: 0 }}
              animate={{ x: [hx, (hx + tx) / 2, tx, tx], y: [hy, hy - 50 - (i % 3) * 10, 214, 216], opacity: [0, 1, 1, 0] }}
              transition={{ duration: 1, delay: 0.5 + i * 0.12, times: [0, 0.5, 0.9, 1] }} />
          )
        })}
        {feeding && <Pop x={292} y={184} text="Quack!" size={15} fill="#FDE047" stroke="#B45309" delay={1.6} reduced={reduced} repeat />}
      </g>
    )
  }
  const sliding = acting && action === 'slide'
  return (
    <g>
      <defs><Grad id={`${uid}sky`} stops={SKY.day} /></defs>
      <Wall fill={`url(#${uid}sky)`} to={240} />
      <Motion.circle cx="306" cy="48" r="32" fill="#FEF08A" opacity="0.5" style={{ originX: 0.5, originY: 0.5 }}
        animate={reduced ? undefined : { scale: [0.94, 1.12, 0.94] }} transition={{ duration: 3, repeat: Infinity }} />
      <circle cx="306" cy="48" r="20" fill="#FDE047" />
      <Clouds reduced={reduced} y={44} />
      <Birds reduced={reduced} y={70} />
      <path d={`M${BX} 200Q-180 150 -60 186T130 182T260 174T460 160T${BX + BW} 176V240H${BX}z`} fill="#86EFAC" />
      <rect x={BX} y="206" width={BW} height="94" fill="#4ADE80" />
      <ellipse cx="236" cy="216" rx="116" ry="13" fill="#38BDF8" />
      <path d="M160 214h28M246 220h40M300 212h22" stroke="#BAE6FD" strokeWidth="2.5" strokeLinecap="round" />
      {/* ducks on the lake: they swim over when Toby has bread */}
      {[[300, 0], [336, 1]].map(([x, i]) => (
        <Motion.g key={i} initial={false} animate={{ x: feeding || w.fed ? 256 + i * 30 - x : 0 }}
          transition={{ duration: reduced ? 0 : 2.2, delay: feeding ? 0.8 + i * 0.3 : 0, ease: 'easeInOut' }}>
          <Motion.g animate={reduced || feeding ? undefined : { x: [0, i ? -10 : 10, 0] }} transition={{ duration: 6 + i, repeat: Infinity, ease: 'easeInOut' }}>
            <g transform={`translate(${x} ${219 - i * 4}) scale(-.72 .72)`}>
              <Duck peck={feeding} reduced={reduced} color={i ? '#fff' : '#FACC15'} />
            </g>
          </Motion.g>
        </Motion.g>
      ))}
      <path d={`M${BX} 276Q-120 252 0 266T180 262T360 252T${BX + BW} 260V300H${BX}z`} fill="#FDE68A" opacity="0.85" />
      {/* trees */}
      <rect x="20" y="150" width="12" height="62" rx="4" fill="#92400E" />
      <circle cx="26" cy="138" r="26" fill="#16A34A" />
      <circle cx="8" cy="156" r="17" fill="#22C55E" />
      <circle cx="46" cy="156" r="17" fill="#22C55E" />
      <rect x="334" y="166" width="10" height="46" rx="4" fill="#92400E" />
      <circle cx="339" cy="156" r="20" fill="#22C55E" />
      {/* left / right (wide): more trees, a swing, a fountain */}
      <g>
        <rect x="-118" y="140" width="14" height="72" rx="4" fill="#92400E" />
        <circle cx="-111" cy="128" r="32" fill="#15803D" />
        <circle cx="-136" cy="150" r="18" fill="#22C55E" />
        <path d="M-250 150h90M-246 150l-10 80M-164 150l10 80" stroke="#B45309" strokeWidth="6" strokeLinecap="round" />
        <Motion.g style={{ transformBox: 'view-box', originX: '-205px', originY: '150px' }}
          animate={reduced ? undefined : { rotate: [-14, 14, -14] }} transition={{ duration: 2.6, repeat: Infinity, ease: 'easeInOut' }}>
          <path d="M-220 150v52M-190 150v52" stroke="#64748B" strokeWidth="2" />
          <rect x="-226" y="200" width="42" height="7" rx="3" fill="#F43F5E" />
        </Motion.g>
        <ellipse cx="480" cy="232" rx="56" ry="12" fill="#7DD3FC" />
        <rect x="472" y="190" width="16" height="40" fill="#CBD5E1" />
        <ellipse cx="480" cy="190" rx="26" ry="7" fill="#E2E8F0" />
        <path d="M480 186q-14-30-30-6M480 186q14-30 30-6" stroke="#7DD3FC" strokeWidth="3" fill="none" strokeLinecap="round" />
        <rect x="574" y="140" width="14" height="72" rx="4" fill="#92400E" />
        <circle cx="581" cy="128" r="30" fill="#16A34A" />
      </g>
      {/* flowers */}
      {[[150, 240, '#F472B6'], [170, 246, '#FDE047'], [300, 238, '#F472B6'], [326, 248, '#fff'], [228, 296, '#FDE047'], [12, 260, '#fff'],
        [-80, 250, '#F472B6'], [-160, 270, '#FDE047'], [420, 262, '#F472B6'], [520, 280, '#fff']].map(([x, y, c], i) => (
        <g key={i}><circle cx={x} cy={y} r="3.5" fill={c} /><circle cx={x} cy={y} r="1.4" fill="#F59E0B" /></g>
      ))}
      {/* bench */}
      <rect x="22" y="212" width="108" height="7" rx="3" fill="#B45309" />
      <rect x="22" y="223" width="108" height="7" rx="3" fill="#B45309" />
      <rect x="32" y="244" width="6" height="22" fill="#78350F" />
      <rect x="114" y="244" width="6" height="22" fill="#78350F" />
      <rect x="18" y="236" width="116" height="9" rx="4" fill="#D97706" />
      <AnimatePresence>
        {action === 'slide' && (
          <Motion.g key="slide" initial={reduced ? false : { opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.5 }}>
            <Slide reduced={reduced} sliding={sliding} />
          </Motion.g>
        )}
      </AnimatePresence>
    </g>
  )
}
