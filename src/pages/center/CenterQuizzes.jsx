/**
 * CenterQuizzes — the center's own A/B/C/D tests (inside the Tests page).
 *
 * A test is a question bank. Questions are added by hand (2–4 options, one
 * right answer) or imported as JSON. Settings: time, how many questions an
 * attempt draws, the same draw for everyone or a different one for each
 * student (the bank is then spread evenly), shuffled options, showing the
 * right answers at the end, and Active — active tests appear in students'
 * Tests section. A test can also be given as homework (Lessons) or run as an
 * olympiad (Olympiads); results show here and in monitoring.
 */
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { AnimatePresence, motion } from 'framer-motion'
import {
  ArrowLeft, Check, CheckCircle2, ClipboardList, Copy, FileJson, Loader2, Pencil, Plus, Shuffle, Trash2, Trophy, Upload, Users, X,
} from 'lucide-react'
import api from '../../api/client'
import { Card, Empty, PrimaryButton } from './ui'

const LETTERS = ['A', 'B', 'C', 'D']
const INPUT = 'w-full border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm text-slate-900 placeholder-slate-400 bg-white focus:outline-none focus:border-slate-400 focus:ring-2 focus:ring-slate-100'
const EXAMPLE = `{
  "questions": [
    {
      "question": "What is the capital of Uzbekistan?",
      "options": ["Samarkand", "Tashkent", "Bukhara", "Khiva"],
      "answer": "B",
      "explanation": "Tashkent has been the capital since 1930."
    },
    {
      "question": "Water boils at 100 °C at sea level.",
      "options": ["True", "False"],
      "answer": "A"
    },
    {
      "question": "12 × 3 = ?",
      "options": ["36", "32", "38"],
      "answer": "A"
    }
  ]
}

// "options": 2, 3 or 4 answers — shown as A, B, C, D
// "answer": the letter of the right option ("A"–"D")
// "explanation": optional, shown after the test if you allow it`

