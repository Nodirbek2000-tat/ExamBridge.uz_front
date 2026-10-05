/*
 * /games — the games hub.
 *
 * Shows only the games the platform lists (GET /api/games/stats/hub/), in the
 * order the admin set: 'live' → playable card, 'soon' → a quiet "Tez orada"
 * card, 'hidden' → not shown. The only number is real: players this week,
 * sent by the server only once there are 30 or more.
 *
 * Every picture is drawn here in SVG (Toby is his own component). The hub stays
 * light: no three.js and no game code — a game's chunk is only fetched when a
 * finger or pointer is already on its card.
 */
import { useId } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { motion as Motion, useReducedMotion } from 'framer-motion'
import { ArrowLeft, ArrowRight, Mic } from 'lucide-react'
import api from '../../api/client'
import Toby, { TobyAvatar } from './tobys-day/Toby'
import { ItemArt } from './tobys-day/items'

/* ── catalogue: what the hub knows how to draw ─────────────────────────────── */

const OK = '#34D3A0'
const CLOSE = '#F5B14C'

const CATALOG = {
  'tobys-day': {
    route: '/games/tobys-day',
    accent: '#F5B14C',
    tagline: 'Toby bilan kun o‘tkaz — sen gapirasan, u bajaradi.',
    art: 'toby',
    extra: { route: '/games/tobys-day?room=1', label: 'Play Room', hint: 'Toby bilan erkin o‘yna' },
  },
  'voice-drive': {
    route: '/games/voice-drive',
    accent: '#FF5C5C',
    tagline: 'Mashinani ovozing bilan boshqar — buyruq ber, yo‘lda qol.',
    art: 'car',
  },
  speaking: {
    route: '/games/speaking',
    accent: OK,
    tagline: 'Matnni ovoz chiqarib o‘qi — AI har bir so‘zingni tekshiradi.',
    art: 'speak',
  },
  'word-battle': {
    route: '/games/word-battle',
    accent: '#5CC2FF',
    tagline: 'So‘z dueli: kim tezroq va aniqroq?',
    art: 'bears',
  },
  runner: {
    route: '/games/runner',
    accent: '#A98BFF',
    tagline: 'Yugur, sakra — so‘zni ayt va uch!',
    art: 'runner',
  },
}

// shown only when the list cannot be loaded — the same games the server starts with
const FALLBACK = [
  { slug: 'tobys-day', title: 'TOBY’S DAY', status: 'live', players_week: null },
  { slug: 'voice-drive', title: 'VOICE DRIVE', status: 'live', players_week: null },
  { slug: 'speaking', title: 'SPEAKING', status: 'live', players_week: null },
  { slug: 'word-battle', title: 'WORD BATTLE', status: 'soon', players_week: null },
  { slug: 'runner', title: 'RUNNER', status: 'soon', players_week: null },
]

// warm a game's code while the finger is on its way to the card
const PREFETCH = {
  'tobys-day': () => import('./tobys-day/TobysDayGame'),
  'voice-drive': () => import('./voice-drive/VoiceDriveGame'),
  speaking: () => import('./speaking/SpeakingGame'),
  runner: () => import('./runner/RunnerGame'),
}
const prefetched = new Set()
function prefetch(slug) {
  if (!PREFETCH[slug] || prefetched.has(slug)) return
  prefetched.add(slug)
  PREFETCH[slug]().catch(() => prefetched.delete(slug))
}

const fmtCount = (n) => String(n).replace(/\B(?=(\d{3})+(?!\d))/g, ' ')

/* ── shared CSS for the drawings (paused for reduced motion and for 'soon') ── */

