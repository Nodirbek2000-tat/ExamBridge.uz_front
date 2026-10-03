/*
 * TOBY'S DAY — the start screen: Toby says hi (wearing his accessory), the
 * learner's level and stars, the Play Room, the wardrobe, and the day as a
 * grid of big illustrated zone cards (any number of zones from content.js;
 * each opens with stars from the one before). Wide on a computer, tidy on a phone.
 */
import { useEffect, useRef, useState } from 'react'
import { motion as Motion } from 'framer-motion'
import { ChevronLeft, CloudOff, Lock, Mic, Play, Sparkles, Star, Trophy, Volume2 } from 'lucide-react'
import { speechSupported } from '../../../games/voice/useSpeech'
import { sayLine, stopVoice } from '../../../games/voice/voiceTts'
import { VoiceNotice } from '../../../games/voice/VoiceUI'
import { GREETING, ZONES } from './content'
import { levelInfo, maxStars, medal, unlockNeed, zoneUnlocked } from './logic'
import { COMMAND_COUNT, allStars, newAccs, roomStars } from './room'
import { TobyAvatar } from './Toby'
import { ItemArt, ItemIcon } from './items'
import { ITEM_NAMES } from './world-items'
import { RoomBackdrop } from './RoomScene'
import { AccIcon, WardrobeButton } from './Wardrobe'
import { Bar, Coin, Medal } from './ui'

const STAR = 'M0-10 2.9-3.1 10.5-3.1 4.3 1.6 6.6 9.1 0 4.6-6.6 9.1-4.3 1.6-10.5-3.1-2.9-3.1z'

/* a picture for each zone card (static: eight cards must stay light) */
function ZoneArt({ k }) {
  return (
    <svg viewBox="-50 -50 100 100" className="h-full w-full" aria-hidden>
      <circle r="44" fill="#fff" opacity="0.16" />
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
      {!['morning', 'breakfast', 'street', 'school', 'shop', 'park', 'cooking', 'evening'].includes(k) && (
        <path d={STAR} transform="scale(3.2)" fill="#FDE047" />
      )}
    </svg>
  )
}

/* item pictures of the zone's lines (B's `pic` field), up to three — only names items.jsx can draw */
const DRAWN = new Set(ITEM_NAMES)
function zonePics(zone) {
  const out = []
  for (const s of zone.steps || []) {
    if (s.pic && DRAWN.has(s.pic) && !out.includes(s.pic)) out.push(s.pic)
    if (out.length >= 3) break
  }
  return out
}

