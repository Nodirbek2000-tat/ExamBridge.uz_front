import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Swords, Mic2, Repeat2, Grid3x3, Image as ImageIcon, Link2, Ban,
  BookOpen, Newspaper, Users, ChevronRight, Sparkles, Trophy, Flame, X, Gamepad2,
} from 'lucide-react'

/* ─────────────────────────────────────────────────────────────
   Demo data — visual only for now
   ───────────────────────────────────────────────────────────── */

const FEATURED = {
  key: 'word-battle',
  title: 'WORD BATTLE',
  subtitle: 'Do‘stingni duelga chaqir — 20 so‘z, kim tez va aniq?',
  players: '80 204',
  from: '#22B8F0',
  to: '#0C7BD1',
  icon: Swords,
}

const GAMES = [
  {
    key: 'speaking-battle',
    title: 'SPEAKING BATTLE',
    subtitle: 'Bot yoki jonli raqib bilan gaplash',
    players: '41 902',
    from: '#8B5CF6',
    to: '#D946EF',
    icon: Mic2,
    tag: 'AI',
  },
  {
    key: 'shadowing',
    title: 'SHADOWING',
    subtitle: 'Ovoz ortidan takrorla, talaffuzni charxla',
    players: '27 415',
    from: '#F43F5E',
    to: '#FB7185',
    icon: Repeat2,
  },
  {
    key: 'squares',
    title: 'SQUARES',
    subtitle: 'Harflar to‘ridan so‘zlarni top',
    players: '33 033',
    from: '#84CC16',
    to: '#4D9E0F',
    icon: Grid3x3,
  },
  {
    key: '4pics',
    title: '4 PICS 1 WORD',
    subtitle: 'To‘rt rasm — bitta so‘z',
    players: '18 684',
    from: '#FB923C',
    to: '#EA8C1B',
    icon: ImageIcon,
  },
  {
    key: 'odd-one-out',
    title: 'ODD ONE OUT',
    subtitle: 'Ortiqchasini top',
    players: '24 271',
    from: '#94A3B8',
    to: '#64748B',
    icon: Ban,
  },
  {
    key: 'connections',
    title: 'CONNECTIONS',
    subtitle: 'So‘zlarni guruhlarga ajrat',
    players: '33 317',
    from: '#06B6D4',
    to: '#0E7490',
    icon: Link2,
  },
]

const LIBRARY = [
  {
    key: 'articles',
    title: 'Articles',
    subtitle: 'Maqolani o‘qi, AI overview bilan muhokama qil',
    icon: Newspaper,
    from: '#3B82F6',
    to: '#1D4ED8',
    meta: '120+ maqola',
  },
  {
    key: 'books',
    title: 'Books',
    subtitle: 'Inglizcha kitoblar — audio va lug‘at bilan',
    icon: BookOpen,
    from: '#F59E0B',
    to: '#B45309',
    meta: '45 kitob',
  },
]

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

/* ─────────────────────────────────────────────────────────────
   Cards
   ───────────────────────────────────────────────────────────── */

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

        <div className="mt-5 inline-flex items-center gap-2 rounded-full bg-black/25 backdrop-blur-sm px-3 py-1.5">
          <Users size={13} className="text-white/80" />
          <span className="text-[13px] font-bold text-white tabular-nums">{game.players}</span>
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

        <div className="mt-4 inline-flex items-center gap-1.5 rounded-full bg-black/25 backdrop-blur-sm px-2.5 py-1">
          <Users size={11} className="text-white/80" />
          <span className="text-[11px] font-bold text-white tabular-nums">{game.players}</span>
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

function DemoSheet({ game, onClose }) {
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
        initial={{ opacity: 0, scale: 0.94, y: 24 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.94, y: 24 }}
        transition={{ type: 'spring', damping: 26, stiffness: 320 }}
        className="fixed left-1/2 top-1/2 z-[90] w-[min(92vw,420px)] -translate-x-1/2 -translate-y-1/2 overflow-hidden rounded-[28px] border border-white/10 bg-[#12121C] p-7 text-center shadow-2xl"
      >
        <button
          type="button"
          onClick={onClose}
          className="absolute right-4 top-4 flex h-8 w-8 items-center justify-center rounded-full bg-white/5 text-white/50 transition-colors hover:bg-white/10 hover:text-white"
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
          <Sparkles size={15} className="text-amber-400" />
          <span className="text-sm font-bold text-amber-300">Tez orada — demo bosqichi</span>
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

// Games with a real, playable implementation route directly.
// Everything else still opens the "coming soon" demo sheet.
const LIVE_ROUTES = {
  shadowing: '/games/shadowing',
}

export default function GamesHub() {
  const navigate = useNavigate()
  const [selected, setSelected] = useState(null)

  const openGame = (game) => {
    const route = LIVE_ROUTES[game.key]
    if (route) navigate(route)
    else setSelected(game)
  }

  return (
    <div className="min-h-screen bg-[#08080F] p-6 pb-16 text-white">
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
          <div>
            <div className="mb-2 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1">
              <Gamepad2 size={13} className="text-indigo-400" />
              <span className="text-[11px] font-bold uppercase tracking-wider text-white/60">Demo</span>
            </div>
            <h1 className="text-3xl font-black tracking-tight sm:text-4xl">O‘yinlar</h1>
            <p className="mt-1.5 text-sm text-white/50">
              Do‘stlaring bilan bellash, so‘z boyligingni charxla — har kuni 5 daqiqa.
            </p>
          </div>

          <div className="flex gap-2.5">
            <div className="flex items-center gap-2 rounded-2xl border border-white/10 bg-white/5 px-3.5 py-2.5">
              <Flame size={15} className="text-orange-400" />
              <div className="leading-none">
                <p className="text-base font-black">7</p>
                <p className="mt-0.5 text-[10px] text-white/40">kunlik streak</p>
              </div>
            </div>
            <div className="flex items-center gap-2 rounded-2xl border border-white/10 bg-white/5 px-3.5 py-2.5">
              <Trophy size={15} className="text-amber-400" />
              <div className="leading-none">
                <p className="text-base font-black">1 240</p>
                <p className="mt-0.5 text-[10px] text-white/40">ochko</p>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Featured */}
        <BigCard game={FEATURED} onOpen={setSelected} delay={0.05} />

        {/* Grid */}
        <div>
          <p className="mb-3 px-1 text-xs font-bold uppercase tracking-wider text-white/40">Barcha o‘yinlar</p>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {GAMES.map((g, i) => (
              <GameCard key={g.key} game={g} onOpen={openGame} delay={0.1 + i * 0.05} />
            ))}
          </div>
        </div>

        {/* Library */}
        <div>
          <p className="mb-3 px-1 text-xs font-bold uppercase tracking-wider text-white/40">O‘qish va tinglash</p>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {LIBRARY.map((item, i) => (
              <LibraryCard key={item.key} item={item} onOpen={setSelected} delay={0.4 + i * 0.06} />
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
              Qatnashish
            </button>
          </div>
        </motion.div>
      </div>

      <AnimatePresence>
        {selected && <DemoSheet game={selected} onClose={() => setSelected(null)} />}
      </AnimatePresence>
    </div>
  )
}
