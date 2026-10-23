import { useEffect, useState } from 'react'
import { NavLink, Outlet, useLocation, useNavigate, useParams } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'
import {
  Bell, BookOpen, GraduationCap, LayoutDashboard, LogOut, Menu, ShieldCheck, Users, UsersRound, X,
} from 'lucide-react'
import { useQuery } from '@tanstack/react-query'
import { useAuthStore } from '../../store/authStore'
import api from '../../api/client'
import LazyBoundary from '../../components/LazyBoundary'
import { canWrite, tierOf } from '../admin/adminAccess'
import { initials } from './ui'

// Who sees what. Teachers teach (lessons); the admin runs people and groups;
// the director watches everything and hires admins and teachers.
// 'staff' = an ExamBridge admin looking at a center they are not part of.
const NAV = [
  { to: 'dashboard', icon: LayoutDashboard, label: 'Overview', roles: ['director', 'admin', 'teacher', 'staff'] },
  { to: 'lessons',   icon: BookOpen,        label: 'Lessons',  roles: ['director', 'admin', 'teacher', 'staff'] },
  { to: 'groups',    icon: UsersRound,      label: 'Groups',   roles: ['director', 'admin', 'teacher', 'staff'] },
  { to: 'students',  icon: Users,           label: 'Students', roles: ['director', 'admin', 'staff'] },
  { to: 'teachers',  icon: GraduationCap,   label: 'Teachers', roles: ['director', 'admin', 'staff'] },
  { to: 'admins',    icon: ShieldCheck,     label: 'Admins',   roles: ['director', 'staff'] },
]

const ROLE_LABEL = { director: 'Director', admin: 'Administrator', teacher: 'Teacher', staff: 'ExamBridge' }
const MANAGER_ROLES = ['director', 'admin', 'teacher', 'staff']

function Sidebar({ center, role, nav, user, logout, onClose }) {
  return (
    <div className="flex flex-col h-full bg-white">
      <div className="h-16 flex items-center gap-3 px-5 border-b border-slate-100">
        {center?.logo
          ? <img src={center.logo} alt="" className="h-9 w-9 rounded-xl object-cover" />
          : <div className="h-9 w-9 rounded-xl bg-slate-900 text-white flex items-center justify-center font-bold text-sm flex-shrink-0">{center?.name?.[0] || 'C'}</div>}
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-slate-900 truncate leading-tight">{center?.name || 'Center'}</p>
          <p className="text-[11px] text-slate-400">{ROLE_LABEL[role]}</p>
        </div>
        {onClose && <button onClick={onClose} className="lg:hidden p-1 text-slate-400"><X size={18} /></button>}
      </div>

      <nav className="flex-1 py-4 px-3 space-y-0.5 overflow-y-auto">
        {nav.map(({ to, icon: Icon, label }) => (
          <NavLink key={to} to={to} onClick={onClose}
            className={({ isActive }) => `flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors ${
              isActive ? 'bg-slate-900 text-white' : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'}`}>
            {({ isActive }) => (<><Icon size={17} className={isActive ? 'text-white' : 'text-slate-400'} />{label}</>)}
          </NavLink>
        ))}
      </nav>

      <div className="p-3 border-t border-slate-100">
        <div className="flex items-center gap-3 px-2 py-2">
          <span className="w-8 h-8 rounded-full bg-slate-100 text-slate-600 text-[11px] font-bold flex items-center justify-center flex-shrink-0">
            {initials(user?.full_name || user?.email)}
          </span>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-semibold text-slate-800 truncate">{user?.full_name || user?.first_name || 'User'}</p>
            <p className="text-[11px] text-slate-400 truncate">{user?.email}</p>
          </div>
          <button onClick={logout} title="Log out" className="p-1.5 rounded-lg text-slate-400 hover:text-rose-500 hover:bg-rose-50 transition-colors">
            <LogOut size={15} />
          </button>
        </div>
      </div>
    </div>
  )
}

