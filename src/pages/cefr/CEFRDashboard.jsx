import { motion } from 'framer-motion'
import { Link } from 'react-router-dom'
import { BookOpen, ArrowRight, Headphones, GraduationCap } from 'lucide-react'

const LEVELS = ['A1', 'A2', 'B1', 'B2', 'C1', 'C2']
const LEVEL_COLORS = {
  A1: 'bg-green-100 text-green-700',
  A2: 'bg-green-100 text-green-700',
  B1: 'bg-blue-100 text-blue-700',
  B2: 'bg-blue-100 text-blue-700',
  C1: 'bg-sky-100 text-sky-700',
  C2: 'bg-red-100 text-red-700',
}

export default function CEFRDashboard() {
  return (
    <div className="space-y-6">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-red-500 to-sky-400 flex items-center justify-center">
            <BookOpen size={20} className="text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-black">CEFR Preparation</h1>
            <p className="text-gray-500 text-sm">A1 → C2 English Proficiency Tests</p>
          </div>
        </div>
      </motion.div>

      {/* Quick access cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {[
          { to: '/app/cefr/tests', icon: GraduationCap, label: 'Grammar & Vocab', desc: 'MCQ, Gap fill, Error correction', color: 'from-sky-400 to-slate-400' },
          { to: '/app/cefr/reading', icon: BookOpen, label: 'Reading', desc: 'Passages with comprehension questions', color: 'from-blue-400 to-indigo-400' },
          { to: '/app/cefr/listening', icon: Headphones, label: 'Listening', desc: 'Audio sections and transcripts', color: 'from-purple-400 to-violet-400' },
        ].map((card, i) => (
          <motion.div key={card.to} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.07 }}>
            <Link to={card.to}
              className="flex items-center gap-3 bg-white rounded-2xl p-4 border border-sky-50 shadow-sm hover:shadow-md transition-all hover:-translate-y-0.5">
              <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${card.color} flex items-center justify-center flex-shrink-0`}>
                <card.icon size={18} className="text-white" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-bold text-gray-800 text-sm">{card.label}</p>
                <p className="text-xs text-gray-400 truncate">{card.desc}</p>
              </div>
              <ArrowRight size={14} className="text-gray-300 flex-shrink-0" />
            </Link>
          </motion.div>
        ))}
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        {LEVELS.map((level, i) => (
          <motion.div
            key={level}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.08 }}
            className="bg-white rounded-2xl p-5 shadow-card border border-sky-50 hover:shadow-glow transition-all hover:-translate-y-0.5"
          >
            <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${LEVEL_COLORS[level]}`}>{level}</span>
            <h3 className="font-black text-xl mt-3 mb-1">Level {level}</h3>
            <p className="text-gray-500 text-xs mb-4">Grammar · Vocabulary · Reading · Writing</p>
            <Link
              to={`/app/cefr/tests?level=${level}`}
              className="text-sky-600 text-sm font-semibold flex items-center gap-1 hover:gap-2 transition-all"
            >
              Take Test <ArrowRight size={14} />
            </Link>
          </motion.div>
        ))}
      </div>
    </div>
  )
}

