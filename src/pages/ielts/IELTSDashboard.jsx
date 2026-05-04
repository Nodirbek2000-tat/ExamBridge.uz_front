import { motion } from 'framer-motion'
import { Link } from 'react-router-dom'
import { Globe, FileText, Headphones, Mic, PenLine, ArrowRight } from 'lucide-react'

const SKILLS = [
  { icon: FileText, label: 'Reading', to: '/app/ielts/reading', desc: 'T/F/NG · MCQ · Gap fill · Matching', color: 'text-sky-500 bg-sky-50' },
  { icon: Headphones, label: 'Listening', to: '/app/ielts/listening', desc: 'Section 1–4 · Real audio', color: 'text-slate-500 bg-slate-50' },
  { icon: Mic, label: 'Speaking', to: '/app/ielts/speaking', desc: 'Part 1·2·3 · AI feedback', color: 'text-red-500 bg-red-50' },
  { icon: PenLine, label: 'Writing', to: '/app/ielts/writing', desc: 'Task 1·2 · AI band score', color: 'text-sky-600 bg-sky-50' },
]

export default function IELTSDashboard() {
  return (
    <div className="space-y-6">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
        <div className="flex items-center gap-3 mb-1">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-slate-500 to-sky-400 flex items-center justify-center">
            <Globe size={20} className="text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-black">IELTS Preparation</h1>
            <p className="text-gray-500 text-sm">Academic & General Training · Band 0–9</p>
          </div>
        </div>
      </motion.div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {SKILLS.map((skill, i) => (
          <motion.div
            key={skill.label}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.1 }}
          >
            <Link
              to={skill.to}
              className="flex items-start gap-4 bg-white rounded-2xl p-5 shadow-card border border-sky-50 hover:shadow-glow transition-all hover:-translate-y-0.5 group block"
            >
              <div className={`w-12 h-12 rounded-xl ${skill.color} flex items-center justify-center flex-shrink-0 group-hover:scale-110 transition-transform`}>
                <skill.icon size={22} className={skill.color.split(' ')[0]} />
              </div>
              <div className="flex-1">
                <h3 className="font-bold text-lg">{skill.label}</h3>
                <p className="text-gray-500 text-xs mt-0.5">{skill.desc}</p>
              </div>
              <ArrowRight size={18} className="text-gray-300 group-hover:text-sky-400 transition-colors mt-1" />
            </Link>
          </motion.div>
        ))}
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
        className="bg-white rounded-2xl p-6 shadow-card border border-sky-50"
      >
        <h3 className="font-black text-lg mb-2">Full Mock Test</h3>
        <p className="text-gray-500 text-sm mb-4">
          Complete IELTS simulation: Reading + Listening + Writing + Speaking
        </p>
        <Link
          to="/app/ielts/tests"
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl gradient-primary text-white font-bold text-sm shadow-glow hover:opacity-90 transition-opacity"
        >
          Start Full Mock <ArrowRight size={16} />
        </Link>
      </motion.div>
    </div>
  )
}

