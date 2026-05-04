import { motion } from 'framer-motion'
import { Link, useNavigate } from 'react-router-dom'
import { useEffect, useMemo, useRef, useState } from 'react'
import {
  ArrowRight,
  BarChart3,
  Bookmark,
  CalendarDays,
  Calculator,
  CheckCircle2,
  Check,
  Clock3,
  Flame,
  Library,
  Plus,
  Star,
  Target,
  Trophy,
  XCircle,
  Zap,
  Crown,
  CalendarPlus,
  X,
  Trash2,
} from 'lucide-react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import api from '../../api/client'

const fadeUp = {
  hidden: { opacity: 0, y: 20 },
  visible: (i = 0) => ({ opacity: 1, y: 0, transition: { delay: i * 0.07 } }),
}

function ProgressBar({
  label,
  value,
  max = 800,
  topRightLabel,
  bottomRightLabel,
  color = 'from-sky-300 to-blue-500',
  markerValue,
}) {
  const pct = max ? Math.min((value / max) * 100, 100) : 0
  const markerPct = max ? Math.min((markerValue ?? value) / max * 100, 100) : 0
  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between text-xs">
        <span className="font-semibold text-slate-600">{label}</span>
        <span className="text-slate-500">{topRightLabel ?? `Max: ${max}`}</span>
      </div>
      <div className="h-4 rounded-full bg-slate-100 overflow-hidden relative">
        <motion.div
          className={`h-full rounded-full bg-gradient-to-r ${color}`}
          initial={{ width: 0 }}
          animate={{ width: `${pct}%` }}
          transition={{ duration: 0.8 }}
        />
        {markerValue && (
          <>
            <div
              className="absolute top-0 bottom-0 w-[2px] bg-white/95 shadow-[0_0_0_1px_rgba(59,130,246,0.15)]"
              style={{ left: `calc(${markerPct}% - 1px)` }}
            />
            <div
              className="absolute top-0 bottom-0 w-[2px] bg-white/85"
              style={{ left: `calc(${markerPct}% + 3px)` }}
            />
          </>
        )}
      </div>
      <div className="text-right text-xs text-slate-500">{bottomRightLabel ?? `Score: ${value}`}</div>
    </div>
  )
}

function RadarChart({ values }) {
  const labelPositions = [
    { className: 'top-0 left-1/2 -translate-x-1/2 -translate-y-1' },
    { className: 'top-[32%] right-0 translate-x-3 -translate-y-1/2 text-left' },
    { className: 'bottom-2 right-4 text-left' },
    { className: 'bottom-2 left-8 text-left' },
    { className: 'top-[32%] left-0 -translate-x-3 -translate-y-1/2 text-right' },
  ]

  const points = useMemo(() => {
    const cx = 120
    const cy = 98
    const radius = 70
    return values.map((v, idx) => {
      const angle = (Math.PI * 2 * idx) / values.length - Math.PI / 2
      const r = radius * Math.max(0, Math.min(v.value, 100)) / 100
      return `${cx + r * Math.cos(angle)},${cy + r * Math.sin(angle)}`
    })
  }, [values])

  const axisPoints = useMemo(() => {
    const cx = 120
    const cy = 98
    const radius = 78
    return values.map((_, idx) => {
      const angle = (Math.PI * 2 * idx) / values.length - Math.PI / 2
      return {
        x: cx + radius * Math.cos(angle),
        y: cy + radius * Math.sin(angle),
      }
    })
  }, [values])

  return (
    <div className="relative h-[250px] rounded-2xl bg-[#f9f9fb] border border-slate-100">
      <svg width="240" height="196" viewBox="0 0 240 196" className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-[43%]">
        <polygon points="120,20 194,72 166,164 74,164 46,72" fill="none" stroke="#e9e1f8" />
        <polygon points="120,34 182,77 158,152 82,152 58,77" fill="none" stroke="#ece6fa" />
        <polygon points="120,48 170,83 151,140 89,140 70,83" fill="none" stroke="#efeafa" />
        <polygon points="120,62 158,89 144,128 96,128 82,89" fill="none" stroke="#f1edfb" />
        <polygon points="120,76 146,95 136,116 104,116 94,95" fill="none" stroke="#f4f1fc" />
        {axisPoints.map((p, idx) => (
          <line key={values[idx].label} x1="120" y1="98" x2={p.x} y2={p.y} stroke="#eee7fa" />
        ))}
        <polygon
          points={points.join(' ')}
          fill="rgba(167, 139, 250, 0.20)"
          stroke="#8b5cf6"
          strokeWidth="2.5"
        />
      </svg>

      {values.map((item, idx) => (
        <div key={item.label} className={`absolute ${labelPositions[idx].className}`}>
          <div className="text-[11px] leading-tight font-semibold text-slate-700">{item.label}</div>
          <div className="text-[18px] leading-none font-black text-slate-700">{item.value}%</div>
        </div>
      ))}
    </div>
  )
}

