/*
 * TOBY'S DAY — the start screen, minimal: Toby says hi (wearing his
 * accessory) with the learner's level, today's three missions, the Play Room,
 * the zones (any number from content.js; each opens with stars from the one
 * before) as calm cards with an illustrated tile, and this week's best players.
 * Wide on a computer (three columns on top), one tidy column on a phone.
 */
import { useEffect, useRef, useState } from 'react'
import { motion as Motion } from 'framer-motion'
import { ChevronLeft, CloudOff, Lock, Play, Volume2 } from 'lucide-react'
import { speechSupported } from '../../../games/voice/useSpeech'
import { sayLine, stopVoice } from '../../../games/voice/voiceTts'
import { VoiceNotice } from '../../../games/voice/VoiceUI'
import { GREETING, TOBY_VOICE, ZONES, stepType } from './content'
import { levelInfo, maxStars, medal, unlockNeed, zoneUnlocked } from './logic'
import { COMMAND_COUNT, allStars, newAccs, roomStars } from './room'
import { TobyAvatar } from './Toby'
import { ItemArt } from './items'
import { RoomBackdrop } from './RoomScene'
import { AccIcon, WardrobeButton } from './Wardrobe'
import MissionsCard from './DailyMissions'
import { Bar, Coin, Medal, StarIcon } from './ui'

const STAR = 'M0-10 2.9-3.1 10.5-3.1 4.3 1.6 6.6 9.1 0 4.6-6.6 9.1-4.3 1.6-10.5-3.1-2.9-3.1z'
const DRAWN = new Set(['morning', 'breakfast', 'street', 'school', 'shop', 'park', 'cooking', 'evening', 'doctor', 'birthday'])

