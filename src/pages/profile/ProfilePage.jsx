import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  User, Mail, Target, Clock, Calendar, Bell, Crown,
  ChevronRight, X, Eye, EyeOff, Check, LogOut, Shield,
  Headphones, FileText, BookOpen, Sun, Moon, Monitor,
} from 'lucide-react'
import { useAuthStore } from '../../store/authStore'
import { useThemeStore } from '../../store/themeStore'
import { useCenterStudent } from '../../hooks/useCenterStudent'

// ── Helpers ───────────────────────────────────────────────────────────────────
const BAND_OPTIONS = ['5.0', '5.5', '6.0', '6.5', '7.0', '7.5', '8.0', '8.5', '9.0']
const CEFR_LEVELS = ['A1', 'A2', 'B1', 'B2', 'C1', 'C2']
const STUDY_TIMES = [
  { value: 15, label: '15 min' },
  { value: 30, label: '30 min' },
  { value: 45, label: '45 min' },
  { value: 60, label: '1 hour' },
  { value: 90, label: '1.5 hours' },
  { value: 120, label: '2 hours' },
]

function formatDate(iso) {
  if (!iso) return 'Not set'
  const d = new Date(iso)
  return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })
}

function formatCreated(iso) {
  if (!iso) return ''
  const d = new Date(iso)
  return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })
}

// ── Modal wrapper ─────────────────────────────────────────────────────────────
function Modal({ title, onClose, children }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="w-full max-w-sm bg-white dark:bg-gray-900 rounded-2xl shadow-2xl border border-gray-100 dark:border-gray-700">
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 dark:border-gray-700">
          <h3 className="font-bold text-gray-900 dark:text-white">{title}</h3>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition">
            <X size={16} />
          </button>
        </div>
        <div className="p-5">{children}</div>
      </div>
    </div>
  )
}

// ── Section card ──────────────────────────────────────────────────────────────
function Card({ children, className = '' }) {
  return (
    <div className={`bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-2xl overflow-hidden shadow-sm ${className}`}>
      {children}
    </div>
  )
}

function CardTitle({ icon: Icon, title, color = 'text-sky-500' }) {
  return (
    <div className="flex items-center gap-3 px-5 py-4 border-b border-gray-50 dark:border-gray-700">
      <div className={`w-8 h-8 rounded-xl flex items-center justify-center ${color === 'text-sky-500' ? 'bg-sky-50 dark:bg-sky-900/30' : color === 'text-amber-500' ? 'bg-amber-50 dark:bg-amber-900/30' : 'bg-gray-50 dark:bg-gray-700'}`}>
        <Icon size={16} className={color} />
      </div>
      <span className="font-bold text-gray-900 dark:text-white">{title}</span>
    </div>
  )
}

