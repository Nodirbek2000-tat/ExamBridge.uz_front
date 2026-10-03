import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion'
import {
  Swords, Mic, Mic2, Repeat2, Grid3x3, Image as ImageIcon, Link2, Ban,
  BookOpen, Newspaper, Users, ChevronRight, Sparkles, Trophy, X, Clock, Gamepad2, ArrowLeft,
} from 'lucide-react'
import api from '../../api/client'

/* ─────────────────────────────────────────────────────────────
   Catalogue. Only real numbers are shown: players this week come
   from GET /games/hub/ (null below 30 players → "Yangi").
   Games that are not built yet say "Tez orada".
   ───────────────────────────────────────────────────────────── */

const VOICE_GAMES = [
  {
    key: 'tobys-day',
    route: '/games/tobys-day',
    title: 'TOBY’S DAY',
    subtitle: 'Gapir, Toby bajaradi',
    sample: 'I get up at seven.',
    from: '#FBBF24',
    to: '#EA580C',
    art: 'toby',
    // second door on the card: straight into Toby's Play Room
    extra: { route: '/games/tobys-day?room=1', title: 'Play Room', text: 'Toby bilan o‘yna — Gapir, Toby qiladi!' },
  },
  {
    key: 'voice-drive',
    route: '/games/voice-drive',
    title: 'VOICE DRIVE',
    subtitle: 'Ovozing bilan boshqar',
    sample: 'Turn left!',
    from: '#3B82F6',
    to: '#7C3AED',
    art: 'car',
  },
]

const FEATURED = {
  key: 'word-battle',
  title: 'WORD BATTLE',
  subtitle: 'Do‘stingni duelga chaqir — 20 so‘z, kim tez va aniq?',
  from: '#22B8F0',
  to: '#0C7BD1',
  icon: Swords,
}

const GAMES = [
  {
    key: 'speaking-battle',
    title: 'SPEAKING BATTLE',
    subtitle: 'Bot yoki jonli raqib bilan gaplash',
    from: '#8B5CF6',
    to: '#D946EF',
    icon: Mic2,
    tag: 'AI',
  },
  {
    key: 'shadowing',
    route: '/games/shadowing',
    title: 'SHADOWING',
    subtitle: 'Ovoz ortidan takrorla, talaffuzni charxla',
    from: '#F43F5E',
    to: '#FB7185',
    icon: Repeat2,
  },
  {
    key: 'squares',
    title: 'SQUARES',
    subtitle: 'Harflar to‘ridan so‘zlarni top',
    from: '#84CC16',
    to: '#4D9E0F',
    icon: Grid3x3,
  },
  {
    key: '4pics',
    title: '4 PICS 1 WORD',
    subtitle: 'To‘rt rasm — bitta so‘z',
    from: '#FB923C',
    to: '#EA8C1B',
    icon: ImageIcon,
  },
  {
    key: 'odd-one-out',
    title: 'ODD ONE OUT',
    subtitle: 'Ortiqchasini top',
    from: '#94A3B8',
    to: '#64748B',
    icon: Ban,
  },
  {
    key: 'connections',
    title: 'CONNECTIONS',
    subtitle: 'So‘zlarni guruhlarga ajrat',
    from: '#06B6D4',
    to: '#0E7490',
    icon: Link2,
  },
]

const LIBRARY = [
  {
    key: 'articles',
    route: '/study/articles',
    title: 'Articles',
    subtitle: 'Maqolani o‘qi, AI overview bilan muhokama qil',
    icon: Newspaper,
    from: '#3B82F6',
    to: '#1D4ED8',
    meta: 'Study Tools',
  },
  {
    key: 'books',
    title: 'Books',
    subtitle: 'Inglizcha kitoblar — audio va lug‘at bilan',
    icon: BookOpen,
    from: '#F59E0B',
    to: '#B45309',
    meta: 'Tez orada',
  },
]