/* a picture for each zone card (static: ten cards must stay light) */
function ZoneArt({ k }) {
  return (
    <svg viewBox="-50 -50 100 100" className="h-full w-full" aria-hidden>
      {k === 'morning' && (
        <g>
          {Array.from({ length: 10 }, (_, i) => (
            <rect key={i} x="-3" y="-42" width="6" height="13" rx="3" fill="#FEF08A" transform={`rotate(${i * 36})`} />
          ))}
          <circle r="22" fill="#FDE047" />
          <circle r="22" fill="none" stroke="#FACC15" strokeWidth="3" />
          <path d="M-9-2q3 4 6 0M3-2q3 4 6 0M-6 8q6 5 12 0" stroke="#B45309" strokeWidth="2.6" fill="none" strokeLinecap="round" />
          <ellipse cx="-11" cy="5" rx="4" ry="2.5" fill="#FB923C" opacity="0.6" />
          <ellipse cx="11" cy="5" rx="4" ry="2.5" fill="#FB923C" opacity="0.6" />
          <g transform="translate(22 26)" fill="#fff">
            <ellipse rx="16" ry="8" /><ellipse cx="8" cy="-6" rx="10" ry="8" /><ellipse cx="-8" cy="-3" rx="8" ry="6" />
          </g>
        </g>
      )}
      {k === 'breakfast' && (
        <g>
          <ellipse cx="0" cy="22" rx="40" ry="11" fill="#fff" />
          <ellipse cx="0" cy="20" rx="30" ry="7" fill="#F1F5F9" />
          <g transform="translate(-12 12) scale(1.3)"><ItemArt name="eggs" /></g>
          <g transform="translate(18 -8) scale(1.9)"><ItemArt name="cup" /></g>
          <path d="M16-30q-5-6 0-11t0-11M24-30q-5-6 0-11" stroke="#fff" strokeWidth="2.6" fill="none" strokeLinecap="round" opacity="0.85" />
        </g>
      )}
      {k === 'street' && (
        <g>
          <path d="M-46 18h92v26h-92z" fill="#334155" />
          {[-36, -20, -4, 12, 28].map(x => <rect key={x} x={x} y="22" width="10" height="18" rx="1.5" fill="#fff" />)}
          <rect x="-34" y="-40" width="5" height="58" rx="2" fill="#475569" />
          <rect x="-42" y="-44" width="21" height="44" rx="7" fill="#1E293B" />
          <circle cx="-31.5" cy="-34" r="5.5" fill="#EF4444" />
          <circle cx="-31.5" cy="-22" r="5.5" fill="#FACC15" opacity="0.4" />
          <circle cx="-31.5" cy="-10" r="5.5" fill="#22C55E" opacity="0.4" />
          <g transform="translate(14 -2)">
            <rect x="-22" y="-12" width="44" height="18" rx="7" fill="#FACC15" />
            <path d="M-14-12q4-12 14-12t14 12z" fill="#FDE047" />
            <rect x="-10" y="-21" width="9" height="8" rx="2" fill="#BAE6FD" />
            <rect x="2" y="-21" width="9" height="8" rx="2" fill="#BAE6FD" />
            <circle cx="-12" cy="7" r="6" fill="#1E293B" />
            <circle cx="12" cy="7" r="6" fill="#1E293B" />
          </g>
        </g>
      )}
      {k === 'school' && (
        <g>
          <rect x="-36" y="-12" width="72" height="50" rx="4" fill="#FDE68A" />
          <path d="M-42-10 0-38 42-10z" fill="#EF4444" />
          <rect x="-8" y="14" width="16" height="24" rx="2" fill="#B45309" />
          {[-28, 14].map(x => <rect key={x} x={x} y="-2" width="14" height="12" rx="2" fill="#93C5FD" />)}
          <circle cx="0" cy="-18" r="7" fill="#fff" stroke="#B45309" strokeWidth="2" />
          <path d="M0-18v-4M0-18h3" stroke="#B45309" strokeWidth="1.8" strokeLinecap="round" />
          <path d="M30-38v-14" stroke="#64748B" strokeWidth="2.4" />
          <path d="M30-52h14l-4 5 4 5H30z" fill="#3B82F6" />
        </g>
      )}
      {k === 'shop' && (
        <g>
          <rect x="-38" y="-14" width="76" height="52" rx="4" fill="#fff" />
          {[-38, -19, 0, 19].map((x, i) => <path key={x} d={`M${x}-30h19v16q-9.5 8-19 0z`} fill={i % 2 ? '#fff' : '#EC4899'} />)}
          <rect x="-40" y="-34" width="80" height="6" rx="3" fill="#BE185D" />
          <rect x="-30" y="-4" width="24" height="20" rx="2" fill="#BAE6FD" />
          <rect x="4" y="2" width="26" height="36" rx="2" fill="#A855F7" />
          <g transform="translate(-16 26) scale(1.15)"><ItemArt name="basket" basket={['apples', 'milk', 'bread']} /></g>
        </g>
      )}
      {k === 'park' && (
        <g>
          <ellipse cx="0" cy="36" rx="46" ry="9" fill="#16A34A" />
          <rect x="-24" y="0" width="8" height="36" rx="3" fill="#92400E" />
          <circle cx="-20" cy="-14" r="22" fill="#22C55E" />
          <circle cx="-34" cy="-2" r="12" fill="#16A34A" />
          <circle cx="-6" cy="-24" r="12" fill="#4ADE80" />
          <rect x="6" y="16" width="34" height="6" rx="2" fill="#B45309" />
          <rect x="8" y="22" width="4" height="12" fill="#78350F" />
          <rect x="34" y="22" width="4" height="12" fill="#78350F" />
          <g transform="translate(26 0) scale(1.3)"><ItemArt name="football" /></g>
        </g>
      )}
      {k === 'cooking' && (
        <g>
          <rect x="-34" y="20" width="68" height="16" rx="4" fill="#334155" />
          <path d="M-22 20c-6-2-6-30 0-32h44c6 2 6 30 0 32z" fill="#94A3B8" />
          <rect x="-26" y="-14" width="52" height="7" rx="3.5" fill="#64748B" />
          <rect x="-6" y="-22" width="12" height="8" rx="3" fill="#475569" />
          <path d="M-30-6h-8M30-6h8" stroke="#475569" strokeWidth="5" strokeLinecap="round" />
          <path d="M-10-28q-6-7 0-13t0-12M2-28q-6-7 0-13t0-12M14-28q-6-7 0-13" stroke="#fff" strokeWidth="3" fill="none" strokeLinecap="round" opacity="0.9" />
          <path d="M-12 28h24" stroke="#F97316" strokeWidth="4" strokeLinecap="round" />
          <path d="M-8 32h16" stroke="#FDE047" strokeWidth="3" strokeLinecap="round" />
        </g>
      )}
      {k === 'evening' && (
        <g>
          <path d="M10-34a28 28 0 1 0 18 44A23 23 0 0 1 10-34z" fill="#FEF9C3" />
          {[[-30, -30, 1], [30, -36, 0.8], [36, 2, 0.6], [-38, 4, 0.7], [-10, -42, 0.5]].map(([x, y, s], i) => (
            <path key={i} d={STAR} transform={`translate(${x} ${y}) scale(${s * 0.7})`} fill="#fff" />
          ))}
          <g transform="translate(-14 14)">
            <rect x="-14" y="0" width="28" height="22" fill="#4338CA" />
            <path d="M-18 2 0-14 18 2z" fill="#312E81" />
            <rect x="-6" y="6" width="10" height="9" rx="1.5" fill="#FDE047" />
          </g>
        </g>
      )}
      {k === 'doctor' && (
        <g>
          <rect x="-34" y="-30" width="68" height="64" rx="10" fill="#fff" />
          <rect x="-34" y="-30" width="68" height="16" rx="8" fill="#5EEAD4" />
          <path d="M-6-4h12v12h12v12H6v12H-6V20h-12V8h12z" transform="translate(0 -6) scale(.8)" fill="#10B981" />
          <g transform="translate(26 22) scale(1.4)"><ItemArt name="stethoscope" /></g>
          <g transform="translate(-26 24) scale(1.2)"><ItemArt name="thermometer" /></g>
        </g>
      )}
      {k === 'birthday' && (
        <g>
          <g transform="translate(-22 -8) scale(1.6)"><ItemArt name="balloons" /></g>
          <g transform="translate(10 16) scale(2.1)"><ItemArt name="cake" /></g>
          <g transform="translate(34 -24) scale(1.1)"><ItemArt name="party-hat" /></g>
        </g>
      )}
      {!DRAWN.has(k) && <path d={STAR} transform="scale(3.2)" fill="#FDE047" />}
    </svg>
  )
}

