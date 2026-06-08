import { useEffect, useRef, useState } from 'react'
import {
  Menu, LogOut, ChevronDown, User, Bell, ClipboardList,
  CheckCheck, LayoutDashboard, ShieldCheck, GraduationCap, Crown,
} from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useAuthStore } from '../../store/authStore'
import { NavLink, useNavigate } from 'react-router-dom'
import api from '../../api/client'

/* ── relative "x ago" helper ─────────────────────────────────── */
function timeAgo(iso) {
  const diff = (Date.now() - new Date(iso).getTime()) / 1000
  if (diff < 60) return 'just now'
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`
  return `${Math.floor(diff / 86400)}d ago`
}

/* ── Notification dropdown (center students) ─────────────────── */
function NotifBell({ notifCount }) {
  const qc = useQueryClient()
  const [open, setOpen] = useState(false)
  const ref = useRef(null)

  const { data: notifs = [], isLoading } = useQuery({
    queryKey: ['my-notifications'],
    queryFn: () => api.get('/centers/notifications/').then((r) => r.data),
    enabled: open,
    staleTime: 10_000,
  })

  const markRead = useMutation({
    mutationFn: () => api.post('/centers/notifications/read/'),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['notif-count'] })
      qc.invalidateQueries({ queryKey: ['my-notifications'] })
    },
  })

  useEffect(() => {
    const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false) }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen((p) => !p)}
        className={`relative p-2 rounded-xl transition-colors ${
          open ? 'bg-sky-50 text-sky-500' : 'text-gray-500 hover:bg-sky-50 hover:text-sky-500'
        }`}
        title="Notifications"
      >
        <Bell size={22} />
        {notifCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] px-1 bg-red-500 text-white text-[9px] font-bold rounded-full flex items-center justify-center ring-2 ring-white">
            {notifCount > 9 ? '9+' : notifCount}
          </span>
        )}
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -8, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -8, scale: 0.97 }}
            transition={{ duration: 0.15 }}
            className="absolute right-0 top-[calc(100%+10px)] w-[360px] max-w-[calc(100vw-2rem)] bg-white rounded-2xl shadow-xl shadow-sky-500/15 border border-sky-100 z-50 overflow-hidden"
          >
            <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 bg-gradient-to-br from-sky-50 to-white">
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-bold text-gray-900">Notifications</h3>
                {notifCount > 0 && (
                  <span className="text-[10px] font-bold text-white bg-red-500 px-1.5 py-0.5 rounded-full">{notifCount}</span>
                )}
              </div>
              {notifCount > 0 && (
                <button
                  onClick={() => markRead.mutate()}
                  disabled={markRead.isPending}
                  className="flex items-center gap-1 text-[11px] font-semibold text-sky-600 hover:text-sky-700 transition-colors disabled:opacity-50"
                >
                  <CheckCheck size={13} /> Mark all read
                </button>
              )}
            </div>
            <div className="max-h-[380px] overflow-y-auto">
              {isLoading ? (
                <div className="py-10 text-center text-sm text-gray-400">Loading…</div>
              ) : notifs.length === 0 ? (
                <div className="py-12 text-center">
                  <Bell size={28} className="mx-auto mb-2 text-gray-200" />
                  <p className="text-sm text-gray-400 font-medium">No notifications yet</p>
                </div>
              ) : (
                notifs.map((n) => (
                  <div key={n.id} className={`flex items-start gap-3 px-4 py-3 border-b border-gray-50 last:border-0 ${n.is_read ? 'bg-white' : 'bg-sky-50/40'}`}>
                    <div className="w-9 h-9 rounded-xl bg-sky-100 flex items-center justify-center flex-shrink-0 mt-0.5">
                      <ClipboardList size={16} className="text-sky-500" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-gray-900 leading-snug">{n.title}</p>
                      {n.message && <p className="text-xs text-gray-500 mt-0.5 line-clamp-2">{n.message}</p>}
                      <div className="flex items-center gap-2 mt-1">
                        {n.center?.name && (
                          <span className="text-[10px] font-medium text-sky-600 bg-sky-50 px-1.5 py-0.5 rounded-full">{n.center.name}</span>
                        )}
                        <span className="text-[10px] text-gray-400">{timeAgo(n.created_at)}</span>
                      </div>
                    </div>
                    {!n.is_read && <span className="w-2 h-2 rounded-full bg-sky-500 flex-shrink-0 mt-2" />}
                  </div>
                ))
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

/* ── Role config ─────────────────────────────────────────────── */
const ROLE_META = {
  director: { icon: Crown,        label: 'Director',    grad: 'from-amber-500 to-orange-500',  badge: 'bg-amber-50 text-amber-700 border-amber-200',   text: 'text-amber-600' },
  admin:    { icon: ShieldCheck,  label: 'Admin',       grad: 'from-purple-500 to-indigo-500', badge: 'bg-purple-50 text-purple-700 border-purple-200', text: 'text-purple-600' },
  teacher:  { icon: GraduationCap,label: 'Teacher',     grad: 'from-sky-500 to-cyan-500',      badge: 'bg-sky-50 text-sky-700 border-sky-200',          text: 'text-sky-600' },
  staff:    { icon: ShieldCheck,  label: 'Super Admin', grad: 'from-rose-500 to-pink-500',     badge: 'bg-rose-50 text-rose-700 border-rose-200',       text: 'text-rose-600' },
}

export default function TopBar({
  onMenuClick, isCenterStudent, notifCount, studentCenterId,
  isManagerRole, managerRole, managerCenterId, managerCenterName,
}) {
  const user = useAuthStore((s) => s.user)
  const logout = useAuthStore((s) => s.logout)
  const navigate = useNavigate()
  const [open, setOpen] = useState(false)
  const ref = useRef(null)

  const isCenterStaff = isManagerRole || user?.is_staff
  const roleMeta = user?.is_staff ? ROLE_META.staff
    : isManagerRole && managerRole ? ROLE_META[managerRole] : null
  const RoleIcon = roleMeta?.icon

  const initial = user?.first_name?.[0]?.toUpperCase()
    || user?.full_name?.[0]?.toUpperCase()
    || user?.email?.[0]?.toUpperCase() || 'U'

  useEffect(() => {
    const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false) }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const handleLogout = async () => {
    setOpen(false)
    await logout()
    navigate('/login')
  }

  const goToPanel = () => {
    setOpen(false)
    if (user?.is_staff) navigate('/admin-panel')
    else if (managerCenterId) navigate(`/center/${managerCenterId}/dashboard`)
  }

  return (
    <header className="h-16 bg-white/85 dark:bg-gray-900/90 backdrop-blur-md border-b border-sky-100 dark:border-gray-800 flex items-center px-6 gap-4 sticky top-0 z-10 transition-colors">
      <button
        onClick={onMenuClick}
        className="lg:hidden p-2 rounded-lg hover:bg-sky-50 dark:hover:bg-gray-800 text-gray-600 dark:text-gray-300 transition"
      >
        <Menu size={20} />
      </button>

      <div className="flex-1" />

      {/* ── Action button (Upgrade / Open Panel) ──────────────── */}
      {isCenterStaff ? (
        /* Center staff & super-admin: coloured "Open Panel" button */
        <button
          onClick={goToPanel}
          className={`hidden sm:flex items-center gap-2 px-4 py-1.5 rounded-full bg-gradient-to-r ${roleMeta?.grad || 'from-sky-500 to-indigo-500'} text-white text-sm font-semibold shadow-sm hover:opacity-90 transition-opacity`}
        >
          <LayoutDashboard size={14} />
          {user?.is_staff ? 'Admin Panel' : `${roleMeta?.label || 'Open'} Panel`}
        </button>
      ) : !isCenterStudent && (
        /* Regular user: Upgrade button */
        <NavLink
          to="/app/subscription"
          className="hidden sm:flex items-center gap-2 px-4 py-1.5 rounded-full gradient-primary text-white text-sm font-semibold shadow-glow hover:opacity-90 transition-opacity"
        >
          <span>⚡</span> Upgrade
        </NavLink>
      )}

      {/* Notification bell — center students only */}
      {isCenterStudent && <NotifBell notifCount={notifCount} />}

      {/* ── Account dropdown ──────────────────────────────────── */}
      <div ref={ref} className="relative">
        <button
          type="button"
          onClick={() => setOpen((p) => !p)}
          className={`flex items-center gap-2 sm:gap-2.5 rounded-full border bg-white dark:bg-gray-800 pl-1.5 pr-2 sm:pr-3 py-1 shadow-sm outline-none transition-colors ${
            open
              ? 'border-sky-300 dark:border-sky-600 ring-2 ring-sky-100 dark:ring-sky-900/40'
              : 'border-sky-100 dark:border-gray-700 hover:border-sky-200 hover:bg-sky-50/60 dark:hover:bg-gray-700'
          }`}
        >
          {/* Avatar circle — role-coloured for staff */}
          <span className={`w-9 h-9 rounded-full flex items-center justify-center shrink-0 font-bold text-sm text-white ${
            roleMeta ? `bg-gradient-to-br ${roleMeta.grad}` : 'gradient-primary shadow-glow'
          }`}>
            {initial}
          </span>

          <span className="hidden sm:flex flex-col items-start max-w-[9.5rem] min-w-0 text-left">
            <span className="text-xs font-bold text-gray-900 dark:text-white truncate w-full">
              {user?.full_name || user?.first_name || 'Account'}
            </span>
            {roleMeta ? (
              <span className={`text-[10px] font-semibold truncate w-full ${roleMeta.text}`}>{roleMeta.label}</span>
            ) : isCenterStudent ? (
              <span className="text-[10px] font-semibold truncate w-full text-green-600">Center Student</span>
            ) : (
              <span className={`text-[10px] font-semibold truncate w-full ${user?.is_premium ? 'text-amber-600' : 'text-sky-600'}`}>
                {user?.is_premium ? '⚡ Premium' : 'Free'}
              </span>
            )}
          </span>
          <ChevronDown size={16} strokeWidth={2.25} className={`text-sky-500 shrink-0 transition-transform ${open ? 'rotate-180' : ''}`} />
        </button>

        {open && (
          <div
            role="menu"
            className="absolute right-0 top-[calc(100%+10px)] w-64 bg-white dark:bg-gray-900 rounded-2xl shadow-xl shadow-sky-500/15 border border-sky-100 dark:border-gray-700 py-2 z-50 overflow-hidden"
          >
            {/* Profile header */}
            <div className="px-4 py-3.5 bg-gradient-to-br from-sky-50 via-white to-sky-50/40 dark:from-gray-800 dark:via-gray-800 dark:to-gray-800 border-b border-sky-100 dark:border-gray-700">
              <div className="flex items-start gap-3">
                <div className={`w-11 h-11 rounded-full flex items-center justify-center shrink-0 ring-2 ring-white dark:ring-gray-700 text-white font-bold text-base ${
                  roleMeta ? `bg-gradient-to-br ${roleMeta.grad}` : 'gradient-primary shadow-glow'
                }`}>
                  {initial}
                </div>
                <div className="min-w-0 flex-1 pt-0.5">
                  <p className="text-sm font-bold text-gray-900 dark:text-white truncate">{user?.full_name || user?.first_name || 'User'}</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400 truncate mt-0.5">{user?.email}</p>
                  {roleMeta ? (
                    <span className={`inline-flex mt-2 text-[10px] font-bold px-2 py-0.5 rounded-full border ${roleMeta.badge}`}>
                      {roleMeta.label}
                      {isManagerRole && managerCenterName && (
                        <span className="ml-1 opacity-60 font-medium">· {managerCenterName}</span>
                      )}
                    </span>
                  ) : isCenterStudent ? (
                    <span className="inline-flex mt-2 text-[10px] font-bold px-2 py-0.5 rounded-full border bg-green-50 text-green-700 border-green-200">
                      Center Student
                    </span>
                  ) : (
                    <span className={`inline-flex mt-2 text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                      user?.is_premium
                        ? 'bg-amber-50 text-amber-800 border-amber-200'
                        : 'bg-sky-100 text-sky-700 border-sky-200'
                    }`}>
                      {user?.is_premium ? '⚡ Premium' : 'Free'}
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Panel shortcut inside dropdown */}
            {isCenterStaff && (
              <button
                type="button"
                role="menuitem"
                onClick={goToPanel}
                className="w-full flex items-center gap-3 px-4 py-2.5 text-sm font-medium text-gray-700 dark:text-gray-200 hover:bg-sky-50 dark:hover:bg-gray-800 transition-colors"
              >
                <LayoutDashboard size={15} className="text-sky-500" strokeWidth={2.25} />
                {user?.is_staff ? 'Admin Panel' : `${roleMeta?.label || 'Open'} Panel`}
              </button>
            )}

            <button
              type="button"
              role="menuitem"
              onClick={() => { setOpen(false); navigate('/app/profile') }}
              className="w-full flex items-center gap-3 px-4 py-2.5 text-sm font-medium text-gray-700 dark:text-gray-200 hover:bg-sky-50 dark:hover:bg-gray-800 transition-colors"
            >
              <User size={15} className="text-sky-500" strokeWidth={2.25} />
              My Profile
            </button>
            <button
              type="button"
              role="menuitem"
              onClick={handleLogout}
              className="w-full flex items-center gap-3 px-4 py-2.5 text-sm font-medium text-gray-700 dark:text-gray-200 hover:bg-sky-50 dark:hover:bg-gray-800 transition-colors"
            >
              <LogOut size={15} className="text-sky-500" strokeWidth={2.25} />
              Log out
            </button>
          </div>
        )}
      </div>
    </header>
  )
}