// Warm the game's code while the finger is on its way to the card.
const PREFETCH = {
  'tobys-day': () => import('./tobys-day/TobysDayGame'),
  'voice-drive': () => import('./voice-drive/VoiceDriveGame'),
}
const prefetched = new Set()
function prefetchGame(key) {
  if (!PREFETCH[key] || prefetched.has(key)) return
  prefetched.add(key)
  PREFETCH[key]().catch(() => prefetched.delete(key))
}

const fmtCount = (n) => String(n).replace(/\B(?=(\d{3})+(?!\d))/g, ' ')

/* ─────────────────────────────────────────────────────────────
   Decorative bits
   ───────────────────────────────────────────────────────────── */

function Glow({ className = '', color = '#6366F1' }) {
  return (
    <div
      className={`pointer-events-none absolute rounded-full blur-[80px] opacity-40 ${className}`}
      style={{ background: color }}
    />
  )
}

function CardArt({ Icon }) {
  return (
    <div className="pointer-events-none absolute right-0 top-0 bottom-0 w-[46%] overflow-hidden">
      <div className="absolute -right-6 top-1/2 -translate-y-1/2 opacity-[0.22]">
        <Icon size={160} strokeWidth={1.1} className="text-white" />
      </div>
      <div className="absolute -right-10 -top-10 w-40 h-40 rounded-full bg-white/15 blur-2xl" />
      <div className="absolute right-8 bottom-2 w-20 h-20 rounded-full bg-white/10 blur-xl" />
    </div>
  )
}

/* Real players this week, "Yangi" while it is too early to count, "Tez orada" if not built. */
function PlayersChip({ live, players, small = false }) {
  const size = small ? 11 : 13
  const cls = small ? 'gap-1.5 px-2.5 py-1 text-[11px]' : 'gap-2 px-3 py-1.5 text-[13px]'
  let content
  if (!live) content = <><Clock size={size} className="text-white/80" /> Tez orada</>
  else if (players != null) content = <><Users size={size} className="text-white/80" /> <span className="tabular-nums">{fmtCount(players)}</span> <span className="font-semibold text-white/70">bu hafta</span></>
  else content = <><Sparkles size={size} className="text-white/80" /> Yangi</>
  return (
    <span className={`inline-flex items-center rounded-full bg-black/25 font-bold text-white backdrop-blur-sm ${cls}`}>
      {content}
    </span>
  )
}

/* ── Speak & Play art: inline SVG, gently animated unless reduced motion ── */

