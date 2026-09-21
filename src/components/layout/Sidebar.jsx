import { NavLink, useNavigate, useLocation } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import {
  GraduationCap, BookOpen, Globe, Home,
  Library, X, ChevronRight, ChevronsUpDown, Calculator, Sparkles,
  ClipboardList, Bell, Crown, FileText, Layers, History, Check, Gamepad2,
} from 'lucide-react'
import { useState, useEffect, useRef } from 'react'
import { useAuthStore } from '../../store/authStore'
import Logo from '../Logo.jsx'

// ── Each exam is its own workspace ───────────────────────────────────────────
const EXAMS = {
  sat: {
    key: 'sat',
    label: 'SAT',
    subtitle: 'Digital SAT prep',
    icon: Calculator,
    accent: 'sky',
    home: '/app/sat',
    badge: null,
    items: [
      { label: 'Home', to: '/app/sat', icon: Home, end: true },
      { label: 'Full-Length Tests', to: '/app/sat/tests', icon: FileText },
      { label: 'Practice', to: '/app/sat/practice', icon: Layers },
      { label: 'Saved Questions', to: '/app/sat/saved', icon: BookOpen },
      { label: 'Vocabulary', to: '/app/sat/vocab', icon: Library },
    ],
  },
  ielts: {
    key: 'ielts',
    label: 'IELTS',
    subtitle: 'Academic / General',
    icon: Globe,
    accent: 'violet',
    home: '/app/ielts',
    badge: 'NEW',
    items: [
      { label: 'Home', to: '/app/ielts', icon: Home, end: true },
      { label: 'Tests', to: '/app/ielts/skills', icon: Layers },
      { label: 'Test History', to: '/app/ielts/history', icon: History },
    ],
  },
  cefr: {
    key: 'cefr',
    label: 'CEFR',
    subtitle: 'B1, B2, C1 levels',
    icon: BookOpen,
    accent: 'rose',
    home: '/app/cefr',
    badge: 'NEW',
    items: [
      { label: 'Home', to: '/app/cefr', icon: Home, end: true },
      { label: 'Tests', to: '/app/cefr/skills', icon: Layers },
      { label: 'Test History', to: '/app/cefr/history', icon: History },
    ],
  },
}

const EXAM_ORDER = ['sat', 'ielts', 'cefr']

const ACCENTS = {
  sky:    { text: 'text-sky-600',    bg: 'bg-sky-50',    ring: 'border-sky-200',    dot: 'bg-sky-500',    activeBg: 'from-sky-500 to-blue-600',    soft: 'bg-sky-50 dark:bg-sky-900/20' },
  violet: { text: 'text-violet-600', bg: 'bg-violet-50', ring: 'border-violet-200', dot: 'bg-violet-500', activeBg: 'from-violet-500 to-indigo-600', soft: 'bg-violet-50 dark:bg-violet-900/20' },
  rose:   { text: 'text-rose-600',   bg: 'bg-rose-50',   ring: 'border-rose-200',   dot: 'bg-rose-500',   activeBg: 'from-rose-500 to-pink-600',   soft: 'bg-rose-50 dark:bg-rose-900/20' },
}

const BOTTOM_LINKS = [
  { label: 'Games', to: '/games', icon: Gamepad2, isNew: true },
  { label: 'Study Tools', to: '/study', icon: GraduationCap, isNew: true },
  { label: 'AI Tutor', to: '/app/ai', icon: Sparkles },
  { label: 'Universities', to: '/app/universities', icon: GraduationCap },
  { label: 'Vocabulary', to: '/app/vocabulary', icon: Library },
  { label: 'Pricing', to: '/app/subscription', icon: Crown, highlight: true },
]

function examFromPath(pathname) {
  if (pathname.startsWith('/app/sat')) return 'sat'
  if (pathname.startsWith('/app/ielts')) return 'ielts'
  if (pathname.startsWith('/app/cefr')) return 'cefr'
  return null
}

