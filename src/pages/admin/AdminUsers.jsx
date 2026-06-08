import { useState, useEffect, useRef, useCallback } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Search, Users, Crown, Calendar, BookOpen, AlertCircle, UserCheck,
  Loader2, UserPlus, X, ChevronDown, ShieldCheck, Trash2, ChevronRight,
  Mail, Clock, CheckCircle2, BarChart2, Shield, ShieldOff, Ban,
  RefreshCw, Unlock, Bot, Zap, Globe, Lock,
} from 'lucide-react'
import api from '../../api/client'

/* ─── Animation variants ─────────────────────────────────────── */
const fadeUp = {
  hidden: { opacity: 0, y: 20 },
  visible: (i = 0) => ({
    opacity: 1, y: 0,
    transition: { duration: 0.35, delay: i * 0.04, ease: 'easeOut' },
  }),
}

/* ─── Helpers ─────────────────────────────────────────────────── */
function formatDate(str) {
  if (!str) return '—'
  return new Date(str).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

function getInitials(name, email) {
  const src = name?.trim() || email?.trim() || '?'
  const parts = src.split(' ')
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase()
  return src[0].toUpperCase()
}

const AVATAR_GRADIENTS = [
  'from-sky-400 to-slate-400', 'from-slate-400 to-yellow-400',
  'from-rose-400 to-sky-400', 'from-purple-400 to-pink-400',
  'from-blue-400 to-cyan-400', 'from-emerald-400 to-teal-400',
]

function UserAvatar({ name, email, size = 'md' }) {
  const initials = getInitials(name, email)
  const idx = (initials.charCodeAt(0) + (initials[1]?.charCodeAt(0) ?? 0)) % AVATAR_GRADIENTS.length
  const dim = size === 'lg' ? 'w-16 h-16 text-xl' : size === 'sm' ? 'w-8 h-8 text-xs' : 'w-10 h-10 text-sm'
  return (
    <div className={`${dim} rounded-full flex items-center justify-center font-bold text-white flex-shrink-0 bg-gradient-to-br ${AVATAR_GRADIENTS[idx]} shadow-sm`}>
      {initials}
    </div>
  )
}

/* ─── Stat card ───────────────────────────────────────────────── */
function StatCard({ icon: Icon, label, value, iconClass, bgClass, index }) {
  return (
    <motion.div custom={index} variants={fadeUp} initial="hidden" animate="visible"
      className="bg-white rounded-2xl p-5 shadow-card border border-sky-50 flex items-center gap-4">
      <div className={`w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0 ${bgClass}`}>
        <Icon size={20} className={iconClass} />
      </div>
      <div>
        <p className="text-xs text-gray-500 font-medium leading-none mb-1">{label}</p>
        <p className="text-2xl font-bold text-gray-900 leading-none">
          {value === undefined
            ? <span className="inline-block w-14 h-6 bg-gray-100 rounded animate-pulse" />
            : (value ?? 0).toLocaleString()}
        </p>
      </div>
    </motion.div>
  )
}

/* ─── Premium duration picker ────────────────────────────────────────────── */
function PremiumModal({ user, onClose, onGrant }) {
  return (
    <>
      <div className="fixed inset-0 bg-black/40 z-[60]" onClick={onClose} />
      <div className="fixed inset-0 z-[70] flex items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.92 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.92 }}
          transition={{ duration: 0.2 }}
          className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6"
        >
          <div className="flex items-center gap-3 mb-5">
            <div className="w-10 h-10 rounded-xl bg-amber-100 flex items-center justify-center">
              <Crown size={18} className="text-amber-500" />
            </div>
            <div>
              <h3 className="font-bold text-gray-900">Grant Premium</h3>
              <p className="text-xs text-gray-400">{user?.email}</p>
            </div>
          </div>

          <p className="text-sm text-gray-600 mb-4">
            Choose duration. Timer starts from <strong>today</strong> (or extends existing expiry).
          </p>

          <div className="grid grid-cols-2 gap-3 mb-4">
            <button
              onClick={() => onGrant(30)}
              className="flex flex-col items-center gap-1 p-4 rounded-xl border-2 border-amber-200 bg-amber-50 hover:border-amber-400 hover:bg-amber-100 transition group"
            >
              <span className="text-2xl font-black text-amber-600 group-hover:scale-110 transition-transform">30</span>
              <span className="text-xs font-bold text-amber-500">days · 1 month</span>
            </button>
            <button
              onClick={() => onGrant(90)}
              className="flex flex-col items-center gap-2 p-4 rounded-xl border-2 border-sky-200 bg-sky-50 hover:border-sky-400 hover:bg-sky-100 transition group relative"
            >
              <span className="absolute -top-2.5 right-2 text-[9px] bg-emerald-500 text-white font-black px-2 py-0.5 rounded-full">−30%</span>
              <span className="text-2xl font-black text-sky-600 group-hover:scale-110 transition-transform">90</span>
              <span className="text-xs font-bold text-sky-500">days · 3 months</span>
            </button>
          </div>

          <button
            onClick={onClose}
            className="w-full py-2.5 rounded-xl text-sm font-semibold text-gray-500 bg-gray-50 hover:bg-gray-100 transition"
          >
            Cancel
          </button>
        </motion.div>
      </div>
    </>
  )
}

/* ─── User Detail Drawer ──────────────────────────────────────── */
function UserDetailDrawer({ userId, onClose, onDeleted }) {
  const queryClient = useQueryClient()
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [showPremiumModal, setShowPremiumModal] = useState(false)
  const [showAdminIpPrompt, setShowAdminIpPrompt] = useState(false)
  const [adminIpInput, setAdminIpInput] = useState('')

  const { data: user, isLoading } = useQuery({
    queryKey: ['admin-user-detail', userId],
    queryFn: () => api.get(`/admin/users/${userId}/`).then(r => r.data),
    enabled: !!userId,
  })

  const deleteMutation = useMutation({
    mutationFn: () => api.delete(`/admin/users/${userId}/`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-users'] })
      onDeleted()
    },
  })

  const premiumMutation = useMutation({
    mutationFn: (payload) => api.post(`/admin/users/${userId}/toggle-premium/`, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-user-detail', userId] })
      queryClient.invalidateQueries({ queryKey: ['admin-users'] })
      setShowPremiumModal(false)
    },
  })

  // Kept as alias so existing usages of togglePremium still work
  const togglePremium = premiumMutation

  const toggleStaff = useMutation({
    mutationFn: (payload = {}) => api.post(`/admin/users/${userId}/toggle-staff/`, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-user-detail', userId] })
      queryClient.invalidateQueries({ queryKey: ['admin-users'] })
      setShowAdminIpPrompt(false)
      setAdminIpInput('')
    },
  })

  const handleMakeAdmin = () => {
    const payload = adminIpInput.trim() ? { admin_ip: adminIpInput.trim() } : {}
    toggleStaff.mutate(payload)
  }

  const handlePremiumClick = () => {
    if (user?.is_premium) {
      // Revoke immediately
      premiumMutation.mutate({ action: 'revoke' })
    } else {
      // Show duration picker
      setShowPremiumModal(true)
    }
  }

  const handleGrant = (days) => {
    premiumMutation.mutate({ action: 'grant', days })
  }

  const fullName = user?.full_name || user?.email || '—'

  return (
    <>
      {/* Premium duration modal */}
      <AnimatePresence>
        {showPremiumModal && (
          <PremiumModal
            user={user}
            onClose={() => setShowPremiumModal(false)}
            onGrant={handleGrant}
          />
        )}
      </AnimatePresence>

      {/* Backdrop */}
      <div className="fixed inset-0 bg-black/30 z-40" onClick={onClose} />

      {/* Drawer */}
      <motion.div
        initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }}
        transition={{ type: 'spring', damping: 30, stiffness: 300 }}
        className="fixed right-0 top-0 bottom-0 w-full max-w-md bg-white z-50 shadow-2xl flex flex-col"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <h2 className="font-bold text-gray-900">User Details</h2>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition">
            <X size={18} />
          </button>
        </div>

        {isLoading ? (
          <div className="flex-1 flex items-center justify-center">
            <Loader2 size={28} className="animate-spin text-sky-400" />
          </div>
        ) : user ? (
          <div className="flex-1 overflow-y-auto">
            {/* Profile section */}
            <div className="px-5 py-6 border-b border-gray-50 flex items-center gap-4">
              <UserAvatar name={fullName} email={user.email} size="lg" />
              <div className="flex-1 min-w-0">
                <h3 className="font-bold text-gray-900 text-lg leading-tight">{fullName}</h3>
                <p className="text-sm text-gray-500 flex items-center gap-1 mt-1">
                  <Mail size={13} /> {user.email}
                </p>
                <div className="flex items-center gap-2 mt-2 flex-wrap">
                  {user.is_premium ? (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-slate-100 text-slate-700 text-xs font-semibold rounded-full">
                      <Crown size={9} /> Premium
                    </span>
                  ) : (
                    <span className="inline-flex px-2 py-0.5 bg-gray-100 text-gray-500 text-xs font-semibold rounded-full">Free</span>
                  )}
                  {user.is_staff && (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-blue-100 text-blue-700 text-xs font-semibold rounded-full">
                      <ShieldCheck size={9} /> Staff
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Stats grid */}
            <div className="grid grid-cols-3 gap-2 px-5 py-4 border-b border-gray-50">
              <div className="bg-sky-50 rounded-xl p-3 text-center">
                <p className="text-2xl font-black text-sky-500">{user.tests_taken ?? 0}</p>
                <p className="text-[11px] text-gray-500 mt-0.5">Tests Done</p>
              </div>
              <div className="bg-blue-50 rounded-xl p-3 text-center">
                <p className="text-2xl font-black text-blue-500">{user.analytics?.total_questions ?? 0}</p>
                <p className="text-[11px] text-gray-500 mt-0.5">Questions</p>
              </div>
              <div className="bg-emerald-50 rounded-xl p-3 text-center">
                <p className="text-2xl font-black text-emerald-500">{user.analytics?.accuracy_pct ?? 0}%</p>
                <p className="text-[11px] text-gray-500 mt-0.5">Accuracy</p>
              </div>
            </div>

            {/* Question analytics */}
            {user.analytics?.total_questions > 0 && (
              <div className="px-5 py-4 border-b border-gray-50">
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Question Analytics</p>
                {[
                  { label: 'Reading', data: user.analytics.reading, color: 'bg-sky-400' },
                  { label: 'Listening', data: user.analytics.listening, color: 'bg-purple-400' },
                ].map(({ label, data, color }) => data?.total > 0 && (
                  <div key={label} className="mb-3">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs text-gray-600 font-medium">{label}</span>
                      <span className="text-xs text-gray-500">{data.correct}/{data.total} · {data.pct}%</span>
                    </div>
                    <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                      <div className={`h-full ${color} rounded-full transition-all`} style={{ width: `${data.pct}%` }} />
                    </div>
                  </div>
                ))}
              </div>
            )}


            {/* SAT attempts */}
            {user.sat_attempts?.length > 0 && (
              <div className="px-5 py-4 border-b border-gray-50">
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">SAT Attempts</p>
                <div className="space-y-1.5">
                  {user.sat_attempts.map(a => (
                    <div key={a.id} className="flex items-center gap-3 py-1.5">
                      <div className={`w-2 h-2 rounded-full flex-shrink-0 ${a.status === 'COMPLETED' ? 'bg-green-400' : 'bg-gray-300'}`} />
                      <p className="flex-1 text-xs text-gray-700 truncate">{a.test_name}</p>
                      {a.score != null && <span className="text-xs font-bold text-sky-500">{a.score}</span>}
                      <span className="text-xs text-gray-400 flex-shrink-0">{formatDate(a.created_at)}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* IELTS attempts */}
            {user.ielts_attempts?.length > 0 && (
              <div className="px-5 py-4 border-b border-gray-50">
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">IELTS Attempts</p>
                <div className="space-y-1.5">
                  {user.ielts_attempts.map(a => (
                    <div key={a.id} className="flex items-center gap-3 py-1.5">
                      <div className={`w-2 h-2 rounded-full flex-shrink-0 ${a.status === 'COMPLETED' ? 'bg-green-400' : 'bg-gray-300'}`} />
                      <p className="flex-1 text-xs text-gray-700 truncate">{a.test_name}</p>
                      {a.overall_band != null && (
                        <span className="text-xs font-bold text-purple-500">Band {a.overall_band}</span>
                      )}
                      {!a.overall_band && a.reading_band != null && (
                        <span className="text-xs font-bold text-sky-400">R:{a.reading_band}</span>
                      )}
                      <span className="text-xs text-gray-400 flex-shrink-0">{formatDate(a.created_at)}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Actions */}
            <div className="px-5 py-4 space-y-2">
              {/* Premium expiry info */}
              {user.is_premium && user.premium_until && (
                <div className="bg-amber-50 border border-amber-100 rounded-xl px-4 py-2.5 flex items-center gap-2 mb-1">
                  <Crown size={13} className="text-amber-500 flex-shrink-0" />
                  <div>
                    <p className="text-[11px] text-amber-600 font-semibold">Premium active</p>
                    <p className="text-[11px] text-amber-500">
                      Expires: <strong>{formatDate(user.premium_until)}</strong>
                    </p>
                  </div>
                </div>
              )}

              {/* Premium info (read-only — managed via Stripe) */}
              {user.is_premium && user.premium_until && (
                <div className="bg-amber-50 border border-amber-100 rounded-xl px-4 py-2.5 flex items-center gap-2">
                  <Crown size={13} className="text-amber-500 flex-shrink-0" />
                  <div>
                    <p className="text-[11px] text-amber-600 font-semibold">Premium active (via Stripe)</p>
                    <p className="text-[11px] text-amber-500">
                      Expires: <strong>{formatDate(user.premium_until)}</strong>
                    </p>
                  </div>
                </div>
              )}

              {/* Make Admin / Revoke Admin */}
              {user.is_staff ? (
                <button
                  onClick={() => toggleStaff.mutate({})}
                  disabled={toggleStaff.isPending}
                  className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-bold border transition bg-blue-50 text-blue-700 border-blue-200 hover:bg-blue-100"
                >
                  {toggleStaff.isPending ? <Loader2 size={14} className="animate-spin" /> : <ShieldCheck size={14} />}
                  Revoke Admin Access
                </button>
              ) : showAdminIpPrompt ? (
                <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 space-y-3">
                  <p className="text-xs font-semibold text-blue-700 flex items-center gap-1.5">
                    <ShieldCheck size={13} /> Admin IP Whitelist (ixtiyoriy)
                  </p>
                  <input
                    type="text"
                    value={adminIpInput}
                    onChange={e => setAdminIpInput(e.target.value)}
                    placeholder="Yangi adminning IP si (masalan: 95.130.20.5)"
                    className="w-full px-3 py-2 text-sm border border-blue-200 rounded-lg focus:outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100 bg-white"
                  />
                  <p className="text-[10px] text-blue-500">Bo'sh qoldirsangiz whitelist ga qo'shilmaydi</p>
                  <div className="flex gap-2">
                    <button onClick={() => { setShowAdminIpPrompt(false); setAdminIpInput('') }}
                      className="flex-1 py-2 rounded-lg text-xs font-bold bg-white border border-gray-200 text-gray-600 hover:bg-gray-50 transition">
                      Bekor
                    </button>
                    <button onClick={handleMakeAdmin} disabled={toggleStaff.isPending}
                      className="flex-1 py-2 rounded-lg text-xs font-bold bg-blue-600 text-white hover:bg-blue-700 transition flex items-center justify-center gap-1 disabled:opacity-60">
                      {toggleStaff.isPending ? <Loader2 size={12} className="animate-spin" /> : <ShieldCheck size={12} />}
                      Tasdiqlash
                    </button>
                  </div>
                </div>
              ) : (
                <button
                  onClick={() => setShowAdminIpPrompt(true)}
                  className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-bold border transition bg-gray-50 text-gray-700 border-gray-200 hover:bg-blue-50 hover:text-blue-700 hover:border-blue-200"
                >
                  <ShieldCheck size={14} /> Make Admin
                </button>
              )}

              {!confirmDelete ? (
                <button
                  onClick={() => setConfirmDelete(true)}
                  className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-bold bg-red-50 text-red-600 border border-red-200 hover:bg-red-100 transition"
                >
                  <Trash2 size={14} /> Delete User
                </button>
              ) : (
                <div className="bg-red-50 border border-red-200 rounded-xl p-4 space-y-3">
                  <p className="text-sm text-red-700 font-semibold text-center">
                    Delete <strong>{fullName}</strong>? This cannot be undone.
                  </p>
                  <div className="flex gap-2">
                    <button onClick={() => setConfirmDelete(false)}
                      className="flex-1 py-2 rounded-lg text-sm font-bold bg-white border border-gray-200 text-gray-600 hover:bg-gray-50 transition">
                      Cancel
                    </button>
                    <button onClick={() => deleteMutation.mutate()}
                      disabled={deleteMutation.isPending}
                      className="flex-1 py-2 rounded-lg text-sm font-bold bg-red-500 text-white hover:bg-red-600 transition flex items-center justify-center gap-1 disabled:opacity-60">
                      {deleteMutation.isPending ? <Loader2 size={13} className="animate-spin" /> : <Trash2 size={13} />}
                      Yes, Delete
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="flex-1 flex items-center justify-center text-gray-400 text-sm">User not found</div>
        )}
      </motion.div>
    </>
  )
}

/* ─── Loading skeleton ────────────────────────────────────────── */
function SkeletonRows({ count = 5 }) {
  return (
    <div className="p-4 space-y-3">
      {[...Array(count)].map((_, i) => (
        <div key={i} className="flex items-center gap-4 py-2">
          <div className="w-10 h-10 rounded-full bg-gray-100 animate-pulse flex-shrink-0" />
          <div className="flex-1 space-y-2">
            <div className="h-3 bg-gray-100 rounded animate-pulse w-2/5" />
            <div className="h-2.5 bg-gray-50 rounded animate-pulse w-3/5" />
          </div>
          <div className="hidden sm:block h-5 bg-gray-100 rounded-full animate-pulse w-16" />
          <div className="hidden md:block h-3 bg-gray-100 rounded animate-pulse w-10" />
          <div className="hidden lg:block h-3 bg-gray-100 rounded animate-pulse w-24" />
          <div className="h-7 bg-gray-100 rounded-lg animate-pulse w-24" />
        </div>
      ))}
    </div>
  )
}

/* ─── Empty state ─────────────────────────────────────────────── */
function EmptyState({ search }) {
  return (
    <motion.div initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }}
      className="flex flex-col items-center justify-center py-20 px-6 text-center">
      <div className="w-20 h-20 rounded-full bg-sky-50 flex items-center justify-center mb-4">
        <UserCheck size={36} className="text-sky-200" />
      </div>
      <p className="text-base font-semibold text-gray-700 mb-1">
        {search ? 'No results found' : 'No users yet'}
      </p>
      <p className="text-sm text-gray-400 max-w-xs">
        {search ? `No users match "${search}".` : 'Users will appear here once they register.'}
      </p>
    </motion.div>
  )
}

/* ─── Premium badge (read-only, managed by Stripe) ──────────────── */
function PremiumBadge({ user }) {
  if (!user.is_premium) return null
  return (
    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200 whitespace-nowrap">
      <Crown size={10} /> Premium
    </span>
  )
}

/* ─── Mobile user card ────────────────────────────────────────── */
function UserCard({ user, isPending, pendingId, onToggle, onSelect }) {
  const fullName = user.first_name && user.last_name
    ? `${user.first_name} ${user.last_name}`
    : user.full_name || user.name || user.username || '—'

  return (
    <motion.div variants={fadeUp} initial="hidden" animate="visible"
      onClick={() => onSelect(user.id)}
      className="bg-white rounded-2xl border border-sky-50 shadow-card p-4 flex flex-col gap-3 cursor-pointer hover:border-sky-200 hover:shadow-md transition-all">
      <div className="flex items-start gap-3">
        <UserAvatar name={fullName} email={user.email} />
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-gray-900 text-sm leading-tight truncate">{fullName}</p>
          <p className="text-xs text-gray-500 truncate mt-0.5">{user.email}</p>
        </div>
        <div className="flex flex-col items-end gap-1.5 flex-shrink-0">
          {user.is_premium
            ? <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-slate-100 text-slate-700 text-xs font-semibold rounded-full"><Crown size={9} /> Premium</span>
            : <span className="inline-flex px-2 py-0.5 bg-gray-100 text-gray-500 text-xs font-semibold rounded-full">Free</span>}
          {user.is_staff && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-blue-100 text-blue-700 text-xs font-semibold rounded-full">
              <ShieldCheck size={9} /> Staff
            </span>
          )}
        </div>
      </div>
      <div className="flex items-center justify-between pt-1 border-t border-gray-50">
        <div className="flex items-center gap-3 text-xs text-gray-500">
          <span className="flex items-center gap-1"><BookOpen size={11} className="text-gray-400" />{user.tests_taken ?? 0} tests</span>
          <span className="flex items-center gap-1"><Calendar size={11} className="text-gray-400" />{formatDate(user.date_joined)}</span>
        </div>
        <PremiumBadge user={user} />
      </div>
    </motion.div>
  )
}

/* ─── Desktop table row ───────────────────────────────────────── */
function UserRow({ user, index, isPending, pendingId, onToggle, onSelect }) {
  const fullName = user.first_name && user.last_name
    ? `${user.first_name} ${user.last_name}`
    : user.full_name || user.name || user.username || '—'

  return (
    <motion.tr custom={index} variants={fadeUp} initial="hidden" animate="visible"
      onClick={() => onSelect(user.id)}
      className="hover:bg-sky-50/30 transition-colors cursor-pointer">
      <td className="px-5 py-3.5">
        <div className="flex items-center gap-3">
          <UserAvatar name={fullName} email={user.email} />
          <div className="min-w-0">
            <p className="font-semibold text-gray-900 text-sm leading-tight truncate max-w-[160px]">{fullName}</p>
            <p className="text-xs text-gray-400 truncate max-w-[160px]">{user.email}</p>
          </div>
        </div>
      </td>
      <td className="px-5 py-3.5">
        <div className="flex flex-col gap-1">
          {user.is_premium
            ? <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-slate-100 text-slate-700 text-xs font-semibold rounded-full w-fit"><Crown size={9} /> Premium</span>
            : <span className="inline-flex px-2 py-0.5 bg-gray-100 text-gray-500 text-xs font-semibold rounded-full w-fit">Free</span>}
          {user.is_staff && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-blue-100 text-blue-700 text-xs font-semibold rounded-full w-fit">
              <ShieldCheck size={9} /> Staff
            </span>
          )}
        </div>
      </td>
      <td className="px-5 py-3.5">
        <span className="inline-flex items-center gap-1.5 text-sm font-medium text-gray-700">
          <BookOpen size={13} className="text-gray-400" />{user.tests_taken ?? 0}
        </span>
      </td>
      <td className="px-5 py-3.5">
        <span className="inline-flex items-center gap-1.5 text-xs text-gray-500">
          <Calendar size={11} />{formatDate(user.date_joined || user.joined)}
        </span>
      </td>
      <td className="px-5 py-3.5">
        <div className="flex flex-col gap-0.5">
          {user.is_premium ? (
            <>
              <span className="inline-flex items-center gap-1 text-xs font-semibold text-amber-700">
                <Crown size={10} /> Premium
              </span>
              {user.premium_until && (
                <span className="text-[10px] text-gray-400 flex items-center gap-1">
                  <Clock size={9} /> Until {formatDate(user.premium_until)}
                </span>
              )}
            </>
          ) : (
            <span className="text-xs text-gray-400">Free</span>
          )}
        </div>
      </td>
      <td className="px-5 py-3.5">
        <ChevronRight size={14} className="text-gray-300" />
      </td>
    </motion.tr>
  )
}

/* ─── Blocked Tab ─────────────────────────────────────────────── */
const REASON_LABELS = {
  brute_force: { label: 'Brute Force', icon: Zap, color: 'text-red-600 bg-red-50 border-red-200' },
  bot_ua: { label: 'Bot / Scraper', icon: Bot, color: 'text-orange-600 bg-orange-50 border-orange-200' },
  no_user_agent: { label: 'No User-Agent', icon: Globe, color: 'text-yellow-700 bg-yellow-50 border-yellow-200' },
  no_accept_header: { label: 'Suspicious Request', icon: AlertCircle, color: 'text-yellow-700 bg-yellow-50 border-yellow-200' },
  rate_limit_exceeded: { label: 'Rate Limit', icon: Zap, color: 'text-purple-600 bg-purple-50 border-purple-200' },
  admin_ip_not_whitelisted: { label: 'Admin IP Block', icon: Lock, color: 'text-blue-600 bg-blue-50 border-blue-200' },
}

function reasonMeta(reason = '') {
  const key = Object.keys(REASON_LABELS).find(k => reason.startsWith(k))
  return REASON_LABELS[key] || { label: reason, icon: Ban, color: 'text-gray-600 bg-gray-50 border-gray-200' }
}

function timeAgo(ts) {
  if (!ts) return '—'
  const diff = Math.floor(Date.now() / 1000 - ts)
  if (diff < 60) return `${diff}s oldin`
  if (diff < 3600) return `${Math.floor(diff / 60)}min oldin`
  if (diff < 86400) return `${Math.floor(diff / 3600)}soat oldin`
  return `${Math.floor(diff / 86400)}kun oldin`
}

function timeLeft(ts) {
  if (!ts) return ''
  const diff = ts - Math.floor(Date.now() / 1000)
  if (diff <= 0) return 'Muddati o\'tgan'
  if (diff < 3600) return `${Math.floor(diff / 60)}min qoldi`
  return `${Math.floor(diff / 3600)}soat qoldi`
}

function BlockedTab() {
  const queryClient = useQueryClient()

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['admin-security-blocked'],
    queryFn: () => api.get('/admin/security/blocked/').then(r => r.data),
    refetchInterval: 15_000,
  })

  const { data: wlData, refetch: refetchWl } = useQuery({
    queryKey: ['admin-security-whitelist'],
    queryFn: () => api.get('/admin/security/whitelist/').then(r => r.data),
  })

  const unblockMutation = useMutation({
    mutationFn: (ip) => api.post('/admin/security/unblock/', { ip }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-security-blocked'] })
    },
  })

  const removeWlMutation = useMutation({
    mutationFn: (ip) => api.delete('/admin/security/whitelist/remove/', { data: { ip } }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['admin-security-whitelist'] }),
  })

  const [newIp, setNewIp] = useState('')
  const addWlMutation = useMutation({
    mutationFn: (ip) => api.post('/admin/security/whitelist/', { ip }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-security-whitelist'] })
      setNewIp('')
    },
  })

  const blocked = data?.blocked || []
  const whitelist = wlData?.whitelist || []

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-base font-bold text-gray-900">Bloklangan IP lar</h3>
          <p className="text-xs text-gray-400 mt-0.5">Bot, brute force va shubhali so'rovlar avtomatik bloklanadi</p>
        </div>
        <button onClick={() => refetch()}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-gray-600 border border-gray-200 hover:bg-gray-50 transition">
          <RefreshCw size={12} /> Yangilash
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {Object.entries(REASON_LABELS).map(([key, meta]) => {
          const Icon = meta.icon
          const count = blocked.filter(b => b.reason?.startsWith(key)).length
          return (
            <div key={key} className={`rounded-xl border p-3 ${meta.color}`}>
              <div className="flex items-center gap-2 mb-1">
                <Icon size={14} />
                <span className="text-[11px] font-bold">{meta.label}</span>
              </div>
              <div className="text-2xl font-black">{count}</div>
            </div>
          )
        })}
      </div>

      {/* Blocked list */}
      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 size={22} className="animate-spin text-gray-400" />
        </div>
      ) : blocked.length === 0 ? (
        <div className="text-center py-12 text-gray-400">
          <Shield size={36} className="mx-auto mb-3 opacity-30" />
          <p className="font-semibold">Hech kim bloklanmagan</p>
          <p className="text-xs mt-1">Shubhali faoliyat aniqlanganda bu yerda ko'rinadi</p>
        </div>
      ) : (
        <div className="space-y-2">
          <AnimatePresence>
            {blocked.map((entry) => {
              const meta = reasonMeta(entry.reason)
              const Icon = meta.icon
              return (
                <motion.div
                  key={entry.ip}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  className="bg-white border border-gray-100 rounded-xl p-4 flex items-start gap-3 shadow-sm"
                >
                  <div className={`w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 border ${meta.color}`}>
                    <Icon size={16} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-mono font-bold text-sm text-gray-900">{entry.ip}</span>
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${meta.color}`}>
                        {meta.label}
                      </span>
                    </div>
                    <div className="text-[11px] text-gray-500 mt-0.5 truncate" title={entry.ua}>
                      {entry.ua ? `UA: ${entry.ua}` : 'User-Agent yo\'q'}
                    </div>
                    <div className="flex gap-3 mt-1 text-[10px] text-gray-400">
                      <span>{timeAgo(entry.blocked_at)}</span>
                      <span className="text-orange-500 font-semibold">{timeLeft(entry.unblock_at)}</span>
                      {entry.path && <span className="truncate max-w-[120px]">{entry.path}</span>}
                    </div>
                  </div>
                  <button
                    onClick={() => unblockMutation.mutate(entry.ip)}
                    disabled={unblockMutation.isPending}
                    className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[11px] font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 hover:bg-emerald-100 transition flex-shrink-0"
                  >
                    <Unlock size={12} /> Ochish
                  </button>
                </motion.div>
              )
            })}
          </AnimatePresence>
        </div>
      )}

      {/* Admin IP Whitelist */}
      <div className="bg-white border border-gray-100 rounded-2xl p-5 shadow-sm">
        <div className="flex items-center gap-2 mb-4">
          <ShieldCheck size={16} className="text-sky-600" />
          <h4 className="font-bold text-gray-900 text-sm">Admin IP Whitelist</h4>
          <span className="text-[10px] bg-sky-100 text-sky-700 px-2 py-0.5 rounded-full font-semibold">
            {whitelist.length} ta IP
          </span>
        </div>

        {/* Add IP */}
        <div className="flex gap-2 mb-4">
          <input
            type="text"
            value={newIp}
            onChange={e => setNewIp(e.target.value)}
            placeholder="IP qo'shish (masalan: 185.10.20.30)"
            className="flex-1 px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:border-sky-400 focus:ring-2 focus:ring-sky-100"
            onKeyDown={e => e.key === 'Enter' && newIp && addWlMutation.mutate(newIp)}
          />
          <button
            onClick={() => newIp && addWlMutation.mutate(newIp)}
            disabled={!newIp || addWlMutation.isPending}
            className="px-4 py-2 bg-sky-600 text-white text-sm font-semibold rounded-lg hover:bg-sky-700 transition disabled:opacity-50"
          >
            Qo'shish
          </button>
        </div>

        {whitelist.length === 0 ? (
          <p className="text-xs text-gray-400 text-center py-3">
            Hech qanday IP qo'shilmagan — hamma kirishi mumkin
          </p>
        ) : (
          <div className="space-y-2">
            {whitelist.map(ip => (
              <div key={ip} className="flex items-center justify-between px-3 py-2 bg-gray-50 rounded-lg">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-emerald-500" />
                  <span className="font-mono text-sm text-gray-900">{ip}</span>
                </div>
                <button
                  onClick={() => removeWlMutation.mutate(ip)}
                  className="text-red-400 hover:text-red-600 transition p-1 rounded hover:bg-red-50"
                >
                  <X size={14} />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

/* ─── Main component ──────────────────────────────────────────── */
const PAGE_SIZE = 50

export default function AdminUsers() {
  const [activeTab, setActiveTab] = useState('users')
  const [rawSearch, setRawSearch] = useState('')
  const [search, setSearch] = useState('')
  const [planFilter, setPlanFilter] = useState('ALL')   // ALL | premium | free
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE)
  const [pendingId, setPendingId] = useState(null)
  const [selectedUserId, setSelectedUserId] = useState(null)
  const debounceRef = useRef(null)
  const queryClient = useQueryClient()

  useEffect(() => {
    clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => {
      setSearch(rawSearch.trim())
      setVisibleCount(PAGE_SIZE)
    }, 400)
    return () => clearTimeout(debounceRef.current)
  }, [rawSearch])

  const { data, isLoading, error } = useQuery({
    queryKey: ['admin-users', search],
    queryFn: () => api.get('/admin/users/', { params: search ? { q: search } : {} }).then(r => r.data),
    staleTime: 30_000,
  })

  const revokePremium = useMutation({
    mutationFn: ({ id }) => api.post(`/admin/users/${id}/toggle-premium/`, { action: 'revoke' }),
    onMutate: async ({ id }) => {
      setPendingId(id)
      await queryClient.cancelQueries({ queryKey: ['admin-users', search] })
      const prev = queryClient.getQueryData(['admin-users', search])
      queryClient.setQueryData(['admin-users', search], (old) => {
        if (!old) return old
        const mapper = u => u.id === id ? { ...u, is_premium: false } : u
        if (Array.isArray(old)) return old.map(mapper)
        return { ...old, results: old.results?.map(mapper) }
      })
      return { prev }
    },
    onError: (_err, _vars, ctx) => {
      if (ctx?.prev) queryClient.setQueryData(['admin-users', search], ctx.prev)
    },
    onSettled: () => {
      setPendingId(null)
      queryClient.invalidateQueries({ queryKey: ['admin-users'] })
    },
  })

  // Table row action: revoke directly, grant opens drawer (which has duration picker)
  const handleToggle = useCallback(
    (user) => {
      if (user.is_premium) {
        revokePremium.mutate({ id: user.id })
      } else {
        setSelectedUserId(user.id)  // open drawer → duration picker modal
      }
    },
    [revokePremium]
  )

  const allUsers = Array.isArray(data) ? data : (data?.results ?? [])
  const totalCount = data?.count ?? allUsers.length
  const premiumCount = allUsers.filter(u => u.is_premium).length
  const freeCount = allUsers.length - premiumCount
  const newToday = allUsers.filter(u => {
    if (!u.date_joined) return false
    const d = new Date(u.date_joined)
    const now = new Date()
    return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth() && d.getDate() === now.getDate()
  }).length

  // Apply plan filter
  const filteredUsers = planFilter === 'ALL' ? allUsers
    : planFilter === 'premium' ? allUsers.filter(u => u.is_premium)
    : allUsers.filter(u => !u.is_premium)

  const visibleUsers = filteredUsers.slice(0, visibleCount)
  const hasMore = visibleCount < filteredUsers.length

  return (
    <div className="space-y-6">
      {/* Drawer */}
      <AnimatePresence>
        {selectedUserId && (
          <UserDetailDrawer
            userId={selectedUserId}
            onClose={() => setSelectedUserId(null)}
            onDeleted={() => setSelectedUserId(null)}
          />
        )}
      </AnimatePresence>

      {/* ── Header ── */}
      <motion.div variants={fadeUp} initial="hidden" animate="visible"
        className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl gradient-primary flex items-center justify-center shadow-glow">
            <Users size={17} className="text-white" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-gray-900 leading-tight">User Management</h2>
            <p className="text-xs text-gray-400">Foydalanuvchilar va xavfsizlik</p>
          </div>
        </div>

        {/* Tab switcher */}
        <div className="flex items-center gap-1 bg-gray-100 rounded-xl p-1 self-start sm:self-auto">
          <button
            onClick={() => setActiveTab('users')}
            className={`flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-sm font-semibold transition ${
              activeTab === 'users'
                ? 'bg-white text-sky-600 shadow-sm'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            <Users size={14} /> Foydalanuvchilar
          </button>
          <button
            onClick={() => setActiveTab('blocked')}
            className={`flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-sm font-semibold transition ${
              activeTab === 'blocked'
                ? 'bg-white text-red-600 shadow-sm'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            <Shield size={14} /> Bloklangan
          </button>
        </div>
      </motion.div>

      {/* ── Blocked tab content ── */}
      {activeTab === 'blocked' && <BlockedTab />}

      {/* ── Users tab content ── */}
      {activeTab === 'users' && (<>
      {/* ── Stats row ── */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatCard index={0} icon={Users} label="Total Users" value={isLoading ? undefined : totalCount} iconClass="text-sky-600" bgClass="bg-sky-100" />
        <StatCard index={1} icon={Crown} label="Premium Users" value={isLoading ? undefined : premiumCount} iconClass="text-amber-600" bgClass="bg-amber-100" />
        <StatCard index={2} icon={UserPlus} label="New Today" value={isLoading ? undefined : newToday} iconClass="text-emerald-600" bgClass="bg-emerald-100" />
      </div>

      {/* ── Search + Filters ── */}
      <motion.div custom={1} variants={fadeUp} initial="hidden" animate="visible"
        className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
        <div className="relative w-full sm:max-w-sm">
          <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
          <input type="text" value={rawSearch} onChange={e => setRawSearch(e.target.value)}
            placeholder="Search by name or email…"
            className="w-full pl-10 pr-9 py-2.5 bg-white border border-gray-200 rounded-xl text-sm text-gray-700 placeholder-gray-400 focus:outline-none focus:border-sky-400 focus:ring-2 focus:ring-sky-100 transition shadow-sm" />
          {rawSearch && (
            <button onClick={() => setRawSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-300 hover:text-gray-500 transition">
              <X size={13} />
            </button>
          )}
        </div>
        {/* Plan filter pills */}
        <div className="flex items-center gap-1.5 bg-gray-100 rounded-xl p-1">
          {[
            { id: 'ALL', label: `All (${allUsers.length})` },
            { id: 'premium', label: `Premium (${premiumCount})` },
            { id: 'free', label: `Free (${freeCount})` },
          ].map(f => (
            <button key={f.id} onClick={() => { setPlanFilter(f.id); setVisibleCount(PAGE_SIZE) }}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                planFilter === f.id ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
      </motion.div>

      {/* ── Error ── */}
      {error && (
        <div className="flex items-center gap-3 p-4 bg-red-50 border border-red-200 rounded-2xl text-red-700">
          <AlertCircle size={17} />
          <p className="text-sm">Failed to load users: {error.message}</p>
        </div>
      )}

      {/* ── Mobile cards ── */}
      {!error && (
        <div className="block md:hidden space-y-3">
          {isLoading ? (
            [...Array(5)].map((_, i) => (
              <div key={i} className="bg-white rounded-2xl border border-sky-50 p-4 space-y-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-gray-100 animate-pulse" />
                  <div className="flex-1 space-y-2">
                    <div className="h-3 bg-gray-100 rounded animate-pulse w-1/2" />
                    <div className="h-2.5 bg-gray-50 rounded animate-pulse w-3/4" />
                  </div>
                </div>
              </div>
            ))
          ) : !visibleUsers.length ? (
            <EmptyState search={search} />
          ) : (
            <AnimatePresence>
              {visibleUsers.map(u => (
                <UserCard key={u.id} user={u} isPending={revokePremium.isPending}
                  pendingId={pendingId} onToggle={handleToggle} onSelect={setSelectedUserId} />
              ))}
            </AnimatePresence>
          )}
        </div>
      )}

      {/* ── Desktop table ── */}
      {!error && (
        <motion.div custom={2} variants={fadeUp} initial="hidden" animate="visible"
          className="hidden md:block bg-white rounded-2xl shadow-card border border-sky-50 overflow-hidden">
          {isLoading ? <SkeletonRows count={5} />
            : !visibleUsers.length ? <EmptyState search={search} />
            : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-gradient-to-r from-sky-50/60 to-slate-50/40 border-b border-sky-100/50">
                      {['User', 'Plan', 'Tests Taken', 'Joined', 'Premium Expiry', ''].map(h => (
                        <th key={h} className="text-left px-5 py-3.5 text-xs font-semibold text-gray-500 uppercase tracking-wider">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    <AnimatePresence>
                      {visibleUsers.map((u, i) => (
                        <UserRow key={u.id} user={u} index={i} isPending={revokePremium.isPending}
                          pendingId={pendingId} onToggle={handleToggle} onSelect={setSelectedUserId} />
                      ))}
                    </AnimatePresence>
                  </tbody>
                </table>
              </div>
            )}
        </motion.div>
      )}

      {/* ── Load more ── */}
      {!isLoading && !error && hasMore && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex flex-col items-center gap-2 pt-2">
          <p className="text-xs text-gray-400">Showing {visibleUsers.length} of {allUsers.length} users</p>
          <button onClick={() => setVisibleCount(c => c + PAGE_SIZE)}
            className="flex items-center gap-2 px-5 py-2.5 bg-white border border-sky-200 text-sky-600 rounded-xl text-sm font-semibold hover:bg-sky-50 transition shadow-sm">
            <ChevronDown size={15} /> Load more
          </button>
        </motion.div>
      )}
      </>)}
    </div>
  )
}

