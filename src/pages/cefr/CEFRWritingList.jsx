/* CEFR Writing tests in the CEFR hub: full tests first, then Part 1 / Part 2 practice. */
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { Clock3, Crown, Layers, Loader2, PenLine } from 'lucide-react'
import api from '../../api/client'
import { cefrLevelLabel, cefrTheme } from '../../components/feedback/feedbackUtils'

const KIND = {
  FULL: { label: 'Full test', cls: 'bg-amber-50 text-amber-700' },
  PART1: { label: 'Part 1', cls: 'bg-sky-50 text-sky-700' },
  PART2: { label: 'Part 2', cls: 'bg-violet-50 text-violet-700' },
}
const TASK_LABEL = { '1.1': 'Task 1.1 · informal letter', '1.2': 'Task 1.2 · formal letter', '2': 'Part 2 · essay' }
const ORDER = { FULL: 0, PART1: 1, PART2: 2 }

export default function CEFRWritingList({ accentBtn = 'bg-amber-500 hover:bg-amber-600' } = {}) {
  const navigate = useNavigate()
  const [starting, setStarting] = useState(null)
  const [message, setMessage] = useState('')

  const { data = [], isLoading } = useQuery({
    queryKey: ['cefr-writing-list'],
    queryFn: () => api.get('/cefr/writing/').then(r => r.data),
  })
  const tests = [...data].sort((a, b) => ORDER[a.kind] - ORDER[b.kind])
  const full = tests.filter(t => t.kind === 'FULL').length

  const start = async (test) => {
    if (test.last?.status === 'IN_PROGRESS') return navigate(`/exam/cefr/writing/${test.last.response_id}`)
    setStarting(test.id)
    setMessage('')
    try {
      const r = await api.post(`/cefr/writing/${test.id}/start/`)
      navigate(`/exam/cefr/writing/${r.data.response_id}`)
    } catch (e) {
      setMessage(e.response?.status === 403 ? 'This test is for Premium members.' : 'The test could not be started. Try again.')
    } finally {
      setStarting(null)
    }
  }

  return (
    <div className="rounded-2xl border border-gray-200 bg-white">
      <div className="border-b border-gray-100 px-5 py-4">
        <h3 className="text-2xl font-black leading-none text-gray-900">Choose a test</h3>
        <p className="mt-2 text-sm text-gray-500">
          <span className="font-semibold text-gray-900">CEFR Writing</span>
          <span className="ml-2">{isLoading ? '…' : `${full} full test${full === 1 ? '' : 's'}, ${tests.length - full} part${tests.length - full === 1 ? '' : 's'}`}</span>
          <span className="ml-2 text-gray-400">· scored out of 75 by a strict AI examiner</span>
        </p>
      </div>
      {message && <p className="mx-4 mt-4 rounded-xl bg-amber-50 px-4 py-3 text-sm font-semibold text-amber-800">{message}</p>}

      <div className="grid grid-cols-1 gap-3 p-4 md:grid-cols-2">
        {isLoading && [...Array(4)].map((_, i) => <div key={i} className="h-28 animate-pulse rounded-xl border border-gray-100 bg-gray-50" />)}

        {!isLoading && tests.map(t => {
          const last = t.last
          const done = last?.status === 'READY'
          const th = done ? cefrTheme(last.level) : null
          const busy = starting === t.id
          return (
            <div key={t.id} className="relative flex flex-col gap-4 rounded-xl border border-gray-200 px-4 py-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <h4 className="font-bold text-gray-900">{t.title}</h4>
                  <span className={`flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-semibold ${KIND[t.kind]?.cls}`}>
                    {t.kind === 'FULL' && <Layers size={10} />} {KIND[t.kind]?.label}
                  </span>
                  {t.is_premium && <span className="flex items-center gap-1 rounded-full bg-yellow-50 px-2 py-0.5 text-xs font-semibold text-yellow-700"><Crown size={10} /> Premium</span>}
                </div>
                <p className="mt-1.5 text-sm text-gray-500">{t.tasks.map(k => TASK_LABEL[k]).join(' · ')}</p>
                <div className="mt-2 flex flex-wrap items-center gap-3 text-sm text-gray-500">
                  <span className="inline-flex items-center gap-1"><Clock3 size={14} /> {t.time_limit} min</span>
                  {done && (
                    <button type="button" onClick={() => navigate(`/exam/cefr/writing/result/${last.response_id}`)}
                      className="inline-flex items-center gap-1.5 rounded-lg px-2 py-0.5 text-sm font-bold hover:underline"
                      style={{ background: th.soft, color: th.hex }}>
                      {cefrLevelLabel(last.level)} · {last.score}/75
                    </button>
                  )}
                  {last?.status === 'SCORING' && (
                    <button type="button" onClick={() => navigate(`/exam/cefr/writing/result/${last.response_id}`)}
                      className="inline-flex items-center gap-1 text-sm font-semibold text-sky-700 hover:underline">
                      <Loader2 size={13} className="animate-spin" /> Being checked
                    </button>
                  )}
                </div>
              </div>
              <button type="button" onClick={() => start(t)} disabled={busy}
                className={`btn-glass h-10 shrink-0 rounded-lg px-5 text-sm font-bold text-white transition disabled:opacity-60 ${accentBtn}`}>
                {busy ? <Loader2 size={15} className="mx-auto animate-spin" /> : last?.status === 'IN_PROGRESS' ? 'Continue' : last ? 'Re-do test' : 'Start test'}
              </button>
            </div>
          )
        })}

        {!isLoading && !tests.length && (
          <div className="py-16 text-center text-gray-400 md:col-span-2">
            <PenLine size={34} className="mx-auto mb-2 text-gray-300" />
            No writing tests yet
          </div>
        )}
      </div>
    </div>
  )
}
