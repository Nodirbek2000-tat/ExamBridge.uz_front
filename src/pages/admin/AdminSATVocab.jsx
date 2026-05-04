import { motion } from 'framer-motion'
import { Library, Info } from 'lucide-react'

const fadeUp = {
  hidden: { opacity: 0, y: 16 },
  visible: (i = 0) => ({ opacity: 1, y: 0, transition: { duration: 0.3, delay: i * 0.08 } }),
}

export default function AdminSATVocab() {
  return (
    <div className="space-y-5">
      <motion.div variants={fadeUp} initial="hidden" animate="visible" className="flex items-center gap-2.5">
        <div className="w-9 h-9 rounded-xl gradient-primary flex items-center justify-center shadow-glow">
          <Library size={17} className="text-white" />
        </div>
        <div>
          <h2 className="text-lg font-bold text-gray-900">Vocabulary Management</h2>
          <p className="text-xs text-gray-400">SAT vocabulary words shown to students</p>
        </div>
      </motion.div>

      <motion.div custom={1} variants={fadeUp} initial="hidden" animate="visible"
        className="bg-sky-50 border border-sky-200 rounded-2xl p-5 flex items-start gap-3">
        <Info size={18} className="text-sky-500 flex-shrink-0 mt-0.5" />
        <div className="text-sm text-sky-800">
          <p className="font-bold mb-1">Vocabulary is currently built into the app</p>
          <p className="leading-relaxed">
            The 30+ SAT vocabulary words are stored in <code className="bg-sky-100 px-1 rounded text-xs">SATVocab.jsx</code>.
            To add more words, edit that file directly or a database-backed vocab system can be added here later.
          </p>
        </div>
      </motion.div>
    </div>
  )
}

