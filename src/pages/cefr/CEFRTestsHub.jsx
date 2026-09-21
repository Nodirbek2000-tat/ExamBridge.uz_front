import { useState } from 'react'
import { useSearchParams, useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { motion, AnimatePresence } from 'framer-motion'
import { BookOpen, Headphones, Mic, PenLine, History } from 'lucide-react'
import api from '../../api/client'
import CEFRReadingList from './CEFRReadingList'
import CEFRListeningList from './CEFRListeningList'
import CEFRSpeakingList from './CEFRSpeakingList'
import CEFRTestList from './CEFRTestList'

const TABS = [
  { key: 'reading', label: 'Reading', icon: BookOpen, color: 'text-sky-500', activeBg: 'bg-sky-500', btn: 'bg-sky-500 hover:bg-sky-600' },
  { key: 'listening', label: 'Listening', icon: Headphones, color: 'text-violet-500', activeBg: 'bg-violet-500', btn: 'bg-violet-500 hover:bg-violet-600' },
  { key: 'speaking', label: 'Speaking', icon: Mic, color: 'text-rose-500', activeBg: 'bg-rose-500', btn: 'bg-rose-500 hover:bg-rose-600' },
  { key: 'writing', label: 'Writing', icon: PenLine, color: 'text-amber-500', activeBg: 'bg-amber-500', btn: 'bg-amber-500 hover:bg-amber-600' },
]

export default function CEFRTestsHub() {
  const [searchParams, setSearchParams] = useSearchParams()
  const navigate = useNavigate()
  const initial = TABS.some((t) => t.key === searchParams.get('tab')) ? searchParams.get('tab') : 'reading'
  const [tab, setTab] = useState(initial)

  const { data: readingData } = useQuery({ queryKey: ['cefr-reading-list'], queryFn: () => api.get('/cefr/reading/').then((r) => r.data) })
  const { data: listeningData } = useQuery({ queryKey: ['cefr-listening-list'], queryFn: () => api.get('/cefr/listening/').then((r) => r.data) })
  const { data: speakingData } = useQuery({ queryKey: ['cefr-speaking-tasks'], queryFn: () => api.get('/ielts/speaking/?source=CEFR').then((r) => r.data) })

  const counts = {
    reading: readingData?.length || 0,
    listening: listeningData?.length || 0,
    speaking: speakingData?.length || 0,
  }

  const pick = (key) => {
    setTab(key)
    setSearchParams({ tab: key }, { replace: true })
  }

  const activeTab = TABS.find((t) => t.key === tab)

  return (
    <div className="min-h-[60vh]">
      {/* White header band — title and tabs sit on white */}
      <div className="-mx-6 -mt-6 px-6 pt-6 pb-0 bg-white border-b border-gray-100">
        <div className="max-w-6xl mx-auto space-y-5">
          <div className="flex items-center justify-between gap-4">
            <div>
              <h1 className="text-2xl sm:text-3xl font-black text-gray-900">CEFR Tests</h1>
              <p className="text-sm text-gray-500 mt-1">Pick a test type &amp; start practicing!</p>
            </div>
            <button
              type="button"
              onClick={() => navigate('/app/cefr/history')}
              className="hidden sm:inline-flex items-center gap-2 px-4 py-2 rounded-xl border border-gray-200 bg-white text-sm font-semibold text-gray-700 hover:bg-gray-50 transition flex-shrink-0"
            >
              <History size={16} /> History
            </button>
          </div>

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
                  {counts[key] != null && (
                    <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${active ? 'bg-white/25 text-white' : 'bg-gray-100 text-gray-500'}`}>
                      {counts[key]}
                    </span>
                  )}
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
            {tab === 'reading' && <CEFRReadingList accentBtn={activeTab?.btn} />}
            {tab === 'listening' && <CEFRListeningList accentBtn={activeTab?.btn} />}
            {tab === 'speaking' && <CEFRSpeakingList embedded accentBtn={activeTab?.btn} />}
            {tab === 'writing' && <CEFRTestList />}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  )
}
