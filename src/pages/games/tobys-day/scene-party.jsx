/*
 * TOBY'S DAY — the birthday party in the living room: bunting and a HAPPY
 * BIRTHDAY banner, balloons Toby puts up, his friends Lily and Sam, Mum behind
 * the party table with the big cake (its candles go out when he blows), and
 * Grandma who comes with a present.
 * Room props: { layer, w, uid, acting, action, reduced, speaker, talker, sp }.
 */
import { motion as Motion } from 'framer-motion'
import { ItemArt } from './items'
import { Grandma, Kid, Mum } from './characters'
import { AT0, BW, BX, FONT, SKY, at } from './world-geo'
import { Confetti, Floor, Grad, Pop, Puff, Sparkles, Twinkle, Wall } from './scene-kit'

const FLAGS = ['#F472B6', '#FACC15', '#38BDF8', '#34D399', '#A78BFA', '#FB923C']
const BANNER = 'HAPPY BIRTHDAY'
const CAKE = { x: 258, y: 246 }               // the cake's base on the table (left end: Mum's face stays free)
const MUM_X = 324                             // Mum behind the table, right of the cake
const GRANDMA = { x: 58, y: 240, s: 0.9 }     // behind the friends: her face above their heads
// her right paw held out (rightAngle −70) — where the present starts its flight to Toby
const GIFT_FROM = { x: GRANDMA.x + 44 * GRANDMA.s, y: GRANDMA.y - 46 * GRANDMA.s }
const NOTE = 'M-4.5 0a4.5 3.5-20 1 0 9 0a4.5 3.5-20 1 0-9 0zM3.6-1.5V-19q6 1 8 8'

/* one balloon on a string, tied at (0, 0) */
function Balloon({ c, dx = 0, h = 46, reduced, delay = 0 }) {
  return (
    <Motion.g style={AT0} animate={reduced ? undefined : { rotate: [-4, 4, -4] }} transition={{ duration: 3.4 + delay, repeat: Infinity, ease: 'easeInOut', delay }}>
      <path d={`M0 0Q${dx * 0.3 - 4} ${-h * 0.5} ${dx} ${-h}`} stroke="#94A3B8" strokeWidth="1.2" fill="none" />
      <g transform={`translate(${dx} ${-h})`}>
        <ellipse cx="0" cy="-13" rx="11" ry="13.5" fill={c} />
        <path d="M0 0l-2.6 3h5.2z" fill={c} />
        <ellipse cx="-4" cy="-18" rx="2.6" ry="4.4" fill="#fff" opacity="0.45" />
      </g>
    </Motion.g>
  )
}

function Bunch({ x, y, colors, reduced, delay = 0 }) {
  return (
    <g transform={`translate(${x} ${y})`}>
      <Balloon c={colors[0]} dx={-14} h={40} reduced={reduced} delay={delay} />
      <Balloon c={colors[1]} dx={12} h={44} reduced={reduced} delay={delay + 0.4} />
      <Balloon c={colors[2]} dx={0} h={60} reduced={reduced} delay={delay + 0.8} />
    </g>
  )
}

