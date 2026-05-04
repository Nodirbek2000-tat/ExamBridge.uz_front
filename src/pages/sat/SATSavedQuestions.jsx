import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { motion, AnimatePresence } from 'framer-motion'
import {
  BookmarkCheck, CheckCircle2, XCircle, Trash2,
  ChevronDown, Search, Bookmark, FileText, MinusCircle,
  Flag, BookOpen,
} from 'lucide-react'
import api from '../../api/client'
import { InlineMath, BlockMath } from 'react-katex'
import { sanitizeHtml } from '../../utils/sanitizeHtml';

// ── LaTeX renderer ────────────────────────────────────────────────────────────
function LatexText({ text }) {
  if (!text) return null
  const parts = []
  const re = /(\\\[[\s\S]*?\\\]|\\\([\s\S]*?\\\)|\$\$[\s\S]*?\$\$|\$[^$\n]*?\$)/g
  let lastIndex = 0, i = 0, match
  while ((match = re.exec(text)) !== null) {
    if (match.index > lastIndex)
      parts.push(<span key={i++} dangerouslySetInnerHTML={{ __html: sanitizeHtml(text.slice(lastIndex, match.index)) }} />)
    const raw = match[0]
    try {
      if (raw.startsWith('\\[') || raw.startsWith('$$')) {
        const inner = raw.startsWith('\\[') ? raw.slice(2, -2) : raw.slice(2, -2)
        parts.push(<BlockMath key={i++} math={inner.trim()} />)
      } else {
        const inner = raw.startsWith('\\(') ? raw.slice(2, -2) : raw.slice(1, -1)
        parts.push(<InlineMath key={i++} math={inner.trim()} />)
      }
    } catch { parts.push(<span key={i++}>{raw}</span>) }
    lastIndex = match.index + raw.length
  }
  if (lastIndex < text.length)
    parts.push(<span key={i++} dangerouslySetInnerHTML={{ __html: sanitizeHtml(text.slice(lastIndex)) }} />)
  return <>{parts}</>
}

function DiffBadge({ d }) {
  const map = {
    easy:   'bg-emerald-50 text-emerald-700 border-emerald-200',
    medium: 'bg-amber-50 text-amber-700 border-amber-200',
    hard:   'bg-rose-50 text-rose-700 border-rose-200',
  }
  const cls = map[d] || map.medium
  return (
    <span className={`inline-flex items-center text-[11px] font-bold px-2 py-0.5 rounded-full border ${cls} capitalize`}>
      {d}
    </span>
  )
}

