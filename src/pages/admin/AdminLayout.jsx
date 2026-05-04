import { useState } from 'react'
import { NavLink, Outlet, Navigate, useLocation } from 'react-router-dom'
import { useAuthStore } from '../../store/authStore'
import {
  LayoutDashboard,
  Users,
  BookOpen,
  Headphones,
  GraduationCap,
  Settings,
  LogOut,
  ChevronDown,
  ChevronRight,
  Mic,
  PenLine,
  ListMusic,
  FileText,
  Calculator,
  Library,
  Zap,
  FileJson,
  Sparkles,
  Flag,
  CalendarDays,
  Trophy,
} from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import Logo from '../../components/Logo.jsx'

// ── Nav config ─────────────────────────────────────────────────────────────────

const NAV = [
  { to: '/admin-panel', icon: LayoutDashboard, label: 'Dashboard', exact: true },
  { to: '/admin-panel/users', icon: Users, label: 'Users' },
  { to: '/admin-panel/leaderboard', icon: Trophy, label: 'Leaderboard' },
  {
    key: 'sat',
    icon: Calculator,
    label: 'SAT',
    children: [
      { to: '/admin-panel/sat/practice', icon: BookOpen, label: 'Practice Questions' },
      { to: '/admin-panel/sat/tests', icon: FileText, label: 'Full-Length Tests' },
      { to: '/admin-panel/sat/real-mock', icon: Zap, label: 'Real Mock' },
      { to: '/admin-panel/sat/vocab', icon: Library, label: 'Vocabulary' },
      { to: '/admin-panel/sat/exam-date', icon: CalendarDays, label: 'Exam Date' },
      { to: '/admin-panel/sat/import-guide', icon: FileJson, label: 'Import Guide' },
    ],
  },
  {
    key: 'ielts',
    icon: Headphones,
    label: 'IELTS',
    children: [
      { to: '/admin-panel/ielts/reading',   icon: BookOpen,  label: 'Reading' },
      { to: '/admin-panel/ielts/listening', icon: ListMusic, label: 'Listening' },
      { to: '/admin-panel/ielts/speaking',  icon: Mic,       label: 'Speaking' },
      { to: '/admin-panel/ielts/writing',   icon: PenLine,   label: 'Writing' },
      { to: '/admin-panel/ielts/tests',     icon: Zap,       label: 'Full Tests' },
    ],
  },
  {
    key: 'cefr',
    icon: GraduationCap,
    label: 'CEFR',
    children: [
      { to: '/admin-panel/cefr/reading',   icon: BookOpen,      label: 'Reading' },
      { to: '/admin-panel/cefr/listening', icon: ListMusic,     label: 'Listening' },
      { to: '/admin-panel/cefr/grammar',   icon: GraduationCap, label: 'Grammar' },
    ],
  },
  { to: '/admin-panel/ai-structures', icon: Sparkles, label: 'AI Structures' },
  { to: '/admin-panel/reports', icon: Flag, label: 'Reports' },
  { to: '/admin-panel/system', icon: Settings, label: 'System' },
]

// ── Accordion item ─────────────────────────────────────────────────────────────

