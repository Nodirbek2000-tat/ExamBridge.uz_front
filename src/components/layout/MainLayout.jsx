import { useState, useEffect, useRef } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { Outlet, useLocation, useNavigate, Link } from 'react-router-dom'
import { Bell, X, Clock, ClipboardList } from 'lucide-react'
import Sidebar from './Sidebar'
import TopBar from './TopBar'
import { useCenterStudent } from '../../hooks/useCenterStudent'
import { useQuery } from '@tanstack/react-query'
import api from '../../api/client'

/* ── Center notification toast ────────────────────────────────── */
function CenterNotifToast({ isCenterStudent, studentCenterId }) {
  const [visible, setVisible] = useState(false)
  const prevCountRef = useRef(null)
  const navigate = useNavigate()

  const { data } = useQuery({
    queryKey: ['notif-count'],
    queryFn: () => api.get('/centers/notifications/count/').then((r) => r.data),
    enabled: isCenterStudent,
    refetchInterval: 30_000,
  })

  useEffect(() => {
    if (!data) return
    const count = data.unread ?? 0
    if (prevCountRef.current !== null && count > prevCountRef.current) {
      setVisible(true)
    }
    prevCountRef.current = count
  }, [data])

  useEffect(() => {
    if (!visible) return
    const t = setTimeout(() => setVisible(false), 4500)
    return () => clearTimeout(t)
  }, [visible])

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ opacity: 0, y: -28, scale: 0.94 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -20, scale: 0.94 }}
          transition={{ type: 'spring', damping: 22, stiffness: 280 }}
          className="fixed top-5 left-1/2 -translate-x-1/2 z-[9999] flex items-center gap-3 bg-white border border-sky-200 shadow-xl shadow-sky-100/50 rounded-2xl px-5 py-3 cursor-pointer"
          onClick={() => {
            setVisible(false)
            if (studentCenterId) navigate(`/center/${studentCenterId}/notifications`)
          }}
        >
          <div className="w-8 h-8 rounded-full bg-sky-500 flex items-center justify-center flex-shrink-0">
            <Bell size={15} className="text-white" />
          </div>
          <div>
            <p className="text-sm font-bold text-gray-900">New notification</p>
            <p className="text-xs text-gray-400">From your learning center</p>
          </div>
          <button
            onClick={(e) => { e.stopPropagation(); setVisible(false) }}
            className="ml-1 text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X size={14} />
          </button>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

/* ── Main Layout ───────────────────────────────────────────────── */
export default function MainLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const location = useLocation()

  const {
    isCenterStudent, studentCenterId, pendingCount, notifCount,
    isManagerRole, managerRole, managerCenterId, managerCenterName,
  } = useCenterStudent()

  /* Force light mode for center students — dark theme looks broken for them */
  useEffect(() => {
    if (!isCenterStudent) return
    const html = document.documentElement
    const hadDark = html.classList.contains('dark')
    html.classList.remove('dark')
    return () => {
      if (hadDark) html.classList.add('dark')
    }
  }, [isCenterStudent])

  return (
    <div className="flex h-screen bg-gray-50 dark:bg-gray-950 overflow-hidden transition-colors">
      <Sidebar
        open={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        isCenterStudent={isCenterStudent}
        pendingCount={pendingCount}
      />

      {sidebarOpen && (
        <div
          className="fixed inset-0 z-20 bg-black/30 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <TopBar
          onMenuClick={() => setSidebarOpen(true)}
          isCenterStudent={isCenterStudent}
          notifCount={notifCount}
          studentCenterId={studentCenterId}
          isManagerRole={isManagerRole}
          managerRole={managerRole}
          managerCenterId={managerCenterId}
          managerCenterName={managerCenterName}
        />
        <main className="flex-1 overflow-y-auto">
          {/* Pending tasks banner — only for center students with pending tasks */}
          {isCenterStudent && pendingCount > 0 && location.pathname !== '/app/my-tasks' && (
            <motion.div
              initial={{ opacity: 0, y: -12 }}
              animate={{ opacity: 1, y: 0 }}
              className="mx-6 mt-4 p-3.5 bg-amber-50 border border-amber-200 rounded-2xl flex items-center gap-3"
            >
              <div className="w-9 h-9 rounded-xl bg-amber-100 flex items-center justify-center flex-shrink-0">
                <Clock size={18} className="text-amber-600" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-bold text-amber-800 text-sm">
                  ⏰ {pendingCount} pending task{pendingCount > 1 ? 's' : ''} — time is running!
                </p>
                <p className="text-xs text-amber-600 mt-0.5">Your teacher has assigned work that needs to be completed.</p>
              </div>
              <Link
                to="/app/my-tasks"
                className="px-3.5 py-2 bg-amber-500 hover:bg-amber-600 text-white text-xs font-bold rounded-xl transition-colors flex-shrink-0 flex items-center gap-1.5"
              >
                <ClipboardList size={13} /> Open Tasks
              </Link>
            </motion.div>
          )}

          <div className="p-6">
            <AnimatePresence mode="wait" initial={false}>
              <motion.div
                key={location.pathname}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.2, ease: 'easeOut' }}
              >
                <Outlet />
              </motion.div>
            </AnimatePresence>
          </div>
        </main>
      </div>

      {/* Center notification toast — only for center students */}
      <CenterNotifToast
        isCenterStudent={isCenterStudent}
        studentCenterId={studentCenterId}
      />
    </div>
  )
}