const ART_CSS = `
.gh-art .gh-spin { animation: gh-spin .55s linear infinite; transform-box: fill-box; transform-origin: center }
.gh-art .gh-dash { animation: gh-dash .5s linear infinite }
.gh-art .gh-streak { animation: gh-streak 1.1s ease-out infinite; transform-box: fill-box }
.gh-art .gh-ride { animation: gh-ride 2.6s ease-in-out infinite }
.gh-art .gh-bar { animation: gh-bar 1.25s ease-in-out infinite; transform-box: fill-box; transform-origin: center }
.gh-art .gh-scan { animation: gh-scan 3.2s cubic-bezier(.45,0,.55,1) infinite }
.gh-art .gh-breathe { animation: gh-breathe 2.8s ease-in-out infinite }
.gh-art .gh-spark { animation: gh-spark 1.6s ease-in-out infinite; transform-box: fill-box; transform-origin: center }
.gh-art .gh-run { animation: gh-run .44s ease-in-out infinite }
.gh-art .gh-coin { animation: gh-coin 1.2s linear infinite; transform-box: fill-box; transform-origin: center }
.gh-still *, .gh-still { animation: none !important }
@media (prefers-reduced-motion: reduce) { .gh-art *, .gh-art { animation: none !important } }
@keyframes gh-spin { to { transform: rotate(360deg) } }
@keyframes gh-dash { to { stroke-dashoffset: 40 } }
@keyframes gh-streak { 0% { transform: translateX(26px); opacity: 0 } 25% { opacity: 1 } 100% { transform: translateX(-34px); opacity: 0 } }
@keyframes gh-ride { 0%, 100% { transform: translateY(0) } 50% { transform: translateY(-1.2px) } }
@keyframes gh-bar { 0%, 100% { transform: scaleY(.38) } 50% { transform: scaleY(1) } }
@keyframes gh-scan { 0% { transform: translateX(0) } 100% { transform: translateX(236px) } }
@keyframes gh-breathe { 0%, 100% { transform: translateY(0) } 50% { transform: translateY(-2.5px) } }
@keyframes gh-spark { 0%, 100% { transform: scale(1); opacity: .9 } 50% { transform: scale(1.08); opacity: 1 } }
@keyframes gh-run { 0%, 100% { transform: translateY(0) } 50% { transform: translateY(-4px) } }
@keyframes gh-coin { 0%, 100% { transform: scaleX(1) } 50% { transform: scaleX(.18) } }
`

/* ── drawings ─────────────────────────────────────────────────────────────── */

function WaveGlyph({ color }) {
  return (
    <svg viewBox="0 0 14 12" className="h-3 w-3.5 flex-shrink-0" aria-hidden>
      {[[1, 4, 4], [5, 1, 10], [9, 3, 6], [13, 5, 2]].map(([x, y, h]) => (
        <rect key={x} x={x - 1} y={y} width="2" height={h} rx="1" fill={color} />
      ))}
    </svg>
  )
}

/* the line the learner says — the game does it */
function SaidLine({ color, className = '', children }) {
  return (
    <span className={`absolute inline-flex items-center gap-2 whitespace-nowrap rounded-2xl rounded-bl-md border border-white/10 bg-[#0B0B10]/60 px-3 py-1.5 text-[13px] font-semibold text-white/90 backdrop-blur-md sm:text-[14px] ${className}`}>
      <WaveGlyph color={color} />
      {children}
    </span>
  )
}

function TobyArt({ still }) {
  return (
    <div className="absolute inset-0">
      <div className="absolute inset-x-0 bottom-[7%] top-[13%] flex justify-center">
        <TobyAvatar className="h-full w-auto" mood="happy" pose="wave" reduced={still} pokes={false} />
      </div>
      <SaidLine color="#F5B14C" className="left-[6%] top-[9%]">“Wave, Toby!”</SaidLine>
    </div>
  )
}

function CarArt() {
  return (
    <div className="absolute inset-0">
      <CarSvg />
      <SaidLine color="#FF5C5C" className="left-[6%] top-[9%]">“Turn left!”</SaidLine>
    </div>
  )
}

