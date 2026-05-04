import { NavLink, useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import {
  GraduationCap, BookOpen, Globe, User, CreditCard,
  Library, X, ChevronDown, ChevronRight, Calculator, LogOut, Star, Sparkles,
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
      { label: 'Full Mock', to: '/app/cefr/tests' },
      { label: 'Test History', to: '/app/cefr/history' },
    ],
  },
]

const BOTTOM_LINKS = [
  { label: 'AI Tutor', to: '/app/ai', icon: Sparkles },
  { label: 'Universities', to: '/app/universities', icon: GraduationCap },
  { label: 'Vocabulary', to: '/app/vocabulary', icon: Library },
]

function SidebarContent({ onClose }) {
  const [expanded, setExpanded] = useState({ sat: true, ielts: false, cefr: false })
  const logout = useAuthStore((s) => s.logout)
  const user = useAuthStore((s) => s.user)
  const navigate = useNavigate()

  const toggle = (key) => setExpanded((p) => ({ ...p, [key]: !p[key] }))

  const handleLogout = async () => {
    await logout()
    navigate('/login')
  }

  return (
    <div className="flex flex-col h-full">
      {/* Logo */}
      <div className="flex items-center justify-between px-4 py-4">
        <div className="flex items-center">
          <Logo className="h-10 w-auto flex-shrink-0" />
        </div>
        {onClose && (
          <button onClick={onClose} className="lg:hidden text-gray-400 hover:text-gray-600 p-1">
            <X size={18} />
          </button>
        )}
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto py-3 px-3 space-y-0.5">
        {EXAM_SECTIONS.map(({ key, label, icon: Icon, color, badge, children }) => (
          <div key={key}>
            <button
              onClick={() => toggle(key)}
              className="w-full flex items-center gap-3.5 px-3.5 py-3 rounded-xl hover:bg-sky-50 transition-colors"
            >
              <Icon size={18} className={color} />
              <span className="flex-1 text-left font-semibold text-[15px] text-gray-700">{label}</span>
              {badge && (
                <span className="text-[10px] font-bold bg-sky-100 text-sky-600 px-1.5 py-0.5 rounded-full">
                  {badge}
                </span>
              )}
              {expanded[key]
                ? <ChevronDown size={13} className="text-gray-400 flex-shrink-0" />
                : <ChevronRight size={13} className="text-gray-400 flex-shrink-0" />}
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
                              : 'text-gray-500 hover:bg-sky-50 hover:text-sky-700'
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

        <div className="my-2 border-t border-sky-50" />

        {BOTTOM_LINKS.map(({ label, to, icon: Icon }) => (
          <NavLink
            key={to}
            to={to}
            onClick={onClose}
            className={({ isActive }) =>
              `flex items-center gap-3.5 px-3.5 py-3 rounded-xl text-[15px] font-medium transition-colors ${
                isActive
                  ? 'bg-sky-50 text-sky-600 font-semibold'
                  : 'text-gray-600 hover:bg-sky-50 hover:text-sky-700'
              }`
            }
          >
            <Icon size={18} />
            {label}
          </NavLink>
        ))}
      </nav>

      {/* User + Logout */}
      <div className="p-3 border-t border-sky-100">
        <div className="flex items-center gap-2.5 px-2 py-2.5 rounded-xl border border-sky-100 bg-gradient-to-br from-sky-50/50 to-white hover:border-sky-200 hover:bg-sky-50/70 transition-colors">
          <div className="w-9 h-9 rounded-full gradient-primary flex items-center justify-center flex-shrink-0 shadow-glow ring-2 ring-white">
            <span className="text-white font-bold text-sm">
              {user?.first_name?.[0]?.toUpperCase() || user?.email?.[0]?.toUpperCase() || 'U'}
            </span>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-bold text-gray-900 truncate">{user?.full_name || user?.email}</p>
            <p className={`text-[10px] font-semibold truncate ${user?.is_premium ? 'text-amber-600' : 'text-sky-600'}`}>
              {user?.is_premium ? '⚡ Premium' : 'Free'}
            </p>
          </div>
          <button
            type="button"
            onClick={handleLogout}
            className="text-sky-400 hover:text-sky-600 hover:bg-sky-100 rounded-lg p-1.5 transition-colors"
            title="Sign out"
          >
            <LogOut size={15} strokeWidth={2.25} />
          </button>
        </div>
      </div>
    </div>
  )
}

export default function Sidebar({ open, onClose }) {
  return (
    <>
      {/* Desktop — always visible, static */}
      <aside className="hidden lg:flex flex-col w-72 flex-shrink-0 bg-white border-r border-sky-100 h-full">
        <SidebarContent onClose={null} />
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
              className="fixed left-0 top-0 z-40 h-full w-72 bg-white shadow-2xl lg:hidden"
            >
              <SidebarContent onClose={onClose} />
            </motion.aside>
          </>
        )}
      </AnimatePresence>
    </>
  )
}