function AccordionNav({ item }) {
  const location = useLocation()
  const isGroupActive = item.children.some((c) => location.pathname.startsWith(c.to))
  const [open, setOpen] = useState(isGroupActive)
  const Icon = item.icon

  return (
    <div>
      <button
        onClick={() => setOpen((v) => !v)}
        className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 group ${
          isGroupActive
            ? 'bg-sky-50 text-sky-600'
            : 'text-gray-600 hover:bg-sky-50 hover:text-sky-600'
        }`}
      >
        <Icon size={17} className={isGroupActive ? 'text-sky-500' : 'text-gray-400 group-hover:text-sky-500'} />
        <span className="flex-1 text-left">{item.label}</span>
        <motion.div animate={{ rotate: open ? 180 : 0 }} transition={{ duration: 0.2 }}>
          <ChevronDown size={13} className="text-gray-400" />
        </motion.div>
      </button>

      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="mt-0.5 ml-4 pl-3 border-l-2 border-sky-100 space-y-0.5 py-1">
              {item.children.map(({ to, icon: CIcon, label }) => (
                <NavLink
                  key={to}
                  to={to}
                  className={({ isActive }) =>
                    `flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-medium transition-all duration-150 ${
                      isActive
                        ? 'bg-sky-500 text-white shadow-sm shadow-sky-200'
                        : 'text-gray-500 hover:bg-sky-50 hover:text-sky-600'
                    }`
                  }
                >
                  {({ isActive }) => (
                    <>
                      <CIcon size={14} className={isActive ? 'text-white' : 'text-gray-400'} />
                      {label}
                    </>
                  )}
                </NavLink>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

// ── Layout ─────────────────────────────────────────────────────────────────────

export default function AdminLayout() {
  const user = useAuthStore((s) => s.user)
  const logout = useAuthStore((s) => s.logout)

  if (!user) return <Navigate to="/login" replace />
  if (!user.is_staff) return <Navigate to="/login" replace />

  return (
    <div className="flex h-screen bg-white overflow-hidden">
      {/* Sidebar */}
      <motion.aside
        initial={{ x: -60, opacity: 0 }}
        animate={{ x: 0, opacity: 1 }}
        transition={{ duration: 0.35, ease: 'easeOut' }}
        className="w-60 flex-shrink-0 bg-white border-r border-sky-100 flex flex-col shadow-sm"
      >
        {/* Logo */}
        <div className="h-16 flex items-center px-5 border-b border-sky-100">
          <div className="flex items-center gap-2.5">
            <Logo className="h-10 w-auto" />
            <div>
              <p className="text-xs font-bold text-gray-900 leading-tight">ExamBridge</p>
              <p className="text-[10px] text-sky-500 font-semibold uppercase tracking-wider">Admin</p>
            </div>
          </div>
        </div>

        {/* Nav */}
        <nav className="flex-1 py-4 px-3 space-y-0.5 overflow-y-auto">
          {NAV.map((item) => {
            if (item.children) {
              return <AccordionNav key={item.key} item={item} />
            }
            const Icon = item.icon
            return (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.exact}
                className={({ isActive }) =>
                  `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 group ${
                    isActive
                      ? 'bg-sky-500 text-white shadow-sm shadow-sky-200'
                      : 'text-gray-600 hover:bg-sky-50 hover:text-sky-600'
                  }`
                }
              >
                {({ isActive }) => (
                  <>
                    <Icon size={17} className={isActive ? 'text-white' : 'text-gray-400 group-hover:text-sky-500'} />
                    <span className="flex-1">{item.label}</span>
                    {isActive && <ChevronRight size={14} className="text-sky-200" />}
                  </>
                )}
              </NavLink>
            )
          })}
        </nav>

        {/* Bottom user card */}
        <div className="p-3 border-t border-sky-100">
          <div className="flex items-center gap-3 px-2 py-2 rounded-lg">
            <div className="w-8 h-8 rounded-full bg-sky-100 flex items-center justify-center flex-shrink-0">
              <span className="text-xs font-bold text-sky-600">
                {user.first_name?.[0] || user.email?.[0] || 'A'}
              </span>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-semibold text-gray-800 truncate">
                {user.first_name || 'Admin'}
              </p>
              <p className="text-[10px] text-gray-400 truncate">{user.email}</p>
            </div>
            <button
              onClick={logout}
              className="text-gray-400 hover:text-red-500 transition-colors"
              title="Logout"
            >
              <LogOut size={15} />
            </button>
          </div>
        </div>
      </motion.aside>

      {/* Main area */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* TopBar */}
        <header className="h-16 bg-white border-b border-sky-100 flex items-center px-6 gap-4 shadow-sm flex-shrink-0">
          <div>
            <h1 className="text-base font-bold text-gray-900">Admin Panel</h1>
            <p className="text-xs text-gray-400">ExamBridge management console</p>
          </div>
          <div className="ml-auto flex items-center gap-3">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-sky-50 text-sky-600 text-xs font-semibold rounded-full border border-sky-200">
              <span className="w-1.5 h-1.5 rounded-full bg-sky-500 animate-pulse" />
              Staff
            </span>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-y-auto p-6">
          <Outlet />
        </main>
      </div>
    </div>
  )
}