// ── Practice Question Card ────────────────────────────────────────────────────
function QuestionCard({ item, onRemove }) {
  const [expanded, setExpanded] = useState(false)
  const q = item
  const isCorrect = item.is_correct

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.97 }}
      transition={{ duration: 0.18 }}
      className="group rounded-2xl border border-slate-200 bg-white shadow-sm hover:shadow-md hover:border-slate-300 transition-all overflow-hidden"
    >
      {/* Top color bar */}
      <div className={`h-1 w-full ${isCorrect ? 'bg-emerald-400' : 'bg-rose-400'}`} />

      <div
        className="flex items-start gap-3 p-4 cursor-pointer select-none"
        onClick={() => setExpanded(v => !v)}
      >
        {/* Status icon */}
        <div className={`mt-0.5 flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${
          isCorrect ? 'bg-emerald-50' : 'bg-rose-50'
        }`}>
          {isCorrect
            ? <CheckCircle2 size={16} className="text-emerald-500" />
            : <XCircle size={16} className="text-rose-500" />}
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <p className="text-[13.5px] font-semibold text-slate-800 line-clamp-2 leading-snug mb-2.5">
            <LatexText text={q.content} />
          </p>
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="inline-flex items-center text-[11px] font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 border border-slate-200">
              {q.subject === 'Matematika' ? 'Math' : 'English'}
            </span>
            {q.difficulty && <DiffBadge d={q.difficulty} />}
            <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-200">
              <Bookmark size={9} strokeWidth={2.5} /> Saved
            </span>
            <span className={`inline-flex items-center text-[11px] font-bold px-2 py-0.5 rounded-full border ${
              isCorrect ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-rose-50 text-rose-700 border-rose-200'
            }`}>
              {isCorrect ? 'Correct' : 'Wrong'}
            </span>
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-1 flex-shrink-0 mt-0.5">
          <motion.div animate={{ rotate: expanded ? 180 : 0 }} transition={{ duration: 0.2 }}>
            <ChevronDown size={15} className="text-gray-400" />
          </motion.div>
          <button
            onClick={e => { e.stopPropagation(); onRemove(q.id) }}
            className="p-1.5 rounded-lg text-gray-300 opacity-0 group-hover:opacity-100 hover:text-rose-500 hover:bg-rose-50 transition-all"
            title="Remove"
          >
            <Trash2 size={13} />
          </button>
        </div>
      </div>

      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="px-4 pb-4 space-y-3 border-t border-slate-100 pt-3">
              {q.passage && (
                <div className="text-sm text-gray-700 bg-slate-50 rounded-xl p-3 max-h-44 overflow-y-auto leading-relaxed border border-slate-100">
                  <LatexText text={q.passage} />
                </div>
              )}
              {q.image && (
                <img src={q.image} alt="" className="max-w-sm rounded-xl border border-gray-200 shadow-sm" />
              )}
              <div className="text-sm text-gray-800 leading-relaxed font-medium">
                <LatexText text={q.content} />
              </div>
              {q.question_type === 'MCQ' && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {['A', 'B', 'C', 'D'].map((letter) => {
                    const text = q[`choice_${letter.toLowerCase()}`]
                    if (!text) return null
                    const isC = q.correct_answer === letter
                    const isU = item.user_answer === letter
                    return (
                      <div key={letter} className={`flex items-center gap-2 px-3 py-2 rounded-xl text-sm border transition-colors ${
                        isC ? 'bg-emerald-50 border-emerald-200 text-emerald-800 font-semibold'
                          : isU && !isC ? 'bg-rose-50 border-rose-200 text-rose-700'
                          : 'bg-gray-50 border-gray-100 text-gray-600'
                      }`}>
                        <span className="font-black w-5 flex-shrink-0">{letter}</span>
                        <span className="flex-1 leading-snug"><LatexText text={text} /></span>
                        {isC && <CheckCircle2 size={13} className="text-emerald-600 flex-shrink-0" />}
                        {isU && !isC && <XCircle size={13} className="text-rose-500 flex-shrink-0" />}
                      </div>
                    )
                  })}
                </div>
              )}
              {q.question_type === 'INPUT' && (
                <div className="flex gap-3 text-sm flex-wrap">
                  <div className="flex items-center gap-2 px-3 py-2 bg-gray-50 rounded-xl border border-gray-100">
                    <span className="text-gray-400">Your answer:</span>
                    <span className={`font-bold ${isCorrect ? 'text-emerald-600' : 'text-rose-600'}`}>{item.user_answer || '—'}</span>
                  </div>
                  {!isCorrect && (
                    <div className="flex items-center gap-2 px-3 py-2 bg-emerald-50 rounded-xl border border-emerald-100">
                      <span className="text-gray-400">Correct:</span>
                      <span className="font-bold text-emerald-700">{q.correct_answer}</span>
                    </div>
                  )}
                </div>
              )}
              {q.explanation && (
                <div className="p-3 bg-sky-50 border border-sky-100 rounded-xl text-sm text-slate-700 leading-relaxed">
                  <span className="font-bold text-sky-700">Explanation: </span>
                  <LatexText text={q.explanation} />
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  )
}

