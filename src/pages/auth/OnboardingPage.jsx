import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { Calculator, Globe, BookOpen, ArrowRight, Check } from 'lucide-react'
import api from '../../api/client'
import Logo from '../../components/Logo.jsx'

const EXAMS = [
  { key: 'SAT', icon: Calculator, label: 'SAT', desc: 'Digital SAT — Math & Reading/Writing', color: 'from-sky-500 to-slate-400' },
  { key: 'IELTS', icon: Globe, label: 'IELTS', desc: 'Academic or General Training', color: 'from-slate-500 to-sky-400' },
  { key: 'CEFR', icon: BookOpen, label: 'CEFR', desc: 'A1 to C2 Proficiency Test', color: 'from-red-500 to-sky-400' },
]

const LEVELS = ['Beginner', 'Elementary', 'Intermediate', 'Upper-Intermediate', 'Advanced']

const GOALS = [
  'Studying abroad', 'University admission', 'Work visa', 'Personal growth', 'Job requirement'
]

export default function OnboardingPage() {
  const [step, setStep] = useState(0)
  const [selected, setSelected] = useState({ exams: [], level: '', goal: '' })
  const navigate = useNavigate()

  const toggleExam = (key) => {
    setSelected((p) => ({
      ...p,
      exams: p.exams.includes(key) ? p.exams.filter((e) => e !== key) : [...p.exams, key],
    }))
  }

  const finish = async () => {
    try {
      await api.patch('/auth/onboard/', selected)
    } catch {}
    navigate('/app/sat')
  }

  const steps = [
    // Step 0: Choose exams
    <motion.div key="step0" initial={{ opacity: 0, x: 40 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -40 }}>
      <h2 className="text-2xl font-black mb-2">Which exams are you preparing for?</h2>
      <p className="text-gray-500 text-sm mb-6">Select all that apply</p>
      <div className="space-y-3">
        {EXAMS.map(({ key, icon: Icon, label, desc, color }) => {
          const active = selected.exams.includes(key)
          return (
            <button
              key={key}
              onClick={() => toggleExam(key)}
              className={`w-full flex items-center gap-4 p-4 rounded-2xl border-2 text-left transition-all
                ${active ? 'border-sky-500 bg-sky-50 shadow-glow' : 'border-gray-100 bg-white hover:border-sky-200'}`}
            >
              <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${color} flex items-center justify-center flex-shrink-0`}>
                <Icon size={22} className="text-white" />
              </div>
              <div className="flex-1">
                <div className="font-bold">{label}</div>
                <div className="text-gray-500 text-xs">{desc}</div>
              </div>
              {active && <Check size={20} className="text-sky-500 flex-shrink-0" />}
            </button>
          )
        })}
      </div>
      <button
        onClick={() => setStep(1)}
        disabled={selected.exams.length === 0}
        className="w-full mt-6 py-3.5 rounded-xl gradient-primary text-white font-bold shadow-glow disabled:opacity-40 flex items-center justify-center gap-2"
      >
        Continue <ArrowRight size={18} />
      </button>
    </motion.div>,

    // Step 1: Current level
    <motion.div key="step1" initial={{ opacity: 0, x: 40 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -40 }}>
      <h2 className="text-2xl font-black mb-2">What's your current level?</h2>
      <p className="text-gray-500 text-sm mb-6">We'll personalize your practice tests</p>
      <div className="space-y-2">
        {LEVELS.map((level) => (
          <button
            key={level}
            onClick={() => setSelected((p) => ({ ...p, level }))}
            className={`w-full flex items-center justify-between px-5 py-3.5 rounded-xl border-2 transition-all
              ${selected.level === level ? 'border-sky-500 bg-sky-50 font-semibold text-sky-700' : 'border-gray-100 bg-white hover:border-sky-200'}`}
          >
            {level}
            {selected.level === level && <Check size={18} className="text-sky-500" />}
          </button>
        ))}
      </div>
      <button
        onClick={() => setStep(2)}
        disabled={!selected.level}
        className="w-full mt-6 py-3.5 rounded-xl gradient-primary text-white font-bold shadow-glow disabled:opacity-40 flex items-center justify-center gap-2"
      >
        Continue <ArrowRight size={18} />
      </button>
    </motion.div>,

    // Step 2: Goal
    <motion.div key="step2" initial={{ opacity: 0, x: 40 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -40 }}>
      <h2 className="text-2xl font-black mb-2">What's your main goal?</h2>
      <p className="text-gray-500 text-sm mb-6">This helps us recommend the right tests</p>
      <div className="space-y-2">
        {GOALS.map((goal) => (
          <button
            key={goal}
            onClick={() => setSelected((p) => ({ ...p, goal }))}
            className={`w-full flex items-center justify-between px-5 py-3.5 rounded-xl border-2 transition-all
              ${selected.goal === goal ? 'border-sky-500 bg-sky-50 font-semibold text-sky-700' : 'border-gray-100 bg-white hover:border-sky-200'}`}
          >
            {goal}
            {selected.goal === goal && <Check size={18} className="text-sky-500" />}
          </button>
        ))}
      </div>
      <button
        onClick={finish}
        disabled={!selected.goal}
        className="w-full mt-6 py-3.5 rounded-xl gradient-primary text-white font-bold shadow-glow disabled:opacity-40 flex items-center justify-center gap-2"
      >
        Start Preparing <ArrowRight size={18} />
      </button>
    </motion.div>,
  ]

  return (
    <div className="min-h-screen bg-white flex items-center justify-center px-4">
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-96 h-96 bg-sky-200 rounded-full blur-[120px] opacity-25" />
      </div>

      <div className="relative w-full max-w-md">
        {/* Progress */}
        <div className="flex items-center gap-2 mb-8">
          {[0, 1, 2].map((i) => (
            <div
              key={i}
              className={`h-1.5 flex-1 rounded-full transition-all duration-300 ${i <= step ? 'gradient-primary' : 'bg-gray-200'}`}
            />
          ))}
        </div>

        <div className="bg-white rounded-3xl p-8 shadow-glow border border-sky-100">
          {/* Logo */}
          <div className="flex items-center mb-8">
            <Logo className="h-10 w-auto" />
          </div>

          <AnimatePresence mode="wait">
            {steps[step]}
          </AnimatePresence>
        </div>
      </div>
    </div>
  )
}



