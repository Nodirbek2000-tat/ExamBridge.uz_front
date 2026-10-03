/* CEFR multilevel Speaking tests in the CEFR hub. */
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { Clock3, Crown, Layers, Loader2, Mic } from 'lucide-react'
import api from '../../api/client'
import { cefrLevelLabel, cefrTheme } from '../../components/feedback/feedbackUtils'

const PART_LABEL = { '1.1': 'Part 1.1 · about you', '1.2': 'Part 1.2 · two pictures', '2': 'Part 2 · long turn', '3': 'Part 3 · for & against' }

export default function CEFRSpeakingTests({ accentBtn = 'bg-rose-500 hover:bg-rose-600' } = {}) {
  const navigate = useNavigate()
  const [starting, setStarting] = useState(null)
  const [message, setMessage] = useState('')

  const { data = [], isLoading } = useQuery({
    queryKey: ['cefr-speaking-tests'],
    queryFn: () => api.get('/cefr/speaking/').then(r => r.data),
  })
  const tests = [...data].sort((a, b) => b.parts.length - a.parts.length)
  const full = tests.filter(t => t.parts.length === 4).length

  const start = async (test) => {
    setStarting(test.id)
    setMessage('')
    try {
      const r = await api.post(`/cefr/speaking/${test.id}/start/`)
      navigate(`/exam/cefr/speaking/test/${r.data.response_id}`)
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
          <span className="font-semibold text-gray-900">CEFR Speaking</span>
          <span className="ml-2">{isLoading ? '…' : `${full} full test${full === 1 ? '' : 's'}, ${tests.length - full} part${tests.length - full === 1 ? '' : 's'}`}</span>
          <span className="ml-2 text-gray-400">· real exam timing, scored out of 75</span>
        </p>
      </div>
      {message && <p className="mx-4 mt-4 rounded-xl bg-amber-50 px-4 py-3 text-sm font-semibold text-amber-800">{message}</p>}

      <div className="grid grid-cols-1 gap-3 p-4 md:grid-cols-2">
        {isLoading && [...Array(2)].map((_, i) => <div key={i} className="h-28 animate-pulse rounded-xl border border-gray-100 bg-gray-50" />)}
        {!isLoading && tests.map(t => {
          const last = t.last
          const done = last?.status === 'READY'
          const th = done ? cefrTheme(last.level) : null
          return (
            <div key={t.id} className="flex flex-col gap-4 rounded-xl border border-gray-200 px-4 py-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <h4 className="font-bold text-gray-900">{t.title}</h4>
                  {t.parts.length === 4 && <span className="flex items-center gap-1 rounded-full bg-amber-50 px-2 py-0.5 text-xs font-semibold text-amber-700"><Layers size={10} /> Full test</span>}
                  {t.is_premium && <span className="flex items-center gap-1 rounded-full bg-yellow-50 px-2 py-0.5 text-xs font-semibold text-yellow-700"><Crown size={10} /> Premium</span>}
                </div>
                <p className="mt-1.5 text-sm text-gray-500">{t.parts.map(k => PART_LABEL[k]).join(' · ')}</p>
                <div className="mt-2 flex flex-wrap items-center gap-3 text-sm text-gray-500">
                  <span className="inline-flex items-center gap-1"><Clock3 size={14} /> ~{t.minutes} min</span>
                  {done && (
                    <button type="button" onClick={() => navigate(`/exam/cefr/speaking/test/${last.response_id}/result`)}
                      className="rounded-lg px-2 py-0.5 text-sm font-bold hover:underline" style={{ background: th.soft, color: th.hex }}>
                      {cefrLevelLabel(last.level)} · {last.score}/75
                    </button>
                  )}
                  {last?.status === 'SCORING' && (
                    <button type="button" onClick={() => navigate(`/exam/cefr/speaking/test/${last.response_id}/result`)}
                      className="inline-flex items-center gap-1 text-sm font-semibold text-sky-700 hover:underline">
                      <Loader2 size={13} className="animate-spin" /> Being checked
                    </button>
                  )}
                </div>
              </div>
              <button type="button" onClick={() => start(t)} disabled={starting === t.id}
                className={`btn-glass h-10 shrink-0 rounded-lg px-5 text-sm font-bold text-white transition disabled:opacity-60 ${accentBtn}`}>
                {starting === t.id ? <Loader2 size={15} className="mx-auto animate-spin" /> : done ? 'Re-do test' : 'Start test'}
              </button>
            </div>
          )
        })}
        {!isLoading && !tests.length && (
          <div className="py-14 text-center text-gray-400 md:col-span-2">
            <Mic size={34} className="mx-auto mb-2 text-gray-300" />
            No speaking tests yet
          </div>
        )}
      </div>
    </div>
  )
}