/* the big birthday cake on the table; `out` = candles blown out */
function BigCake({ out, blowing, reduced, uid }) {
  const { x, y } = CAKE
  return (
    <g>
      <defs>
        <radialGradient id={`${uid}glow`}>
          <stop offset="0" stopColor="#FEF08A" stopOpacity="0.55" />
          <stop offset="1" stopColor="#FEF08A" stopOpacity="0" />
        </radialGradient>
      </defs>
      <ellipse cx={x} cy={y + 2} rx="38" ry="6" fill="#E2E8F0" />
      <ellipse cx={x} cy={y} rx="34" ry="5" fill="#fff" />
      <path d={`M${x - 30} ${y - 26}h60v24q0 3-3 3h-54q-3 0-3-3z`} fill="#F9A8D4" />
      <path d={`M${x - 30} ${y - 26}h60v7q-7.5 6-15 0-7.5 6-15 0-7.5 6-15 0-7.5 6-15 0z`} fill="#fff" />
      <path d={`M${x - 20} ${y - 44}h40v18h-40z`} fill="#FBCFE8" />
      <path d={`M${x - 20} ${y - 44}h40v5q-5 4.5-10 0-5 4.5-10 0-5 4.5-10 0-5 4.5-10 0z`} fill="#fff" />
      {[-22, -11, 0, 11, 22].map(dx => <circle key={dx} cx={x + dx} cy={y - 10} r="2.2" fill="#F43F5E" />)}
      <path d={`M${x - 26} ${y - 20}v12`} stroke="#fff" strokeWidth="2.4" opacity="0.5" strokeLinecap="round" />
      {[-12, 0, 12].map((dx, i) => (
        <g key={dx}>
          <rect x={x + dx - 2} y={y - 58} width="4" height="14" rx="1.5" fill={['#60A5FA', '#FDE047', '#34D399'][i]} />
          <path d={`M${x + dx - 2} ${y - 54}l4 2.4M${x + dx - 2} ${y - 49}l4 2.4`} stroke="#fff" strokeWidth="1" opacity="0.7" />
          {!out && (
            <Motion.g style={{ transformBox: 'view-box', originX: `${x + dx}px`, originY: `${y - 58}px` }}
              animate={blowing ? { scaleY: [1, 0.6, 0], opacity: [1, 1, 0] } : reduced ? undefined : { scaleY: [1, 1.12, 0.94, 1], rotate: [-3, 3, -3] }}
              transition={blowing ? { duration: 0.6, delay: 0.9 + i * 0.15 } : { duration: 0.9, repeat: Infinity, delay: i * 0.2 }}>
              <path d={`M${x + dx} ${y - 68}c4 4 4.5 7.5 0 10-4.5-2.5-4-6 0-10z`} fill="#FDBA74" />
              <path d={`M${x + dx} ${y - 64}c2 2.4 2.2 4.2 0 5.6-2.2-1.4-2-3.2 0-5.6z`} fill="#FEF08A" />
            </Motion.g>
          )}
          {(out || blowing) && !reduced && (
            <Motion.path d={`M${x + dx} ${y - 60}q-4-6 0-11t0-11`} stroke="#CBD5E1" strokeWidth="2" fill="none" strokeLinecap="round"
              initial={{ opacity: 0 }} animate={{ opacity: [0, 0.8, 0], y: [0, -12] }}
              transition={{ duration: 1.8, delay: blowing ? 1.2 + i * 0.15 : 0, repeat: blowing ? 1 : 0 }} />
          )}
        </g>
      ))}
      {/* the candles' warm light: a soft glow (a flat disc looked like a pale ghost behind them) */}
      {!out && <circle cx={x} cy={y - 62} r="26" fill={`url(#${uid}glow)`} />}
    </g>
  )
}

