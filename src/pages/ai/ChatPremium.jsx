import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Check, Crown, PlayCircle } from 'lucide-react'

const PERKS = [
  'Unlimited AI Tutor messages, in as many chats as you like',
  'Full, detailed answers, step by step',
  'SAT, IELTS and CEFR help in one place',
]

/** The whole AI Tutor page once a free account has used its messages. */
export function PremiumLock({ limit }) {
  return (
    <div className="flex-1 overflow-y-auto flex items-center justify-center px-4 py-10 bg-white">
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md text-center"
      >
        <div className="mx-auto w-16 h-16 rounded-2xl bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center shadow-lg shadow-amber-200">
          <Crown size={30} className="text-white" />
        </div>
        <h2 className="mt-5 text-2xl font-black text-gray-900">Keep learning with Premium</h2>
        <p className="mt-2 text-[15px] text-gray-500 leading-relaxed">
          You have used your {limit} free AI Tutor messages. Go Premium to keep asking the AI Tutor anything.
        </p>
        <ul className="mt-6 space-y-2.5 text-left rounded-2xl border border-gray-100 bg-gray-50/70 p-5">
          {PERKS.map((perk) => (
            <li key={perk} className="flex gap-2.5 text-[15px] text-gray-700">
              <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-emerald-600">
                <Check size={13} strokeWidth={3} />
              </span>
              {perk}
            </li>
          ))}
        </ul>
        <Link
          to="/app/subscription"
          className="mt-6 flex h-12 items-center justify-center gap-2 rounded-xl bg-gray-900 text-white font-bold hover:bg-gray-800 transition"
        >
          <Crown size={17} className="text-amber-300" />
          Get Premium
        </Link>
        <Link
          to="/app/lessons"
          className="mt-4 inline-flex items-center gap-1.5 text-sm font-semibold text-violet-600 hover:text-violet-700"
        >
          <PlayCircle size={16} />
          AI video lessons stay free. Watch them
        </Link>
      </motion.div>
    </div>
  )
}

/** Above the message box: how many free messages are left. */
export function FreeLeft({ left, limit }) {
  const last = left === 1
  return (
    <div className="mx-auto mb-2 flex max-w-3xl items-center justify-between gap-3 px-1 text-[13px]">
      <span className={`inline-flex items-center gap-2 font-semibold ${last ? 'text-amber-600' : 'text-gray-500'}`}>
        <span className="flex gap-1" aria-hidden="true">
          {Array.from({ length: limit }, (_, i) => (
            <span key={i} className={`h-1.5 w-1.5 rounded-full ${i < left ? (last ? 'bg-amber-500' : 'bg-violet-500') : 'bg-gray-200'}`} />
          ))}
        </span>
        {last ? 'Last free message' : `${left} of ${limit} free messages left`}
      </span>
      <Link to="/app/subscription" className="inline-flex items-center gap-1 font-bold text-violet-600 hover:text-violet-700">
        <Crown size={14} />
        Go unlimited
      </Link>
    </div>
  )
}

/** In place of the message box after the last free answer. */
export function LimitReached({ limit }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="mx-auto max-w-3xl rounded-2xl border border-amber-200 bg-gradient-to-r from-amber-50 to-orange-50 p-4 flex flex-col sm:flex-row sm:items-center gap-3"
    >
      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-amber-400 to-orange-500 text-white">
        <Crown size={20} />
      </span>
      <div className="flex-1 min-w-0">
        <p className="font-bold text-gray-900">You have used all {limit} free messages</p>
        <p className="text-sm text-gray-600">Go Premium for unlimited AI Tutor chats. AI video lessons stay free.</p>
      </div>
      <Link
        to="/app/subscription"
        className="h-10 px-4 shrink-0 rounded-xl bg-gray-900 text-white font-bold text-sm inline-flex items-center justify-center gap-1.5 hover:bg-gray-800 transition"
      >
        <Crown size={15} className="text-amber-300" />
        Get Premium
      </Link>
    </motion.div>
  )
}