/* the kinds of task in a zone (small dots under the title) */
function zoneKinds(zone) {
  const n = { listen: 0, ask: 0, gap: 0 }
  for (const s of zone.steps) { const t = stepType(s); if (t in n) n[t] += 1 }
  return n
}

function ZoneCard({ zone, index, progress, open, next, onStart, reduced }) {
  const saved = progress.zones[zone.key]
  const stars = saved?.stars || 0
  const max = maxStars(zone)
  const prev = ZONES[index - 1]
  const prevStars = prev ? progress.zones[prev.key]?.stars || 0 : 0
  const m = medal(stars, zone)
  const kinds = zoneKinds(zone)
  const fresh = zone.id >= 9 && !saved?.plays
  return (
    <Motion.button type="button" onClick={() => open && onStart(index)} disabled={!open}
      initial={reduced ? false : { opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.04 + index * 0.035, duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
      whileHover={open && !reduced ? { y: -3 } : undefined} whileTap={open ? { scale: 0.985 } : undefined}
      className={`group relative flex w-full flex-row items-stretch gap-3 overflow-hidden rounded-[24px] border bg-[#111118] p-2.5 text-left transition-colors
        disabled:cursor-not-allowed min-[560px]:flex-col min-[560px]:gap-0 min-[560px]:p-0 lg:rounded-[28px]
        ${next ? 'border-[#FFB020]/50' : 'border-white/[0.08] hover:border-white/[0.14]'}`}
      aria-label={open ? `${zone.title} — boshlash` : `${zone.title} — yopiq`}>
      {/* the illustrated tile */}
      <div className={`relative h-[92px] w-[92px] flex-shrink-0 overflow-hidden rounded-[18px] min-[560px]:h-36 min-[560px]:w-full min-[560px]:rounded-none lg:h-40 ${open ? '' : 'grayscale-[70%]'}`}
        style={{ background: `radial-gradient(120% 120% at 25% 15%, ${zone.from}55 0%, transparent 60%), ${zone.to}26` }}>
        <div className="absolute inset-2 min-[560px]:inset-x-10 min-[560px]:inset-y-3"><ZoneArt k={zone.key} /></div>
        <span className="absolute left-2 top-2 flex h-6 min-w-6 items-center justify-center rounded-full bg-[#0B0B10]/55 px-1.5 text-[11.5px] font-bold text-white/90 backdrop-blur min-[560px]:left-3 min-[560px]:top-3 lg:h-7 lg:min-w-7 lg:text-[12.5px]">
          {index + 1}
        </span>
        {fresh && open && (
          <span className="absolute right-2 top-2 rounded-full bg-[#FFB020] px-2 py-0.5 text-[10.5px] font-extrabold uppercase tracking-wide text-[#1A1203] min-[560px]:right-3 min-[560px]:top-3">Yangi</span>
        )}
      </div>

      {/* text */}
      <div className="relative flex min-w-0 flex-1 flex-col py-0.5 pr-1 min-[560px]:p-4 lg:p-5">
        <div className="flex items-center gap-1.5">
          <span className="rounded-md bg-white/[0.06] px-1.5 py-0.5 text-[10.5px] font-bold uppercase tracking-wider text-white/60">{zone.cefr}</span>
          <span className="text-[12px] font-medium text-white/40">{zone.steps.length} ta topshiriq</span>
          {next && <span className="ml-auto rounded-full bg-[#FFB020]/[0.14] px-2 py-0.5 text-[10.5px] font-bold uppercase tracking-wide text-[#FFC95C]">Keyingisi</span>}
        </div>
        <h3 className="mt-1 truncate text-[18px] font-extrabold leading-tight tracking-tight text-white min-[560px]:text-[20px] lg:text-[22px]">{zone.title}</h3>
        <p className="truncate text-[13px] font-medium text-white/50 lg:text-[14px]">{zone.uz} · {zone.blurb}</p>
        <div className="mt-auto flex items-end justify-between gap-2 pt-2">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <Medal n={m} size={14} />
              <span className="text-[12px] font-semibold tabular-nums text-white/55">{stars}/{max}</span>
              {(kinds.listen + kinds.ask + kinds.gap) > 0 && (
                <span className="hidden truncate text-[11.5px] font-medium text-white/35 sm:inline">
                  · {[kinds.listen && 'tinglash', kinds.ask && 'savol', kinds.gap && 'bo‘sh joy'].filter(Boolean).join(', ')}
                </span>
              )}
            </div>
            <div className="mt-1.5 h-1 w-full max-w-[200px] overflow-hidden rounded-full bg-white/[0.08]">
              <div className="h-full rounded-full bg-[#FFB020]" style={{ width: `${max ? (stars / max) * 100 : 0}%` }} />
            </div>
          </div>
          <span className={`flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full transition-transform lg:h-11 lg:w-11
            ${open ? 'bg-[#FFB020] text-[#1A1203] group-hover:scale-105' : 'bg-white/[0.06] text-white/45'}`}>
            {open ? <Play size={17} className="ml-0.5 fill-current" /> : <Lock size={16} />}
          </span>
        </div>
        {!open && prev && (
          <p className="mt-2 text-[12px] font-medium leading-snug text-white/45">
            Ochish uchun «{prev.title}» da {unlockNeed(prev)} ★ <span className="tabular-nums text-white/60">({Math.min(prevStars, unlockNeed(prev))}/{unlockNeed(prev)})</span>
          </p>
        )}
      </div>
    </Motion.button>
  )
}

function Board({ board, className = '' }) {
  const top = (board?.top || []).slice(0, 5)
  return (
    <section className={`rounded-[28px] border border-white/[0.08] bg-[#111118] p-4 lg:p-5 ${className}`}>
      <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
        <h2 className="text-[16px] font-extrabold tracking-tight lg:text-[18px]">Bu hafta — eng yaxshilar</h2>
        {board?.me && (
          <p className="text-[13px] font-medium text-white/45">
            Siz: {board.me.rank ? <b className="text-white">#{board.me.rank}</b> : 'hali reytingda emas'}
            {board.me.best_score ? <> · rekord <b className="text-white">{board.me.best_score}</b></> : null}
          </p>
        )}
      </div>
      {top.length ? (
        <ol className="mt-3 grid gap-1.5 sm:grid-cols-2 lg:grid-cols-5 lg:gap-2">
          {top.map((r, i) => (
            <li key={`${r.name}-${i}`} className="flex items-center gap-3 rounded-2xl bg-[#17171F] px-3 py-2 lg:py-2.5">
              <span className={`flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full text-[12px] font-bold ${i === 0 ? 'bg-[#FFB020] text-[#1A1203]' : 'bg-white/[0.08] text-white/70'}`}>{i + 1}</span>
              <span className="min-w-0 flex-1 truncate text-[14px] font-semibold text-white/90">{r.name}</span>
              <span className="flex items-center gap-1 text-[14px] font-bold tabular-nums"><Coin size={14} />{r.score}</span>
            </li>
          ))}
        </ol>
      ) : (
        <p className="mt-3 rounded-2xl bg-[#17171F] px-3 py-4 text-center text-[14px] font-medium text-white/50">
          Bu hafta hali natija yo‘q — birinchi bo‘ling!
        </p>
      )}
    </section>
  )
}

/* the Play Room card: the room with Toby on his stage */
function RoomCard({ progress, acc, onRoom, reduced }) {
  const rs = roomStars(progress)
  return (
    <Motion.button type="button" onClick={onRoom}
      initial={reduced ? false : { opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, delay: 0.08 }}
      whileHover={reduced ? undefined : { y: -3 }} whileTap={{ scale: 0.985 }}
      className="group relative flex w-full flex-col overflow-hidden rounded-[28px] border border-white/[0.08] bg-[#111118] text-left"
      aria-label="Toby bilan o‘yna — Gapir, Toby qiladi!">
      <div className="relative h-40 w-full overflow-hidden min-[420px]:h-48 lg:h-52">
        <RoomBackdrop className="absolute inset-0 h-full w-full" />
        <div className="absolute inset-0 bg-gradient-to-t from-[#111118] via-[#111118]/10 to-transparent" />
        <div className="absolute bottom-0 left-1/2 h-[92%] w-[44%] max-w-[220px] -translate-x-1/2">
          <TobyAvatar className="h-full w-full" acc={acc} mood="happy" pose="dance" reduced={reduced} />
        </div>
        <span className="absolute right-3 top-3 flex items-center gap-1 rounded-full bg-[#0B0B10]/60 px-2.5 py-1 text-[12px] font-bold tabular-nums text-white backdrop-blur lg:text-[13px]">
          <StarIcon size={13} /> {rs}/{COMMAND_COUNT}
        </span>
      </div>
      <div className="relative flex flex-1 flex-col px-4 pb-4 pt-1 lg:px-5 lg:pb-5">
        <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-[#FFB020]">Play Room</p>
        <h2 className="mt-0.5 text-[22px] font-extrabold leading-tight tracking-tight text-white lg:text-[26px]">Toby bilan o‘yna</h2>
        <p className="mt-1 text-[13.5px] font-medium text-white/55 lg:text-[15px]">Buyruq bering — Toby bajaradi: sakra, raqs tush, o‘tir…</p>
        <div className="mt-3 flex items-center gap-3">
          <div className="min-w-0 flex-1">
            <Bar pct={rs / COMMAND_COUNT} reduced={reduced} height="h-1" />
            <p className="mt-1.5 text-[12px] font-medium text-white/45">{rs} / {COMMAND_COUNT} buyruq o‘rganildi</p>
          </div>
          <span className="flex h-11 flex-shrink-0 items-center gap-2 rounded-full bg-white px-4 text-[15px] font-extrabold text-[#0B0B10] transition-transform group-hover:scale-105 lg:h-12 lg:px-5">
            <Play size={16} className="fill-current" /> O‘ynash
          </span>
        </div>
      </div>
    </Motion.button>
  )
}

export default function ZoneMap({ progress, online, board, acc = null, onStart, onRoom, onWardrobe, onClaim, onBack, reduced = false }) {
  const supported = speechSupported()
  const lv = levelInfo(progress.xp)
  const [talking, setTalking] = useState(false)
  const [hops, setHops] = useState(0)
  const voiceId = useRef(0)
  const total = allStars(progress)
  const fresh = newAccs(progress)                    // accessories unlocked but not seen in the wardrobe yet
  const open = ZONES.map((_, i) => zoneUnlocked(ZONES, i, progress))
  const nextIndex = ZONES.findIndex((z, i) => open[i] && !(progress.zones[z.key]?.stars > 0))
  const opened = open.filter(Boolean).length

  useEffect(() => () => { voiceId.current += 1; stopVoice() }, [])

  const greet = async () => {
    const id = ++voiceId.current
    setHops(h => h + 1)
    setTalking(true)
    let timer
    await Promise.race([sayLine(GREETING, { voice: TOBY_VOICE }), new Promise(r => { timer = setTimeout(r, 6000) })])
    clearTimeout(timer)
    if (id === voiceId.current) setTalking(false)
  }

  return (
    <div className="mx-auto w-full max-w-[1440px] px-4 pb-16 pt-4 sm:px-6 lg:px-8 lg:pt-7">
      <header className="flex items-center gap-2 sm:gap-3">
        <button type="button" onClick={onBack} aria-label="O‘yinlarga qaytish"
          className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full border border-white/[0.08] bg-[#111118] text-white/75 transition hover:bg-[#17171F] lg:h-11 lg:w-11">
          <ChevronLeft size={21} />
        </button>
        <div className="min-w-0 flex-1">
          <h1 className="truncate text-[19px] font-extrabold leading-tight tracking-tight sm:text-[20px] lg:text-[28px]">Toby’s Day</h1>
          <p className="hidden truncate text-[12px] font-medium text-white/45 sm:block lg:text-[14px]">Gapiring — Toby bajaradi</p>
        </div>
        {online === false && (
          <span className="hidden items-center gap-1 rounded-full bg-white/[0.06] px-2.5 py-1 text-[11px] font-semibold text-white/55 sm:flex" title="Natijalar shu qurilmada saqlanadi">
            <CloudOff size={13} /> Offline
          </span>
        )}
        <div className="flex flex-shrink-0 items-center gap-2 rounded-full border border-white/[0.08] bg-[#111118] px-2.5 py-1.5 text-[12.5px] font-bold tabular-nums sm:gap-3 sm:px-3 sm:text-[13.5px] lg:px-4 lg:py-2 lg:text-[15px]">
          <span className="flex items-center gap-1"><Coin size={15} />{progress.coins}</span>
          <span className="h-4 w-px bg-white/10" />
          <span className="flex items-center gap-1" title="Zonalar + o‘yin xonasi + vazifalar"><StarIcon size={14} />{total}</span>
        </div>
        <WardrobeButton progress={progress} onClick={onWardrobe} compact className="sm:hidden" />
        <WardrobeButton progress={progress} onClick={onWardrobe} className="hidden sm:flex" />
      </header>

      {/* grid-cols-1 = minmax(0, 1fr): a long mission row must not widen the phone column past the screen */}
      <div className="mt-4 grid grid-cols-1 gap-3 sm:gap-4 lg:mt-7 lg:grid-cols-2 lg:gap-5 xl:grid-cols-[minmax(0,1.05fr)_minmax(0,1fr)_minmax(0,1fr)]">
        {/* Toby + your level */}
        <Motion.section initial={reduced ? false : { opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}
          className="relative flex flex-col overflow-hidden rounded-[28px] border border-white/[0.08] bg-[#111118] p-4 lg:p-5">
          <div className="pointer-events-none absolute -left-16 -top-20 h-64 w-64 rounded-full bg-[#FFB020]/[0.10] blur-3xl" />
          <div className="relative flex flex-1 items-center gap-2 lg:gap-4">
            <button type="button" onClick={greet} aria-label="Toby bilan salomlashish" className="relative -my-1 h-36 w-32 flex-shrink-0 sm:h-40 sm:w-36 lg:h-52 lg:w-44">
              <TobyAvatar className="h-full w-full" acc={acc} mood={talking ? 'proud' : 'idle'} pose={talking ? 'wave' : 'rest'} talking={talking} jump={hops} reduced={reduced} />
            </button>
            <div className="min-w-0 flex-1">
              <button type="button" onClick={greet}
                className="relative inline-flex max-w-full items-start gap-2 rounded-[18px] rounded-bl-md bg-white px-3 py-2 text-left text-[14px] font-bold leading-snug text-slate-800 shadow-lg lg:px-4 lg:py-3 lg:text-[17px]">
                <span>{GREETING}</span>
                <Volume2 size={15} className={`mt-0.5 flex-shrink-0 ${talking ? 'text-[#F59E0B]' : 'text-slate-400'}`} />
              </button>
              <button type="button" onClick={onWardrobe}
                className="relative mt-3 inline-flex max-w-full items-center gap-2 whitespace-nowrap rounded-full border border-white/[0.08] bg-[#17171F] px-3 py-1.5 text-[12.5px] font-semibold text-white/85 transition hover:bg-[#1D1D27] lg:text-[14px]">
                {/* one line on a phone too (the long label wrapped into two next to the badge) */}
                <span className="min-[420px]:hidden">Kiyintirish</span>
                <span className="hidden min-[420px]:inline">Tobyni kiyintirish</span>
                {fresh.length > 0 && (
                  <span className="-my-1 -mr-1.5 flex items-center gap-1 rounded-full bg-[#FFB020] py-0.5 pl-0.5 pr-2 text-[11px] font-extrabold uppercase text-[#1A1203]">
                    <AccIcon acc={fresh[fresh.length - 1]} size={18} /> Yangi
                  </span>
                )}
              </button>
            </div>
          </div>
          <div className="relative mt-3 rounded-2xl bg-[#17171F] p-3 lg:p-4">
            <div className="flex items-center justify-between text-[12px] font-semibold lg:text-[13px]">
              <span className="text-white/85">Speaking · Lv {lv.level}</span>
              <span className="tabular-nums text-white/45">{lv.into} / {lv.need} XP</span>
            </div>
            <div className="mt-2"><Bar pct={lv.pct} reduced={reduced} height="h-1.5" /></div>
          </div>
        </Motion.section>

        <MissionsCard progress={progress} onClaim={onClaim} reduced={reduced} />

        <RoomCard progress={progress} acc={acc} onRoom={onRoom} reduced={reduced} />
      </div>

      {!supported && <div className="mt-4"><VoiceNotice error="unsupported" /></div>}

      {/* the day */}
      <div className="mb-3 mt-8 flex flex-wrap items-baseline justify-between gap-2 lg:mb-4 lg:mt-10">
        <h2 className="text-[18px] font-extrabold tracking-tight lg:text-[22px]">Toby’ning kuni</h2>
        <p className="text-[12.5px] font-medium text-white/40 lg:text-[14px]">{opened} / {ZONES.length} zona ochiq</p>
      </div>
      <div className="grid grid-cols-1 gap-2.5 min-[560px]:grid-cols-2 min-[560px]:gap-4 lg:grid-cols-3 lg:gap-5 xl:grid-cols-5">
        {ZONES.map((z, i) => (
          <ZoneCard key={z.key} zone={z} index={i} progress={progress} open={open[i]} next={i === nextIndex} onStart={onStart} reduced={reduced} />
        ))}
      </div>

      <Board board={board} className="mt-8 lg:mt-10" />
    </div>
  )
}
