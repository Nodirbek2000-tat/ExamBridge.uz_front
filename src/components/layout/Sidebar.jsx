import { NavLink, useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import {
  GraduationCap, BookOpen, Globe,
  Library, X, ChevronDown, ChevronRight, Calculator, Sparkles,
  ClipboardList, Bell, Crown,
} from 'lucide-react'
import { useState } from 'react'
import { useAuthStore } from '../../store/authStore'
import Logo from '../Logo.jsx'

const EXAM_SECTIONS = [
  {
    key: 'sat',
    label: 'SAT',
    icon: Calculator,
    color: 'text-sky-500',
    badge: null,
    children: [
      { label: 'Overview', to: '/app/sat' },
      { label: 'Full-Length Tests', to: '/app/sat/tests' },
      { label: 'Practice', to: '/app/sat/practice' },
      { label: 'Saved Questions', to: '/app/sat/saved' },
      { label: 'Vocabulary', to: '/app/sat/vocab' },
    ],
  },
  {
    key: 'ielts',
    label: 'IELTS',
    icon: Globe,
    color: 'text-slate-500',
    badge: 'NEW',
    children: [
      { label: 'Reading', to: '/app/ielts/reading' },
      { label: 'Listening', to: '/app/ielts/listening' },
      { label: 'Speaking', to: '/app/ielts/speaking' },
      { label: 'Writing', to: '/app/ielts/writing' },
      { label: 'Full Mock', to: '/app/ielts/tests' },
      { label: 'Test History', to: '/app/ielts/history' },
    ],
  },
  {
    key: 'cefr',
    label: 'CEFR',
    icon: BookOpen,
    color: 'text-red-500',
    badge: 'NEW',
    children: [
      { label: 'Grammar', to: '/app/cefr/tests' },
      { label: 'Reading', to: '/app/cefr/reading' },
      { label: 'Listening', to: '/app/cefr/listening' },
      { label: 'Speaking', to: '/app/cefr/speaking' },
      { label: 'Writing', to: '/app/cefr/writing' },
      { label: 'Test History', to: '/app/cefr/history' },
    ],
  },
]

const BOTTOM_LINKS = [
  { label: 'AI Tutor', to: '/app/ai', icon: Sparkles },
  { label: 'Universities', to: '/app/universities', icon: GraduationCap },
  { label: 'Vocabulary', to: '/app/vocabulary', icon: Library },
  { label: 'Pricing', to: '/app/subscription', icon: Crown, highlight: true },
]

function SidebarContent({ onClose, isCenterStudent, pendingCount }) {
  const [expanded, setExpanded] = useState({ sat: true, ielts: false, cefr: false })
  const user = useAuthStore((s) => s.user)
  const navigate = useNavigate()

  const toggle = (key) => setExpanded((p) => ({ ...p, [key]: !p[key] }))

  const goToProfile = () => {
    onClose?.()
    navigate('/app/profile')
  }

  return (
    <div className="flex flex-col h-full bg-white dark:bg-gray-900 transition-colors">
      {/* Logo */}
      <div className="flex items-center justify-between px-4 py-4 border-b border-gray-100 dark:border-gray-800">
        <div className="flex items-center">
          <Logo className="h-10 w-auto flex-shrink-0" />
        </div>
        {onClose && (
          <button onClick={onClose} className="lg:hidden text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 p-1">
            <X size={18} />
          </button>
        )}
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto py-3 px-3 space-y-0.5">

        {/* ── Pending tasks reminder (center students only) ──────── */}
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

        {/* Exam sections (SAT, IELTS, CEFR) */}
        {EXAM_SECTIONS.map(({ key, label, icon: Icon, color, badge, children }) => (
          <div key={key}>
            <button
              onClick={() => toggle(key)}
              className="w-full flex items-center gap-3.5 px-3.5 py-3 rounded-xl hover:bg-sky-50 dark:hover:bg-sky-900/20 transition-colors"
            >
              <Icon size={18} className={color} />
              <span className="flex-1 text-left font-semibold text-[15px] text-gray-700 dark:text-gray-200">{label}</span>
              {badge && (
                <span className="text-[10px] font-bold bg-sky-100 dark:bg-sky-900/40 text-sky-600 dark:text-sky-400 px-1.5 py-0.5 rounded-full">
                  {badge}
                </span>
              )}
              {expanded[key]
                ? <ChevronDown size={13} className="text-gray-400 dark:text-gray-500 flex-shrink-0" />
                : <ChevronRight size={13} className="text-gray-400 dark:text-gray-500 flex-shrink-0" />}
            </button>

            <AnimatePresence initial={false}>
              {expanded[key] && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.18 }}
                  className="overflow-hidden"
                >
                  <div className="pl-8 pr-1 space-y-0.5 pt-0.5 pb-1">
                    {children.map((c) => (
                      <NavLink
                        key={c.to}
                        to={c.to}
                        end
                        onClick={onClose}
                        className={({ isActive }) =>
                          `block px-3.5 py-2 rounded-lg text-[15px] transition-all ${
                            isActive
                              ? 'gradient-primary text-white font-semibold shadow-sm'
                              : 'text-gray-500 dark:text-gray-400 hover:bg-sky-50 dark:hover:bg-sky-900/20 hover:text-sky-700 dark:hover:text-sky-400'
                          }`
                        }
                      >
                        {c.label}
                      </NavLink>
                    ))}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        ))}

        {/* ── My Tasks — only for center students, between CEFR and divider ── */}
        {isCenterStudent && (
          <NavLink
            to="/app/my-tasks"
            onClick={onClose}
            className={({ isActive }) =>
              `flex items-center gap-3.5 px-3.5 py-3 rounded-xl text-[15px] font-medium transition-colors ${
                isActive
                  ? 'bg-rose-50 text-rose-600 font-semibold'
                  : 'text-gray-600 dark:text-gray-400 hover:bg-rose-50 hover:text-rose-600'
              }`
            }
          >
            <ClipboardList size={18} className="text-rose-500 flex-shrink-0" />
            <span className="flex-1">My Tasks</span>
            {pendingCount > 0 && (
              <span className="bg-red-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full min-w-[20px] text-center leading-tight flex-shrink-0">
                {pendingCount > 9 ? '9+' : pendingCount}
              </span>
            )}
          </NavLink>
        )}

        <div className="my-2 border-t border-gray-100 dark:border-gray-800" />

        {BOTTOM_LINKS.map(({ label, to, icon: Icon, highlight }) => (
          <NavLink
            key={to}
            to={to}
            onClick={onClose}
            className={({ isActive }) =>
              highlight
                ? `flex items-center gap-3.5 px-3.5 py-3 rounded-xl text-[15px] font-semibold transition-colors ${
                    isActive
                      ? 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300'
                      : 'text-amber-600 dark:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-900/20'
                  }`
                : `flex items-center gap-3.5 px-3.5 py-3 rounded-xl text-[15px] font-medium transition-colors ${
                    isActive
                      ? 'bg-sky-50 dark:bg-sky-900/20 text-sky-600 dark:text-sky-400 font-semibold'
                      : 'text-gray-600 dark:text-gray-400 hover:bg-sky-50 dark:hover:bg-sky-900/20 hover:text-sky-700 dark:hover:text-sky-400'
                  }`
            }
          >
            <Icon size={18} className={highlight ? 'text-amber-500' : ''} />
            <span className="flex-1">{label}</span>
            {highlight && (
              <span className="text-[9px] font-bold bg-amber-100 dark:bg-amber-900/40 text-amber-600 dark:text-amber-400 px-1.5 py-0.5 rounded-full">
                PRO
              </span>
            )}
          </NavLink>
        ))}
      </nav>

      {/* User card — click to go to profile */}
      <div className="p-3 border-t border-gray-100 dark:border-gray-800">
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
              isCenterStudent ? 'text-green-600' :
              user?.is_premium ? 'text-amber-600 dark:text-amber-400' : 'text-sky-600 dark:text-sky-400'
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
      {/* Desktop — always visible, static */}
      <aside className="hidden lg:flex flex-col w-72 flex-shrink-0 bg-white dark:bg-gray-900 border-r border-sky-100 dark:border-gray-800 h-full transition-colors">
        <SidebarContent
          onClose={null}
          isCenterStudent={isCenterStudent}
          pendingCount={pendingCount}
        />
      </aside>

      {/* Mobile — drawer overlay */}
      <AnimatePresence>
        {open && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-30 bg-black/40 lg:hidden"
              onClick={onClose}
            />
            <motion.aside
              initial={{ x: -280 }}
              animate={{ x: 0 }}
              exit={{ x: -280 }}
              transition={{ type: 'spring', damping: 28, stiffness: 250 }}
              className="fixed left-0 top-0 z-40 h-full w-72 shadow-2xl lg:hidden"
            >
              <SidebarContent
                onClose={onClose}
                isCenterStudent={isCenterStudent}
                pendingCount={pendingCount}
              />
            </motion.aside>
          </>
        )}
      </AnimatePresence>
    </>
  )
}
