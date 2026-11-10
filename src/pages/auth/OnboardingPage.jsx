import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { Calculator, Globe, BookOpen, ArrowRight, Check, X } from 'lucide-react'
import { FaTelegramPlane } from 'react-icons/fa'
import api from '../../api/client'
import Logo from '../../components/Logo.jsx'
import { SOCIALS } from '../home/data.js'

// Where the student lands after onboarding: the mocks of the first exam they picked.
const MOCKS_PATH = {
  SAT: '/app/sat/tests',
  IELTS: '/app/ielts/skills?tab=mock',
  CEFR: '/app/cefr/skills',
}

const CHANNEL_PERKS = ['New mock tests as soon as they are added', 'Exam tips and study plans', 'Updates and announcements']

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
    setStep(3)
  }

  const goToMocks = () => navigate(MOCKS_PATH[selected.exams[0]] ?? MOCKS_PATH.SAT)

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

    // Step 3: Telegram channel, optional
    <motion.div key="step3" initial={{ opacity: 0, x: 40 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -40 }}>
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-sky-500 to-blue-600 px-5 py-6 text-white">
        <div className="pointer-events-none absolute -right-8 -top-10 h-32 w-32 rounded-full bg-white/15 blur-xl" />
        <span className="relative flex h-14 w-14 items-center justify-center rounded-2xl bg-white/20">
          <FaTelegramPlane size={26} />
        </span>
        <h2 className="relative mt-4 text-2xl font-black leading-tight">Join our Telegram channel</h2>
        <p className="relative mt-1 text-sm text-white/85">Optional — you can start your mocks right away.</p>
      </div>

      <ul className="mt-5 space-y-2.5">
        {CHANNEL_PERKS.map((perk) => (
          <li key={perk} className="flex items-center gap-3 text-sm text-gray-700">
            <span className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-sky-50 text-sky-600">
              <Check size={14} />
            </span>
            {perk}
          </li>
        ))}
      </ul>

      <a
        href={SOCIALS.channel}
        target="_blank"
        rel="noopener noreferrer"
        onClick={goToMocks}
        className="w-full mt-6 py-3.5 rounded-xl bg-[#229ED9] hover:bg-[#1C8EC4] text-white font-bold transition-colors flex items-center justify-center gap-2"
      >
        <FaTelegramPlane size={17} /> Join @exambridge_uz
      </a>
      <button
        type="button"
        onClick={goToMocks}
        className="w-full mt-2 py-3 rounded-xl text-sm font-semibold text-gray-500 hover:text-gray-800 hover:bg-gray-50 transition-colors flex items-center justify-center gap-1.5"
      >
        Maybe later, go to mocks <ArrowRight size={16} />
      </button>
    </motion.div>,
  ]

  return (
    // The text colour is set here: the app's dark mode turns inherited text white,
    // and this card stays white, so without it the questions disappeared.
    <div className="min-h-screen bg-white text-gray-900 flex items-center justify-center px-4">
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

        <div className="relative bg-white rounded-3xl p-8 shadow-glow border border-sky-100">
          {step === 3 && (
            <button
              type="button"
              onClick={goToMocks}
              aria-label="Close and go to mocks"
              className="absolute right-4 top-4 flex h-9 w-9 items-center justify-center rounded-full text-gray-400 hover:bg-gray-100 hover:text-gray-700 transition-colors"
            >
              <X size={18} />
            </button>
          )}
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