function Row({ label, value, onClick, toggle, checked, onToggle, readOnly }) {
  return (
    <div
      onClick={!toggle && !readOnly ? onClick : undefined}
      className={`flex items-center justify-between px-5 py-3.5 border-b last:border-b-0 border-gray-50 dark:border-gray-700/60 ${!toggle && !readOnly ? 'cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700/40 transition' : ''}`}
    >
      <div className="min-w-0">
        <p className="text-xs text-gray-400 dark:text-gray-500 mb-0.5">{label}</p>
        {!toggle && <p className={`text-sm font-semibold ${readOnly ? 'text-gray-400 dark:text-gray-500' : 'text-gray-800 dark:text-gray-100'} truncate`}>{value}</p>}
      </div>
      {toggle ? (
        <button
          type="button"
          onClick={onToggle}
          className={`relative w-11 h-6 rounded-full transition-colors flex-shrink-0 ${checked ? 'bg-sky-500' : 'bg-gray-200 dark:bg-gray-600'}`}
        >
          <span className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${checked ? 'translate-x-5' : ''}`} />
        </button>
      ) : !readOnly ? (
        <ChevronRight size={15} className="text-gray-300 dark:text-gray-600 flex-shrink-0" />
      ) : null}
    </div>
  )
}

// ── Name Modal ────────────────────────────────────────────────────────────────
function NameModal({ user, onClose }) {
  const updateProfile = useAuthStore((s) => s.updateProfile)
  const [firstName, setFirstName] = useState(user.first_name || '')
  const [lastName, setLastName] = useState(user.last_name || '')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const save = async () => {
    if (!firstName.trim()) return setError('Name is required')
    setLoading(true)
    const res = await updateProfile({ first_name: firstName.trim(), last_name: lastName.trim() })
    setLoading(false)
    if (res.success) onClose()
    else setError(res.error)
  }

  return (
    <Modal title="Edit Name" onClose={onClose}>
      <div className="space-y-3">
        <div>
          <label className="text-xs font-semibold text-gray-500 dark:text-gray-400 mb-1 block">First Name</label>
          <input value={firstName} onChange={e => setFirstName(e.target.value)}
            className="w-full px-3 py-2.5 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded-xl text-sm text-gray-800 dark:text-gray-100 focus:outline-none focus:border-sky-400 focus:ring-2 focus:ring-sky-100 dark:focus:ring-sky-900/40 transition" />
        </div>
        <div>
          <label className="text-xs font-semibold text-gray-500 dark:text-gray-400 mb-1 block">Last Name</label>
          <input value={lastName} onChange={e => setLastName(e.target.value)}
            className="w-full px-3 py-2.5 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded-xl text-sm text-gray-800 dark:text-gray-100 focus:outline-none focus:border-sky-400 focus:ring-2 focus:ring-sky-100 dark:focus:ring-sky-900/40 transition" />
        </div>
        {error && <p className="text-xs text-red-500">{error}</p>}
        <div className="flex gap-2 pt-1">
          <button onClick={onClose} className="flex-1 py-2.5 rounded-xl border border-gray-200 dark:border-gray-600 text-sm font-semibold text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition">Cancel</button>
          <button onClick={save} disabled={loading} className="flex-1 py-2.5 rounded-xl bg-sky-500 hover:bg-sky-600 text-white text-sm font-semibold transition disabled:opacity-50">
            {loading ? 'Saving...' : 'Save'}
          </button>
        </div>
      </div>
    </Modal>
  )
}

// ── Target Band Modal ─────────────────────────────────────────────────────────
function TargetBandModal({ current, onClose }) {
  const updateProfile = useAuthStore((s) => s.updateProfile)
  const [value, setValue] = useState(current || '7.0')
  const [loading, setLoading] = useState(false)

  const save = async () => {
    setLoading(true)
    await updateProfile({ target_band: value })
    setLoading(false)
    onClose()
  }

  return (
    <Modal title="Target Band" onClose={onClose}>
      <div className="space-y-4">
        <div className="relative">
          <select value={value} onChange={e => setValue(e.target.value)}
            className="w-full px-3 py-2.5 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded-xl text-sm font-semibold text-gray-800 dark:text-gray-100 focus:outline-none focus:border-sky-400 focus:ring-2 focus:ring-sky-100 dark:focus:ring-sky-900/40 transition appearance-none">
            {[...BAND_OPTIONS, ...CEFR_LEVELS].map(v => (
              <option key={v} value={v}>{v}</option>
            ))}
          </select>
        </div>
        <div className="flex gap-2">
          <button onClick={onClose} className="flex-1 py-2.5 rounded-xl border border-gray-200 dark:border-gray-600 text-sm font-semibold text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition">Cancel</button>
          <button onClick={save} disabled={loading} className="flex-1 py-2.5 rounded-xl bg-sky-500 hover:bg-sky-600 text-white text-sm font-semibold transition disabled:opacity-50">
            {loading ? 'Saving...' : 'Save'}
          </button>
        </div>
      </div>
    </Modal>
  )
}

// ── Study Time Modal ──────────────────────────────────────────────────────────
function StudyTimeModal({ current, onClose }) {
  const updateProfile = useAuthStore((s) => s.updateProfile)
  const [value, setValue] = useState(current || 30)
  const [loading, setLoading] = useState(false)

  const save = async () => {
    setLoading(true)
    await updateProfile({ daily_study_minutes: value })
    setLoading(false)
    onClose()
  }

  return (
    <Modal title="Daily Study Time" onClose={onClose}>
      <div className="space-y-4">
        <div className="grid grid-cols-3 gap-2">
          {STUDY_TIMES.map(opt => (
            <button key={opt.value} onClick={() => setValue(opt.value)}
              className={`py-2.5 rounded-xl text-sm font-semibold border-2 transition ${value === opt.value ? 'border-sky-500 bg-sky-50 dark:bg-sky-900/30 text-sky-600 dark:text-sky-400' : 'border-gray-100 dark:border-gray-600 text-gray-600 dark:text-gray-300 hover:border-sky-200 dark:hover:border-sky-700'}`}>
              {opt.label}
            </button>
          ))}
        </div>
        <div className="flex gap-2">
          <button onClick={onClose} className="flex-1 py-2.5 rounded-xl border border-gray-200 dark:border-gray-600 text-sm font-semibold text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition">Cancel</button>
          <button onClick={save} disabled={loading} className="flex-1 py-2.5 rounded-xl bg-sky-500 hover:bg-sky-600 text-white text-sm font-semibold transition disabled:opacity-50">
            {loading ? 'Saving...' : 'Save'}
          </button>
        </div>
      </div>
    </Modal>
  )
}

// ── Exam Date Modal ───────────────────────────────────────────────────────────
function ExamDateModal({ current, onClose }) {
  const updateProfile = useAuthStore((s) => s.updateProfile)
  const [value, setValue] = useState(current || '')
  const [loading, setLoading] = useState(false)

  const save = async () => {
    setLoading(true)
    await updateProfile({ exam_date: value || null })
    setLoading(false)
    onClose()
  }

  return (
    <Modal title="Exam Date" onClose={onClose}>
      <div className="space-y-4">
        <input type="date" value={value} onChange={e => setValue(e.target.value)}
          className="w-full px-3 py-2.5 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded-xl text-sm text-gray-800 dark:text-gray-100 focus:outline-none focus:border-sky-400 focus:ring-2 focus:ring-sky-100 dark:focus:ring-sky-900/40 transition" />
        {value && (
          <button onClick={() => setValue('')} className="text-xs text-red-400 hover:text-red-500 transition">Clear date</button>
        )}
        <div className="flex gap-2">
          <button onClick={onClose} className="flex-1 py-2.5 rounded-xl border border-gray-200 dark:border-gray-600 text-sm font-semibold text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition">Cancel</button>
          <button onClick={save} disabled={loading} className="flex-1 py-2.5 rounded-xl bg-sky-500 hover:bg-sky-600 text-white text-sm font-semibold transition disabled:opacity-50">
            {loading ? 'Saving...' : 'Save'}
          </button>
        </div>
      </div>
    </Modal>
  )
}

// ── Change Password Modal ─────────────────────────────────────────────────────
function ChangePasswordModal({ onClose }) {
  const changePassword = useAuthStore((s) => s.changePassword)
  const [oldPw, setOldPw] = useState('')
  const [newPw, setNewPw] = useState('')
  const [confirmPw, setConfirmPw] = useState('')
  const [showOld, setShowOld] = useState(false)
  const [showNew, setShowNew] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)

  const save = async () => {
    setError('')
    if (!oldPw || !newPw) return setError('All fields are required')
    if (newPw !== confirmPw) return setError('New passwords do not match')
    if (newPw.length < 8) return setError('New password must be at least 8 characters')
    setLoading(true)
    const res = await changePassword(oldPw, newPw)
    setLoading(false)
    if (res.success) { setSuccess(true); setTimeout(onClose, 1200) }
    else setError(res.error)
  }

  return (
    <Modal title="Change Password" onClose={onClose}>
      <div className="space-y-3">
        {success ? (
          <div className="flex items-center gap-2 text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-900/20 rounded-xl px-4 py-3">
            <Check size={16} /> <span className="text-sm font-semibold">Password changed!</span>
          </div>
        ) : (
          <>
            <div className="relative">
              <label className="text-xs font-semibold text-gray-500 dark:text-gray-400 mb-1 block">Current Password</label>
              <input type={showOld ? 'text' : 'password'} value={oldPw} onChange={e => setOldPw(e.target.value)}
                className="w-full px-3 pr-10 py-2.5 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded-xl text-sm text-gray-800 dark:text-gray-100 focus:outline-none focus:border-sky-400 focus:ring-2 focus:ring-sky-100 dark:focus:ring-sky-900/40 transition" />
              <button onClick={() => setShowOld(p => !p)} className="absolute right-3 top-7 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition">
                {showOld ? <EyeOff size={15} /> : <Eye size={15} />}
              </button>
            </div>
            <div className="relative">
              <label className="text-xs font-semibold text-gray-500 dark:text-gray-400 mb-1 block">New Password</label>
              <input type={showNew ? 'text' : 'password'} value={newPw} onChange={e => setNewPw(e.target.value)}
                className="w-full px-3 pr-10 py-2.5 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded-xl text-sm text-gray-800 dark:text-gray-100 focus:outline-none focus:border-sky-400 focus:ring-2 focus:ring-sky-100 dark:focus:ring-sky-900/40 transition" />
              <button onClick={() => setShowNew(p => !p)} className="absolute right-3 top-7 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition">
                {showNew ? <EyeOff size={15} /> : <Eye size={15} />}
              </button>
            </div>
            <div>
              <label className="text-xs font-semibold text-gray-500 dark:text-gray-400 mb-1 block">Confirm New Password</label>
              <input type="password" value={confirmPw} onChange={e => setConfirmPw(e.target.value)}
                className="w-full px-3 py-2.5 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded-xl text-sm text-gray-800 dark:text-gray-100 focus:outline-none focus:border-sky-400 focus:ring-2 focus:ring-sky-100 dark:focus:ring-sky-900/40 transition" />
            </div>
            {error && <p className="text-xs text-red-500">{error}</p>}
            <div className="flex gap-2 pt-1">
              <button onClick={onClose} className="flex-1 py-2.5 rounded-xl border border-gray-200 dark:border-gray-600 text-sm font-semibold text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition">Cancel</button>
              <button onClick={save} disabled={loading} className="flex-1 py-2.5 rounded-xl bg-sky-500 hover:bg-sky-600 text-white text-sm font-semibold transition disabled:opacity-50">
                {loading ? 'Saving...' : 'Save'}
              </button>
            </div>
          </>
        )}
      </div>
    </Modal>
  )
}

// ── Theme picker ──────────────────────────────────────────────────────────────
const THEMES = [
  { key: 'light', label: 'Light', icon: Sun },
  { key: 'dark', label: 'Dark', icon: Moon },
  { key: 'system', label: 'System', icon: Monitor },
]

function ThemePicker() {
  const { theme, setTheme } = useThemeStore()
  return (
    <div className="px-5 py-3.5">
      <p className="text-xs text-gray-400 dark:text-gray-500 mb-2">Theme</p>
      <div className="flex gap-2">
        {THEMES.map(({ key, label, icon: Icon }) => (
          <button key={key} onClick={() => setTheme(key)}
            className={`flex-1 flex flex-col items-center gap-1.5 py-2.5 rounded-xl border-2 text-xs font-semibold transition ${theme === key ? 'border-sky-500 bg-sky-50 dark:bg-sky-900/30 text-sky-600 dark:text-sky-400' : 'border-gray-100 dark:border-gray-600 text-gray-500 dark:text-gray-400 hover:border-sky-200 dark:hover:border-sky-700'}`}>
            <Icon size={16} />
            {label}
          </button>
        ))}
      </div>
    </div>
  )
}

// ── Main Page ─────────────────────────────────────────────────────────────────
export default function ProfilePage() {
  const user = useAuthStore((s) => s.user)
  const updateProfile = useAuthStore((s) => s.updateProfile)
  const logout = useAuthStore((s) => s.logout)
  const navigate = useNavigate()
  const [modal, setModal] = useState(null)
  const { isCenterStudent } = useCenterStudent()

  const handleLogout = async () => {
    await logout()
    navigate('/login')
  }

  const toggleNewsletter = async () => {
    await updateProfile({ email_newsletter: !user.email_newsletter })
  }

  const initial = user?.first_name?.[0]?.toUpperCase() || user?.email?.[0]?.toUpperCase() || 'U'

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 transition-colors">
      {/* Modals */}
      {modal === 'name' && <NameModal user={user} onClose={() => setModal(null)} />}
      {modal === 'band' && <TargetBandModal current={user?.target_band} onClose={() => setModal(null)} />}
      {modal === 'time' && <StudyTimeModal current={user?.daily_study_minutes} onClose={() => setModal(null)} />}
      {modal === 'date' && <ExamDateModal current={user?.exam_date} onClose={() => setModal(null)} />}
      {modal === 'password' && <ChangePasswordModal onClose={() => setModal(null)} />}

      <div className="max-w-4xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-6">
          <p className="text-xs font-bold uppercase tracking-widest text-sky-500 mb-1">Account</p>
          <h1 className="text-3xl font-black text-gray-900 dark:text-white">My profile</h1>
          <p className="text-sm text-gray-400 dark:text-gray-500 mt-1">Manage your profile & account settings</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          {/* Left column */}
          <div className="lg:col-span-2 space-y-5">

            {/* Profile Card */}
            <Card>
              <CardTitle icon={User} title="Profile" />

              {/* Avatar + name strip */}
              <div className="flex items-center gap-4 px-5 py-4 border-b border-gray-50 dark:border-gray-700">
                <div className="w-14 h-14 rounded-full gradient-primary flex items-center justify-center shadow-glow flex-shrink-0 ring-4 ring-sky-100 dark:ring-sky-900/40">
                  <span className="text-white font-black text-xl">{initial}</span>
                </div>
                <div>
                  <p className="font-bold text-gray-900 dark:text-white">{user?.full_name || 'User'}</p>
                  <span className={`text-xs font-bold px-2 py-0.5 rounded-full border ${
                    isCenterStudent
                      ? 'bg-green-50 text-green-700 border-green-200'
                      : user?.is_premium
                        ? 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-900/20 dark:text-amber-400 dark:border-amber-700'
                        : 'bg-sky-50 text-sky-600 border-sky-200 dark:bg-sky-900/20 dark:text-sky-400 dark:border-sky-700'
                  }`}>
                    {isCenterStudent ? 'Center Student' : user?.is_premium ? '⚡ Premium' : 'Free'}
                  </span>
                </div>
              </div>

              <Row label="Name" value={user?.full_name || '—'} onClick={() => setModal('name')} />
              <Row label="Email" value={user?.email || '—'} readOnly />
              <Row label="Target Band" value={user?.target_band || 'Not set'} onClick={() => setModal('band')} />
              <Row label="Daily Study Time" value={user?.daily_study_minutes ? `${user.daily_study_minutes} min` : '30 min'} onClick={() => setModal('time')} />
              <Row label="Exam Date" value={formatDate(user?.exam_date)} onClick={() => setModal('date')} />
              <Row label="Email Newsletter" value="" toggle checked={!!user?.email_newsletter} onToggle={toggleNewsletter} />
            </Card>

            {/* Security */}
            <Card>
              <CardTitle icon={Shield} title="Security" color="text-slate-500" />
              <Row label="Password" value="Change your password" onClick={() => setModal('password')} />
            </Card>

            {/* Support */}
            <Card>
              <CardTitle icon={Headphones} title="Support" color="text-indigo-500" />
              <a href="mailto:support@exambridge.com" className="flex items-center justify-between px-5 py-3.5 border-b border-gray-50 dark:border-gray-700/60 hover:bg-gray-50 dark:hover:bg-gray-700/40 transition cursor-pointer">
                <div>
                  <p className="text-xs text-gray-400 dark:text-gray-500 mb-0.5">Email</p>
                  <p className="text-sm font-semibold text-sky-600 dark:text-sky-400">support@exambridge.com</p>
                </div>
                <ChevronRight size={15} className="text-gray-300 dark:text-gray-600" />
              </a>
              <div className="flex items-center justify-between px-5 py-3.5 border-b border-gray-50 dark:border-gray-700/60 hover:bg-gray-50 dark:hover:bg-gray-700/40 transition cursor-pointer">
                <div>
                  <p className="text-xs text-gray-400 dark:text-gray-500 mb-0.5">Telegram</p>
                  <p className="text-sm font-semibold text-gray-800 dark:text-gray-100">@exambridge_support</p>
                </div>
                <ChevronRight size={15} className="text-gray-300 dark:text-gray-600" />
              </div>
            </Card>

            {/* Legal */}
            <Card>
              <CardTitle icon={FileText} title="Legal" color="text-gray-400" />
              <div className="flex items-center justify-between px-5 py-3.5 border-b border-gray-50 dark:border-gray-700/60 hover:bg-gray-50 dark:hover:bg-gray-700/40 transition cursor-pointer">
                <p className="text-sm font-semibold text-gray-800 dark:text-gray-100">Privacy Policy</p>
                <ChevronRight size={15} className="text-gray-300 dark:text-gray-600" />
              </div>
              <div className="flex items-center justify-between px-5 py-3.5 hover:bg-gray-50 dark:hover:bg-gray-700/40 transition cursor-pointer">
                <p className="text-sm font-semibold text-gray-800 dark:text-gray-100">Terms of Service</p>
                <ChevronRight size={15} className="text-gray-300 dark:text-gray-600" />
              </div>
            </Card>
          </div>

          {/* Right column */}
          <div className="space-y-5">

            {/* Subscription */}
            <Card>
              <CardTitle icon={Crown} title="Subscription" color="text-amber-500" />
              <div className="px-5 py-4 space-y-2.5">
                {isCenterStudent ? (
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-500 dark:text-gray-400">Status</span>
                    <span className="text-sm font-bold text-green-600">Center Student</span>
                  </div>
                ) : (
                  <>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-500 dark:text-gray-400">Status</span>
                      <span className={`text-sm font-bold ${user?.is_premium ? 'text-amber-600 dark:text-amber-400' : 'text-gray-500 dark:text-gray-400'}`}>
                        {user?.is_premium ? 'Premium' : 'No subscription'}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-500 dark:text-gray-400">Plan</span>
                      <span className="text-sm text-gray-400 dark:text-gray-500">{user?.is_premium ? 'Monthly' : '—'}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-500 dark:text-gray-400">Next billing</span>
                      <span className="text-sm text-gray-400 dark:text-gray-500">
                        {user?.premium_until ? formatDate(user.premium_until) : '—'}
                      </span>
                    </div>
                  </>
                )}
              </div>
              {!user?.is_premium && !isCenterStudent && (
                <div className="px-5 pb-4">
                  <button onClick={() => navigate('/app/subscription')}
                    className="w-full py-3 gradient-primary text-white rounded-xl font-bold text-sm shadow-glow hover:opacity-90 transition flex items-center justify-center gap-2">
                    <Crown size={15} /> Get Premium
                  </button>
                </div>
              )}
            </Card>

            {/* Preferences */}
            <Card>
              <CardTitle icon={Monitor} title="Preferences" color="text-violet-500" />
              <ThemePicker />
            </Card>

            {/* Log out */}
            <button onClick={handleLogout}
              className="w-full py-3.5 bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-2xl text-sm font-bold text-gray-600 dark:text-gray-300 hover:bg-red-50 dark:hover:bg-red-900/20 hover:text-red-600 dark:hover:text-red-400 hover:border-red-100 dark:hover:border-red-800 transition shadow-sm flex items-center justify-center gap-2">
              <LogOut size={16} /> Log out
            </button>

            {user?.created_at && (
              <p className="text-center text-xs text-gray-400 dark:text-gray-600">
                Account created {formatCreated(user.created_at)}
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
