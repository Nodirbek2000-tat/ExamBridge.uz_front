import { useState, useEffect, useRef, useCallback } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Search, Users, Crown, Calendar, BookOpen, AlertCircle, UserCheck,
  Loader2, UserPlus, X, ChevronDown, ShieldCheck, Trash2, ChevronRight,
  Mail, Clock, CheckCircle2, BarChart2,
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
    mutationFn: () => api.post(`/admin/users/${userId}/toggle-staff/`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-user-detail', userId] })
      queryClient.invalidateQueries({ queryKey: ['admin-users'] })
    },
  })

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

              <button
                onClick={handlePremiumClick}
                disabled={premiumMutation.isPending}
                className={`w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-bold border transition ${
                  user.is_premium
                    ? 'bg-amber-50 text-amber-700 border-amber-200 hover:bg-amber-100'
                    : 'bg-gray-50 text-gray-700 border-gray-200 hover:bg-amber-50 hover:text-amber-700 hover:border-amber-200'
                }`}
              >
                {premiumMutation.isPending ? <Loader2 size={14} className="animate-spin" /> : <Crown size={14} />}
                {user.is_premium ? 'Revoke Premium' : 'Make Premium →'}
              </button>

              <button
                onClick={() => toggleStaff.mutate()}
                disabled={toggleStaff.isPending}
                className={`w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-bold border transition ${
                  user.is_staff
                    ? 'bg-blue-50 text-blue-700 border-blue-200 hover:bg-blue-100'
                    : 'bg-gray-50 text-gray-700 border-gray-200 hover:bg-blue-50 hover:text-blue-700 hover:border-blue-200'
                }`}
              >
                {toggleStaff.isPending ? <Loader2 size={14} className="animate-spin" /> : <ShieldCheck size={14} />}
                {user.is_staff ? 'Revoke Admin Access' : 'Make Admin'}
              </button>

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

/* ─── Toggle Premium button ───────────────────────────────────── */
function TogglePremiumBtn({ user, isPending, pendingId, onToggle }) {
  const loading = isPending && pendingId === user.id
  return (
    <button onClick={e => { e.stopPropagation(); onToggle(user) }} disabled={isPending}
      title={user.is_premium ? 'Revoke premium' : 'Choose duration & grant premium'}
      className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all disabled:opacity-50 ${
        user.is_premium
          ? 'bg-amber-50 text-amber-700 border-amber-200 hover:bg-amber-100'
          : 'bg-gray-50 text-gray-600 border-gray-200 hover:bg-amber-50 hover:text-amber-700 hover:border-amber-200'
      }`}>
      {loading ? <Loader2 size={11} className="animate-spin" /> : <Crown size={11} />}
      {user.is_premium ? 'Revoke' : 'Make Premium'}
    </button>
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
        <TogglePremiumBtn user={user} isPending={isPending} pendingId={pendingId} onToggle={onToggle} />
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
        <div className="flex items-center gap-2">
          <TogglePremiumBtn user={user} isPending={isPending} pendingId={pendingId} onToggle={onToggle} />
          <ChevronRight size={14} className="text-gray-300" />
        </div>
      </td>
    </motion.tr>
  )
}

/* ─── Main component ──────────────────────────────────────────── */
const PAGE_SIZE = 50

export default function AdminUsers() {
  const [rawSearch, setRawSearch] = useState('')
  const [search, setSearch] = useState('')
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
  const newToday = allUsers.filter(u => {
    if (!u.date_joined) return false
    const d = new Date(u.date_joined)
    const now = new Date()
    return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth() && d.getDate() === now.getDate()
  }).length

  const visibleUsers = allUsers.slice(0, visibleCount)
  const hasMore = visibleCount < allUsers.length

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
            <p className="text-xs text-gray-400">Click a user to view details or delete</p>
          </div>
        </div>
      </motion.div>

      {/* ── Stats row ── */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatCard index={0} icon={Users} label="Total Users" value={isLoading ? undefined : totalCount} iconClass="text-sky-600" bgClass="bg-sky-100" />
        <StatCard index={1} icon={Crown} label="Premium Users" value={isLoading ? undefined : premiumCount} iconClass="text-slate-600" bgClass="bg-slate-100" />
        <StatCard index={2} icon={UserPlus} label="New Today" value={isLoading ? undefined : newToday} iconClass="text-emerald-600" bgClass="bg-emerald-100" />
      </div>

      {/* ── Search ── */}
      <motion.div custom={1} variants={fadeUp} initial="hidden" animate="visible" className="relative max-w-sm">
        <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
        <input type="text" value={rawSearch} onChange={e => setRawSearch(e.target.value)}
          placeholder="Search by name or email…"
          className="w-full pl-10 pr-9 py-2.5 bg-white border border-gray-200 rounded-xl text-sm text-gray-700 placeholder-gray-400 focus:outline-none focus:border-sky-400 focus:ring-2 focus:ring-sky-100 transition shadow-sm" />
        {rawSearch && (
          <button onClick={() => setRawSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-300 hover:text-gray-500 transition">
            <X size={13} />
          </button>
        )}
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
                      {['User', 'Plan', 'Tests Taken', 'Joined', 'Action'].map(h => (
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
    </div>
  )
}