function TobyArt({ reduce }) {
  const fur = '#FFF4E6'
  const pink = '#FDA4AF'
  return (
    <svg viewBox="0 0 160 170" className="h-full w-full" aria-hidden>
      <ellipse cx="80" cy="161" rx="44" ry="7" fill="#000" opacity="0.16" />
      {/* body + belly */}
      <path d="M40 160c0-33 17-55 40-55s40 22 40 55z" fill={fur} />
      <ellipse cx="80" cy="141" rx="21" ry="17" fill="#fff" />
      {/* waving arm */}
      <motion.g
        style={{ originX: 0.12, originY: 0.92 }}
        animate={reduce ? undefined : { rotate: [0, -16, 0, -16, 0] }}
        transition={{ duration: 1.8, repeat: Infinity, repeatDelay: 1.6, ease: 'easeInOut' }}
      >
        <path d="M114 126c14-6 22-18 22-34" stroke={fur} strokeWidth="13" strokeLinecap="round" fill="none" />
        <circle cx="136" cy="89" r="9" fill={fur} />
      </motion.g>
      <path d="M44 128c-8 8-10 18-8 26" stroke={fur} strokeWidth="12" strokeLinecap="round" fill="none" />
      {/* ears */}
      <path d="M38 58 46 14l30 30z" fill={fur} />
      <path d="M46 46 50 25l14 15z" fill={pink} />
      <path d="M122 58 114 14 84 44z" fill={fur} />
      <path d="M114 46 110 25 96 40z" fill={pink} />
      {/* head */}
      <circle cx="80" cy="68" r="40" fill={fur} />
      {/* eyes (blink) */}
      <motion.g
        animate={reduce ? undefined : { scaleY: [1, 1, 0.1, 1] }}
        transition={{ duration: 3.2, repeat: Infinity, times: [0, 0.9, 0.95, 1] }}
      >
        <ellipse cx="65" cy="64" rx="7" ry="9" fill="#1F2937" />
        <ellipse cx="95" cy="64" rx="7" ry="9" fill="#1F2937" />
        <circle cx="67.5" cy="60" r="2.6" fill="#fff" />
        <circle cx="97.5" cy="60" r="2.6" fill="#fff" />
      </motion.g>
      <circle cx="54" cy="80" r="6" fill={pink} opacity="0.7" />
      <circle cx="106" cy="80" r="6" fill={pink} opacity="0.7" />
      <path d="M76 76h8l-4 4.5z" fill="#F472B6" />
      {/* talking mouth */}
      <motion.ellipse
        cx="80" cy="89" rx="7" fill="#9F1239"
        initial={{ ry: 3 }}
        animate={reduce ? { ry: 4 } : { ry: [2.5, 6, 3, 5.5, 2.5] }}
        transition={{ duration: 1.1, repeat: Infinity, repeatDelay: 0.6 }}
      />
      {/* whiskers */}
      <g stroke="#E7D3BE" strokeWidth="1.6" strokeLinecap="round">
        <path d="M44 82h-14M45 88l-13 4M116 82h14M115 88l13 4" />
      </g>
      {/* sound waves */}
      <g stroke="#fff" strokeWidth="3" strokeLinecap="round" fill="none" opacity="0.75">
        <path d="M18 34c-6 6-6 16 0 22" />
        <path d="M8 28c-10 10-10 24 0 34" opacity="0.6" />
      </g>
    </svg>
  )
}

function CarArt({ reduce }) {
  return (
    <svg viewBox="0 0 160 170" className="h-full w-full" aria-hidden>
      {/* road in perspective */}
      <path d="M62 8h36l58 162H4z" fill="#0B0A23" opacity="0.5" />
      <path d="M62 8 4 170M98 8l58 162" stroke="#fff" strokeOpacity="0.55" strokeWidth="2" />
      <motion.path
        d="M80 10v160" stroke="#FDE047" strokeWidth="4" strokeDasharray="12 14"
        initial={{ strokeDashoffset: 0 }}
        animate={reduce ? undefined : { strokeDashoffset: [0, -52] }}
        transition={{ duration: 0.7, repeat: Infinity, ease: 'linear' }}
      />
      {/* turn arrow sign */}
      <g transform="translate(18 18)">
        <rect width="34" height="26" rx="7" fill="#fff" opacity="0.92" />
        <path d="M24 13H11m0 0 5-5m-5 5 5 5" stroke="#4F46E5" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" fill="none" />
      </g>
      {/* car, seen from behind, steering left-right */}
      <motion.g
        animate={reduce ? undefined : { x: [-10, 10, -10] }}
        transition={{ duration: 3.4, repeat: Infinity, ease: 'easeInOut' }}
      >
        <ellipse cx="80" cy="156" rx="38" ry="6" fill="#000" opacity="0.3" />
        <rect x="47" y="140" width="13" height="14" rx="4" fill="#111827" />
        <rect x="100" y="140" width="13" height="14" rx="4" fill="#111827" />
        <path d="M58 113c4-17 12-23 22-23s18 6 22 23z" fill="#DC2626" />
        <path d="M63 112c3-12 9-16 17-16s14 4 17 16z" fill="#BFDBFE" opacity="0.92" />
        <rect x="44" y="111" width="72" height="35" rx="11" fill="#EF4444" />
        <rect x="50" y="120" width="15" height="7" rx="3" fill="#FDE047" />
        <rect x="95" y="120" width="15" height="7" rx="3" fill="#FDE047" />
        <rect x="70" y="131" width="20" height="8" rx="2" fill="#fff" />
        <path d="M44 128h72" stroke="#B91C1C" strokeWidth="1.5" />
      </motion.g>
      {/* speed lines */}
      <g stroke="#fff" strokeWidth="2.5" strokeLinecap="round" opacity="0.5">
        <path d="M24 120h-14M30 136h-20M136 120h14M130 136h20" />
      </g>
    </svg>
  )
}

