import { motion } from 'framer-motion'
import { useNavigate } from 'react-router-dom'
import { Sparkles, ArrowLeft } from 'lucide-react'

/**
 * Shared "coming soon" screen for Study Tools sections that are not built yet.
 * Each section passes its own identity so the page still feels designed.
 */
export default function StudyPlaceholder({ title, subtitle, icon: Icon, from, to, points = [] }) {
  const navigate = useNavigate()

  return (
    <div className="mx-auto max-w-2xl">
      <button
        type="button"
        onClick={() => navigate('/study')}
        className="mb-6 inline-flex items-center gap-2 text-sm font-semibold text-slate-500 transition-colors hover:text-slate-900"
      >
        <ArrowLeft size={16} /> Study Tools
      </button>

      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="overflow-hidden rounded-3xl border border-slate-200 bg-white p-8 text-center shadow-sm"
      >
        <div
          className="mx-auto mb-5 flex h-20 w-20 items-center justify-center rounded-3xl shadow-lg"
          style={{ background: `linear-gradient(135deg, ${from}, ${to})` }}
        >
          <Icon size={34} className="text-white" />
        </div>

        <h1 className="text-2xl font-black tracking-tight text-slate-900">{title}</h1>
        <p className="mx-auto mt-2 max-w-md text-sm leading-relaxed text-slate-500">{subtitle}</p>

        {points.length > 0 && (
          <ul className="mx-auto mt-6 max-w-sm space-y-2.5 text-left">
            {points.map((p) => (
              <li key={p} className="flex items-start gap-2.5 rounded-xl bg-slate-50 px-3.5 py-2.5">
                <span
                  className="mt-1.5 h-1.5 w-1.5 flex-shrink-0 rounded-full"
                  style={{ background: from }}
                />
                <span className="text-[13px] font-medium text-slate-600">{p}</span>
              </li>
            ))}
          </ul>
        )}

        <div className="mt-7 inline-flex items-center gap-2 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3">
          <Sparkles size={15} className="text-amber-500" />
          <span className="text-sm font-bold text-amber-700">Ishlab chiqilmoqda — tez orada</span>
        </div>
      </motion.div>
    </div>
  )
}