function RadarPanel({ stats }) {
  const [mode, setMode] = useState('rw')

  // Build values from real stats or use placeholders
  const rwValues = [
    { label: 'Inferences', value: stats?.rw_avg ? Math.round(stats.rw_avg / 8) : 0 },
    { label: 'Student notes', value: stats?.rw_avg ? Math.round(stats.rw_avg / 8.2) : 0 },
    { label: 'Form & sense', value: stats?.rw_avg ? Math.round(stats.rw_avg / 10) : 0 },
    { label: 'Vocab', value: stats?.rw_avg ? Math.round(stats.rw_avg / 12) : 0 },
    { label: 'Boundaries', value: stats?.rw_avg ? Math.round(stats.rw_avg / 9) : 0 },
  ]

  const mathValues = [
    { label: 'Algebra', value: stats?.math_avg ? Math.round(stats.math_avg / 9.3) : 0 },
    { label: 'Adv. math', value: stats?.math_avg ? Math.round(stats.math_avg / 10.5) : 0 },
    { label: 'Problem solving', value: stats?.math_avg ? Math.round(stats.math_avg / 11.3) : 0 },
    { label: 'Geometry', value: stats?.math_avg ? Math.round(stats.math_avg / 12.7) : 0 },
    { label: 'Data analysis', value: stats?.math_avg ? Math.round(stats.math_avg / 11.8) : 0 },
  ]

  const values = mode === 'rw' ? rwValues : mathValues

  return (
    <div className="bg-white rounded-3xl border border-slate-200 p-5 shadow-card">
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-black text-slate-900 text-[28px] leading-none">Progress analysis</h3>
        <div className="rounded-xl bg-slate-100 p-1 flex items-center gap-1">
          <button
            type="button"
            onClick={() => setMode('rw')}
            className={`px-3 py-1 text-xs font-bold rounded-lg transition ${mode === 'rw' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500'}`}
          >
            R&W
          </button>
          <button
            type="button"
            onClick={() => setMode('math')}
            className={`px-3 py-1 text-xs font-bold rounded-lg transition ${mode === 'math' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500'}`}
          >
            Math
          </button>
        </div>
      </div>
      {stats?.tests_taken > 0 ? (
        <RadarChart values={values} />
      ) : (
        <div className="h-[250px] rounded-2xl bg-slate-50 border border-slate-100 flex flex-col items-center justify-center gap-2 text-slate-400">
          <BarChart3 size={32} className="text-slate-300" />
          <p className="text-sm font-semibold">Complete a test to see analysis</p>
        </div>
      )}
    </div>
  )
}

function FlipNumber({ value }) {
  const [currentValue, setCurrentValue] = useState(value)
  const [prevValue, setPrevValue] = useState(value)
  const [isFlipping, setIsFlipping] = useState(false)
  const [flipKey, setFlipKey] = useState(0)

  useEffect(() => {
    if (value === currentValue) return
    setPrevValue(currentValue)
    setCurrentValue(value)
    setFlipKey((k) => k + 1)
    setIsFlipping(true)

    const timer = setTimeout(() => setIsFlipping(false), 620)
    return () => clearTimeout(timer)
  }, [value, currentValue])

  const currentText = String(currentValue).padStart(2, '0')
  const prevText = String(prevValue).padStart(2, '0')

  return (
    <div
      className="relative rounded-2xl border border-slate-200 overflow-hidden bg-gradient-to-b from-slate-100 to-slate-200 shadow-[0_8px_16px_rgba(15,23,42,0.10)] min-w-[84px]"
      style={{ perspective: 1000 }}
    >
      <div className="h-[42px] bg-gradient-to-b from-slate-50 to-slate-200/75" />
      <div className="h-[42px] bg-gradient-to-b from-slate-100 to-slate-200" />

      <div className="absolute inset-x-0 top-0 h-1/2 overflow-hidden z-10">
        <div className="absolute inset-x-0 top-0 h-[84px] flex items-center justify-center text-[48px] leading-none font-black text-slate-900 tracking-tight">
          {currentText}
        </div>
      </div>

      <div className="absolute inset-x-0 bottom-0 h-1/2 overflow-hidden z-10">
        <div className="absolute inset-x-0 -top-[42px] h-[84px] flex items-center justify-center text-[48px] leading-none font-black text-slate-900 tracking-tight">
          {currentText}
        </div>
      </div>

      <div className="absolute left-0 right-0 top-1/2 -translate-y-1/2 h-[2px] bg-white/95 shadow-[0_1px_0_rgba(255,255,255,0.9)] z-30" />

      {isFlipping && (
        <>
          <motion.div
            key={`top-${flipKey}`}
            initial={{ rotateX: 0 }}
            animate={{ rotateX: -90 }}
            transition={{ duration: 0.24, ease: 'easeIn' }}
            style={{ transformOrigin: 'bottom center', backfaceVisibility: 'hidden' }}
            className="absolute inset-x-0 top-0 h-1/2 overflow-hidden bg-gradient-to-b from-slate-50 to-slate-200/85 z-20"
          >
            <div className="absolute inset-x-0 top-0 h-[84px] flex items-center justify-center text-[48px] leading-none font-black text-slate-900 tracking-tight">
              {prevText}
            </div>
          </motion.div>

          <motion.div
            key={`bottom-${flipKey}`}
            initial={{ rotateX: 90 }}
            animate={{ rotateX: 0 }}
            transition={{ duration: 0.26, delay: 0.24, ease: 'easeOut' }}
            style={{ transformOrigin: 'top center', backfaceVisibility: 'hidden' }}
            className="absolute inset-x-0 bottom-0 h-1/2 overflow-hidden bg-gradient-to-b from-slate-100 to-slate-200 z-20"
          >
            <div className="absolute inset-x-0 -top-[42px] h-[84px] flex items-center justify-center text-[48px] leading-none font-black text-slate-900 tracking-tight">
              {currentText}
            </div>
          </motion.div>
        </>
      )}
    </div>
  )
}