export function PartyRoom({ layer, w, uid, acting, action, reduced, speaker, talker, sp }) {
  const talks = (who) => speaker === 'other' && talker === who
  const blowing = acting && action === 'blow'
  if (layer === 'front') {
    const [hx, hy] = at(sp, 100, 40)
    const [gx, gy] = at(sp, 150, 190)
    const giving = acting && action === 'gift'
    const eating = acting && action === 'cake'
    return (
      <g>
        {/* the party table: cloth, cake, cups */}
        <path d="M236 248h260v60H236z" fill="#fff" />
        <path d={`M236 248h260v14${Array.from({ length: 13 }, () => 'q-10 10-20 0').join('')}z`} fill="#FBCFE8" />
        <ellipse cx="366" cy="248" rx="130" ry="7" fill="#fff" />
        <BigCake out={!!w.candlesOut && !blowing} blowing={blowing} reduced={reduced} uid={uid} />
        <g transform="translate(334 240) scale(.8)"><ItemArt name="juice" /></g>
        <path d="M352 244h18l-2 6h-14z" fill="#F472B6" />
        <path d="M376 244h18l-2 6h-14z" fill="#38BDF8" />
        {eating && <ItemArt name="cake-slice" transform="translate(354 238) scale(.8)" />}
        {/* moments */}
        {acting && action === 'birthday' && <Confetti x={180} y={150} reduced={reduced} n={16} delay={0.3} />}
        {acting && action === 'best' && <Confetti x={180} y={140} reduced={reduced} n={18} delay={0.4} />}
        {acting && action === 'best' && <Confetti x={300} y={150} reduced={reduced} n={12} delay={0.9} />}
        {acting && action === 'partyhat' && <Puff x={hx} y={hy} reduced={reduced} />}
        {acting && action === 'partyhat' && <Sparkles x={hx} y={hy - 10} r={34} delay={0.8} reduced={reduced} />}
        {blowing && <Pop x={CAKE.x} y={150} text="Whoosh!" size={17} fill="#E0F2FE" stroke="#0369A1" delay={0.9} reduced={reduced} />}
        {giving && (
          <Motion.g style={AT0} initial={reduced ? { x: gx, y: gy } : { x: GIFT_FROM.x, y: GIFT_FROM.y, opacity: 0 }}
            animate={{ x: gx, y: gy, opacity: 1 }} transition={reduced ? { duration: 0 } : { duration: 1, delay: 0.3, ease: 'easeOut' }}>
            <ItemArt name="present" transform="scale(1.5)" />
          </Motion.g>
        )}
        {giving && <Sparkles x={gx} y={gy - 10} r={30} delay={1.3} reduced={reduced} />}
        {/* the present on the floor next to Toby, in front (not over the friends) */}
        {w.gift && !giving && <ItemArt name="present" transform="translate(120 298) scale(1.15)" />}
        {acting && action === 'song' && !reduced && [0, 1, 2, 3].map(i => (
          <Motion.g key={i} style={AT0} initial={{ x: 60 + i * 70, y: 180, opacity: 0 }}
            animate={{ y: [180, 110 - (i % 2) * 20], x: [60 + i * 70, 70 + i * 70 + (i % 2 ? 12 : -12)], opacity: [0, 1, 0], rotate: [-12, 12] }}
            transition={{ duration: 2, repeat: Infinity, delay: i * 0.45 }}>
            <path d={NOTE} fill="#A78BFA" stroke="#7C3AED" strokeWidth="2" strokeLinecap="round" />
          </Motion.g>
        ))}
      </g>
    )
  }

  const up = w.balloons || (acting && action === 'balloons')
  const friends = w.friends || (acting && action === 'welcome')
  const grandma = w.gift || action === 'gift'           // she is there to say her line, not only after it
  const cheer = acting && ['birthday', 'song', 'best', 'blow'].includes(action)
  return (
    <g>
      <defs>
        <Grad id={`${uid}sky`} stops={SKY.day} />
        <Grad id={`${uid}wall`} stops={['#FFF1F2', '#FCE7F3']} />
        <pattern id={`${uid}paper`} width="28" height="28" patternUnits="userSpaceOnUse">
          <rect width="28" height="28" fill="none" />
          <circle cx="14" cy="14" r="2" fill="#F9A8D4" opacity="0.35" />
        </pattern>
      </defs>
      <Wall fill={`url(#${uid}wall)`} />
      <rect x={BX} y="-260" width={BW} height="496" fill={`url(#${uid}paper)`} />
      {/* window */}
      <rect x="-10" y="40" width="96" height="96" rx="10" fill="#fff" />
      <rect x="-4" y="46" width="84" height="84" rx="6" fill={`url(#${uid}sky)`} />
      <path d="M-4 112q20-12 42-4t42-6v28h-84z" fill="#86EFAC" />
      <rect x="35" y="46" width="4" height="84" fill="#fff" />
      <path d="M-16 38h108" stroke="#BE185D" strokeWidth="5" strokeLinecap="round" />
      {/* bunting over the room */}
      <Motion.g animate={reduced ? undefined : { y: [0, 2, 0] }} transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}>
        <path d="M-140 10Q20 50 180 22T500 18" stroke="#94A3B8" strokeWidth="1.6" fill="none" />
        {Array.from({ length: 22 }, (_, i) => {
          const x = -130 + i * 30
          const t = (x + 140) / 640
          const y = 10 + Math.sin(t * Math.PI * 2.1) * 14 + 12
          return <path key={i} d={`M${x - 9} ${y - 2}h18l-9 16z`} fill={FLAGS[i % FLAGS.length]} />
        })}
      </Motion.g>
      {/* HAPPY BIRTHDAY banner */}
      <g>
        {BANNER.split('').map((ch, i) => {
          if (ch === ' ') return null
          const x = 118 + i * 17
          const y = 64 + Math.sin((i / (BANNER.length - 1)) * Math.PI) * -6
          return (
            <g key={i} transform={`translate(${x} ${y}) rotate(${(i - 6.5) * 1.6})`}>
              <path d="M-8-9h16v16l-8 5-8-5z" fill={FLAGS[i % FLAGS.length]} />
              <text x="0" y="3.4" textAnchor="middle" fontSize="10" fontWeight="900" fill="#fff" fontFamily={FONT}>{ch}</text>
            </g>
          )
        })}
      </g>
      {/* picture frame + clock */}
      <rect x="292" y="96" width="44" height="34" rx="4" fill="#fff" stroke="#F9A8D4" strokeWidth="3" />
      <path d="M298 124l10-12 8 8 6-6 8 10z" fill="#86EFAC" />
      <circle cx="324" cy="106" r="3.5" fill="#FDE047" />
      {/* the floor and the rug first: everybody below stands on them (drawn after, nobody sinks in) */}
      <Floor fill="#E9C9A5" lines={[256, 278]} line="#D4A97C" />
      <ellipse cx="160" cy="282" rx="150" ry="16" fill="#F9A8D4" opacity="0.45" />
      {/* sofa on the left (wide screens) */}
      <g>
        <rect x="-230" y="168" width="150" height="68" rx="14" fill="#A78BFA" />
        <rect x="-222" y="140" width="134" height="48" rx="14" fill="#8B5CF6" />
        <rect x="-240" y="176" width="26" height="60" rx="10" fill="#7C3AED" />
        <rect x="-96" y="176" width="26" height="60" rx="10" fill="#7C3AED" />
      </g>
      {/* presents on a side table (right, wide) */}
      <g>
        <rect x="408" y="200" width="90" height="36" rx="4" fill="#FBCFE8" />
        <ItemArt name="present" transform="translate(430 186) scale(1.2)" />
        <ItemArt name="present" transform="translate(468 190) scale(.9) rotate(8)" />
      </g>
      {/* balloons: a bunch waits tied to a chair, then Toby puts them up on the wall */}
      {up ? (
        <>
          <Motion.g initial={acting && action === 'balloons' && !reduced ? { y: 120, opacity: 0 } : false} animate={{ y: 0, opacity: 1 }}
            transition={{ duration: 1.1, delay: 0.5, ease: 'easeOut' }}>
            <Bunch x={110} y={150} colors={['#F43F5E', '#38BDF8', '#FACC15']} reduced={reduced} />
          </Motion.g>
          <Motion.g initial={acting && action === 'balloons' && !reduced ? { y: 120, opacity: 0 } : false} animate={{ y: 0, opacity: 1 }}
            transition={{ duration: 1.1, delay: 0.9, ease: 'easeOut' }}>
            <Bunch x={262} y={156} colors={['#A78BFA', '#34D399', '#F472B6']} reduced={reduced} delay={0.6} />
          </Motion.g>
        </>
      ) : (
        <g>
          <rect x="196" y="206" width="30" height="30" rx="3" fill="#FDE68A" stroke="#F59E0B" strokeWidth="2" />
          <Bunch x={211} y={206} colors={['#F43F5E', '#38BDF8', '#FACC15']} reduced={reduced} />
        </g>
      )}
      {acting && action === 'balloons' && <Twinkle x={180} y={100} w={200} h={40} n={5} reduced={reduced} />}
      {/* Mum behind the table, right of the cake (her face always free) */}
      <g transform={`translate(${MUM_X} 258) scale(1.06)`}>
        <Mum talking={talks('mum')} cheer={cheer} wave={acting && action === 'birthday'} reduced={reduced} />
      </g>
      {/* Grandma arrives (from the left, as her step starts) and stays with the guests, just behind the friends */}
      {grandma && (
        <Motion.g initial={reduced || action !== 'gift' ? { x: GRANDMA.x } : { x: -110 }} animate={{ x: GRANDMA.x }}
          transition={{ type: 'spring', stiffness: 50, damping: 14 }}>
          <g transform={`translate(0 ${GRANDMA.y}) scale(${GRANDMA.s})`}>
            <Grandma hold={null} leftAngle={0} rightAngle={acting && action === 'gift' ? -70 : 0} talking={talks('grandma')}
              cheer={cheer && action !== 'blow'} reduced={reduced} />
          </g>
        </Motion.g>
      )}
      {/* friends on the left, in front */}
      {friends && (
        <Motion.g initial={acting && action === 'welcome' && !reduced ? { x: -120 } : false} animate={{ x: 0 }}
          transition={{ type: 'spring', stiffness: 50, damping: 14, delay: 0.3 }}>
          <g transform="translate(86 284) scale(.84)"><Kid v={0} talking={talks('boy')} cheer={cheer} reduced={reduced} /></g>
          <g transform="translate(34 290) scale(.86)"><Kid v={1} talking={talks('girl')} cheer={cheer} wave={acting && action === 'welcome'} reduced={reduced} /></g>
        </Motion.g>
      )}
    </g>
  )
}