// ── Test Bookmark Card ────────────────────────────────────────────────────────
function TestBookmarkCard({ item }) {
  const [expanded, setExpanded] = useState(false)
  const isUnanswered = !item.user_answer
  const isCorrect = item.is_correct

  const statusColor = isUnanswered ? 'bg-gray-400' : isCorrect ? 'bg-emerald-400' : 'bg-rose-400'

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.97 }}
      transition={{ duration: 0.18 }}
      className="rounded-2xl border border-slate-200 bg-white shadow-sm hover:shadow-md hover:border-slate-300 transition-all overflow-hidden"
    >
      {/* Top color bar */}
      <div className={`h-1 w-full ${statusColor}`} />

      <div
        className="flex items-start gap-3 p-4 cursor-pointer select-none"
        onClick={() => setExpanded(v => !v)}
      >
        {/* Status icon */}
        <div className={`mt-0.5 flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${
          isUnanswered ? 'bg-gray-100' : isCorrect ? 'bg-emerald-50' : 'bg-rose-50'
        }`}>
          {isUnanswered
            ? <MinusCircle size={16} className="text-gray-400" />
            : isCorrect
              ? <CheckCircle2 size={16} className="text-emerald-500" />
              : <XCircle size={16} className="text-rose-500" />}
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <p className="text-[13.5px] font-semibold text-slate-800 line-clamp-2 leading-snug mb-2.5">
            <LatexText text={item.content} />
          </p>
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="inline-flex items-center text-[11px] font-bold px-2 py-0.5 rounded-full bg-sky-50 text-sky-700 border border-sky-200">
              {item.section === 'MATH' ? 'Math' : 'English'} · M{item.module}
            </span>
            {item.difficulty && <DiffBadge d={item.difficulty?.toLowerCase()} />}
            <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-full bg-orange-50 text-orange-700 border border-orange-200">
              <Flag size={9} strokeWidth={2.5} /> Bookmarked
            </span>
            {item.test_name && (
              <span className="text-[11px] text-gray-400 truncate max-w-[140px]">{item.test_name}</span>
            )}
            {isUnanswered
              ? <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-gray-100 text-gray-500 border border-gray-200">Blank</span>
              : <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full border ${
                  isCorrect ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-rose-50 text-rose-700 border-rose-200'
                }`}>
                  {isCorrect ? 'Correct' : 'Wrong'}
                </span>}
          </div>
        </div>

        <motion.div animate={{ rotate: expanded ? 180 : 0 }} transition={{ duration: 0.2 }} className="flex-shrink-0 mt-1">
          <ChevronDown size={15} className="text-gray-400" />
        </motion.div>
      </div>

      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="px-4 pb-4 space-y-3 border-t border-slate-100 pt-3">
              {item.passage && (
                <div className="text-sm text-gray-700 bg-slate-50 rounded-xl p-3 max-h-44 overflow-y-auto leading-relaxed border border-slate-100
                  [&_p]:mb-1.5 [&_ul]:ml-4 [&_ul]:list-disc [&_li]:my-0.5 [&_u]:underline [&_b]:font-bold">
                  <LatexText text={item.passage} />
                </div>
              )}
              {item.table_data && Array.isArray(item.table_data) && (
                <div className="overflow-x-auto rounded-xl border border-gray-200 shadow-sm">
                  <table className="w-full text-xs">
                    <tbody>
                      {item.table_data.map((row, ri) => (
                        <tr key={ri} className={ri === 0 ? 'bg-gray-50' : 'bg-white'}>
                          {row.map((cell, ci) => ri === 0
                            ? <th key={ci} className="border border-gray-100 px-3 py-2 font-semibold text-left text-gray-700">{cell}</th>
                            : <td key={ci} className="border border-gray-100 px-3 py-2 text-gray-600">{cell}</td>
                          )}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
              {item.image && (
                <img src={item.image} alt="" className="max-w-sm rounded-xl border border-gray-200 shadow-sm" />
              )}
              <div className="text-sm text-gray-800 leading-relaxed font-medium">
                <LatexText text={item.content} />
              </div>
              {item.question_type === 'MCQ' && item.choices && (
                <div className="space-y-1.5">
                  {item.choices.map((c) => {
                    const isC = item.correct_answer === c.option
                    const isU = item.user_answer === c.option
                    return (
                      <div key={c.option} className={`flex items-start gap-2 px-3 py-2 rounded-xl text-sm border ${
                        isC ? 'bg-emerald-50 border-emerald-200 font-semibold'
                          : isU && !isC ? 'bg-rose-50 border-rose-200'
                          : 'bg-gray-50 border-gray-100'}`}>
                        <span className="font-black w-5 flex-shrink-0">{c.option}</span>
                        <span className="flex-1 min-w-0">
                          {c.image && <img src={c.image} alt={`Choice ${c.option}`} className="max-h-20 object-contain mb-1 rounded block" />}
                          {c.text && <LatexText text={c.text} />}
                        </span>
                        {isC && <CheckCircle2 size={13} className="text-emerald-600 flex-shrink-0 mt-0.5" />}
                        {isU && !isC && <XCircle size={13} className="text-rose-500 flex-shrink-0 mt-0.5" />}
                      </div>
                    )
                  })}
                </div>
              )}
              {item.explanation && (
                <div className="p-3 bg-sky-50 border border-sky-100 rounded-xl text-sm text-slate-700 leading-relaxed">
                  <span className="font-bold text-sky-700">Explanation: </span>
                  <LatexText text={item.explanation} />
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  )
}

// ── Empty State ───────────────────────────────────────────────────────────────
function EmptyState({ icon: Icon, title, desc }) {
  return (
    <div className="flex flex-col items-center justify-center py-20 gap-4 text-gray-400">
      <div className="w-16 h-16 rounded-2xl bg-gray-100 flex items-center justify-center">
        <Icon size={28} strokeWidth={1.5} />
      </div>
      <div className="text-center">
        <p className="font-bold text-gray-500 text-base">{title}</p>
        <p className="text-sm mt-1 max-w-xs text-gray-400">{desc}</p>
      </div>
    </div>
  )
}

// ── Main Page ─────────────────────────────────────────────────────────────────
export default function SATSavedQuestions() {
  const qc = useQueryClient()
  const [tab, setTab] = useState('practice')
  const [filterCorrect, setFilterCorrect] = useState('')
  const [filterSubject, setFilterSubject] = useState('')
  const [search, setSearch] = useState('')

  const { data, isLoading } = useQuery({
    queryKey: ['sat-saved', filterCorrect, filterSubject],
    queryFn: () => api.get('/sat/saved/', { params: { correct: filterCorrect, subject: filterSubject } }).then(r => r.data),
  })

  const { data: bookmarksData, isLoading: bookmarksLoading } = useQuery({
    queryKey: ['sat-test-bookmarks'],
    queryFn: () => api.get('/sat/saved/test-bookmarks/').then(r => r.data),
  })

  const removeMutation = useMutation({
    mutationFn: (qId) => api.post(`/sat/practice/${qId}/save/`, { action: 'unsave' }),
    onSuccess: () => qc.invalidateQueries(['sat-saved']),
  })

  const all = data?.results || []
  const bookmarks = bookmarksData?.results || []

  const filtered = search
    ? all.filter(q => q.content?.toLowerCase().includes(search.toLowerCase()) || q.topic?.toLowerCase().includes(search.toLowerCase()))
    : all

  const filteredBookmarks = search
    ? bookmarks.filter(q => q.content?.toLowerCase().includes(search.toLowerCase()))
    : bookmarks

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-10">

      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="w-11 h-11 rounded-2xl bg-sky-100 flex items-center justify-center shadow-sm">
          <BookmarkCheck size={22} className="text-sky-600" />
        </div>
        <div>
          <h1 className="text-[28px] leading-none font-black text-slate-900">Saved Questions</h1>
          <p className="text-sm text-gray-500 mt-0.5">Practice saves & test bookmarks</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2">
        <button
          onClick={() => setTab('practice')}
          className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold transition-all border ${
            tab === 'practice'
              ? 'bg-sky-500 text-white border-sky-500 shadow-md shadow-sky-200'
              : 'bg-white text-gray-600 border-gray-200 hover:border-sky-300 hover:text-sky-600'
          }`}
        >
          <FileText size={15} />
          Practice Saved
          <span className={`text-[11px] font-black px-1.5 py-0.5 rounded-full ${
            tab === 'practice' ? 'bg-white/20 text-white' : 'bg-gray-100 text-gray-500'
          }`}>{all.length}</span>
        </button>
        <button
          onClick={() => setTab('test')}
          className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold transition-all border ${
            tab === 'test'
              ? 'bg-sky-500 text-white border-sky-500 shadow-md shadow-sky-200'
              : 'bg-white text-gray-600 border-gray-200 hover:border-sky-300 hover:text-sky-600'
          }`}
        >
          <Flag size={15} />
          Test Bookmarks
          <span className={`text-[11px] font-black px-1.5 py-0.5 rounded-full ${
            tab === 'test' ? 'bg-white/20 text-white' : 'bg-gray-100 text-gray-500'
          }`}>{bookmarks.length}</span>
        </button>
      </div>

      {/* Filter Bar */}
      <div className="bg-white rounded-2xl px-4 py-3 border border-slate-200 shadow-sm flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-44">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search questions..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-sky-400 transition bg-gray-50 focus:bg-white"
          />
        </div>

        {tab === 'practice' && (
          <>
            <div className="flex gap-1 bg-gray-100 rounded-xl p-1">
              {[
                { key: '',      label: 'All' },
                { key: 'true',  label: 'Correct' },
                { key: 'false', label: 'Wrong' },
              ].map(f => (
                <button
                  key={f.key}
                  onClick={() => setFilterCorrect(f.key)}
                  className={`px-3.5 py-1.5 text-xs font-bold rounded-lg transition-all ${
                    filterCorrect === f.key
                      ? 'bg-white text-slate-800 shadow-sm'
                      : 'text-gray-500 hover:text-gray-700'
                  }`}
                >
                  {f.label}
                </button>
              ))}
            </div>

            <div className="flex gap-1 bg-gray-100 rounded-xl p-1">
              {[
                { key: '',              label: 'All Subjects' },
                { key: 'Matematika',    label: 'Math' },
                { key: 'Ingliz tili',   label: 'English' },
              ].map(f => (
                <button
                  key={f.key}
                  onClick={() => setFilterSubject(f.key)}
                  className={`px-3.5 py-1.5 text-xs font-bold rounded-lg transition-all ${
                    filterSubject === f.key
                      ? 'bg-white text-slate-800 shadow-sm'
                      : 'text-gray-500 hover:text-gray-700'
                  }`}
                >
                  {f.label}
                </button>
              ))}
            </div>
          </>
        )}
      </div>

      {/* Practice Saved Tab */}
      <AnimatePresence mode="wait">
        {tab === 'practice' && (
          <motion.div key="practice" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            {isLoading ? (
              <div className="flex justify-center py-20">
                <div className="w-8 h-8 border-[3px] border-sky-500 border-t-transparent rounded-full animate-spin" />
              </div>
            ) : filtered.length === 0 ? (
              <EmptyState
                icon={BookOpen}
                title={all.length === 0 ? 'No saved questions yet' : 'No questions match your filters'}
                desc={all.length === 0 ? 'Practice questions and save them to review later' : 'Try adjusting your filters'}
              />
            ) : (
              <div className="space-y-3">
                <p className="text-xs text-gray-400 font-medium px-1">{filtered.length} question{filtered.length !== 1 ? 's' : ''}</p>
                <AnimatePresence>
                  {filtered.map(item => (
                    <QuestionCard
                      key={item.id}
                      item={item}
                      onRemove={qId => removeMutation.mutate(qId)}
                    />
                  ))}
                </AnimatePresence>
              </div>
            )}
          </motion.div>
        )}

        {/* Test Bookmarks Tab */}
        {tab === 'test' && (
          <motion.div key="test" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            {bookmarksLoading ? (
              <div className="flex justify-center py-20">
                <div className="w-8 h-8 border-[3px] border-sky-500 border-t-transparent rounded-full animate-spin" />
              </div>
            ) : filteredBookmarks.length === 0 ? (
              <EmptyState
                icon={Flag}
                title={bookmarks.length === 0 ? 'No test bookmarks yet' : 'No questions match your search'}
                desc={bookmarks.length === 0
                  ? 'During a test, click "Mark for Review" flag to bookmark questions'
                  : 'Try adjusting your search'}
              />
            ) : (
              <div className="space-y-3">
                <p className="text-xs text-gray-400 font-medium px-1">{filteredBookmarks.length} bookmark{filteredBookmarks.length !== 1 ? 's' : ''}</p>
                <AnimatePresence>
                  {filteredBookmarks.map((item, i) => (
                    <TestBookmarkCard key={`${item.attempt_id}-${item.question_id}-${i}`} item={item} />
                  ))}
                </AnimatePresence>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