function CountdownCard({ examDate, onEdit }) {
  const [now, setNow] = useState(Date.now())

  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(timer)
  }, [])

  if (!examDate) {
    return (
      <div className="bg-white rounded-3xl border border-slate-200 p-5 shadow-card">
        <div className="flex justify-center mb-3">
          <div className="relative">
            <div className="w-11 h-11 rounded-xl bg-blue-50 flex items-center justify-center">
              <CalendarDays size={24} className="text-rose-500" />
            </div>
            <div className="absolute -right-1 -bottom-1 w-5 h-5 rounded-full bg-sky-500 text-white flex items-center justify-center shadow">
              <Clock3 size={11} />
            </div>
          </div>
        </div>
        <h3 className="font-black text-slate-900 text-[28px] leading-none text-center mb-2">Exam countdown</h3>
        <p className="text-sm text-slate-500 text-center mb-4">No exam date set yet.</p>
        <button
          onClick={onEdit}
          className="w-full h-9 rounded-xl border border-sky-200 text-sky-600 text-sm font-bold hover:bg-sky-50 transition flex items-center justify-center gap-1.5"
        >
          <CalendarDays size={14} /> Set exam date
        </button>
      </div>
    )
  }

  const targetDate = new Date(examDate)
  const diffMs = Math.max(targetDate.getTime() - now, 0)
  const days = Math.floor(diffMs / (1000 * 60 * 60 * 24))
  const hours = Math.floor((diffMs / (1000 * 60 * 60)) % 24)
  const minutes = Math.floor((diffMs / (1000 * 60)) % 60)
  const seconds = Math.floor((diffMs / 1000) % 60)

  const blocks = [
    { short: 'DAYS', value: days },
    { short: 'HOURS', value: hours },
    { short: 'MINS', value: minutes },
    { short: 'SECS', value: seconds },
  ]

  const examDay = targetDate.getDate()
  const examMonth = targetDate.toLocaleDateString('en-US', { month: 'long' })
  const examYear = targetDate.getFullYear()

  return (
    <div className="bg-white rounded-3xl border border-slate-200 p-5 shadow-card">
      <div className="flex justify-center mb-3">
        <div className="relative">
          <div className="w-11 h-11 rounded-xl bg-blue-50 flex items-center justify-center">
            <CalendarDays size={24} className="text-rose-500" />
          </div>
          <div className="absolute -right-1 -bottom-1 w-5 h-5 rounded-full bg-sky-500 text-white flex items-center justify-center shadow">
            <Clock3 size={11} />
          </div>
        </div>
      </div>

      <div className="flex items-center justify-between mb-1">
        <h3 className="font-black text-slate-900 text-[28px] leading-none">Exam countdown</h3>
        <button onClick={onEdit} className="p-1.5 rounded-lg text-slate-400 hover:text-sky-600 hover:bg-sky-50 transition" title="Edit exam date">
          <CalendarPlus size={15} />
        </button>
      </div>
      <div className="text-center mb-4">
        <span className="text-2xl font-black text-sky-600">{examDay} {examMonth}</span>
        <span className="ml-2 text-sm font-semibold text-slate-400">{examYear}</span>
      </div>

      <div className="grid grid-cols-4 gap-2 mb-1">
        {blocks.map((b) => (
          <div key={b.short} className="text-center">
            <FlipNumber value={b.value} />
            <div className="text-[10px] mt-2 uppercase font-bold tracking-wide text-slate-500">{b.short}</div>
          </div>
        ))}
      </div>
    </div>
  )
}

const EXAM_MONTHS = [
  { num: '01', name: 'January' }, { num: '02', name: 'February' }, { num: '03', name: 'March' },
  { num: '04', name: 'April' }, { num: '05', name: 'May' }, { num: '06', name: 'June' },
  { num: '07', name: 'July' }, { num: '08', name: 'August' }, { num: '09', name: 'September' },
  { num: '10', name: 'October' }, { num: '11', name: 'November' }, { num: '12', name: 'December' },
]
const EXAM_DAYS = Array.from({ length: 31 }, (_, i) => String(i + 1).padStart(2, '0'))