// ── Exam switcher (bottom card) ──────────────────────────────────────────────
function ExamSwitcher({ activeKey, onPick }) {
  const [open, setOpen] = useState(false)
  const ref = useRef(null)
  const active = EXAMS[activeKey]
  const a = ACCENTS[active.accent]

  useEffect(() => {
    const onDoc = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false) }
    document.addEventListener('mousedown', onDoc)
    return () => document.removeEventListener('mousedown', onDoc)
  }, [])

  const ActiveIcon = active.icon
  return (
    <div ref={ref} className="relative">
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 8, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 8, scale: 0.98 }}
            transition={{ duration: 0.15 }}
            className="absolute bottom-full left-0 right-0 mb-2 rounded-2xl border border-gray-100 dark:border-gray-700 bg-white dark:bg-gray-800 shadow-xl overflow-hidden p-1.5 z-10"
          >
            {EXAM_ORDER.map((k) => {
              const ex = EXAMS[k]
              const acc = ACCENTS[ex.accent]
              const Icon = ex.icon
              const isActive = k === activeKey
              return (
                <button
                  key={k}
                  type="button"
                  onClick={() => { setOpen(false); onPick(k) }}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left transition-colors ${
                    isActive ? acc.soft : 'hover:bg-gray-50 dark:hover:bg-gray-700/50'
                  }`}
                >
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${acc.bg} dark:bg-gray-700`}>
                    <Icon size={16} className={acc.text} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold text-gray-900 dark:text-white leading-tight">{ex.label}</p>
                    <p className="text-[11px] text-gray-400 dark:text-gray-500 leading-tight">{ex.subtitle}</p>
                  </div>
                  {isActive && <Check size={15} className={acc.text} strokeWidth={2.5} />}
                </button>
              )
            })}
          </motion.div>
        )}
      </AnimatePresence>

      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-2xl border transition-colors ${a.ring} dark:border-gray-700 ${a.bg} dark:bg-gray-800 hover:brightness-[0.98]`}
      >
        <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 bg-white dark:bg-gray-700 shadow-sm`}>
          <ActiveIcon size={16} className={a.text} />
        </div>
        <div className="flex-1 min-w-0 text-left">
          <p className="text-[10px] font-bold uppercase tracking-wider text-gray-400 dark:text-gray-500 leading-none mb-0.5">Exam</p>
          <p className="text-sm font-black text-gray-900 dark:text-white leading-tight">{active.label}</p>
        </div>
        <ChevronsUpDown size={15} className="text-gray-400 dark:text-gray-500 flex-shrink-0" />
      </button>
    </div>
  )
}