function CarSvg() {
  const id = useId().replace(/:/g, '')
  const u = (n) => `url(#${id}${n})`
  return (
    <svg viewBox="12 32 296 185" className="h-full w-full" aria-hidden>
      <defs>
        <linearGradient id={`${id}body`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#FF9289" />
          <stop offset=".42" stopColor="#FF5C5C" />
          <stop offset="1" stopColor="#A9263A" />
        </linearGradient>
        <linearGradient id={`${id}glass`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#36405E" />
          <stop offset="1" stopColor="#0D1120" />
        </linearGradient>
        <linearGradient id={`${id}beam`} x1="0" x2="1">
          <stop offset="0" stopColor="#FFF1C2" stopOpacity=".5" />
          <stop offset="1" stopColor="#FFF1C2" stopOpacity="0" />
        </linearGradient>
        <linearGradient id={`${id}road`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#1E1E2A" />
          <stop offset="1" stopColor="#111118" stopOpacity="0" />
        </linearGradient>
        <radialGradient id={`${id}tail`}>
          <stop offset="0" stopColor="#FF2E4D" stopOpacity=".7" />
          <stop offset="1" stopColor="#FF2E4D" stopOpacity="0" />
        </radialGradient>
        <radialGradient id={`${id}rim`}>
          <stop offset="0" stopColor="#3A3F4E" />
          <stop offset="1" stopColor="#1A1D27" />
        </radialGradient>
      </defs>

      {/* distant skyline */}
      <g fill="#fff" opacity=".035">
        <rect x="18" y="104" width="22" height="56" rx="2" />
        <rect x="44" y="86" width="16" height="74" rx="2" />
        <rect x="64" y="116" width="26" height="44" rx="2" />
        <rect x="236" y="96" width="18" height="64" rx="2" />
        <rect x="258" y="78" width="24" height="82" rx="2" />
        <rect x="286" y="110" width="20" height="50" rx="2" />
      </g>

      {/* road */}
      <rect x="0" y="160" width="320" height="40" fill={u('road')} />
      <line x1="0" y1="160.5" x2="320" y2="160.5" stroke="#fff" strokeOpacity=".1" />
      <line className="gh-dash" x1="-20" y1="183" x2="340" y2="183" stroke="#fff" strokeOpacity=".2" strokeWidth="3" strokeDasharray="22 18" strokeLinecap="round" />

      {/* speed streaks */}
      <g stroke="#fff" strokeLinecap="round" strokeWidth="2">
        <line className="gh-streak" x1="14" y1="112" x2="44" y2="112" strokeOpacity=".3" />
        <line className="gh-streak" style={{ animationDelay: '.35s' }} x1="4" y1="128" x2="40" y2="128" strokeOpacity=".22" />
        <line className="gh-streak" style={{ animationDelay: '.7s' }} x1="18" y1="144" x2="44" y2="144" strokeOpacity=".18" />
      </g>

      {/* light */}
      <path d="M266 115 L320 101 L320 141 Z" fill={u('beam')} />
      <circle cx="50" cy="118" r="14" fill={u('tail')} />
      <ellipse cx="160" cy="160" rx="120" ry="5.5" fill="#000" opacity=".6" />

      <g className="gh-ride">
        {/* body */}
        <path
          d="M48 134C48 124 51 115 60 111L98 102C111 90 128 82 150 81L180 81C196 82 208 90 222 101C243 105 259 109 267 115C272 119 273 127 272 135C271 140 268 142 264 142L250 142A22 22 0 0 0 206 142L112 142A22 22 0 0 0 68 142L56 142C51 142 48 139 48 134Z"
          fill={u('body')}
        />
        {/* spoiler, sill, creases */}
        <path d="M55 109.5 L75 105 L77 107.5 L57 112 Z" fill="#8E2131" />
        <path d="M114 137 H204" stroke="#6E1A27" strokeOpacity=".7" strokeWidth="3" strokeLinecap="round" />
        <path d="M70 119C140 115.5 200 116.5 262 121.5" stroke="#fff" strokeOpacity=".2" strokeWidth="1.2" fill="none" />
        <path d="M61 112.5 L99 103.5 M224 102.5C243 106.5 256 109.5 264 115" stroke="#fff" strokeOpacity=".45" strokeWidth="1.4" fill="none" strokeLinecap="round" />
        {/* glass */}
        <path d="M106 102C118 91 133 86 150 85.5L179 85.5C192 86 202 92 212 101Z" fill={u('glass')} />
        <path d="M121 99 L137 88.5 L146 88.5 L130 99 Z" fill="#fff" opacity=".12" />
        <path d="M168 99 L178 88.5 L183 88.5 L173 99 Z" fill="#fff" opacity=".08" />
        <rect x="158" y="85" width="4" height="17" fill="#C83A44" />
        {/* doors, handle, mirror */}
        <path d="M162 103.5V134M210 103C212.5 115 212.5 126 209.5 134" stroke="#000" strokeOpacity=".22" strokeWidth="1.2" fill="none" />
        <rect x="170" y="109" width="11" height="2.6" rx="1.3" fill="#000" opacity=".3" />
        <path d="M205 99.5c3-4.5 9.5-4.5 12 0l-1 4h-9.5z" fill="#D9444C" />
        {/* lights + intake */}
        <path d="M258.5 112.5 L268.5 116.5C269.6 118 269 119.6 267 119.6 L257 117Z" fill="#FFF3C4" />
        <path d="M49 117 L59 113.5 L59 119.5 L49 122 Z" fill="#FF3352" />
        <path d="M252 134.5 L270 133.5" stroke="#000" strokeOpacity=".35" strokeWidth="2.5" strokeLinecap="round" />
        {/* wheels */}
        {[90, 228].map(cx => (
          <g key={cx}>
            <circle cx={cx} cy="142" r="18" fill="#0B0B11" />
            <circle cx={cx} cy="142" r="12.5" fill={u('rim')} stroke="#C9CEDA" strokeOpacity=".75" strokeWidth="1.4" />
            <g className="gh-spin">
              <circle cx={cx} cy="142" r="12" fill="none" />
              {[0, 72, 144, 216, 288].map(a => (
                <rect key={a} x={cx - 1.5} y="131" width="3" height="10" rx="1.5" fill="#D5DAE4" transform={`rotate(${a} ${cx} 142)`} />
              ))}
            </g>
            <circle cx={cx} cy="142" r="2.6" fill="#E9ECF2" />
          </g>
        ))}
      </g>
    </svg>
  )
}

// "She sells sea shells" — each word judged, the waveform coloured to match
const SPEAK_WORDS = [
  { w: 'She', x: 25, width: 50, c: OK },
  { w: 'sells', x: 83, width: 66, c: OK },
  { w: 'sea', x: 157, width: 50, c: CLOSE },
  { w: 'shells', x: 215, width: 80, c: OK },
]
const WAVE = Array.from({ length: 34 }, (_, i) => {
  const env = Math.abs(Math.sin(i * 0.52 + 0.4)) * (0.55 + 0.45 * Math.sin(i * 0.23 + 1.2))
  const x = 42 + i * 7.1
  const word = SPEAK_WORDS.find(s => x >= s.x - 4 && x <= s.x + s.width + 4) || SPEAK_WORDS[SPEAK_WORDS.length - 1]
  return { x, h: 8 + Math.abs(env) * 44, c: word.c, d: ((i * 37) % 11) / 10 }
})

function SpeakArt() {
  const id = useId().replace(/:/g, '')
  return (
    <svg viewBox="0 0 320 200" className="h-full w-full" aria-hidden>
      <defs>
        <linearGradient id={`${id}scan`} x1="0" x2="1">
          <stop offset="0" stopColor={OK} stopOpacity="0" />
          <stop offset="1" stopColor={OK} stopOpacity=".22" />
        </linearGradient>
      </defs>
      {/* the text, word by word */}
      {SPEAK_WORDS.map(s => (
        <g key={s.w}>
          <rect x={s.x} y="34" width={s.width} height="36" rx="11" fill="#fff" fillOpacity=".05" stroke="#fff" strokeOpacity=".08" />
          <text x={s.x + s.width / 2} y="57.5" textAnchor="middle" fontSize="17" fontWeight="700" fill="#fff" fillOpacity=".92" fontFamily="inherit">{s.w}</text>
          <rect x={s.x + 12} y="76" width={s.width - 24} height="3" rx="1.5" fill={s.c} />
        </g>
      ))}
      {/* the voice */}
      <line x1="34" y1="136" x2="286" y2="136" stroke="#fff" strokeOpacity=".06" />
      {WAVE.map((b, i) => (
        <rect key={i} className="gh-bar" style={{ animationDelay: `${-b.d}s` }} x={b.x - 1.8} y={136 - b.h / 2} width="3.6" height={b.h} rx="1.8" fill={b.c} fillOpacity=".9" />
      ))}
      <g className="gh-scan">
        <rect x="6" y="100" width="34" height="72" fill={`url(#${id}scan)`} />
        <line x1="40" y1="98" x2="40" y2="174" stroke={OK} strokeWidth="1.6" strokeLinecap="round" />
        <circle cx="40" cy="98" r="3" fill={OK} />
      </g>
    </svg>
  )
}

/* one bear facing right; the other is the same bear mirrored, in brown */
function Bear({ fur, shade, muzzle, inner, nose, brow, scarf, id }) {
  return (
    <g>
      <defs>
        <linearGradient id={`${id}f`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={fur} />
          <stop offset="1" stopColor={shade} />
        </linearGradient>
      </defs>
      <path d="M22 204C26 162 56 140 92 140C128 140 156 162 162 204Z" fill={shade} />
      <path d="M50 150C70 158 112 158 134 150L138 162C112 172 70 172 46 162Z" fill={scarf} />
      <circle cx="58" cy="70" r="14" fill={`url(#${id}f)`} />
      <circle cx="124" cy="67" r="14" fill={`url(#${id}f)`} />
      <circle cx="59" cy="71" r="7" fill={inner} />
      <circle cx="123" cy="68" r="7" fill={inner} />
      <ellipse cx="92" cy="105" rx="46" ry="42" fill={`url(#${id}f)`} />
      <ellipse cx="108" cy="121" rx="23" ry="16.5" fill={muzzle} />
      <path d="M113 111Q121 107 129 111Q127.5 119 121 120.5Q114.5 119 113 111Z" fill={nose} />
      <ellipse cx="119" cy="111.5" rx="3" ry="1.4" fill="#fff" opacity=".45" />
      <path d="M121 120.5V125.5M114.5 127.5Q121 131.5 127.5 126.5" stroke={nose} strokeWidth="2" fill="none" strokeLinecap="round" />
      <ellipse cx="88" cy="98" rx="4.3" ry="5.2" fill={nose} />
      <ellipse cx="112" cy="96" rx="4.3" ry="5.2" fill={nose} />
      <circle cx="89.5" cy="96" r="1.4" fill="#fff" />
      <circle cx="113.5" cy="94" r="1.4" fill="#fff" />
      <path d="M79 87L94 91.5M106 89.5L120 84.5" stroke={brow} strokeWidth="3.2" strokeLinecap="round" />
    </g>
  )
}

function BearsArt() {
  const id = useId().replace(/:/g, '')
  return (
    <svg viewBox="0 0 320 200" className="h-full w-full" aria-hidden>
      <defs>
        <radialGradient id={`${id}glow`}>
          <stop offset="0" stopColor="#5CC2FF" stopOpacity=".45" />
          <stop offset="1" stopColor="#5CC2FF" stopOpacity="0" />
        </radialGradient>
      </defs>
      <g className="gh-breathe">
        <Bear id={`${id}p`} fur="#FFFFFF" shade="#CFDEEC" muzzle="#FFFFFF" inner="#C3D4E6" nose="#1D2330" brow="#93A8BF" scarf="#5CC2FF" />
      </g>
      <g className="gh-breathe" style={{ animationDelay: '-1.4s' }}>
        <g transform="translate(320 0) scale(-1 1)">
          <Bear id={`${id}b`} fur="#9A6440" shade="#6B4027" muzzle="#D2A27A" inner="#55301C" nose="#1B110C" brow="#3E2414" scarf="#FF9F43" />
        </g>
      </g>
      <circle cx="160" cy="104" r="36" fill={`url(#${id}glow)`} />
      <g className="gh-spark">
        <circle cx="160" cy="104" r="18" fill="#0B0B10" stroke="#5CC2FF" strokeWidth="1.6" />
        <text x="160" y="110" textAnchor="middle" fontSize="15" fontWeight="700" fill="#fff" fontFamily="inherit" letterSpacing=".5">VS</text>
      </g>
      <g stroke="#5CC2FF" strokeWidth="2" strokeLinecap="round" opacity=".7">
        <path d="M160 74V66M160 134V142M146 78l-4-6M174 78l4-6" />
      </g>
    </svg>
  )
}

/* three lanes in perspective, all meeting at the vanishing point VP */
const VP = { x: 160, y: 40 }
const LANES = [40, 160, 280]
const RAIL = 34
const laneX = (xb, y) => VP.x + ((xb - VP.x) * (y - VP.y)) / (200 - VP.y)
const DEPTHS = [1, 1.28, 1.65, 2.15, 2.8, 3.7, 4.9, 6.6, 9.2, 13].map(z => ({ y: VP.y + 160 / z, t: 8 / z }))
const COINS = [150, 121, 101, 87].map((y) => {
  const s = (y - VP.y) / 160
  return { x: laneX(280, y), cy: y - 16 * s, r: 9 * s }
})

/* TOBY RUN: Toby rides his speech-bubble balloon above the middle lane, the So'z shari arch far ahead */
function RunnerArt({ still }) {
  const id = useId().replace(/:/g, '')
  const u = (n) => `url(#${id}${n})`
  return (
    <div className="absolute inset-0">
      <svg viewBox="0 0 320 200" className="h-full w-full" aria-hidden>
        <defs>
          <radialGradient id={`${id}sky`} cx=".5" cy=".2" r=".6">
            <stop offset="0" stopColor="#A98BFF" stopOpacity=".42" />
            <stop offset="1" stopColor="#A98BFF" stopOpacity="0" />
          </radialGradient>
          <linearGradient id={`${id}ground`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#201E30" />
            <stop offset="1" stopColor="#15141F" />
          </linearGradient>
          <radialGradient id={`${id}coin`} cx=".38" cy=".35">
            <stop offset="0" stopColor="#FFE9A3" />
            <stop offset="1" stopColor="#F2A626" />
          </radialGradient>
        </defs>
        <rect y={VP.y} width="320" height={200 - VP.y} fill={u('ground')} />
        <rect width="320" height="200" fill={u('sky')} />
        <line x1="0" y1={VP.y} x2="320" y2={VP.y} stroke="#fff" strokeOpacity=".07" />
        {/* sleepers, then rails */}
        {LANES.map(xb => DEPTHS.map(({ y, t }) => (
          <rect key={`${xb}-${y}`} x={laneX(xb - RAIL * 1.3, y)} y={y - t / 2} width={laneX(xb + RAIL * 1.3, y) - laneX(xb - RAIL * 1.3, y)} height={t} rx={t / 3} fill="#33304A" />
        )))}
        {LANES.map(xb => [-1, 1].map(side => (
          <g key={`${xb}${side}`}>
            <path d={`M${xb + side * RAIL} 200 L${VP.x} ${VP.y}`} stroke="#8D88A8" strokeWidth="3" />
            <path d={`M${xb + side * RAIL - 1} 199 L${VP.x} ${VP.y}`} stroke="#fff" strokeOpacity=".3" strokeWidth=".8" />
          </g>
        )))}
        {/* the So'z shari arch far ahead */}
        <path d="M134 78V62a26 26 0 0 1 52 0v16" fill="none" stroke="#2E5AAC" strokeWidth="5" />
        <path d="M134 78V62a26 26 0 0 1 52 0v16" fill="none" stroke="#2BB3C0" strokeWidth="1.4" />
        <ellipse cx="160" cy="31" rx="8" ry="6" fill="#F6EBD9" />
        {/* coins on the right lane, an arc of air coins on the left */}
        {COINS.map((c, i) => (
          <g key={i} className="gh-coin" style={{ animationDelay: `${-i * 0.25}s` }}>
            <circle cx={c.x} cy={c.cy} r={c.r} fill={u('coin')} />
            <circle cx={c.x} cy={c.cy} r={c.r * 0.62} fill="none" stroke="#C9800F" strokeOpacity=".55" strokeWidth={c.r * 0.14} />
          </g>
        ))}
        {[[86, 70, 4], [96, 62, 4.6], [108, 58, 5.2]].map(([x, y, r], i) => (
          <circle key={i} className="gh-coin" style={{ animationDelay: `${-i * 0.3}s` }} cx={x} cy={y} r={r} fill={u('coin')} />
        ))}
        {/* his shadow on the track below */}
        <ellipse cx="160" cy="194" rx="20" ry="3.4" fill="#000" opacity=".45" />
        {/* Toby, lifted by the balloon */}
        <g className="gh-ride">
          <path d="M195 118Q201 96 212 76" stroke="#C9C2D8" strokeWidth="1.4" fill="none" />
          <g transform="translate(228 50)">
            <path d="M-14 18q-6 9-14 12 10 0 18-7" fill="#FFF8EC" />
            <ellipse rx="31" ry="25" fill="#FFF8EC" />
            <ellipse rx="31" ry="25" fill="none" stroke="#2BB3C0" strokeWidth="2.4" />
            <ItemArt name="ticket" transform="scale(1.15)" />
          </g>
          <g transform="translate(110 52) scale(0.5)">
            <Toby mood="happy" pose="raise" reduced={still} pokes={false} />
          </g>
        </g>
      </svg>
      <SaidLine color="#A98BFF" className="left-[6%] top-[9%]">“Ticket!”</SaidLine>
    </div>
  )
}

const ART = { toby: TobyArt, car: CarArt, speak: SpeakArt, bears: BearsArt, runner: RunnerArt }

/* ── cards ────────────────────────────────────────────────────────────────── */

function PlayRoomGlyph() {
  return (
    <svg viewBox="0 0 20 20" className="h-4 w-4 flex-shrink-0" aria-hidden>
      <rect x="2" y="9" width="8" height="8" rx="2" fill="#F5B14C" />
      <rect x="10.5" y="11" width="7" height="6" rx="1.8" fill="#FF8A65" />
      <circle cx="13.5" cy="6" r="3.6" fill="#7DD3FC" />
    </svg>
  )
}

function GameCard({ game, featured, index, reduce, onOpen }) {
  const live = game.status === 'live'
  const Art = ART[game.art]
  const { accent } = game
  const still = reduce || !live

  return (
    <Motion.article
      initial={reduce ? false : { opacity: 0, y: 18 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.05 + index * 0.06, duration: 0.55, ease: [0.16, 1, 0.3, 1] }}
      className={`group relative flex flex-col overflow-hidden rounded-[26px] border border-white/[0.08] bg-[#111118] shadow-[0_20px_50px_-30px_rgba(0,0,0,0.9)] transition-[border-color,transform] duration-300 ${
        live ? 'hover:-translate-y-0.5 hover:border-white/[0.16]' : ''
      } ${featured ? 'md:col-span-2 md:flex-row' : ''}`}
    >
      {live && (
        <button
          type="button"
          onClick={() => onOpen(game.route)}
          onPointerEnter={() => prefetch(game.slug)}
          onTouchStart={() => prefetch(game.slug)}
          onFocus={() => prefetch(game.slug)}
          aria-label={`${game.title} — o‘ynash`}
          className="absolute inset-0 z-10 rounded-[26px] focus-visible:outline-2 focus-visible:outline-offset-2"
          style={{ outlineColor: accent }}
        />
      )}

      {/* the picture */}
      <div
        className={`gh-art relative w-full overflow-hidden border-b border-white/[0.06] ${still ? 'gh-still' : ''} ${
          featured
            ? 'aspect-[16/11] md:order-2 md:aspect-auto md:min-h-[320px] md:flex-1 md:border-b-0 md:border-l'
            : 'aspect-[16/10]'
        }`}
      >
        <div
          className="absolute inset-0"
          style={{ background: `radial-gradient(85% 75% at 50% 100%, ${accent}30 0%, ${accent}0F 45%, transparent 75%)` }}
        />
        <div
          className={`absolute inset-0 transition-transform duration-500 ease-out ${live ? 'group-hover:scale-[1.025]' : 'opacity-75 saturate-[.7]'}`}
        >
          {Art && <Art still={still} />}
        </div>
      </div>

      {/* the words */}
      <div className={`relative flex flex-1 flex-col p-5 sm:p-6 ${featured ? 'md:max-w-[380px] md:justify-center md:p-8 lg:max-w-[400px]' : ''}`}>
        <div className="flex items-start justify-between gap-3">
          <h2 className={`font-bold leading-none tracking-tight text-white ${featured ? 'text-[24px] sm:text-[30px]' : 'text-[22px] sm:text-[24px]'}`}>
            {game.title}
          </h2>
          {!live && (
            <span className="flex-shrink-0 rounded-full border border-white/10 bg-white/[0.04] px-2.5 py-1 text-[11px] font-semibold leading-none text-white/55">
              Tez orada
            </span>
          )}
        </div>
        <p className={`mt-2.5 leading-snug text-white/55 ${featured ? 'text-[15px]' : 'text-[14px]'}`}>{game.tagline}</p>

        {typeof game.players_week === 'number' && (
          <p className="mt-3 inline-flex items-center gap-2 whitespace-nowrap text-[13px] text-white/50">
            <span className="h-1.5 w-1.5 flex-shrink-0 rounded-full" style={{ background: accent }} />
            <span>
              <span className="font-semibold tabular-nums text-white/80">{fmtCount(game.players_week)}</span> o‘yinchi bu hafta
            </span>
          </p>
        )}

        {live && (
          <div className={`flex items-center pt-5 ${featured ? 'md:pt-7' : 'mt-auto'}`}>
            {/* on wide screens the featured card's buttons sit under its text, the main one first;
                everywhere else they keep to the right edge */}
            <span className={`ml-auto flex items-center gap-2 ${featured ? 'md:ml-0 md:flex-row-reverse' : ''}`}>
              {game.extra && (
                <button
                  type="button"
                  onClick={() => onOpen(game.extra.route)}
                  onPointerEnter={() => prefetch(game.slug)}
                  onTouchStart={() => prefetch(game.slug)}
                  title={game.extra.hint}
                  aria-label={`${game.extra.label} — ${game.extra.hint}`}
                  className="relative z-20 inline-flex h-11 items-center gap-2 whitespace-nowrap rounded-full border border-white/10 bg-white/[0.04] px-4 text-[13px] font-semibold text-white/85 transition-colors hover:border-white/20 hover:bg-white/[0.08] focus-visible:outline-2 focus-visible:outline-offset-2"
                  style={{ outlineColor: accent }}
                >
                  <PlayRoomGlyph />
                  {game.extra.label}
                </button>
              )}
              <span
                className={`flex h-11 flex-shrink-0 items-center justify-center gap-2 rounded-full text-[#0B0B10] transition-transform duration-300 group-hover:scale-105 ${
                  featured ? 'px-5 text-[14px] font-bold' : 'w-11'
                }`}
                style={{ background: accent, boxShadow: `0 8px 24px -8px ${accent}` }}
                aria-hidden
              >
                {featured && 'O‘ynash'}
                <ArrowRight size={featured ? 17 : 19} strokeWidth={2.4} />
              </span>
            </span>
          </div>
        )}
      </div>
    </Motion.article>
  )
}

function SkeletonCard({ featured }) {
  return (
    <div className={`flex flex-col overflow-hidden rounded-[26px] border border-white/[0.06] bg-[#111118] ${featured ? 'md:col-span-2 md:flex-row' : ''}`}>
      <div className={`animate-pulse bg-white/[0.03] ${featured ? 'aspect-[16/11] md:order-2 md:aspect-auto md:min-h-[320px] md:flex-1' : 'aspect-[16/10]'}`} />
      <div className={`space-y-3 p-6 ${featured ? 'md:w-[380px]' : ''}`}>
        <div className="h-6 w-40 animate-pulse rounded-lg bg-white/[0.06]" />
        <div className="h-4 w-56 max-w-full animate-pulse rounded-lg bg-white/[0.04]" />
        <div className="h-11 w-11 animate-pulse rounded-full bg-white/[0.05]" />
      </div>
    </div>
  )
}

/* ── page ─────────────────────────────────────────────────────────────────── */

export default function GamesHub() {
  const navigate = useNavigate()
  const reduce = useReducedMotion()

  const { data, isError } = useQuery({
    queryKey: ['games-hub-list'],
    queryFn: () => api.get('/games/stats/hub/').then(r => r.data),
    staleTime: 60 * 1000,
    retry: 1,
  })
  const list = Array.isArray(data) ? data : isError ? FALLBACK : null
  const games = (list || [])
    .filter(g => CATALOG[g.slug] && g.status !== 'hidden')
    .map(g => ({ ...CATALOG[g.slug], ...g }))

  const goBack = () => {
    if ((window.history.state?.idx ?? 0) > 0) navigate(-1)
    else navigate('/app')
  }

  return (
    <div className="min-h-screen overflow-x-hidden bg-[#0B0B10] text-white">
      <style>{ART_CSS}</style>
      <div className="mx-auto w-full max-w-[1360px] px-4 pb-16 pt-5 sm:px-6 sm:pt-8 lg:px-10">
        <header className="flex items-center gap-3 sm:gap-4">
          <button
            type="button"
            onClick={goBack}
            aria-label="Orqaga"
            className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-2xl border border-white/[0.08] bg-[#111118] text-white/70 transition-colors hover:border-white/15 hover:text-white"
          >
            <ArrowLeft size={18} />
          </button>
          <div className="min-w-0">
            <h1 className="text-[28px] font-bold leading-none tracking-tight sm:text-[34px]">O‘yinlar</h1>
            <p className="mt-2 text-[14px] leading-snug text-white/50 sm:text-[15px]">
              Ingliz tilida gapir va o‘yna — har kuni bir necha daqiqa.
            </p>
          </div>
        </header>

        <main className="mt-7 grid grid-cols-1 gap-4 sm:mt-9 sm:gap-5 md:grid-cols-2 lg:grid-cols-3">
          {list === null
            ? [0, 1, 2, 3, 4].map(i => <SkeletonCard key={i} featured={i === 0} />)
            : games.map((g, i) => (
              <GameCard key={g.slug} game={g} featured={i === 0} index={i} reduce={reduce} onOpen={(route) => navigate(route)} />
            ))}
        </main>

        {list !== null && !games.length && (
          <p className="mt-10 text-center text-sm text-white/40">Hozircha o‘yinlar yo‘q — tez orada qaytib keling.</p>
        )}

        <p className="mt-8 flex items-center justify-center gap-2 text-center text-[12.5px] text-white/35">
          <Mic size={13} className="flex-shrink-0" />
          Ovozli o‘yinlar mikrofonga ruxsat so‘raydi — “Allow” ni bosing.
        </p>
      </div>
    </div>
  )
}