function ExamDateModal({ current, onClose, onSave }) {
  const today = new Date()
  const parsed = current ? current.split('-') : []
  const [year, setYear] = useState(parsed[0] ? Number(parsed[0]) : today.getFullYear())
  const [month, setMonth] = useState(parsed[1] || '')
  const [day, setDay] = useState(parsed[2] || '')

  const yearOptions = [today.getFullYear(), today.getFullYear() + 1, today.getFullYear() + 2]
  const canSave = month && day

  const handleSave = () => {
    if (!canSave) return
    onSave(`${year}-${month}-${day}`)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm px-4">
      <div className="bg-white rounded-2xl shadow-2xl p-6 max-w-sm w-full">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-black text-gray-900">Set SAT Exam Date</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition">
            <X size={18} />
          </button>
        </div>
        <p className="text-sm text-gray-500 mb-4">When is your SAT exam? We'll count down to that day.</p>

        <div className="flex gap-2 mb-5">
          <div className="flex-none">
            <label className="text-xs font-semibold text-gray-600 mb-1 block">Year</label>
            <select value={year} onChange={(e) => setYear(Number(e.target.value))}
              className="h-10 px-3 rounded-xl border border-gray-200 bg-white text-sm text-gray-700 focus:outline-none focus:border-sky-400">
              {yearOptions.map((y) => <option key={y} value={y}>{y}</option>)}
            </select>
          </div>
          <div className="flex-1">
            <label className="text-xs font-semibold text-gray-600 mb-1 block">Month</label>
            <select value={month} onChange={(e) => setMonth(e.target.value)}
              className="w-full h-10 px-3 rounded-xl border border-gray-200 bg-white text-sm text-gray-700 focus:outline-none focus:border-sky-400">
              <option value="">— Month —</option>
              {EXAM_MONTHS.map((m) => <option key={m.num} value={m.num}>{m.name}</option>)}
            </select>
          </div>
          <div className="w-20">
            <label className="text-xs font-semibold text-gray-600 mb-1 block">Day</label>
            <select value={day} onChange={(e) => setDay(e.target.value)}
              className="w-full h-10 px-3 rounded-xl border border-gray-200 bg-white text-sm text-gray-700 focus:outline-none focus:border-sky-400">
              <option value="">—</option>
              {EXAM_DAYS.map((d) => <option key={d} value={d}>{Number(d)}</option>)}
            </select>
          </div>
        </div>

        {canSave && (
          <p className="text-sm text-sky-700 font-semibold text-center mb-4">
            📅 {Number(day)} {EXAM_MONTHS.find(m => m.num === month)?.name} {year}
          </p>
        )}

        <div className="flex gap-3">
          <button onClick={onClose}
            className="flex-1 h-10 rounded-xl border border-gray-200 text-sm font-semibold text-gray-600 hover:bg-gray-50 transition">
            Cancel
          </button>
          <button onClick={handleSave} disabled={!canSave}
            className="flex-1 h-10 rounded-xl bg-sky-500 text-white text-sm font-bold hover:bg-sky-600 transition disabled:opacity-50">
            Save
          </button>
        </div>
      </div>
    </div>
  )
}

// -- Leaderboard Modal (top 50) -----------------------------------------------
const RANK_STYLES = {
  1: { row: 'bg-amber-50 border border-amber-200', badge: 'text-amber-600', icon: '🥇' },
  2: { row: 'bg-slate-50 border border-slate-200', badge: 'text-slate-500', icon: '🥈' },
  3: { row: 'bg-orange-50 border border-orange-100', badge: 'text-orange-500', icon: '🥉' },
}

