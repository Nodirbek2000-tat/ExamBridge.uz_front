import { motion } from 'framer-motion'
import { Zap, Info, ChevronRight } from 'lucide-react'

const fadeUp = {
  hidden: { opacity: 0, y: 16 },
  visible: (i = 0) => ({ opacity: 1, y: 0, transition: { duration: 0.3, delay: i * 0.08 } }),
}

export default function AdminSATRealMock() {
  return (
    <div className="space-y-6">
      <motion.div variants={fadeUp} initial="hidden" animate="visible" className="flex items-center gap-2.5">
        <div className="w-9 h-9 rounded-xl gradient-primary flex items-center justify-center shadow-glow">
          <Zap size={17} className="text-white" />
        </div>
        <div>
          <h2 className="text-lg font-bold text-gray-900">Real Mock Tests</h2>
          <p className="text-xs text-gray-400">Adaptive full-length SAT simulation with real scoring</p>
        </div>
      </motion.div>

      {/* Info banner */}
      <motion.div custom={1} variants={fadeUp} initial="hidden" animate="visible"
        className="bg-sky-50 border border-sky-200 rounded-2xl p-5 flex items-start gap-3">
        <Info size={18} className="text-sky-500 flex-shrink-0 mt-0.5" />
        <div className="text-sm text-sky-800">
          <p className="font-bold mb-1">Coming Soon — Real Mock System</p>
          <p className="leading-relaxed">
            Real Mock tests work like the actual Digital SAT with <strong>adaptive Module 2</strong>:
          </p>
          <ul className="mt-2 space-y-1 text-sky-700">
            <li className="flex items-center gap-2"><ChevronRight size={13} />English Module 1 (27 questions, 32 min)</li>
            <li className="flex items-center gap-2"><ChevronRight size={13} />Score: &lt;60% → Easy M2 · 60–85% → Medium M2 · &gt;85% → Hard M2</li>
            <li className="flex items-center gap-2"><ChevronRight size={13} />10-minute break (skippable)</li>
            <li className="flex items-center gap-2"><ChevronRight size={13} />Math Module 1 (22 questions, 35 min) → same 3-way adaptive logic</li>
            <li className="flex items-center gap-2"><ChevronRight size={13} />Final score (400–1600) — Math: 800/44 · English: 800/54, rounded to ×10</li>
          </ul>
        </div>
      </motion.div>

      {/* Adaptive scoring explanation */}
      <motion.div custom={2} variants={fadeUp} initial="hidden" animate="visible"
        className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-50">
          <h3 className="font-bold text-sm text-gray-800">Adaptive Routing Logic</h3>
        </div>
        <div className="p-5">
          <div className="grid grid-cols-3 gap-3">
            <div className="bg-slate-50 rounded-xl p-4 border border-slate-100">
              <div className="font-bold text-slate-600 text-sm mb-2">&lt; 60% → Easy M2</div>
              <p className="text-xs text-slate-500 leading-relaxed">
                Easier Module 2. Score range typically 400–600. Helps identify weak areas.
              </p>
            </div>
            <div className="bg-amber-50 rounded-xl p-4 border border-amber-100">
              <div className="font-bold text-amber-700 text-sm mb-2">60–85% → Medium M2</div>
              <p className="text-xs text-amber-600 leading-relaxed">
                Standard Module 2. Score range typically 550–720. Average performer.
              </p>
            </div>
            <div className="bg-green-50 rounded-xl p-4 border border-green-100">
              <div className="font-bold text-green-700 text-sm mb-2">&gt; 85% → Hard M2</div>
              <p className="text-xs text-green-600 leading-relaxed">
                Hard Module 2. Higher chance of 700–800 range. Strong performer.
              </p>
            </div>
          </div>
        </div>
      </motion.div>

      {/* To import real mocks */}
      <motion.div custom={3} variants={fadeUp} initial="hidden" animate="visible"
        className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
        <h3 className="font-bold text-sm text-gray-800 mb-3">How to Add Real Mocks</h3>
        <ol className="space-y-2 text-sm text-gray-600">
          <li className="flex items-start gap-2.5">
            <span className="w-5 h-5 rounded-full bg-sky-100 text-sky-600 flex-shrink-0 flex items-center justify-center text-xs font-black">1</span>
            Go to <strong>Full-Length Tests → Import</strong> tab
          </li>
          <li className="flex items-start gap-2.5">
            <span className="w-5 h-5 rounded-full bg-sky-100 text-sky-600 flex-shrink-0 flex items-center justify-center text-xs font-black">2</span>
            Import JSON with <code className="bg-gray-100 px-1 rounded text-xs">english_m1, english_m2_easy, english_m2_medium, english_m2_hard, math_m1, math_m2_easy, math_m2_medium, math_m2_hard</code>
          </li>
          <li className="flex items-start gap-2.5">
            <span className="w-5 h-5 rounded-full bg-sky-100 text-sky-600 flex-shrink-0 flex items-center justify-center text-xs font-black">3</span>
            The system will automatically route users to Easy or Hard Module 2 based on their Module 1 score
          </li>
          <li className="flex items-start gap-2.5">
            <span className="w-5 h-5 rounded-full bg-sky-100 text-sky-600 flex-shrink-0 flex items-center justify-center text-xs font-black">4</span>
            Users taking the test will see it as a standard test — the adaptive routing is invisible to them
          </li>
        </ol>
      </motion.div>
    </div>
  )
}

