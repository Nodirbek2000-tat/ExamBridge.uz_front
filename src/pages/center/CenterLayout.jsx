import { useState, useEffect } from 'react'
import { NavLink, Outlet, useNavigate, useParams } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import {
  LayoutDashboard, Users, GraduationCap, ShieldCheck,
  Crown, ClipboardList, BookOpen, LogOut, Bell,
  ChevronRight, Building2,
} from 'lucide-react'
import { useAuthStore } from '../../store/authStore'
import { useQuery } from '@tanstack/react-query'
import api from '../../api/client'
import Logo from '../../components/Logo.jsx'

function getNavForRole(role, centerId) {
  const base = `/center/${centerId}`
  const all = [
    { to: `${base}/dashboard`, icon: LayoutDashboard, label: 'Dashboard', roles: ['director', 'admin', 'teacher'] },
    { to: `${base}/students`,  icon: Users,          label: 'Students',  roles: ['director', 'admin'] },
    { to: `${base}/teachers`,  icon: GraduationCap,  label: 'Teachers',  roles: ['director', 'admin'] },
    { to: `${base}/admins`,    icon: ShieldCheck,    label: 'Admins',    roles: ['director'] },
    { to: `${base}/groups`,    icon: Crown,          label: 'Groups',    roles: ['director', 'admin', 'teacher'] },
    { to: `${base}/assignments`,icon: ClipboardList,  label: 'Tasks',     roles: ['director', 'admin', 'teacher'] },
  ]
  return all.filter(n => n.roles.includes(role))
}

const MANAGER_ROLES = ['director', 'admin', 'teacher']

export default function CenterLayout() {
  const { centerId } = useParams()
  const user = useAuthStore(s => s.user)
  const logout = useAuthStore(s => s.logout)
  const navigate = useNavigate()

  const { data: dashData, isLoading, isError } = useQuery({
    queryKey: ['center-dashboard', centerId],
    queryFn: () => api.get(`/centers/${centerId}/dashboard/`).then(r => r.data),
    staleTime: 30000,
    retry: false,
  })

  const myRole = dashData?.my_role || null

  /* ── Access guard ──────────────────────────────────────────────
     Only director / admin / teacher may enter the center portal.
     Students, regular users, non-members → bounced to /app.
     Blocks manual URL typing too (e.g. /center/2/students). */
  useEffect(() => {
    if (isLoading) return
    if (isError || (myRole && !MANAGER_ROLES.includes(myRole))) {
      navigate('/app', { replace: true })
    }
  }, [isLoading, isError, myRole, navigate])

  const { data: notifCount } = useQuery({
    queryKey: ['notif-count'],
    queryFn: () => api.get('/centers/notifications/count/').then(r => r.data),
    refetchInterval: 30000,
  })

  const center = dashData?.center
  const NAV = getNavForRole(myRole || 'student', centerId)

  /* While loading, or if access is denied (about to redirect), render nothing */
  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center bg-gray-50">
        <div className="w-8 h-8 border-3 border-sky-200 border-t-sky-500 rounded-full animate-spin" />
      </div>
    )
  }
  if (isError || (myRole && !MANAGER_ROLES.includes(myRole))) {
    return null
  }

  return (
    <div className="flex h-screen bg-gray-50 overflow-hidden">
      {/* Sidebar */}
      <motion.aside
        initial={{ x: -60, opacity: 0 }} animate={{ x: 0, opacity: 1 }}
        transition={{ duration: 0.3 }}
        className="w-60 flex-shrink-0 bg-white border-r border-sky-100 flex flex-col shadow-sm"
      >
        {/* Logo / Center name */}
        <div className="h-16 flex items-center px-5 border-b border-sky-100 gap-3">
          {center?.logo
            ? <img src={center.logo} alt="" className="h-9 w-9 rounded-xl object-cover" />
            : <div className="h-9 w-9 rounded-xl bg-gradient-to-br from-sky-500 to-indigo-500 flex items-center justify-center text-white font-bold text-sm flex-shrink-0">
                {center?.name?.[0] || 'C'}
              </div>
          }
          <div className="min-w-0">
            <p className="text-xs font-bold text-gray-900 truncate leading-tight">{center?.name || 'Center'}</p>
            <p className="text-[10px] text-sky-500 font-semibold uppercase tracking-wider capitalize">{myRole}</p>
          </div>
        </div>

        {/* Nav */}
        <nav className="flex-1 py-4 px-3 space-y-0.5 overflow-y-auto">
          {NAV.map(({ to, icon: Icon, label }) => (
            <NavLink key={to} to={to}
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
                  <Icon size={16} className={isActive ? 'text-white' : 'text-gray-400 group-hover:text-sky-500'} />
                  <span className="flex-1">{label}</span>
                  {isActive && <ChevronRight size={13} className="text-sky-200" />}
                </>
              )}
            </NavLink>
          ))}
        </nav>

        {/* User */}
        <div className="p-3 border-t border-sky-100">
          <div className="flex items-center gap-3 px-2 py-2 rounded-lg">
            <div className="w-8 h-8 rounded-full bg-sky-100 flex items-center justify-center flex-shrink-0">
              <span className="text-xs font-bold text-sky-600">{user?.first_name?.[0] || user?.email?.[0] || 'U'}</span>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-semibold text-gray-800 truncate">{user?.first_name || 'User'}</p>
              <p className="text-[10px] text-gray-400 truncate">{user?.email}</p>
            </div>
            <button onClick={logout} className="text-gray-400 hover:text-red-500 transition-colors" title="Logout">
              <LogOut size={14} />
            </button>
          </div>
        </div>
      </motion.aside>

      {/* Main */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Topbar */}
        <header className="h-16 bg-white border-b border-sky-100 flex items-center px-6 gap-4 shadow-sm flex-shrink-0">
          <div>
            <h1 className="text-base font-bold text-gray-900">{center?.name || 'Loading...'}</h1>
            <p className="text-xs text-gray-400 capitalize">{myRole} Panel</p>
          </div>
          <div className="ml-auto flex items-center gap-3">
            {/* Notifications */}
            <NavLink to={`/center/${centerId}/notifications`}
              className="relative p-2 rounded-xl hover:bg-sky-50 text-gray-500 hover:text-sky-500 transition-colors">
              <Bell size={18} />
              {notifCount?.unread > 0 && (
                <span className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-red-500 text-white text-[9px] font-bold rounded-full flex items-center justify-center">
                  {notifCount.unread > 9 ? '9+' : notifCount.unread}
                </span>
              )}
            </NavLink>
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-sky-50 text-sky-600 text-xs font-semibold rounded-full border border-sky-200 capitalize">
              <span className="w-1.5 h-1.5 rounded-full bg-sky-500 animate-pulse" />
              {myRole}
            </span>
          </div>
        </header>

        {/* Page */}
        <main className="flex-1 overflow-y-auto p-6">
          <Outlet context={{ center, myRole, stats: dashData?.stats, centerId, dashData }} />
        </main>
      </div>
    </div>
  )
}