function Switch({ on, onChange, disabled }) {
  return (
    <button type="button" role="switch" aria-checked={on} disabled={disabled} onClick={() => onChange(!on)}
      className={`relative w-11 h-6 rounded-full transition-colors flex-shrink-0 disabled:opacity-50 ${on ? 'bg-emerald-500' : 'bg-slate-300'}`}>
      <span className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform ${on ? 'translate-x-5' : ''}`} />
    </button>
  )
}

/* ── one question: view / edit ─────────────────────────────── */
function QuestionForm({ initial, onSave, onCancel, saving, error }) {
  const [text, setText] = useState(initial?.text || '')
  const [options, setOptions] = useState(initial?.options || ['', '', '', ''])
  const [correct, setCorrect] = useState(initial?.correct ?? 0)
  const [explanation, setExplanation] = useState(initial?.explanation || '')
  const setOpt = (i, v) => setOptions((o) => o.map((x, j) => (j === i ? v : x)))
  const filled = options.map((o) => o.trim())
  const submit = () => {
    // keep the options the user filled in; the right one keeps its letter if blanks are removed
    const kept = filled.map((o, i) => [o, i]).filter(([o]) => o)
    const newCorrect = kept.findIndex(([, i]) => i === correct)
    onSave({ question: text, options: kept.map(([o]) => o), answer: newCorrect < 0 ? -1 : newCorrect, explanation })
  }
  return (
    <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/70 space-y-3">
      <textarea rows={2} value={text} onChange={(e) => setText(e.target.value)} placeholder="Question" autoFocus className={`${INPUT} resize-none`} />
      <div className="grid sm:grid-cols-2 gap-2">
        {options.map((o, i) => (
          <label key={i} className={`flex items-center gap-2 pl-2 pr-3 py-1.5 rounded-xl border bg-white ${correct === i ? 'border-emerald-400 ring-2 ring-emerald-100' : 'border-slate-200'}`}>
            <button type="button" onClick={() => setCorrect(i)} title="Mark as the right answer"
              className={`w-7 h-7 rounded-lg text-xs font-bold flex-shrink-0 ${correct === i ? 'bg-emerald-500 text-white' : 'bg-slate-100 text-slate-500 hover:bg-slate-200'}`}>
              {LETTERS[i]}
            </button>
            <input value={o} onChange={(e) => setOpt(i, e.target.value)} placeholder={i < 2 ? `Option ${LETTERS[i]}` : `Option ${LETTERS[i]} (optional)`}
              className="flex-1 min-w-0 text-sm outline-none bg-transparent" />
          </label>
        ))}
      </div>
      <p className="text-[11px] text-slate-400">Click a letter to mark the right answer. Leave C or D empty for a 2- or 3-option question.</p>
      <input value={explanation} onChange={(e) => setExplanation(e.target.value)} placeholder="Explanation (optional)" className={INPUT} />
      {error && <p className="text-sm text-rose-600">{error}</p>}
      <div className="flex justify-end gap-2">
        <button type="button" onClick={onCancel} className="px-4 py-2 rounded-xl text-sm font-semibold text-slate-500 hover:bg-white">Cancel</button>
        <PrimaryButton icon={saving ? Loader2 : Check} disabled={saving || !text.trim() || filled.filter(Boolean).length < 2 || !filled[correct]} onClick={submit}>
          Save question
        </PrimaryButton>
      </div>
    </div>
  )
}

function ImportPanel({ centerId, quizId, onClose, onDone }) {
  const [json, setJson] = useState('')
  const [replace, setReplace] = useState(false)
  const [msg, setMsg] = useState(null)
  const [busy, setBusy] = useState(false)
  const [copied, setCopied] = useState(false)
  const run = async () => {
    setMsg(null)
    let parsed
    try { parsed = JSON.parse(json.replace(/^\s*\/\/.*$/gm, '')) } catch { return setMsg({ ok: false, text: 'Invalid JSON — check for a missing comma or quote.' }) }
    setBusy(true)
    try {
      const body = Array.isArray(parsed) ? parsed : { ...parsed, replace }
      const { data } = await api.post(`/centers/${centerId}/quizzes/${quizId}/import/`, body)
      setMsg({ ok: true, text: `Added ${data.added} questions — the bank now has ${data.questions}.` })
      setJson('')
      onDone()
    } catch (e) {
      setMsg({ ok: false, text: e.response?.data?.error || 'Import failed' })
    } finally {
      setBusy(false)
    }
  }
  return (
    <>
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-slate-900/30 z-40" onClick={onClose} />
      <motion.aside initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }} transition={{ type: 'spring', damping: 28, stiffness: 260 }}
        className="fixed right-0 top-0 h-full w-full max-w-5xl bg-slate-50 shadow-2xl z-50 flex flex-col">
        <header className="px-6 py-5 bg-white border-b border-slate-200/70 flex items-start justify-between">
          <div>
            <h2 className="text-lg font-bold text-slate-900">Import questions</h2>
            <p className="text-xs text-slate-500 mt-0.5">A simple JSON list. Lines starting with // are ignored.</p>
          </div>
          <button onClick={onClose} className="p-1 text-slate-400 hover:text-slate-700"><X size={20} /></button>
        </header>
        <div className="flex-1 min-h-0 grid lg:grid-cols-2 gap-5 p-6 overflow-y-auto">
          <div className="flex flex-col min-h-0">
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Format</p>
              <button onClick={async () => { try { await navigator.clipboard.writeText(EXAMPLE); setCopied(true); setTimeout(() => setCopied(false), 1500) } catch { /* */ } }}
                className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-slate-900">
                {copied ? <Check size={13} className="text-emerald-600" /> : <Copy size={13} />}{copied ? 'Copied' : 'Copy'}
              </button>
            </div>
            <pre className="flex-1 min-h-[280px] bg-slate-950 rounded-2xl p-4 text-[11px] text-emerald-300 font-mono leading-relaxed overflow-auto whitespace-pre">{EXAMPLE}</pre>
          </div>
          <div className="flex flex-col gap-3 min-h-0">
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Your questions</p>
            <textarea value={json} onChange={(e) => setJson(e.target.value)} spellCheck={false} placeholder='{ "questions": [ … ] }'
              className="flex-1 min-h-[240px] w-full p-3.5 bg-white border border-slate-200 rounded-2xl text-xs font-mono text-slate-800 focus:outline-none focus:border-slate-400 resize-none" />
            <label className="flex items-center justify-center gap-2 px-4 py-2.5 border border-dashed border-slate-300 rounded-xl text-sm text-slate-500 hover:bg-white cursor-pointer">
              <Upload size={15} /> Upload .json file
              <input type="file" accept=".json,application/json" className="hidden"
                onChange={async (e) => { const f = e.target.files[0]; e.target.value = ''; if (f) setJson(await f.text()) }} />
            </label>
            <label className="inline-flex items-center gap-2 text-sm text-slate-600">
              <input type="checkbox" checked={replace} onChange={(e) => setReplace(e.target.checked)} className="rounded" />
              Replace all existing questions
            </label>
            {msg && <p className={`p-3 rounded-xl text-sm ${msg.ok ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-700'}`}>{msg.text}</p>}
            <PrimaryButton className="w-full" icon={busy ? Loader2 : FileJson} disabled={busy || !json.trim()} onClick={run}>Import</PrimaryButton>
          </div>
        </div>
      </motion.aside>
    </>
  )
}

/* ── one test: settings, questions, results ────────────────── */
function QuizEditor({ centerId, quizId, onBack }) {
  const qc = useQueryClient()
  const navigate = useNavigate()
  const [tab, setTab] = useState('questions')
  const [adding, setAdding] = useState(false)
  const [editing, setEditing] = useState(null)
  const [importing, setImporting] = useState(false)
  const [formErr, setFormErr] = useState('')
  const [settings, setSettings] = useState(null)
  const [settingsMsg, setSettingsMsg] = useState(null)

  const key = ['center-quiz', centerId, quizId]
  const { data: quiz } = useQuery({
    queryKey: key,
    queryFn: () => api.get(`/centers/${centerId}/quizzes/${quizId}/`).then((r) => r.data),
  })
  const { data: results } = useQuery({
    queryKey: ['center-quiz-results', centerId, quizId],
    queryFn: () => api.get(`/centers/${centerId}/quizzes/${quizId}/results/`).then((r) => r.data),
    enabled: tab === 'results',
    refetchInterval: tab === 'results' ? 15_000 : false,
  })
  const refresh = () => { qc.invalidateQueries({ queryKey: key }); qc.invalidateQueries({ queryKey: ['center-quizzes', centerId] }) }

  const s = settings || quiz
  const patch = useMutation({
    mutationFn: (body) => api.patch(`/centers/${centerId}/quizzes/${quizId}/`, body).then((r) => r.data),
    onSuccess: (data) => { qc.setQueryData(key, data); setSettings(null); setSettingsMsg({ ok: true, text: 'Saved' }); refresh() },
    onError: (e) => setSettingsMsg({ ok: false, text: e.response?.data?.error || 'Could not save' }),
  })
  const saveQuestion = useMutation({
    mutationFn: (body) => (editing
      ? api.patch(`/centers/${centerId}/quizzes/${quizId}/questions/${editing}/`, body)
      : api.post(`/centers/${centerId}/quizzes/${quizId}/questions/`, body)),
    onSuccess: () => { setAdding(false); setEditing(null); setFormErr(''); refresh() },
    onError: (e) => setFormErr(e.response?.data?.error || 'Could not save the question'),
  })
  const removeQuestion = useMutation({
    mutationFn: (id) => api.delete(`/centers/${centerId}/quizzes/${quizId}/questions/${id}/`),
    onSuccess: refresh,
  })

  if (!quiz) return <div className="py-24 flex justify-center"><Loader2 size={22} className="animate-spin text-slate-300" /></div>
  const set = (k, v) => { setSettingsMsg(null); setSettings({ ...(settings || quiz), [k]: v }) }
  const bankSize = quiz.question_list.length

  return (
    <div className="max-w-5xl mx-auto">
      <button onClick={onBack} className="mb-3 inline-flex items-center gap-1.5 text-sm text-slate-400 hover:text-slate-700"><ArrowLeft size={14} />All A/B/C tests</button>
      <div className="flex flex-wrap items-start justify-between gap-4 mb-5">
        <div className="min-w-0">
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">A/B/C test</p>
          <h1 className="mt-1 text-2xl font-bold text-slate-900 truncate">{quiz.title}</h1>
          <p className="mt-1 text-sm text-slate-500">{bankSize} questions in the bank · {quiz.per_attempt} per attempt · {quiz.time_minutes} min</p>
        </div>
        <div className="flex items-center gap-3 px-4 py-3 rounded-2xl bg-white border border-slate-200/70">
          <div className="text-right">
            <p className="text-sm font-semibold text-slate-900">{quiz.is_active ? 'Active' : 'Not active'}</p>
            <p className="text-[11px] text-slate-400">{quiz.is_active ? "In students' Tests section" : 'Hidden from students'}</p>
          </div>
          <Switch on={quiz.is_active} disabled={patch.isPending} onChange={(v) => patch.mutate({ is_active: v })} />
        </div>
      </div>

      <div className="flex flex-wrap gap-2 mb-5">
        <button onClick={() => navigate(`/center/${centerId}/lessons`)} className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-white border border-slate-200 text-sm font-semibold text-slate-700 hover:border-slate-300">
          <ClipboardList size={15} />Give as homework
        </button>
        <button onClick={() => navigate(`/center/${centerId}/olympiads`)} className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-white border border-slate-200 text-sm font-semibold text-slate-700 hover:border-slate-300">
          <Trophy size={15} />Run as an olympiad
        </button>
        <p className="self-center text-xs text-slate-400">Pick "Our tests → A/B/C tests" there.</p>
      </div>

      <div className="grid lg:grid-cols-[1fr_320px] gap-4 items-start">
        <Card className="overflow-hidden">
          <div className="flex gap-1 px-3 pt-3 border-b border-slate-100">
            {[['questions', `Questions ${bankSize}`], ['results', `Results ${quiz.attempts}`]].map(([k, l]) => (
              <button key={k} onClick={() => setTab(k)}
                className={`relative px-3 pb-2.5 pt-1 text-sm font-semibold ${tab === k ? 'text-slate-900' : 'text-slate-400 hover:text-slate-600'}`}>
                {l}{tab === k && <span className="absolute left-2 right-2 -bottom-px h-0.5 rounded-full bg-slate-900" />}
              </button>
            ))}
          </div>

          {tab === 'questions' && (
            <div className="p-4 space-y-3">
              <div className="flex flex-wrap gap-2">
                <PrimaryButton icon={Plus} onClick={() => { setEditing(null); setAdding(true); setFormErr('') }}>Add question</PrimaryButton>
                <button onClick={() => setImporting(true)} className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl border border-slate-200 bg-white text-sm font-semibold text-slate-700 hover:border-slate-300">
                  <FileJson size={15} />Import JSON
                </button>
              </div>
              {adding && !editing && (
                <QuestionForm onSave={(b) => saveQuestion.mutate(b)} onCancel={() => setAdding(false)} saving={saveQuestion.isPending} error={formErr} />
              )}
              {bankSize === 0 && !adding && <Empty icon={ClipboardList} title="No questions yet" text="Add them one by one or import a JSON list." />}
              <ol className="space-y-2">
                {quiz.question_list.map((q, n) => (
                  <li key={q.id}>
                    {editing === q.id ? (
                      <QuestionForm initial={{ ...q, options: [...q.options, '', '', ''].slice(0, 4) }} onSave={(b) => saveQuestion.mutate(b)}
                        onCancel={() => setEditing(null)} saving={saveQuestion.isPending} error={formErr} />
                    ) : (
                      <div className="group p-4 rounded-2xl border border-slate-200/70 hover:border-slate-300 transition-colors">
                        <div className="flex items-start gap-3">
                          <span className="w-7 text-sm font-semibold text-slate-400 tabular-nums">{n + 1}.</span>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-slate-900 whitespace-pre-line">{q.text}</p>
                            <div className="mt-2 grid sm:grid-cols-2 gap-1.5">
                              {q.options.map((o, i) => (
                                <p key={i} className={`flex items-center gap-2 text-sm px-2.5 py-1.5 rounded-lg ${i === q.correct ? 'bg-emerald-50 text-emerald-800' : 'text-slate-600'}`}>
                                  <span className={`w-5 h-5 rounded-md text-[10px] font-bold flex items-center justify-center ${i === q.correct ? 'bg-emerald-500 text-white' : 'bg-slate-100 text-slate-500'}`}>{LETTERS[i]}</span>
                                  {o}{i === q.correct && <CheckCircle2 size={13} className="ml-auto text-emerald-600" />}
                                </p>
                              ))}
                            </div>
                            {q.explanation && <p className="mt-2 text-xs text-slate-500">💡 {q.explanation}</p>}
                          </div>
                          <div className="flex gap-1 opacity-60 group-hover:opacity-100">
                            <button onClick={() => { setAdding(false); setEditing(q.id); setFormErr('') }} className="p-1.5 rounded-lg text-slate-400 hover:text-slate-800 hover:bg-slate-100"><Pencil size={14} /></button>
                            <button onClick={() => window.confirm('Delete this question?') && removeQuestion.mutate(q.id)} className="p-1.5 rounded-lg text-slate-400 hover:text-rose-500 hover:bg-rose-50"><Trash2 size={14} /></button>
                          </div>
                        </div>
                      </div>
                    )}
                  </li>
                ))}
              </ol>
            </div>
          )}

          {tab === 'results' && (
            !results ? <div className="py-12 flex justify-center"><Loader2 size={18} className="animate-spin text-slate-300" /></div>
              : results.rows.length === 0 ? <Empty icon={Users} title="No attempts yet" text="Results appear here as soon as students finish." />
              : (
                <div className="overflow-x-auto">
                  <p className="px-4 pt-3 text-sm text-slate-500">Average <b className="text-slate-900">{results.average ?? '—'}%</b> · {results.students} students</p>
                  <table className="w-full text-sm mt-2">
                    <thead><tr className="border-b border-slate-100 text-left">
                      {['Student', 'Class', 'Result', 'Time', 'Date'].map((h) => <th key={h} className="px-4 py-2.5 text-[11px] font-semibold uppercase tracking-wider text-slate-400">{h}</th>)}
                    </tr></thead>
                    <tbody className="divide-y divide-slate-100">
                      {results.rows.map((r) => (
                        <tr key={r.id}>
                          <td className="px-4 py-2.5 font-medium text-slate-800 whitespace-nowrap">{r.student}</td>
                          <td className="px-4 py-2.5 text-slate-500">{r.school_class || '—'}</td>
                          <td className="px-4 py-2.5">
                            {r.finished
                              ? <span className={`font-semibold ${r.percent >= 80 ? 'text-emerald-700' : r.percent >= 50 ? 'text-sky-700' : 'text-amber-700'}`}>{r.correct}/{r.total} · {r.percent}%</span>
                              : <span className="text-xs font-semibold text-sky-700 bg-sky-50 px-2 py-0.5 rounded-md">In progress</span>}
                          </td>
                          <td className="px-4 py-2.5 text-slate-500 tabular-nums">{r.seconds != null ? `${Math.floor(r.seconds / 60)}:${String(r.seconds % 60).padStart(2, '0')}` : '—'}</td>
                          <td className="px-4 py-2.5 text-slate-400 whitespace-nowrap">{new Date(r.started_at).toLocaleString('en-GB', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )
          )}
        </Card>

        {/* Settings */}
        <Card className="p-5 space-y-4 lg:sticky lg:top-4">
          <h2 className="text-sm font-semibold text-slate-900">Settings</h2>
          <div>
            <p className="text-xs font-medium text-slate-500 mb-1">Title</p>
            <input value={s.title} onChange={(e) => set('title', e.target.value)} className={INPUT} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <p className="text-xs font-medium text-slate-500 mb-1">Time (min)</p>
              <input type="number" min={1} max={300} value={s.time_minutes} onChange={(e) => set('time_minutes', e.target.value)} className={INPUT} />
            </div>
            <div>
              <p className="text-xs font-medium text-slate-500 mb-1">Questions</p>
              <input type="number" min={1} max={bankSize || undefined} value={s.pick_count ?? ''} placeholder={`All ${bankSize}`}
                onChange={(e) => set('pick_count', e.target.value === '' ? null : Math.min(Number(e.target.value), bankSize || Infinity))} className={INPUT} />
            </div>
          </div>
          <p className="-mt-2 text-[11px] text-slate-400">Each attempt draws this many from the {bankSize} in the bank (never more).</p>
          <div>
            <p className="text-xs font-medium text-slate-500 mb-1.5 inline-flex items-center gap-1"><Shuffle size={12} />Which questions</p>
            <div className="grid grid-cols-2 gap-1 p-1 bg-slate-100 rounded-xl">
              {[[true, 'Same for all'], [false, 'Different each']].map(([v, l]) => (
                <button key={l} type="button" onClick={() => set('same_for_all', v)}
                  className={`py-1.5 rounded-lg text-xs font-semibold ${s.same_for_all === v ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500'}`}>{l}</button>
              ))}
            </div>
            <p className="mt-1.5 text-[11px] text-slate-400">{s.same_for_all
              ? 'Everyone gets the same questions in the same order.'
              : 'Each student gets their own random set — the whole bank is used evenly.'}</p>
          </div>
          {[['shuffle_options', 'Shuffle A/B/C/D for each student'], ['show_answers', 'Show right answers after finishing']].map(([k, l]) => (
            <label key={k} className="flex items-center justify-between gap-3 text-sm text-slate-700">
              {l}<Switch on={!!s[k]} onChange={(v) => set(k, v)} />
            </label>
          ))}
          {settingsMsg && <p className={`text-sm ${settingsMsg.ok ? 'text-emerald-700' : 'text-rose-600'}`}>{settingsMsg.text}</p>}
          <PrimaryButton className="w-full" icon={patch.isPending ? Loader2 : Check} disabled={!settings || patch.isPending}
            onClick={() => patch.mutate({
              title: s.title, time_minutes: Number(s.time_minutes), pick_count: s.pick_count, same_for_all: s.same_for_all,
              shuffle_options: s.shuffle_options, show_answers: s.show_answers,
            })}>Save settings</PrimaryButton>
        </Card>
      </div>

      <AnimatePresence>
        {importing && <ImportPanel centerId={centerId} quizId={quizId} onClose={() => setImporting(false)} onDone={refresh} />}
      </AnimatePresence>
    </div>
  )
}

/* ── list ───────────────────────────────────────────────────── */
export default function CenterQuizzes({ centerId }) {
  const qc = useQueryClient()
  const [openId, setOpenId] = useState(null)
  const [creating, setCreating] = useState(false)
  const [title, setTitle] = useState('')
  const [err, setErr] = useState('')

  const { data: list = [], isLoading } = useQuery({
    queryKey: ['center-quizzes', centerId],
    queryFn: () => api.get(`/centers/${centerId}/quizzes/`).then((r) => r.data),
  })
  const create = useMutation({
    mutationFn: () => api.post(`/centers/${centerId}/quizzes/`, { title, time_minutes: 20 }).then((r) => r.data),
    onSuccess: (q) => { qc.invalidateQueries({ queryKey: ['center-quizzes', centerId] }); setCreating(false); setTitle(''); setOpenId(q.id) },
    onError: (e) => setErr(e.response?.data?.error || 'Could not create'),
  })
  const remove = useMutation({
    mutationFn: (id) => api.delete(`/centers/${centerId}/quizzes/${id}/`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['center-quizzes', centerId] }),
  })

  if (openId) return <QuizEditor centerId={centerId} quizId={openId} onBack={() => setOpenId(null)} />

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
        <p className="text-sm text-slate-500">Simple A/B/C/D tests — any subject, your own questions.</p>
        <PrimaryButton icon={Plus} onClick={() => { setCreating(true); setErr('') }}>New A/B/C test</PrimaryButton>
      </div>
      {creating && (
        <Card className="p-4 mb-4 flex flex-wrap items-center gap-3">
          <input autoFocus value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Test title — e.g. Grammar: Past Simple"
            onKeyDown={(e) => e.key === 'Enter' && title.trim() && create.mutate()} className={`${INPUT} flex-1 min-w-[220px]`} />
          <PrimaryButton icon={create.isPending ? Loader2 : Check} disabled={!title.trim() || create.isPending} onClick={() => create.mutate()}>Create</PrimaryButton>
          <button onClick={() => setCreating(false)} className="p-2 text-slate-400"><X size={18} /></button>
          {err && <p className="w-full text-sm text-rose-600">{err}</p>}
        </Card>
      )}
      {isLoading ? <div className="py-16 flex justify-center"><Loader2 size={20} className="animate-spin text-slate-300" /></div>
        : list.length === 0 ? <Card><Empty icon={ClipboardList} title="No A/B/C tests yet" text="Create one, add questions, switch it on." /></Card>
        : (
          <div className="grid sm:grid-cols-2 gap-3">
            {list.map((q) => (
              <Card key={q.id} className="p-5 hover:border-slate-300 transition-colors">
                <button onClick={() => setOpenId(q.id)} className="w-full text-left">
                  <div className="flex items-start justify-between gap-3">
                    <p className="font-semibold text-slate-900 truncate">{q.title}</p>
                    <span className={`px-2 py-0.5 rounded-md text-[11px] font-bold flex-shrink-0 ${q.is_active ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-500'}`}>
                      {q.is_active ? 'Active' : 'Off'}
                    </span>
                  </div>
                  <p className="mt-1 text-xs text-slate-500">{q.questions} questions · {q.per_attempt} per attempt · {q.time_minutes} min · {q.same_for_all ? 'same for all' : 'random each'}</p>
                  <div className="mt-4 flex items-center gap-4 text-xs text-slate-500">
                    <span className="inline-flex items-center gap-1"><Users size={12} />{q.students} students</span>
                    {q.average != null && <span>avg <b className="text-slate-800">{q.average}%</b></span>}
                    <span className="ml-auto text-slate-400">{q.created_by}</span>
                  </div>
                </button>
                <div className="mt-3 pt-3 border-t border-slate-100 flex justify-end">
                  <button onClick={() => window.confirm(`Delete "${q.title}" with all its questions and results?`) && remove.mutate(q.id)}
                    className="p-1.5 rounded-lg text-slate-300 hover:text-rose-500 hover:bg-rose-50"><Trash2 size={14} /></button>
                </div>
              </Card>
            ))}
          </div>
        )}
    </div>
  )
}
