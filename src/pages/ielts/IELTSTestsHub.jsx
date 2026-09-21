import { useState } from 'react'
import { useSearchParams, useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { motion, AnimatePresence } from 'framer-motion'
import { BookOpen, Headphones, PenLine, Mic, Layers, History, Play } from 'lucide-react'
import api from '../../api/client'
import IELTSReadingList from './IELTSReadingList'
import IELTSListeningList from './IELTSListeningList'
import IELTSWritingList from './IELTSWritingList'
import IELTSSpeakingList from './IELTSSpeakingList'
import IELTSTestList from './IELTSTestList'

const TABS = [
  { key: 'reading', label: 'Reading', icon: BookOpen, color: 'text-sky-500', activeBg: 'bg-sky-500', btn: 'bg-sky-500 hover:bg-sky-600' },
  { key: 'listening', label: 'Listening', icon: Headphones, color: 'text-violet-500', activeBg: 'bg-violet-500', btn: 'bg-violet-500 hover:bg-violet-600' },
  { key: 'writing', label: 'Writing', icon: PenLine, color: 'text-amber-500', activeBg: 'bg-amber-500', btn: 'bg-amber-500 hover:bg-amber-600' },
  { key: 'speaking', label: 'Speaking', icon: Mic, color: 'text-rose-500', activeBg: 'bg-rose-500', btn: 'bg-rose-500 hover:bg-rose-600' },
]

export default function IELTSTestsHub() {
  const [searchParams, setSearchParams] = useSearchParams()
  const navigate = useNavigate()
  const initial = [...TABS.map((t) => t.key), 'mock'].includes(searchParams.get('tab')) ? searchParams.get('tab') : 'reading'
  const [tab, setTab] = useState(initial)

  // Prefetch each skill's list — shares cache with the embedded list pages
  // (same queryKey), so counts appear instantly AND switching tabs is instant.
  const { data: readingData } = useQuery({ queryKey: ['ielts-reading-list'], queryFn: () => api.get('/ielts/reading/').then((r) => r.data) })
  const { data: listeningData } = useQuery({ queryKey: ['ielts-listening-list'], queryFn: () => api.get('/ielts/listening/').then((r) => r.data) })
  const { data: writingData } = useQuery({ queryKey: ['ielts-writing-tasks'], queryFn: () => api.get('/ielts/writing/').then((r) => r.data) })
  const { data: speakingData } = useQuery({ queryKey: ['speaking-tasks'], queryFn: () => api.get('/ielts/speaking/').then((r) => r.data) })

  const counts = {
    reading: (readingData?.mocks?.length || 0) + (readingData?.practices?.length || 0),
    listening: (listeningData?.mocks?.length || 0) + (listeningData?.practices?.length || 0),
    writing: writingData?.length || 0,
    speaking: speakingData?.length || 0,
  }

  const pick = (key) => {
    setTab(key)
    setSearchParams({ tab: key }, { replace: true })
  }

  const activeTab = TABS.find((t) => t.key === tab)

  return (
    <div className="min-h-[60vh]">
      {/* White header band — title, full-exam CTA and tabs sit on white */}
      <div className="-mx-6 -mt-6 px-6 pt-6 pb-0 bg-white border-b border-gray-100">
        <div className="max-w-6xl mx-auto space-y-5">
          <div className="flex items-center justify-between gap-4">
            <div>
              <h1 className="text-2xl sm:text-3xl font-black text-gray-900">IELTS Mock Tests</h1>
              <p className="text-sm text-gray-500 mt-1">Pick a test type &amp; start practicing!</p>
            </div>
            <button
              type="button"
              onClick={() => navigate('/app/ielts/history')}
              className="hidden sm:inline-flex items-center gap-2 px-4 py-2 rounded-xl border border-gray-200 bg-white text-sm font-semibold text-gray-700 hover:bg-gray-50 transition flex-shrink-0"
            >
              <History size={16} /> History
            </button>
          </div>

          {/* Full exam CTA */}
          <motion.button
            type="button"
            onClick={() => pick('mock')}
            whileHover={{ scale: 1.004 }}
            whileTap={{ scale: 0.996 }}
            className={`w-full flex items-center gap-4 rounded-2xl p-4 sm:p-5 text-left transition-colors ${
              tab === 'mock' ? 'bg-rose-100/70' : 'bg-rose-50/70 hover:bg-rose-100/60'
            }`}
          >
            <div className="w-11 h-11 rounded-xl bg-rose-100 flex items-center justify-center flex-shrink-0">
              <Play size={18} className="text-rose-500 fill-rose-500" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-black text-gray-900">Full Exam — dress rehearsal</p>
              <p className="text-sm text-gray-500 mt-0.5">All four skills, exam-day conditions, one predicted overall band. ~2.5h.</p>
            </div>
            <span className="hidden sm:inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-rose-500 text-white text-sm font-bold flex-shrink-0">
              Start <Layers size={14} />
            </span>
          </motion.button>

          {/* Skill tabs — borderless pills; only the active one is filled */}
          <div className="flex gap-1.5 overflow-x-auto pb-3 -mx-1 px-1">
            {TABS.map(({ key, label, icon: Icon, color, activeBg }) => {
              const active = tab === key
              return (
                <button
                  key={key}
                  type="button"
                  onClick={() => pick(key)}
                  className={`flex items-center gap-2 pl-3.5 pr-2.5 py-2 rounded-full text-sm font-bold whitespace-nowrap transition-all flex-shrink-0 ${
                    active
                      ? `${activeBg} text-white shadow-md`
                      : 'text-gray-600 hover:bg-gray-50'
                  }`}
                >
                  <Icon size={16} className={active ? 'text-white' : color} />
                  {label}
                  <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${active ? 'bg-white/25 text-white' : 'bg-gray-100 text-gray-500'}`}>
                    {counts[key]}
                  </span>
                </button>
              )
            })}
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto pt-6">
        <AnimatePresence mode="wait">
          <motion.div
            key={tab}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.18 }}
          >
            {tab === 'reading' && <IELTSReadingList accentBtn={activeTab?.btn} />}
            {tab === 'listening' && <IELTSListeningList accentBtn={activeTab?.btn} />}
            {tab === 'writing' && <IELTSWritingList embedded accentBtn={activeTab?.btn} />}
            {tab === 'speaking' && <IELTSSpeakingList embedded accentBtn={activeTab?.btn} />}
            {tab === 'mock' && <IELTSTestList />}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  )
}