export default function CenterLayout() {
  const { centerId } = useParams()
  const user = useAuthStore((s) => s.user)
  const logout = useAuthStore((s) => s.logout)
  const navigate = useNavigate()
  const location = useLocation()
  const [drawer, setDrawer] = useState(false)

  const { data: dashData, isLoading, isError } = useQuery({
    queryKey: ['center-dashboard', centerId],
    queryFn: () => api.get(`/centers/${centerId}/dashboard/`).then((r) => r.data),
    staleTime: 30000,
    retry: false,
  })
  const myRole = dashData?.my_role || (dashData && user?.is_staff ? 'staff' : null)

  /* Only director / admin / teacher (and ExamBridge staff) may enter.
     Students and non-members go back to /app — typed URLs too. */
  useEffect(() => {
    if (isLoading) return
    if (isError || (myRole && !MANAGER_ROLES.includes(myRole))) navigate('/app', { replace: true })
  }, [isLoading, isError, myRole, navigate])

  useEffect(() => setDrawer(false), [location.pathname])

  const { data: notifCount } = useQuery({
    queryKey: ['notif-count'],
    queryFn: () => api.get('/centers/notifications/count/').then((r) => r.data),
    refetchInterval: 30000,
  })

  if (isLoading) {
    return <div className="flex h-screen items-center justify-center bg-slate-50">
      <div className="w-7 h-7 border-2 border-slate-200 border-t-slate-700 rounded-full animate-spin" />
    </div>
  }
  if (isError || (myRole && !MANAGER_ROLES.includes(myRole))) return null

  const center = dashData?.center
  // View-only ExamBridge admins (levels 2 and 3) get the overview only.
  const nav = NAV.filter((n) => n.roles.includes(myRole))
    .filter((n) => myRole !== 'staff' || canWrite(tierOf(user)) || n.to === 'dashboard')
    .map((n) => ({ ...n, to: `/center/${centerId}/${n.to}` }))
  const sidebar = <Sidebar center={center} role={myRole} nav={nav} user={user} logout={logout} />

  return (
    <div className="flex h-screen bg-slate-50 overflow-hidden">
      <aside className="hidden lg:block w-64 flex-shrink-0 border-r border-slate-200/70">{sidebar}</aside>

      <AnimatePresence>
        {drawer && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="fixed inset-0 bg-slate-900/30 z-30 lg:hidden" onClick={() => setDrawer(false)} />
            <motion.aside initial={{ x: -280 }} animate={{ x: 0 }} exit={{ x: -280 }}
              transition={{ type: 'spring', damping: 28, stiffness: 260 }}
              className="fixed left-0 top-0 h-full w-64 z-40 shadow-2xl lg:hidden">
              <Sidebar center={center} role={myRole} nav={nav} user={user} logout={logout} onClose={() => setDrawer(false)} />
            </motion.aside>
          </>
        )}
      </AnimatePresence>

      <div className="flex-1 flex flex-col overflow-hidden">
        <header className="h-16 bg-white/80 backdrop-blur border-b border-slate-200/70 flex items-center px-4 sm:px-6 gap-3 flex-shrink-0">
          <button onClick={() => setDrawer(true)} className="lg:hidden p-2 -ml-2 text-slate-500"><Menu size={20} /></button>
          <p className="text-sm font-semibold text-slate-900 truncate lg:hidden">{center?.name}</p>
          <div className="ml-auto flex items-center gap-2">
            <NavLink to={`/center/${centerId}/notifications`}
              className="relative p-2 rounded-xl text-slate-500 hover:text-slate-900 hover:bg-slate-100 transition-colors">
              <Bell size={18} />
              {notifCount?.unread > 0 && (
                <span className="absolute top-1 right-1 min-w-[16px] h-4 px-1 bg-rose-500 text-white text-[9px] font-bold rounded-full flex items-center justify-center">
                  {notifCount.unread > 9 ? '9+' : notifCount.unread}
                </span>
              )}
            </NavLink>
            <span className="hidden sm:inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-100 text-slate-600 text-xs font-semibold">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />{ROLE_LABEL[myRole]}
            </span>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto px-4 py-6 sm:px-6 lg:px-8">
          <LazyBoundary>
            <Outlet context={{ center, myRole, stats: dashData?.stats, centerId, dashData }} />
          </LazyBoundary>
        </main>
      </div>
    </div>
  )
}