function LeaderboardModal({ top50, yourRank, yourXp, onClose }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm px-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm flex flex-col" style={{ maxHeight: '82vh' }}>
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 flex-shrink-0">
          <div className="flex items-center gap-2">
            <Trophy size={18} className="text-amber-500" />
            <h2 className="text-lg font-black text-slate-900">Leaderboard</h2>
            <span className="text-xs bg-slate-100 text-slate-500 px-2 py-0.5 rounded-full font-semibold">Top 50</span>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 transition"><X size={18} /></button>
        </div>
        <div className="overflow-y-auto flex-1 px-4 py-3 space-y-1.5">
          {top50.map((entry) => {
            const style = RANK_STYLES[entry.rank]
            return (
              <div key={entry.rank} className={`flex items-center justify-between px-3 py-2.5 rounded-xl ${
                style ? style.row : entry.is_you ? 'bg-sky-50 border border-sky-200' : 'bg-white border border-slate-100'
              }`}>
                <div className="flex items-center gap-2 min-w-0">
                  <span className={`text-sm font-black w-7 text-center flex-shrink-0 ${style ? style.badge : entry.is_you ? 'text-sky-500' : 'text-slate-400'}`}>
                    {style ? style.icon : `#${entry.rank}`}
                  </span>
                  <div className={`w-7 h-7 rounded-full flex-shrink-0 flex items-center justify-center text-xs font-bold ${
                    entry.is_you ? 'bg-sky-500 text-white' : 'bg-slate-200 text-slate-600'
                  }`}>
                    {entry.initial}
                  </div>
                  <p className={`text-sm font-bold truncate ${entry.is_you ? 'text-sky-700' : 'text-slate-800'}`}>
                    {entry.is_you ? 'You' : entry.name}
                  </p>
                </div>
                <span className={`font-black text-sm flex-shrink-0 ml-2 ${entry.is_you ? 'text-sky-600' : 'text-slate-700'}`}>
                  {entry.xp} XP
                </span>
              </div>
            )
          })}
          {top50.length === 0 && (
            <p className="text-center text-slate-400 text-sm py-8">No data yet</p>
          )}
        </div>
        {yourRank > 50 && (
          <div className="px-4 pb-3 flex-shrink-0 border-t border-slate-100 pt-3">
            <div className="flex items-center justify-between px-3 py-2.5 rounded-xl bg-sky-50 border border-sky-200">
              <div className="flex items-center gap-2">
                <span className="text-sm font-black text-sky-500 w-7 text-center">#{yourRank}</span>
                <div className="w-7 h-7 rounded-full bg-sky-500 flex items-center justify-center text-xs font-bold text-white">Y</div>
                <p className="text-sm font-bold text-sky-700">You</p>
              </div>
              <span className="font-black text-sm text-sky-600">{yourXp} XP</span>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

// -- Schedule Task Add Modal --------------------------------------------------
const TASK_TONES = [
  { label: 'Drill',      tone: 'bg-pink-100 text-pink-700 border-pink-200' },
  { label: 'Vocabulary', tone: 'bg-orange-100 text-orange-700 border-orange-200' },
  { label: 'Quiz',       tone: 'bg-blue-100 text-blue-700 border-blue-200' },
  { label: 'Practice',   tone: 'bg-green-100 text-green-700 border-green-200' },
  { label: 'Review',     tone: 'bg-purple-100 text-purple-700 border-purple-200' },
]

function AddTaskModal({ onClose, onAdd }) {
  const [label, setLabel] = useState(TASK_TONES[0].label)
  const [text, setText] = useState('')

  const handleAdd = () => {
    if (!text.trim()) return
    const toneObj = TASK_TONES.find((t) => t.label === label) || TASK_TONES[0]
    onAdd({ id: Date.now(), label, text: text.trim(), tone: toneObj.tone, done: false })
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm px-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-5">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-black text-slate-900">Add task</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 transition"><X size={18} /></button>
        </div>

        <div className="space-y-3 mb-5">
          <div>
            <label className="text-xs font-semibold text-slate-600 mb-1 block">Type</label>
            <div className="flex flex-wrap gap-2">
              {TASK_TONES.map((t) => (
                <button
                  key={t.label}
                  type="button"
                  onClick={() => setLabel(t.label)}
                  className={`px-3 py-1 rounded-xl text-xs font-bold border transition ${
                    label === t.label ? t.tone : 'bg-slate-50 text-slate-500 border-slate-200'
                  }`}
                >
                  {t.label}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="text-xs font-semibold text-slate-600 mb-1 block">Task description</label>
            <input
              autoFocus
              type="text"
              placeholder="e.g. Makon Level 3 – 20 questions"
              value={text}
              onChange={(e) => setText(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleAdd()}
              className="w-full h-10 px-3 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-sky-100 focus:border-sky-400"
            />
          </div>
        </div>

        <div className="flex gap-3">
          <button onClick={onClose} className="flex-1 h-10 rounded-xl border border-slate-200 text-sm font-semibold text-slate-600 hover:bg-slate-50 transition">
            Cancel
          </button>
          <button onClick={handleAdd} disabled={!text.trim()} className="flex-1 h-10 rounded-xl bg-sky-500 text-white text-sm font-bold hover:bg-sky-600 transition disabled:opacity-50">
            Add task
          </button>
        </div>
      </div>
    </div>
  )
}

export default function SATDashboard() {
  const queryClient = useQueryClient()
  const navigate = useNavigate()
  const [examDateModal, setExamDateModal] = useState(false)
  const [leaderboardOpen, setLeaderboardOpen] = useState(false)
  const [addTaskOpen, setAddTaskOpen] = useState(false)

  // Today's schedule — persisted in localStorage
  const [tasks, setTasks] = useState(() => {
    try { return JSON.parse(localStorage.getItem('sat_schedule_tasks') || '[]') } catch { return [] }
  })
  useEffect(() => {
    localStorage.setItem('sat_schedule_tasks', JSON.stringify(tasks))
  }, [tasks])
  const toggleTask = (id) => setTasks((p) => p.map((t) => t.id === id ? { ...t, done: !t.done } : t))
  const removeTask = (id) => setTasks((p) => p.filter((t) => t.id !== id))
  const addTask = (task) => setTasks((p) => [...p, task])
  const sortedTasks = [...tasks.filter((t) => !t.done), ...tasks.filter((t) => t.done)]
  const visibleTasks = sortedTasks.slice(0, 3)
  const hiddenCount = Math.max(0, sortedTasks.length - 3)

  const { data: stats } = useQuery({
    queryKey: ['sat-stats'],
    queryFn: () => api.get('/sat/stats/').then((r) => r.data),
  })

  const { data: ranking } = useQuery({
    queryKey: ['sat-ranking'],
    queryFn: () => api.get('/sat/ranking/').then((r) => r.data),
  })

  const { data: saved } = useQuery({
    queryKey: ['sat-saved-count'],
    queryFn: () => api.get('/sat/saved/').then((r) => r.data),
  })

  const examDateMutation = useMutation({
    mutationFn: (date) => api.post('/sat/exam-date/', { exam_date: date }).then((r) => r.data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sat-stats'] })
      setExamDateModal(false)
    },
  })

  const bestEnglish = stats?.best_english || null
  const bestMath = stats?.best_math || null
  const bestScore = (bestEnglish && bestMath) ? bestEnglish + bestMath : (stats?.best_score || null)
  const rwAvg = stats?.rw_avg || 0
  const mathAvg = stats?.math_avg || 0
  const savedCount = saved?.total || 0
  const savedCorrect = saved?.results?.filter((q) => q.is_correct).length || 0
  const savedWrong = saved?.results?.filter((q) => !q.is_correct).length || 0
  const streak = stats?.study_streak || 0
  const examDate = stats?.exam_date || null

  const yourXp = ranking?.your_xp ?? ((stats?.tests_taken || 0) * 30 + savedCorrect * 2)
  const yourRank = ranking?.your_rank ?? null
  const top3 = ranking?.top3 || []
  const top50 = ranking?.top50 || []

  const weekDays = ['MO', 'TU', 'WE', 'TH', 'FR', 'SA', 'SU']
  const today = new Date().getDay()
  const mondayBasedToday = today === 0 ? 6 : today - 1

  return (
    <div className="space-y-6">
      {addTaskOpen && (
        <AddTaskModal onClose={() => setAddTaskOpen(false)} onAdd={addTask} />
      )}
      {examDateModal && (
        <ExamDateModal
          current={examDate}
          onClose={() => setExamDateModal(false)}
          onSave={(d) => examDateMutation.mutate(d)}
        />
      )}

      <motion.div initial="hidden" animate="visible" variants={fadeUp} className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-sky-500 flex items-center justify-center shadow-lg shadow-sky-200">
          <Calculator size={20} className="text-white" />
        </div>
        <div>
          <h1 className="text-2xl font-black text-slate-900">SAT Overview</h1>
          <p className="text-gray-500 text-sm">Performance, schedule, and next best actions</p>
        </div>
      </motion.div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-5">
        <motion.div custom={1} initial="hidden" animate="visible" variants={fadeUp} className="xl:col-span-2 space-y-5">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
            {/* Best Score card */}
            <div className="bg-white rounded-3xl border border-slate-200 p-5 shadow-card lg:col-span-6">
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-black text-slate-900">Best score</h3>
                <Target size={16} className="text-slate-500" />
              </div>
              {bestScore ? (
                <>
                  <div className="text-5xl font-black text-blue-500 leading-none mb-2">{bestScore}</div>
                  <p className="text-sm text-slate-500 mb-5">
                    R&W: {bestEnglish ?? '—'}, Math: {bestMath ?? '—'}
                  </p>
                  <div className="space-y-4">
                    <ProgressBar
                      label="R&W"
                      value={rwAvg}
                      max={800}
                      topRightLabel={`Best: ${bestEnglish}`}
                      bottomRightLabel={`Avg: ${rwAvg}`}
                      color="from-sky-200 to-blue-500"
                      markerValue={bestEnglish}
                    />
                    <ProgressBar
                      label="Math"
                      value={mathAvg}
                      max={800}
                      topRightLabel={`Best: ${bestMath}`}
                      bottomRightLabel={`Avg: ${mathAvg}`}
                      color="from-sky-300 to-indigo-500"
                      markerValue={bestMath}
                    />
                  </div>
                </>
              ) : (
                <div className="flex flex-col items-center justify-center py-8 text-slate-400 gap-2">
                  <Target size={32} className="text-slate-200" />
                  <p className="text-sm font-semibold">No tests completed yet</p>
                  <Link to="/app/sat/tests" className="text-xs text-sky-500 font-bold hover:underline mt-1">Take your first test →</Link>
                </div>
              )}
            </div>

            <div className="lg:col-span-6">
              <RadarPanel stats={stats} />
            </div>
          </div>

          <div className="bg-white rounded-3xl border border-slate-200 p-5 shadow-card">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-black text-slate-900">Today's schedule</h3>
              <button
                type="button"
                onClick={() => setAddTaskOpen(true)}
                className="w-7 h-7 rounded-xl bg-sky-50 hover:bg-sky-100 text-sky-600 flex items-center justify-center transition"
                title="Add task"
              >
                <Plus size={15} />
              </button>
            </div>
            {sortedTasks.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-6 text-slate-400 gap-2">
                <Clock3 size={28} className="text-slate-200" />
                <p className="text-sm font-semibold">No tasks yet</p>
                <button onClick={() => setAddTaskOpen(true)} className="text-xs text-sky-500 font-bold hover:underline">+ Add your first task</button>
              </div>
            ) : (
              <>
                <div className="space-y-2.5">
                  {visibleTasks.map((task) => (
                    <div
                      key={task.id}
                      className={`group rounded-2xl border px-4 py-3 flex items-start gap-3 transition ${task.done ? 'opacity-50' : ''} ${task.tone}`}
                    >
                      <button
                        type="button"
                        onClick={() => toggleTask(task.id)}
                        className={`mt-0.5 w-5 h-5 rounded-full border-2 flex-shrink-0 flex items-center justify-center transition ${
                          task.done ? 'bg-current border-current' : 'border-current bg-transparent'
                        }`}
                      >
                        {task.done && <Check size={11} strokeWidth={3} className="text-white" />}
                      </button>
                      <div className="flex-1 min-w-0">
                        <div className="text-[11px] font-semibold opacity-70 uppercase tracking-wide">{task.label}</div>
                        <div className={`font-bold text-sm truncate ${task.done ? 'line-through' : ''}`}>{task.text}</div>
                      </div>
                      <button
                        type="button"
                        onClick={() => removeTask(task.id)}
                        className="opacity-0 group-hover:opacity-60 hover:!opacity-100 transition mt-0.5 flex-shrink-0"
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  ))}
                </div>
                {hiddenCount > 0 && (
                  <p className="text-xs text-slate-400 font-semibold text-center mt-2.5">
                    · · · +{hiddenCount} more task{hiddenCount > 1 ? 's' : ''}
                  </p>
                )}
              </>
            )}
          </div>

          <div className="bg-white rounded-3xl border border-slate-200 p-5 shadow-card">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-black text-slate-900">Next best actions</h3>
              <Zap size={16} className="text-sky-600" />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-sm">
              <Link to="/app/sat/tests" className="rounded-2xl border border-slate-200 p-4 hover:bg-slate-50 transition">
                <div className="font-bold text-slate-900 mb-1">Take full mock</div>
                <p className="text-slate-500 mb-2">Simulate real Digital SAT timing.</p>
                <span className="text-sky-600 font-semibold inline-flex items-center gap-1">Open <ArrowRight size={13} /></span>
              </Link>
              <Link to="/app/sat/practice" className="rounded-2xl border border-slate-200 p-4 hover:bg-slate-50 transition">
                <div className="font-bold text-slate-900 mb-1">Fix weak topics</div>
                <p className="text-slate-500 mb-2">Adaptive drilling by category.</p>
                <span className="text-sky-600 font-semibold inline-flex items-center gap-1">Practice <ArrowRight size={13} /></span>
              </Link>
              <Link to="/app/sat/vocab" className="rounded-2xl border border-slate-200 p-4 hover:bg-slate-50 transition">
                <div className="font-bold text-slate-900 mb-1">Vocab sprint</div>
                <p className="text-slate-500 mb-2">Improve speed on R&W passages.</p>
                <span className="text-sky-600 font-semibold inline-flex items-center gap-1">Start <ArrowRight size={13} /></span>
              </Link>
            </div>
          </div>
        </motion.div>

        <motion.div custom={2} initial="hidden" animate="visible" variants={fadeUp} className="space-y-5">
          {/* Streak */}
          <div className="bg-white rounded-3xl border border-slate-200 p-5 shadow-card">
            <div className="text-center">
              <div className="inline-flex items-center gap-2">
                <Flame size={34} className="text-orange-500 fill-orange-500" />
                <span className="text-5xl font-black text-red-400">{streak}</span>
              </div>
              <h3 className="font-black text-slate-700 mt-1">Day streak</h3>
            </div>

            <div className="grid grid-cols-7 gap-1.5 mt-5">
              {weekDays.map((d, idx) => {
                const isCompleted = idx < mondayBasedToday
                const isToday = idx === mondayBasedToday
                return (
                  <div key={d} className="text-center">
                    <div
                      className={`h-9 rounded-xl flex items-center justify-center ${
                        isToday ? 'bg-slate-100 border border-slate-200' : 'bg-transparent'
                      }`}
                    >
                      <Flame
                        size={20}
                        className={
                          isCompleted
                            ? 'text-orange-500 fill-orange-500'
                            : isToday
                              ? 'text-slate-300 fill-slate-300'
                              : 'text-slate-200 fill-slate-200'
                        }
                      />
                    </div>
                    <p className={`text-[11px] mt-1 font-bold ${isToday ? 'text-slate-500' : 'text-slate-400'}`}>{d}</p>
                  </div>
                )
              })}
            </div>
          </div>

          {/* XP & Ranking */}
          <div className="bg-white rounded-3xl border border-slate-200 p-5 shadow-card">
            <div className="flex items-center gap-2 mb-3">
              <Star size={18} className="text-sky-600" />
              <h3 className="font-black text-slate-900">XP & ranking</h3>
            </div>
            <div className="text-4xl font-black text-blue-500">{yourXp}</div>
            <p className="text-xs text-slate-500 mb-4">XP (Experience Points)</p>

            {/* Top 3 leaderboard */}
            <div className="space-y-2 mb-3">
              {top3.map((entry) => {
                const rankColors = { 1: 'text-amber-500', 2: 'text-slate-400', 3: 'text-orange-400' }
                return (
                  <div
                    key={entry.rank}
                    className={`flex items-center justify-between px-3 py-2 rounded-xl ${
                      entry.is_you ? 'bg-sky-50 border border-sky-200' : 'bg-slate-50'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <span className={`text-xs font-black w-5 text-center ${rankColors[entry.rank] || 'text-slate-400'}`}>
                        #{entry.rank}
                      </span>
                      <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold ${
                        entry.is_you ? 'bg-sky-500 text-white' : 'bg-slate-200 text-slate-700'
                      }`}>
                        {entry.initial}
                      </div>
                      <p className={`text-sm font-bold ${entry.is_you ? 'text-sky-700' : 'text-slate-900'}`}>
                        {entry.is_you ? 'You' : entry.name}
                      </p>
                    </div>
                    <span className={`font-bold text-sm ${entry.is_you ? 'text-sky-600' : 'text-blue-500'}`}>
                      {entry.xp}
                    </span>
                  </div>
                )
              })}
            </div>

            {/* User's rank if not in top 3 */}
            {yourRank && yourRank > 3 && (
              <div className="flex items-center justify-between px-3 py-2 rounded-xl bg-sky-50 border border-sky-200">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-slate-500 w-5">#{yourRank}</span>
                  <div className="w-7 h-7 rounded-full bg-sky-500 flex items-center justify-center text-xs font-bold text-white">
                    YOU
                  </div>
                  <p className="text-sm font-bold text-sky-700">You</p>
                </div>
                <span className="font-bold text-sm text-sky-600">{yourXp}</span>
              </div>
            )}

            {top3.length === 0 && (
              <div className="text-center text-slate-400 text-sm py-2">No ranking data yet</div>
            )}

            <button
              type="button"
              onClick={() => navigate('/app/sat/leaderboard')}
              className="w-full mt-1 h-9 rounded-xl border border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-700 text-sm font-bold transition flex items-center justify-center gap-2"
            >
              <Trophy size={13} className="text-amber-500" />
              See full leaderboard
            </button>
          </div>

          {/* Exam countdown */}
          <CountdownCard examDate={examDate} onEdit={() => setExamDateModal(true)} />

          {/* Saved questions */}
          <div className="bg-white rounded-3xl border border-slate-200 p-5 shadow-card">
            <div className="flex items-center gap-2 mb-3">
              <Bookmark size={16} className="text-sky-600" />
              <h3 className="font-black text-slate-900">Saved questions</h3>
            </div>
            <div className="grid grid-cols-3 gap-2 mb-3">
              <div className="rounded-xl bg-green-50 p-2.5 text-center">
                <div className="font-black text-green-700">{savedCorrect}</div>
                <div className="text-[11px] text-green-600 inline-flex items-center gap-1"><CheckCircle2 size={10} />Correct</div>
              </div>
              <div className="rounded-xl bg-red-50 p-2.5 text-center">
                <div className="font-black text-red-700">{savedWrong}</div>
                <div className="text-[11px] text-red-600 inline-flex items-center gap-1"><XCircle size={10} />Wrong</div>
              </div>
              <div className="rounded-xl bg-sky-50 p-2.5 text-center">
                <div className="font-black text-sky-700">{savedCount}</div>
                <div className="text-[11px] text-sky-600">Total</div>
              </div>
            </div>
            <Link to="/app/sat/saved" className="text-sm text-sky-600 font-bold inline-flex items-center gap-1 hover:underline">
              Review bookmarks <ArrowRight size={13} />
            </Link>
          </div>

          {/* Weekly goals */}
          <div className="bg-white rounded-3xl border border-slate-200 p-5 shadow-card">
            <div className="flex items-center gap-2 mb-3">
              <Trophy size={16} className="text-amber-500" />
              <h3 className="font-black text-slate-900">Weekly goals</h3>
            </div>
            <div className="space-y-3">
              <div>
                <div className="flex justify-between text-xs mb-1 text-slate-600">
                  <span>2 full tests</span>
                  <span>{Math.min(stats?.tests_taken || 0, 2)}/2</span>
                </div>
                <div className="h-2 rounded-full bg-slate-100 overflow-hidden">
                  <div className="h-full rounded-full bg-emerald-500" style={{ width: `${Math.min(((stats?.tests_taken || 0) / 2) * 100, 100)}%` }} />
                </div>
              </div>
              <div>
                <div className="flex justify-between text-xs mb-1 text-slate-600">
                  <span>100 vocab revisions</span>
                  <span>{Math.min(savedCount * 5, 100)}/100</span>
                </div>
                <div className="h-2 rounded-full bg-slate-100 overflow-hidden">
                  <div className="h-full rounded-full bg-blue-500" style={{ width: `${Math.min(savedCount * 5, 100)}%` }} />
                </div>
              </div>
            </div>
            <div className="mt-4 flex gap-2">
              <Link to="/app/sat/tests" className="flex-1 text-center rounded-xl bg-slate-900 text-white py-2 text-sm font-bold hover:bg-slate-700 transition">Start test</Link>
              <Link to="/app/sat/vocab" className="flex-1 text-center rounded-xl bg-slate-100 text-slate-800 py-2 text-sm font-bold hover:bg-slate-200 transition">Study words</Link>
            </div>
          </div>

          {/* Quick tip */}
          <div className="bg-white rounded-3xl border border-slate-200 p-5 shadow-card">
            <div className="flex items-center gap-2 mb-2">
              <Library size={16} className="text-sky-600" />
              <h3 className="font-black text-slate-900">Quick tip</h3>
            </div>
            <p className="text-sm text-slate-600 mb-3">
              Start with medium questions, then return to the hardest items with 8-10 minutes left.
            </p>
            <Link to="/app/sat/practice" className="text-sm text-sky-600 font-bold inline-flex items-center gap-1 hover:underline">
              Open adaptive practice <ArrowRight size={13} />
            </Link>
          </div>
        </motion.div>
      </div>
    </div>
  )
}