/* ─────────────────────────────────────────────────────────────
   Cards
   ───────────────────────────────────────────────────────────── */

function VoiceCard({ game, players, onOpen, delay = 0, reduce }) {
  const Art = game.art === 'car' ? CarArt : TobyArt
  const card = (
    <motion.button
      type="button"
      onClick={() => onOpen(game)}
      onPointerEnter={() => prefetchGame(game.key)}
      onFocus={() => prefetchGame(game.key)}
      onTouchStart={() => prefetchGame(game.key)}
      initial={reduce ? false : { opacity: 0, y: 24 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
      whileHover={reduce ? undefined : { y: -4, scale: 1.008 }}
      whileTap={{ scale: 0.985 }}
      className={`group relative flex min-h-[212px] w-full flex-col overflow-hidden rounded-[28px] p-5 text-left shadow-2xl sm:min-h-[236px] sm:p-6 ${game.extra ? 'flex-1 pb-[80px] sm:pb-[88px]' : ''}`}
      style={{ background: `linear-gradient(130deg, ${game.from} 0%, ${game.to} 100%)` }}
      aria-label={`${game.title} — ${game.subtitle}`}
    >
      <div className="pointer-events-none absolute -right-10 -top-12 h-44 w-44 rounded-full bg-white/15 blur-2xl" />
      <div className="pointer-events-none absolute bottom-16 right-1 top-3 w-[44%] max-w-[210px]">
        <Art reduce={reduce} />
      </div>
      <div className="pointer-events-none absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/20 to-transparent transition-transform duration-[900ms] ease-out group-hover:translate-x-full" />

      <div className="relative z-10 flex max-w-[58%] flex-1 flex-col">
        <span className="inline-flex w-fit items-center gap-1 rounded-md bg-white px-1.5 py-0.5 text-[10px] font-black uppercase tracking-wider text-rose-600 shadow">
          <Sparkles size={10} /> New
        </span>
        <h3 className="mt-2.5 text-[26px] font-black leading-none tracking-tight text-white drop-shadow-sm sm:text-[30px]">
          {game.title}
        </h3>
        <p className="mt-2 text-[14px] font-semibold leading-snug text-white/90">{game.subtitle}</p>

        {/* the kind of line you say */}
        <span className="mt-3 inline-flex w-fit max-w-full items-center gap-1.5 rounded-2xl rounded-bl-md bg-white/95 px-3 py-1.5 text-[13px] font-bold text-slate-800 shadow-lg">
          <Mic size={13} className="flex-shrink-0 text-rose-500" />
          <span className="truncate">“{game.sample}”</span>
        </span>

        <div className="mt-auto pt-4">
          <PlayersChip live players={players} />
        </div>
      </div>

      {/* mic motif = play button */}
      <span className="absolute bottom-4 right-4 z-10 flex h-12 w-12 items-center justify-center sm:bottom-5 sm:right-5">
        {!reduce && (
          <motion.span
            className="absolute inset-0 rounded-full bg-white/50"
            initial={{ scale: 1, opacity: 0.55 }}
            animate={{ scale: 1.7, opacity: 0 }}
            transition={{ duration: 1.8, repeat: Infinity, ease: 'easeOut' }}
          />
        )}
        <span className="relative flex h-12 w-12 items-center justify-center rounded-full bg-white shadow-xl transition-transform group-hover:scale-110">
          <Mic size={22} style={{ color: game.to }} />
        </span>
      </span>
    </motion.button>
  )
  if (!game.extra) return card
  // a second door on the card (a sibling, not nested: buttons cannot hold buttons)
  return (
    <div className="relative flex flex-col">
      {card}
      <motion.button
        type="button"
        onClick={() => onOpen({ ...game, route: game.extra.route })}
        onPointerEnter={() => prefetchGame(game.key)}
        onTouchStart={() => prefetchGame(game.key)}
        initial={reduce ? false : { opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: delay + 0.15, duration: 0.4 }}
        whileHover={reduce ? undefined : { scale: 1.02 }}
        whileTap={{ scale: 0.97 }}
        className="absolute bottom-4 left-4 right-[76px] z-20 flex items-center gap-2.5 rounded-2xl bg-gradient-to-r from-violet-600 to-fuchsia-600 px-3 py-2 text-left shadow-xl ring-2 ring-white/40 sm:bottom-5 sm:left-6 sm:right-[84px]"
        aria-label={`${game.extra.title} — ${game.extra.text}`}
      >
        <span className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl bg-white/20">
          <Sparkles size={18} className="text-white" />
        </span>
        <span className="min-w-0">
          <span className="block text-[15px] font-black leading-tight text-white">{game.extra.title}</span>
          <span className="block truncate text-[12px] font-semibold leading-tight text-white/85">{game.extra.text}</span>
        </span>
        <ChevronRight size={18} className="ml-auto flex-shrink-0 text-white/80" />
      </motion.button>
    </div>
  )
}

function MicMotif({ reduce }) {
  return (
    <span className="relative flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-rose-500 to-orange-400 shadow-lg shadow-rose-500/30">
      <Mic size={22} className="text-white" />
      <span className="absolute -right-2 top-1/2 flex -translate-y-1/2 items-end gap-[3px]">
        {[10, 16, 8].map((h, i) => (
          <motion.span
            key={i}
            className="w-[3px] rounded-full bg-rose-300"
            style={{ height: h }}
            animate={reduce ? undefined : { scaleY: [0.5, 1, 0.6, 1, 0.5] }}
            transition={{ duration: 1.2, repeat: Infinity, delay: i * 0.18 }}
          />
        ))}
      </span>
    </span>
  )
}

function BigCard({ game, onOpen, delay = 0 }) {
  const Icon = game.icon
  return (
    <motion.button
      type="button"
      onClick={() => onOpen(game)}
      initial={{ opacity: 0, y: 24 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
      whileHover={{ y: -4, scale: 1.008 }}
      whileTap={{ scale: 0.994 }}
      className="group relative w-full overflow-hidden rounded-[28px] p-6 sm:p-7 text-left shadow-2xl"
      style={{ background: `linear-gradient(120deg, ${game.from} 0%, ${game.to} 100%)` }}
    >
      <CardArt Icon={Icon} />

      {/* shine sweep */}
      <div className="pointer-events-none absolute inset-0 -translate-x-full group-hover:translate-x-full transition-transform duration-[900ms] ease-out bg-gradient-to-r from-transparent via-white/20 to-transparent" />

      <div className="relative z-10 max-w-[62%]">
        <h3 className="text-2xl sm:text-[32px] font-black tracking-tight text-white drop-shadow-sm">
          {game.title}
        </h3>
        <p className="mt-2 text-[13.5px] leading-snug text-white/80 font-medium">{game.subtitle}</p>

        <div className="mt-5">
          <PlayersChip live={!!game.route} players={game.players} />
        </div>
      </div>

      <div className="absolute bottom-5 right-5 z-10 flex h-10 w-10 items-center justify-center rounded-full bg-black/30 backdrop-blur-sm transition-transform group-hover:translate-x-1">
        <ChevronRight size={18} className="text-white" />
      </div>
    </motion.button>
  )
}

function GameCard({ game, onOpen, delay = 0 }) {
  const Icon = game.icon
  return (
    <motion.button
      type="button"
      onClick={() => onOpen(game)}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
      whileHover={{ y: -4, scale: 1.012 }}
      whileTap={{ scale: 0.99 }}
      className="group relative w-full overflow-hidden rounded-3xl p-5 text-left shadow-xl"
      style={{ background: `linear-gradient(125deg, ${game.from} 0%, ${game.to} 100%)` }}
    >
      <CardArt Icon={Icon} />
      <div className="pointer-events-none absolute inset-0 -translate-x-full group-hover:translate-x-full transition-transform duration-[900ms] ease-out bg-gradient-to-r from-transparent via-white/18 to-transparent" />

      <div className="relative z-10 max-w-[64%]">
        <div className="flex items-center gap-2">
          <h3 className="text-lg font-black tracking-tight text-white">{game.title}</h3>
          {game.tag && (
            <span className="rounded-md bg-white/25 px-1.5 py-0.5 text-[9px] font-black uppercase tracking-wider text-white">
              {game.tag}
            </span>
          )}
        </div>
        <p className="mt-1.5 text-xs leading-snug text-white/80 font-medium">{game.subtitle}</p>

        <div className="mt-4">
          <PlayersChip small live={!!game.route} players={game.players} />
        </div>
      </div>

      <div className="absolute bottom-4 right-4 z-10 flex h-8 w-8 items-center justify-center rounded-full bg-black/30 backdrop-blur-sm transition-transform group-hover:translate-x-1">
        <ChevronRight size={15} className="text-white" />
      </div>
    </motion.button>
  )
}

function LibraryCard({ item, onOpen, delay = 0 }) {
  const Icon = item.icon
  return (
    <motion.button
      type="button"
      onClick={() => onOpen(item)}
      initial={{ opacity: 0, y: 18 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 0.4 }}
      whileHover={{ y: -3 }}
      className="group relative w-full overflow-hidden rounded-3xl border border-white/10 bg-white/[0.04] p-5 text-left backdrop-blur-sm transition-colors hover:bg-white/[0.07]"
    >
      <div className="flex items-center gap-4">
        <div
          className="flex h-14 w-14 flex-shrink-0 items-center justify-center rounded-2xl shadow-lg"
          style={{ background: `linear-gradient(135deg, ${item.from}, ${item.to})` }}
        >
          <Icon size={24} className="text-white" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-base font-black text-white">{item.title}</p>
          <p className="mt-0.5 text-xs text-white/50">{item.subtitle}</p>
          <span className="mt-2 inline-block rounded-full bg-white/10 px-2 py-0.5 text-[10px] font-bold text-white/70">
            {item.meta}
          </span>
        </div>
        <ChevronRight size={18} className="flex-shrink-0 text-white/30 transition-transform group-hover:translate-x-1 group-hover:text-white/60" />
      </div>
    </motion.button>
  )
}

/* ─────────────────────────────────────────────────────────────
   Coming-soon sheet
   ───────────────────────────────────────────────────────────── */

function SoonSheet({ game, onClose }) {
  if (!game) return null
  const Icon = game.icon
  return (
    <>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="fixed inset-0 z-[80] bg-black/70 backdrop-blur-sm"
      />
      <motion.div
        role="dialog"
        aria-modal="true"
        initial={{ opacity: 0, scale: 0.94, y: 24 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.94, y: 24 }}
        transition={{ type: 'spring', damping: 26, stiffness: 320 }}
        className="fixed left-1/2 top-1/2 z-[90] w-[min(92vw,420px)] -translate-x-1/2 -translate-y-1/2 overflow-hidden rounded-[28px] border border-white/10 bg-[#12121C] p-7 text-center shadow-2xl"
      >
        <button
          type="button"
          onClick={onClose}
          aria-label="Yopish"
          className="absolute right-4 top-4 flex h-9 w-9 items-center justify-center rounded-full bg-white/5 text-white/50 transition-colors hover:bg-white/10 hover:text-white"
        >
          <X size={16} />
        </button>

        <div
          className="mx-auto mb-5 flex h-20 w-20 items-center justify-center rounded-3xl shadow-xl"
          style={{ background: `linear-gradient(135deg, ${game.from}, ${game.to})` }}
        >
          <Icon size={34} className="text-white" />
        </div>

        <h3 className="text-xl font-black text-white">{game.title}</h3>
        <p className="mt-2 text-sm leading-relaxed text-white/50">{game.subtitle}</p>

        <div className="mt-5 flex items-center justify-center gap-2 rounded-2xl border border-amber-400/20 bg-amber-400/10 px-4 py-3">
          <Clock size={15} className="text-amber-400" />
          <span className="text-sm font-bold text-amber-300">Tez orada — hozir tayyorlanmoqda</span>
        </div>

        <button
          type="button"
          onClick={onClose}
          className="mt-5 w-full rounded-2xl bg-white/10 py-3 text-sm font-bold text-white transition-colors hover:bg-white/15"
        >
          Tushunarli
        </button>
      </motion.div>
    </>
  )
}

/* ─────────────────────────────────────────────────────────────
   Page
   ───────────────────────────────────────────────────────────── */

export default function GamesHub() {
  const navigate = useNavigate()
  const reduce = useReducedMotion()
  const [selected, setSelected] = useState(null)

  // Real numbers only. If the call fails, cards simply say "Yangi".
  const { data: hub } = useQuery({
    queryKey: ['games-hub'],
    queryFn: () => api.get('/games/hub/').then(r => r.data),
    staleTime: 30 * 1000,      // back from a game → "bu hafta o‘ynading" is fresh
    retry: 1,
  })
  const playersOf = (key) => {
    const n = hub?.games?.[key]?.players_week
    return typeof n === 'number' ? n : null
  }
  const playsWeek = hub?.me?.plays_week || 0

  const openGame = (game) => {
    if (game.route) navigate(game.route)
    else setSelected(game)
  }

  // Games are full-screen (no sidebar): always offer a way back to where the learner came from.
  const goBack = () => {
    if ((window.history.state?.idx ?? 0) > 0) navigate(-1)
    else navigate('/app')
  }

  return (
    <div className="min-h-screen overflow-x-hidden bg-[#08080F] px-4 pb-16 pt-6 text-white sm:px-6">
      {/* ambient glows */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <Glow className="left-[-10%] top-[-8%] h-[420px] w-[420px]" color="#4F46E5" />
        <Glow className="right-[-8%] top-[18%] h-[380px] w-[380px]" color="#DB2777" />
        <Glow className="bottom-[-12%] left-[30%] h-[420px] w-[420px]" color="#0891B2" />
      </div>

      <div className="relative z-10 mx-auto max-w-5xl space-y-8">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="flex flex-wrap items-end justify-between gap-4 pt-1"
        >
          <div className="flex min-w-0 items-center gap-3">
            <button
              type="button"
              onClick={goBack}
              aria-label="Orqaga"
              className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-2xl border border-white/10 bg-white/5 text-white/70 transition-colors hover:bg-white/10 hover:text-white"
            >
              <ArrowLeft size={18} />
            </button>
            <div className="min-w-0">
              <h1 className="text-3xl font-black tracking-tight sm:text-4xl">O‘yinlar</h1>
              <p className="mt-1.5 text-sm text-white/50">
                Gapir, o‘yna, so‘z boyligingni charxla — har kuni 5 daqiqa.
              </p>
            </div>
          </div>

          {playsWeek > 0 && (
            <div className="flex items-center gap-2 rounded-2xl border border-white/10 bg-white/5 px-3.5 py-2.5">
              <Gamepad2 size={15} className="text-indigo-400" />
              <div className="leading-none">
                <p className="text-base font-black tabular-nums">{fmtCount(playsWeek)}</p>
                <p className="mt-0.5 text-[10px] text-white/40">bu hafta o‘ynading</p>
              </div>
            </div>
          )}
        </motion.div>

        {/* SPEAK & PLAY */}
        <section aria-labelledby="speak-play-title">
          <motion.div
            initial={reduce ? false : { opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.03 }}
            className="mb-4 flex items-center gap-4"
          >
            <MicMotif reduce={reduce} />
            <div className="min-w-0 pl-1">
              <div className="flex flex-wrap items-center gap-2">
                <h2 id="speak-play-title" className="text-xl font-black tracking-tight sm:text-2xl">SPEAK &amp; PLAY</h2>
                <span className="rounded-md bg-rose-500 px-1.5 py-0.5 text-[10px] font-black uppercase tracking-wider text-white">New</span>
              </div>
              <p className="mt-0.5 text-[13px] leading-snug text-white/55">
                Mikrofonni bos, gapni inglizcha ayt — to‘g‘ri aytsang, o‘yin bajaradi.
              </p>
            </div>
          </motion.div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            {VOICE_GAMES.map((g, i) => (
              <VoiceCard key={g.key} game={g} players={playersOf(g.key)} onOpen={openGame} delay={0.06 + i * 0.07} reduce={reduce} />
            ))}
          </div>
          <p className="mt-2.5 px-1 text-xs text-white/50">Chrome yoki Edge’da ishlaydi (telefonda — Chrome). Bepul, cheksiz.</p>
        </section>

        {/* Featured */}
        <BigCard game={FEATURED} onOpen={openGame} delay={0.12} />

        {/* Grid */}
        <div>
          <p className="mb-3 px-1 text-xs font-bold uppercase tracking-wider text-white/40">Barcha o‘yinlar</p>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {GAMES.map((g, i) => (
              <GameCard key={g.key} game={{ ...g, players: playersOf(g.key) }} onOpen={openGame} delay={0.16 + i * 0.05} />
            ))}
          </div>
        </div>

        {/* Library */}
        <div>
          <p className="mb-3 px-1 text-xs font-bold uppercase tracking-wider text-white/40">O‘qish va tinglash</p>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {LIBRARY.map((item, i) => (
              <LibraryCard key={item.key} item={item} onOpen={openGame} delay={0.4 + i * 0.06} />
            ))}
          </div>
        </div>

        {/* Tournament teaser */}
        <motion.div
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.55, duration: 0.45 }}
          className="relative overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-br from-indigo-600/20 via-purple-600/10 to-transparent p-6"
        >
          <div className="pointer-events-none absolute -right-8 -top-8 opacity-15">
            <Trophy size={150} strokeWidth={1} className="text-white" />
          </div>
          <div className="relative z-10 flex flex-wrap items-center justify-between gap-4">
            <div>
              <h3 className="text-xl font-black">Haftalik turnir</h3>
              <p className="mt-1 text-sm text-white/50">
                8 kishilik bracket — do‘stlaringni chaqir, g‘olib bo‘l.
              </p>
            </div>
            <button
              type="button"
              onClick={() => setSelected({ ...FEATURED, title: 'HAFTALIK TURNIR', subtitle: 'Do‘stlar bilan bracket — tez orada', icon: Trophy })}
              className="rounded-2xl bg-white px-5 py-2.5 text-sm font-black text-[#0B0B14] transition-transform hover:scale-[1.03]"
            >
              Tez orada
            </button>
          </div>
        </motion.div>
      </div>

      <AnimatePresence>
        {selected && <SoonSheet game={selected} onClose={() => setSelected(null)} />}
      </AnimatePresence>
    </div>
  )
}
