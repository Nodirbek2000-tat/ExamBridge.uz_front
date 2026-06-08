import { useOutletContext } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import { Bell, CheckCheck, ClipboardList, UserPlus, Info, Loader2 } from 'lucide-react'
import api from '../../api/client'

const fadeUp = {
  hidden: { opacity: 0, y: 14 },
  visible: (i = 0) => ({ opacity: 1, y: 0, transition: { duration: 0.28, delay: i * 0.04 } }),
}

const TYPE_CONFIG = {
  assignment: { icon: ClipboardList, color: 'text-sky-500 bg-sky-50', label: 'Assignment' },
  submission: { icon: CheckCheck, color: 'text-green-500 bg-green-50', label: 'Submitted' },
  invite: { icon: UserPlus, color: 'text-purple-500 bg-purple-50', label: 'Invite' },
  general: { icon: Info, color: 'text-gray-500 bg-gray-50', label: 'Info' },
}

function timeAgo(dateStr) {
  const diff = Date.now() - new Date(dateStr).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return 'Just now'
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h ago`
  return `${Math.floor(hrs / 24)}d ago`
}

export default function CenterNotifications() {
  const qc = useQueryClient()

  const { data: notifs = [], isLoading } = useQuery({
    queryKey: ['center-notifications'],
    queryFn: () => api.get('/centers/notifications/').then(r => r.data),
  })

  const markRead = useMutation({
    mutationFn: () => api.post('/centers/notifications/read/'),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['center-notifications'] })
      qc.invalidateQueries({ queryKey: ['notif-count'] })
    },
  })

  const unread = notifs.filter(n => !n.is_read).length

  return (
    <div>
      <motion.div variants={fadeUp} initial="hidden" animate="visible" className="flex items-center justify-between mb-5">
        <div>
          <h2 className="text-lg font-bold text-gray-900">Notifications</h2>
          <p className="text-sm text-gray-400">{unread} unread</p>
        </div>
        {unread > 0 && (
          <button
            onClick={() => markRead.mutate()}
            className="flex items-center gap-2 px-3 py-1.5 bg-sky-50 text-sky-600 rounded-xl text-xs font-semibold hover:bg-sky-100 transition-colors"
          >
            <CheckCheck size={13} />
            Mark all read
          </button>
        )}
      </motion.div>

      {isLoading ? (
        <div className="flex justify-center py-16"><Loader2 className="animate-spin text-sky-400" size={24} /></div>
      ) : notifs.length === 0 ? (
        <div className="text-center py-16 text-gray-400">
          <Bell size={36} className="mx-auto mb-3 text-gray-200" />
          <p className="font-medium">No notifications</p>
        </div>
      ) : (
        <div className="space-y-2">
          {notifs.map((n, i) => {
            const cfg = TYPE_CONFIG[n.type] || TYPE_CONFIG.general
            const Icon = cfg.icon
            return (
              <motion.div key={n.id} custom={i} variants={fadeUp} initial="hidden" animate="visible"
                className={`bg-white rounded-2xl border shadow-sm p-4 flex items-start gap-3 transition-colors ${
                  n.is_read ? 'border-gray-100' : 'border-sky-200 bg-sky-50/30'
                }`}>
                <div className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 ${cfg.color}`}>
                  <Icon size={16} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <p className="text-sm font-semibold text-gray-800">{n.title}</p>
                    {!n.is_read && <span className="w-2 h-2 bg-sky-500 rounded-full flex-shrink-0 mt-1" />}
                  </div>
                  {n.message && <p className="text-xs text-gray-500 mt-0.5">{n.message}</p>}
                  <div className="flex items-center gap-2 mt-1">
                    <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full ${cfg.color}`}>
                      {cfg.label}
                    </span>
                    {n.center && <span className="text-[10px] text-gray-400">{n.center.name}</span>}
                    <span className="text-[10px] text-gray-400 ml-auto">{timeAgo(n.created_at)}</span>
                  </div>
                </div>
              </motion.div>
            )
          })}
        </div>
      )}
    </div>
  )
}