function ZoneCard({ zone, index, progress, open, next, onStart, reduced }) {
  const saved = progress.zones[zone.key]
  const stars = saved?.stars || 0
  const max = maxStars(zone)
  const prev = ZONES[index - 1]
  const prevStars = prev ? progress.zones[prev.key]?.stars || 0 : 0
  const pics = zonePics(zone)
  const m = medal(stars, zone)
  return (
    <Motion.button type="button" onClick={() => open && onStart(index)} disabled={!open}
      initial={reduced ? false : { opacity: 0, y: 22 }} animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.08 + index * 0.05, duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
      whileHover={open && !reduced ? { y: -4, scale: 1.015 } : undefined} whileTap={open ? { scale: 0.98 } : undefined}
      className={`group relative flex w-full flex-row overflow-hidden rounded-[28px] text-left shadow-xl disabled:cursor-not-allowed min-[520px]:flex-col lg:rounded-[32px]
        ${next ? 'ring-4 ring-white/70' : ''}`}
      style={{ background: `linear-gradient(145deg, ${zone.from} 0%, ${zone.to} 100%)` }}
      aria-label={open ? `${zone.title} — boshlash` : `${zone.title} — yopiq`}>
      <div className="pointer-events-none absolute -right-10 -top-12 h-40 w-40 rounded-full bg-white/20 blur-2xl" />

      {/* picture */}
      <div className="relative w-[118px] flex-shrink-0 self-stretch min-[520px]:h-36 min-[520px]:w-full lg:h-44">
        <div className="absolute inset-2 min-[520px]:inset-x-6 min-[520px]:inset-y-2"><ZoneArt k={zone.key} /></div>
        <span className="absolute left-2.5 top-2.5 flex h-8 w-8 items-center justify-center rounded-full bg-black/30 text-[14px] font-black text-white backdrop-blur lg:h-9 lg:w-9 lg:text-[16px]">
          {index + 1}
        </span>
        {pics.length > 0 && (
          <div className="absolute bottom-2 right-2 hidden gap-1 min-[520px]:flex">
            {pics.map(p => (
              <span key={p} className="flex h-9 w-9 items-center justify-center rounded-full bg-white/85 shadow lg:h-11 lg:w-11">
                <ItemIcon name={p} size={26} className="lg:h-8 lg:w-8" />
              </span>
            ))}
          </div>
        )}
      </div>

      {/* text */}
      <div className="relative flex min-w-0 flex-1 flex-col p-3.5 pl-1 min-[520px]:bg-black/10 min-[520px]:p-4 min-[520px]:pt-3 lg:p-5 lg:pt-4">
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="rounded-md bg-black/25 px-1.5 py-0.5 text-[10px] font-black uppercase tracking-wider text-white lg:text-[12px]">{zone.cefr}</span>
          <span className="text-[12px] font-bold text-white/80 lg:text-[13px]">{zone.steps.length} ta gap</span>
          {next && (
            <Motion.span animate={reduced ? undefined : { scale: [1, 1.08, 1] }} transition={{ duration: 1.4, repeat: Infinity }}
              className="rounded-full bg-white px-2 py-0.5 text-[10px] font-black uppercase tracking-wide text-rose-600 lg:text-[11px]">
              Keyingisi!
            </Motion.span>
          )}
        </div>
        <h3 className="mt-1 text-[22px] font-black leading-none tracking-tight text-white drop-shadow-sm min-[520px]:text-[24px] lg:text-[28px]">{zone.title}</h3>
        <p className="mt-1 line-clamp-1 text-[13px] font-semibold text-white/85 lg:text-[15px]">{zone.uz} · {zone.blurb}</p>
        <div className="mt-auto flex items-end justify-between gap-2 pt-2.5">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <Medal n={m} size={15} />
              <span className="text-[12px] font-black tabular-nums text-white/90 lg:text-[14px]">{stars}/{max} ★</span>
              {saved?.best ? <span className="hidden items-center gap-1 text-[12px] font-bold text-white/75 sm:flex"><Coin size={13} />{saved.best}</span> : null}
            </div>
            <div className="mt-1.5 h-1.5 w-full max-w-[180px] overflow-hidden rounded-full bg-black/20">
              <div className="h-full rounded-full bg-yellow-200" style={{ width: `${max ? (stars / max) * 100 : 0}%` }} />
            </div>
          </div>
          <span className={`flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-full lg:h-12 lg:w-12 ${open ? 'bg-white text-slate-900 shadow-lg transition-transform group-hover:scale-110' : 'bg-black/25 text-white/80'}`}>
            {open ? <Play size={20} className="ml-0.5 fill-current" /> : <Lock size={18} />}
          </span>
        </div>
      </div>

      {!open && prev && (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-[#08080F]/60 p-3 text-center backdrop-grayscale">
          <span className="flex h-12 w-12 items-center justify-center rounded-full bg-black/40 text-white/90"><Lock size={22} /></span>
          <span className="max-w-[260px] rounded-2xl bg-black/50 px-3 py-1.5 text-[12px] font-bold leading-snug text-white/90 lg:text-[14px]">
            Ochish uchun «{prev.title}» da {unlockNeed(prev)} ★ yig‘ing
            <span className="ml-1 tabular-nums text-amber-200">({Math.min(prevStars, unlockNeed(prev))}/{unlockNeed(prev)})</span>
          </span>
        </div>
      )}
    </Motion.button>
  )
}

function Board({ board, className = '' }) {
  const top = board?.top || []
  return (
    <section className={`rounded-[28px] border border-white/10 bg-white/[0.04] p-4 lg:p-5 ${className}`}>
      <div className="mb-3 flex items-center gap-2">
        <Trophy size={20} className="text-amber-300" />
        <h2 className="text-[16px] font-black lg:text-[18px]">Bu hafta — eng yaxshilar</h2>
      </div>
      {top.length ? (
        <ol className="space-y-1.5">
          {top.slice(0, 5).map((r, i) => (
            <li key={`${r.name}-${i}`} className="flex items-center gap-3 rounded-2xl bg-white/[0.04] px-3 py-2">
              <span className={`flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full text-[12px] font-black ${['bg-amber-400 text-amber-950', 'bg-slate-300 text-slate-900', 'bg-orange-400 text-orange-950'][i] || 'bg-white/10 text-white/70'}`}>{i + 1}</span>
              <span className="min-w-0 flex-1 truncate text-sm font-bold text-white/90 lg:text-[15px]">{r.name}</span>
              <span className="flex items-center gap-1 text-sm font-black tabular-nums"><Coin size={14} />{r.score}</span>
            </li>
          ))}
        </ol>
      ) : (
        <p className="rounded-2xl bg-white/[0.04] px-3 py-4 text-center text-[14px] font-semibold text-white/60">
          Bu hafta hali natija yo‘q — birinchi bo‘ling!
        </p>
      )}
      {board?.me && (
        <p className="mt-3 text-center text-[13px] font-semibold text-white/60">
          Siz: {board.me.rank ? <b className="text-white">#{board.me.rank}</b> : 'hali reytingda emas'}
          {board.me.best_score ? <> · rekord <b className="text-white">{board.me.best_score}</b></> : null}
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
      initial={reduced ? false : { opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.45, delay: 0.06 }}
      whileHover={reduced ? undefined : { y: -4 }} whileTap={{ scale: 0.985 }}
      className="group relative flex w-full flex-col overflow-hidden rounded-[30px] text-left shadow-2xl lg:rounded-[34px]"
      style={{ background: 'linear-gradient(140deg, #8B5CF6 0%, #D946EF 55%, #F43F5E 100%)' }}
      aria-label="Toby bilan o‘yna — Gapir, Toby qiladi!">
      <div className="relative h-44 w-full overflow-hidden min-[420px]:h-52 lg:h-60">
        <RoomBackdrop className="absolute inset-0 h-full w-full" />
        <div className="absolute inset-0 bg-gradient-to-t from-[#8B5CF6]/70 via-transparent to-transparent" />
        <div className="absolute bottom-0 left-1/2 h-[92%] w-[46%] max-w-[230px] -translate-x-1/2">
          <TobyAvatar className="h-full w-full" acc={acc} mood="happy" pose="dance" reduced={reduced} />
        </div>
        <span className="absolute left-3 top-3 inline-flex items-center gap-1 rounded-md bg-white px-2 py-0.5 text-[11px] font-black uppercase tracking-wider text-fuchsia-600 shadow">
          <Sparkles size={11} /> Yangi
        </span>
        <span className="absolute right-3 top-3 flex items-center gap-1 rounded-full bg-black/45 px-2.5 py-1 text-[12px] font-black text-amber-200 backdrop-blur lg:text-[14px]">
          <Star size={13} className="fill-amber-300 text-amber-300" /> {rs}/{COMMAND_COUNT}
        </span>
        {!reduced && (
          <Motion.span className="absolute left-[16%] top-[30%] text-[26px] font-black text-white/90 drop-shadow"
            animate={{ y: [0, -12, 0], rotate: [-8, 8, -8] }} transition={{ duration: 2.4, repeat: Infinity }}>♪</Motion.span>
        )}
      </div>
      <div className="relative flex flex-1 flex-col p-4 lg:p-5">
        <p className="text-[11px] font-black uppercase tracking-[0.18em] text-white/80 lg:text-[12px]">Play Room</p>
        <h2 className="mt-0.5 text-[26px] font-black leading-none tracking-tight text-white drop-shadow lg:text-[32px]">Toby bilan o‘yna</h2>
        <p className="mt-1.5 text-[14px] font-bold text-white/90 lg:text-[16px]">Gapir, Toby qiladi! Tur, o‘tir, sakra, raqs tush…</p>
        <div className="mt-3 flex flex-wrap gap-1.5">
          {['Jump!', 'Dance!', 'Don’t cry!'].map(s => (
            <span key={s} className="inline-flex items-center gap-1 rounded-2xl rounded-bl-md bg-white/95 px-2.5 py-1 text-[13px] font-black text-slate-800 shadow lg:text-[15px]">
              <Mic size={12} className="text-rose-500" /> {s}
            </span>
          ))}
        </div>
        <div className="mt-4 flex items-center gap-3">
          <div className="min-w-0 flex-1">
            <div className="h-2 overflow-hidden rounded-full bg-black/20">
              <div className="h-full rounded-full bg-yellow-200" style={{ width: `${(rs / COMMAND_COUNT) * 100}%` }} />
            </div>
            <p className="mt-1 text-[12px] font-bold text-white/80 lg:text-[13px]">{rs} / {COMMAND_COUNT} buyruq o‘rganildi</p>
          </div>
          <span className="flex h-12 flex-shrink-0 items-center gap-2 rounded-full bg-white px-5 text-[16px] font-black text-fuchsia-700 shadow-xl transition-transform group-hover:scale-105 lg:h-14 lg:text-[18px]">
            <Play size={18} className="fill-current" /> O‘ynash
          </span>
        </div>
      </div>
    </Motion.button>
  )
}

export default function ZoneMap({ progress, online, board, acc = null, onStart, onRoom, onWardrobe, onBack, reduced = false }) {
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
    await Promise.race([sayLine(GREETING), new Promise(r => { timer = setTimeout(r, 6000) })])
    clearTimeout(timer)
    if (id === voiceId.current) setTalking(false)
  }

  return (
    <div className="mx-auto w-full max-w-[1440px] px-4 pb-16 pt-4 sm:px-6 lg:px-8 lg:pt-6">
      <header className="flex items-center gap-3">
        <button type="button" onClick={onBack} aria-label="O‘yinlarga qaytish"
          className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-white/10 text-white/80 transition hover:bg-white/15 lg:h-12 lg:w-12">
          <ChevronLeft size={22} />
        </button>
        <div className="min-w-0 flex-1">
          <p className="text-[11px] font-black uppercase tracking-[0.18em] text-amber-300 lg:text-[13px]">Speak &amp; Play</p>
          <h1 className="text-[22px] font-black leading-tight tracking-tight lg:text-[34px]">TOBY’S DAY</h1>
        </div>
        {online === false && (
          <span className="flex items-center gap-1 rounded-full bg-white/10 px-2.5 py-1 text-[11px] font-bold text-white/60" title="Natijalar shu qurilmada saqlanadi">
            <CloudOff size={13} /> Offline
          </span>
        )}
        <WardrobeButton progress={progress} onClick={onWardrobe} compact className="sm:hidden" />
        <WardrobeButton progress={progress} onClick={onWardrobe} className="hidden sm:flex" />
      </header>

      <div className="mt-4 grid gap-4 lg:mt-6 lg:grid-cols-2 lg:gap-5 xl:grid-cols-[1.12fr_1fr_0.82fr]">
        {/* Toby + your level */}
        <Motion.section initial={reduced ? false : { opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.45 }}
          className="relative flex flex-col overflow-hidden rounded-[30px] p-4 shadow-2xl lg:rounded-[34px] lg:p-6" style={{ background: 'linear-gradient(135deg, #FBBF24 0%, #EA580C 100%)' }}>
          <div className="pointer-events-none absolute -left-10 -top-16 h-56 w-56 rounded-full bg-white/25 blur-3xl" />
          <div className="relative flex flex-1 items-center gap-2 lg:gap-4">
            <button type="button" onClick={greet} aria-label="Toby bilan salomlashish" className="relative -my-2 h-40 w-36 flex-shrink-0 sm:h-44 sm:w-40 lg:h-60 lg:w-52">
              <TobyAvatar className="h-full w-full" acc={acc} mood={talking ? 'proud' : 'idle'} pose={talking ? 'wave' : 'rest'} talking={talking} jump={hops} reduced={reduced} />
            </button>
            <div className="min-w-0 flex-1">
              <button type="button" onClick={greet}
                className="relative inline-flex max-w-full items-center gap-1.5 rounded-2xl rounded-bl-md bg-white px-3 py-2 text-left text-[14px] font-extrabold leading-snug text-slate-800 shadow-lg lg:px-4 lg:py-3 lg:text-[19px]">
                <span>“{GREETING}”</span>
                <Volume2 size={16} className={`flex-shrink-0 ${talking ? 'text-orange-500' : 'text-slate-400'}`} />
              </button>
              <p className="mt-2 text-[13px] font-semibold leading-snug text-white/90 lg:text-[16px]">Gapni ayting — Toby bajaradi!</p>
              <button type="button" onClick={onWardrobe}
                className="relative mt-2.5 inline-flex items-center gap-2 rounded-full bg-black/20 px-3 py-1.5 text-[12.5px] font-black text-white backdrop-blur transition hover:bg-black/30 lg:text-[14px]">
                <Sparkles size={14} /> Tobyni kiyintirish
                {fresh.length > 0 && (
                  <Motion.span animate={reduced ? undefined : { scale: [1, 1.12, 1] }} transition={{ duration: 1.2, repeat: Infinity }}
                    className="-my-1 -mr-1.5 flex items-center gap-1 rounded-full bg-white py-0.5 pl-0.5 pr-2 text-[11px] font-black uppercase text-rose-600 shadow lg:text-[12px]">
                    <AccIcon acc={fresh[fresh.length - 1]} size={20} /> Yangi!
                  </Motion.span>
                )}
              </button>
            </div>
          </div>
          <div className="relative mt-3 rounded-2xl bg-black/20 p-3 backdrop-blur-sm lg:p-4">
            <div className="flex items-center gap-2">
              <span className="flex-shrink-0 whitespace-nowrap rounded-md bg-white px-1.5 py-0.5 text-[11px] font-black text-orange-600 lg:text-[13px]">Lv {lv.level}</span>
              <Bar pct={lv.pct} className="from-white to-yellow-200" reduced={reduced} />
              <span className="flex-shrink-0 text-[11px] font-bold tabular-nums text-white/80 lg:text-[13px]">{lv.into}/{lv.need} XP</span>
            </div>
            <div className="mt-2.5 flex items-center justify-around text-white">
              <span className="flex items-center gap-1.5 text-[15px] font-black tabular-nums lg:text-[19px]"><Coin size={20} />{progress.coins}</span>
              <span className="h-5 w-px bg-white/25" />
              <span className="flex items-center gap-1.5 text-[15px] font-black tabular-nums lg:text-[19px]" title="Zonalar + o‘yin xonasi">
                <Star size={18} className="fill-yellow-200 text-yellow-200" />{total}
              </span>
              <span className="h-5 w-px bg-white/25" />
              <span className="text-[13px] font-bold text-white/85 lg:text-[15px]">Speaking</span>
            </div>
          </div>
        </Motion.section>

        <RoomCard progress={progress} acc={acc} onRoom={onRoom} reduced={reduced} />

        <Board board={board} className="hidden xl:block" />
      </div>

      {/* how it works */}
      <div className="mt-4 grid grid-cols-3 gap-2 text-center lg:mt-5 lg:gap-4">
        {[['1', 'Gapni o‘qing'], ['2', 'Mikrofonni bir marta bosing'], ['3', 'Ayting — Toby bajaradi!']].map(([n, t]) => (
          <div key={n} className="rounded-2xl bg-white/[0.05] px-2 py-2.5 lg:flex lg:items-center lg:gap-3 lg:px-4 lg:py-3 lg:text-left">
            <span className="mx-auto flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-amber-400 text-[12px] font-black text-amber-950 lg:mx-0 lg:h-9 lg:w-9 lg:text-[15px]">
              {n === '2' ? <Mic size={15} /> : n}
            </span>
            <p className="mt-1.5 text-[12px] font-bold leading-tight text-white/75 lg:mt-0 lg:text-[15px]">{t}</p>
          </div>
        ))}
      </div>

      {!supported && <div className="mt-4"><VoiceNotice error="unsupported" /></div>}

      {/* the day */}
      <div className="mb-3 mt-7 flex flex-wrap items-baseline justify-between gap-2 lg:mt-9">
        <h2 className="text-[13px] font-black uppercase tracking-[0.16em] text-white/50 lg:text-[16px]">Toby’ning kuni</h2>
        <p className="text-[12px] font-bold text-white/45 lg:text-[14px]">{opened}/{ZONES.length} zona ochiq</p>
      </div>
      <div className="grid grid-cols-1 gap-3 min-[520px]:grid-cols-2 min-[520px]:gap-4 lg:grid-cols-3 lg:gap-5 xl:grid-cols-4">
        {ZONES.map((z, i) => (
          <ZoneCard key={z.key} zone={z} index={i} progress={progress} open={open[i]} next={i === nextIndex} onStart={onStart} reduced={reduced} />
        ))}
      </div>

      <Board board={board} className="mt-8 xl:hidden" />
    </div>
  )
}