function SidebarContent({ onClose, isCenterStudent, pendingCount }) {
  const user = useAuthStore((s) => s.user)
  const navigate = useNavigate()
  const location = useLocation()

  const [activeKey, setActiveKey] = useState(() => examFromPath(location.pathname) || localStorage.getItem('activeExam') || 'sat')

  // Keep active exam in sync with the current route
  useEffect(() => {
    const ex = examFromPath(location.pathname)
    if (ex && ex !== activeKey) {
      setActiveKey(ex)
      localStorage.setItem('activeExam', ex)
    }
  }, [location.pathname]) // eslint-disable-line react-hooks/exhaustive-deps

  const active = EXAMS[activeKey]
  const acc = ACCENTS[active.accent]

  const pickExam = (k) => {
    setActiveKey(k)
    localStorage.setItem('activeExam', k)
    onClose?.()
    navigate(EXAMS[k].home)
  }

  const goToProfile = () => { onClose?.(); navigate('/app/profile') }

  return (
    <div className="flex flex-col h-full bg-white dark:bg-gray-900 transition-colors">
      {/* Logo */}
      <div className="flex items-center justify-between px-4 py-4 border-b border-gray-100 dark:border-gray-800">
        <Logo className="h-10 w-auto flex-shrink-0" />
        {onClose && (
          <button onClick={onClose} className="lg:hidden text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 p-1">
            <X size={18} />
          </button>
        )}
      </div>

      {/* Nav — only the ACTIVE exam's items */}
      <nav className="flex-1 overflow-y-auto py-3 px-3 space-y-0.5">

        {/* Pending tasks reminder (center students only) */}
        {isCenterStudent && pendingCount > 0 && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-2 p-3 rounded-xl bg-rose-50 border border-rose-200"
          >
            <div className="flex items-start gap-2">
              <div className="w-5 h-5 rounded-full bg-rose-500 flex items-center justify-center flex-shrink-0 mt-0.5">
                <Bell size={11} className="text-white" />
              </div>
              <p className="text-xs text-rose-700 font-medium leading-relaxed">
                Your teacher has assigned tasks that need to be completed
              </p>
            </div>
          </motion.div>
        )}

        {/* Active exam items — identity now lives only in the switcher below */}
        <AnimatePresence mode="wait">
          <motion.div
            key={activeKey}
            initial={{ opacity: 0, x: -8 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.18 }}
            className="space-y-0.5 pt-1"
          >
            {active.items.map((it) => {
              const Icon = it.icon
              return (
                <NavLink
                  key={it.to}
                  to={it.to}
                  end={it.end}
                  onClick={onClose}
                  className={({ isActive }) =>
                    `flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-[15px] transition-all ${
                      isActive
                        ? `bg-gradient-to-r ${acc.activeBg} text-white font-semibold shadow-sm`
                        : 'text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800 hover:text-gray-900 dark:hover:text-gray-200'
                    }`
                  }
                >
                  {({ isActive }) => (
                    <>
                      <Icon size={17} className={isActive ? 'text-white' : acc.text} />
                      <span className="flex-1">{it.label}</span>
                    </>
                  )}
                </NavLink>
              )
            })}
          </motion.div>
        </AnimatePresence>

        {/* My Tasks — center students only */}
        {isCenterStudent && (
          <NavLink
            to="/app/my-tasks"
            onClick={onClose}
            className={({ isActive }) =>
              `flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-[15px] font-medium transition-colors mt-1 ${
                isActive ? 'bg-rose-50 text-rose-600 font-semibold' : 'text-gray-600 dark:text-gray-400 hover:bg-rose-50 hover:text-rose-600'
              }`
            }
          >
            <ClipboardList size={17} className="text-rose-500 flex-shrink-0" />
            <span className="flex-1">My Tasks</span>
            {pendingCount > 0 && (
              <span className="bg-red-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full min-w-[20px] text-center leading-tight flex-shrink-0">
                {pendingCount > 9 ? '9+' : pendingCount}
              </span>
            )}
          </NavLink>
        )}

        <div className="my-2.5 border-t border-gray-100 dark:border-gray-800" />

        {/* Common links */}
        {BOTTOM_LINKS.map(({ label, to, icon: Icon, highlight, isNew }) => (
          <NavLink
            key={to}
            to={to}
            onClick={onClose}
            className={({ isActive }) =>
              highlight
                ? `flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-[15px] font-semibold transition-colors ${
                    isActive ? 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300' : 'text-amber-600 dark:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-900/20'
                  }`
                : `flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-[15px] font-medium transition-colors ${
                    isActive ? 'bg-sky-50 dark:bg-sky-900/20 text-sky-600 dark:text-sky-400 font-semibold' : 'text-gray-600 dark:text-gray-400 hover:bg-sky-50 dark:hover:bg-sky-900/20 hover:text-sky-700 dark:hover:text-sky-400'
                  }`
            }
          >
            <Icon size={17} className={highlight ? 'text-amber-500' : isNew ? 'text-indigo-500' : ''} />
            <span className="flex-1">{label}</span>
            {highlight && (
              <span className="text-[9px] font-bold bg-amber-100 dark:bg-amber-900/40 text-amber-600 dark:text-amber-400 px-1.5 py-0.5 rounded-full">PRO</span>
            )}
            {isNew && (
              <span className="text-[9px] font-bold bg-indigo-100 dark:bg-indigo-900/40 text-indigo-600 dark:text-indigo-400 px-1.5 py-0.5 rounded-full">NEW</span>
            )}
          </NavLink>
        ))}
      </nav>

      {/* Exam switcher */}
      <div className="px-3 pt-2">
        <ExamSwitcher activeKey={activeKey} onPick={pickExam} />
      </div>

      {/* User card */}
      <div className="p-3">
        <button
          type="button"
          onClick={goToProfile}
          className="w-full flex items-center gap-2.5 px-2 py-2.5 rounded-xl border border-sky-100 dark:border-gray-700 bg-gradient-to-br from-sky-50/50 to-white dark:from-gray-800 dark:to-gray-800 hover:border-sky-200 dark:hover:border-sky-600 hover:bg-sky-50/70 dark:hover:bg-gray-700 transition-colors text-left"
        >
          <div className="w-9 h-9 rounded-full gradient-primary flex items-center justify-center flex-shrink-0 shadow-glow ring-2 ring-white dark:ring-gray-800">
            <span className="text-white font-bold text-sm">
              {user?.first_name?.[0]?.toUpperCase() || user?.email?.[0]?.toUpperCase() || 'U'}
            </span>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-bold text-gray-900 dark:text-white truncate">{user?.full_name || user?.email}</p>
            <p className={`text-[10px] font-semibold truncate ${
              isCenterStudent ? 'text-green-600' : user?.is_premium ? 'text-amber-600 dark:text-amber-400' : 'text-sky-600 dark:text-sky-400'
            }`}>
              {isCenterStudent ? 'Center Student' : user?.is_premium ? '⚡ Premium' : 'Free'}
            </p>
          </div>
          <ChevronRight size={14} className="text-gray-400 dark:text-gray-500 flex-shrink-0" />
        </button>
      </div>
    </div>
  )
}

export default function Sidebar({ open, onClose, isCenterStudent, pendingCount }) {
  return (
    <>
      {/* Desktop — always visible */}
      <aside className="hidden lg:flex flex-col w-72 flex-shrink-0 bg-white dark:bg-gray-900 border-r border-sky-100 dark:border-gray-800 h-full transition-colors">
        <SidebarContent onClose={null} isCenterStudent={isCenterStudent} pendingCount={pendingCount} />
      </aside>

      {/* Mobile — drawer */}
      <AnimatePresence>
        {open && (
          <>
            <motion.div
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="fixed inset-0 z-30 bg-black/40 lg:hidden"
              onClick={onClose}
            />
            <motion.aside
              initial={{ x: -280 }} animate={{ x: 0 }} exit={{ x: -280 }}
              transition={{ type: 'spring', damping: 28, stiffness: 250 }}
              className="fixed left-0 top-0 z-40 h-full w-72 shadow-2xl lg:hidden"
            >
              <SidebarContent onClose={onClose} isCenterStudent={isCenterStudent} pendingCount={pendingCount} />
            </motion.aside>
          </>
        )}
      </AnimatePresence>
    </>
  )
}
