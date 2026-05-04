import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Star, BookOpen, Headphones, Brain, Trash2,
  ChevronDown, ChevronUp, Search, Filter, BookMarked
} from 'lucide-react'
import axios from 'axios'

const API = import.meta.env.VITE_API_URL || 'http://localhost:8000'

const SOURCE_META = {
  IELTS_READING:  { label: 'IELTS Reading',   color: 'bg-slate-100 text-slate-700',   icon: BookOpen,   dot: 'bg-slate-400' },
  IELTS_LISTENING:{ label: 'IELTS Listening',  color: 'bg-blue-100 text-blue-700',     icon: Headphones, dot: 'bg-blue-400' },
  CEFR:           { label: 'CEFR',             color: 'bg-red-100 text-red-700',       icon: Brain,      dot: 'bg-red-400' },
}

const QT_COLORS = {
  TFNG:'bg-emerald-100 text-emerald-700', YNNG:'bg-teal-100 text-teal-700',
  MCQ:'bg-blue-100 text-blue-700',        MULTI:'bg-violet-100 text-violet-700',
  GAP:'bg-sky-100 text-sky-700',    MATCH:'bg-pink-100 text-pink-700',
  SHORT:'bg-gray-100 text-gray-700',      SENT:'bg-cyan-100 text-cyan-700',
  TABLE:'bg-indigo-100 text-indigo-700',  MAP:'bg-lime-100 text-lime-700',
  TF:'bg-green-100 text-green-700',       ERROR:'bg-red-100 text-red-700',
  WORD:'bg-purple-100 text-purple-700',   MINFO:'bg-yellow-100 text-yellow-700',
}

function fetchBookmarks() {
  return axios.get(`${API}/api/ielts/bookmarks/`, { withCredentials: true }).then(r => r.data)
}

function BookmarkCard({ bm, onDelete }) {
  const [expanded, setExpanded] = useState(false)
  const q = bm.question
  if (!q) return null

  const meta = SOURCE_META[bm.source_type] || SOURCE_META.CEFR
  const Icon = meta.icon
  const qtColor = QT_COLORS[q.question_type] || 'bg-gray-100 text-gray-600'
  const sourceLabel = q.passage_title || q.section_title || q.source_label || ''

  const answers = q.correct_answer?.includes('|')
    ? q.correct_answer.split('|')
    : [q.correct_answer]

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.97 }}
      className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden"
    >
      {/* Header */}
      <div className="flex items-start gap-3 px-4 pt-4 pb-3">
        <div className={`w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0 ${meta.color}`}>
          <Icon size={15} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap mb-1">
            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${meta.color}`}>
              {meta.label}
            </span>
            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${qtColor}`}>
              {q.question_type_display || q.question_type}
            </span>
            {q.number && (
              <span className="text-[10px] text-gray-400">Q{q.number}</span>
            )}
          </div>
          {sourceLabel && (
            <p className="text-xs text-gray-400 truncate">{sourceLabel}</p>
          )}
          <p className="text-sm font-medium text-gray-800 mt-1 leading-snug line-clamp-2">
            {q.content}
          </p>
        </div>
        <div className="flex items-center gap-1 flex-shrink-0">
          <button
            onClick={() => setExpanded(p => !p)}
            className="w-7 h-7 rounded-lg flex items-center justify-center text-gray-400 hover:bg-gray-100 transition-colors"
          >
            {expanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
          </button>
          <button
            onClick={() => onDelete(bm.id)}
            className="w-7 h-7 rounded-lg flex items-center justify-center text-gray-300 hover:bg-red-50 hover:text-red-500 transition-colors"
          >
            <Trash2 size={13} />
          </button>
        </div>
      </div>

      {/* Expanded detail */}
      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.18 }}
            className="overflow-hidden"
          >
            <div className="px-4 pb-4 space-y-2.5 border-t border-gray-50 pt-3">
              {/* Full content */}
              <p className="text-sm text-gray-700 leading-relaxed">{q.content}</p>

              {/* Choices */}
              {q.choices?.length > 0 && (
                <div className="space-y-1">
                  {q.choices.map(c => {
                    const isCorrect = answers.includes(c.option)
                    return (
                      <div
                        key={c.option}
                        className={`flex items-start gap-2 px-3 py-1.5 rounded-lg text-sm ${
                          isCorrect ? 'bg-emerald-50 text-emerald-800' : 'bg-gray-50 text-gray-600'
                        }`}
                      >
                        <span className={`font-bold text-xs w-4 flex-shrink-0 mt-0.5 ${isCorrect ? 'text-emerald-600' : 'text-gray-400'}`}>
                          {c.option}
                        </span>
                        <span>{c.text}</span>
                        {isCorrect && <span className="ml-auto text-emerald-500 text-xs font-bold">✓</span>}
                      </div>
                    )
                  })}
                </div>
              )}

              {/* Answer (non-choice types) */}
              {q.choices?.length === 0 && q.correct_answer && (
                <div className="flex items-center gap-2">
                  <span className="text-xs text-gray-400">Answer:</span>
                  <span className="text-sm font-semibold text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-lg">
                    {q.correct_answer}
                  </span>
                </div>
              )}

              {/* Explanation */}
              {q.explanation && (
                <div className="bg-slate-50 border border-slate-100 rounded-xl px-3 py-2">
                  <p className="text-xs text-slate-700 leading-relaxed">{q.explanation}</p>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  )
}

export default function BookmarksPage() {
  const [filter, setFilter] = useState('ALL')
  const [search, setSearch] = useState('')
  const queryClient = useQueryClient()

  const { data: bookmarks = [], isLoading } = useQuery({
    queryKey: ['bookmarks'],
    queryFn: fetchBookmarks,
  })

  const deleteMutation = useMutation({
    mutationFn: (id) => axios.delete(`${API}/api/ielts/bookmarks/${id}/`, { withCredentials: true }),
    onSuccess: () => queryClient.invalidateQueries(['bookmarks']),
  })

  const FILTERS = [
    { key: 'ALL', label: 'All' },
    { key: 'IELTS_READING', label: 'IELTS Reading' },
    { key: 'IELTS_LISTENING', label: 'IELTS Listening' },
    { key: 'CEFR', label: 'CEFR' },
  ]

  const visible = bookmarks.filter(bm => {
    if (!bm.question) return false
    if (filter !== 'ALL' && bm.source_type !== filter) return false
    if (search.trim()) {
      const q = search.toLowerCase()
      const text = (bm.question.content || '').toLowerCase()
      const src = (bm.question.passage_title || bm.question.section_title || bm.question.source_label || '').toLowerCase()
      if (!text.includes(q) && !src.includes(q)) return false
    }
    return true
  })

  const counts = { ALL: bookmarks.filter(b => b.question).length }
  for (const k of ['IELTS_READING', 'IELTS_LISTENING', 'CEFR']) {
    counts[k] = bookmarks.filter(b => b.question && b.source_type === k).length
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-12">
      {/* Header */}
      <div className="bg-white border-b border-gray-100 px-4 md:px-8 py-5">
        <div className="max-w-3xl mx-auto">
          <div className="flex items-center gap-3 mb-1">
            <div className="w-9 h-9 rounded-xl bg-slate-100 flex items-center justify-center">
              <Star size={18} className="text-slate-500 fill-slate-400" />
            </div>
            <div>
              <h1 className="text-xl font-black text-gray-900">Bookmarks</h1>
              <p className="text-xs text-gray-400">{counts.ALL} ta saqlangan savol</p>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-4 md:px-8 mt-5 space-y-4">
        {/* Search */}
        <div className="relative">
          <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Savollardan qidirish..."
            className="w-full pl-9 pr-4 py-2.5 bg-white border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-slate-300 focus:ring-2 focus:ring-slate-100"
          />
        </div>

        {/* Filter tabs */}
        <div className="flex gap-2 flex-wrap">
          {FILTERS.map(f => (
            <button
              key={f.key}
              onClick={() => setFilter(f.key)}
              className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all ${
                filter === f.key
                  ? 'bg-slate-500 text-white shadow-sm'
                  : 'bg-white border border-gray-200 text-gray-600 hover:border-slate-300 hover:text-slate-700'
              }`}
            >
              {f.label}
              <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${
                filter === f.key ? 'bg-white/20 text-white' : 'bg-gray-100 text-gray-500'
              }`}>
                {counts[f.key] || 0}
              </span>
            </button>
          ))}
        </div>

        {/* Content */}
        {isLoading ? (
          <div className="space-y-3">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-24 bg-white rounded-2xl border border-gray-100 animate-pulse" />
            ))}
          </div>
        ) : visible.length === 0 ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex flex-col items-center justify-center py-20 text-center"
          >
            <div className="w-16 h-16 bg-slate-50 rounded-2xl flex items-center justify-center mb-4">
              <BookMarked size={28} className="text-slate-300" />
            </div>
            <p className="text-gray-500 font-medium">
              {search ? 'Hech narsa topilmadi' : 'Hali bookmark qilingan savollar yo\'q'}
            </p>
            <p className="text-xs text-gray-400 mt-1">
              {search ? 'Boshqa kalit so\'z bilan qidiring' : 'Savollar yonidagi ⭐ belgisini bosing'}
            </p>
          </motion.div>
        ) : (
          <AnimatePresence mode="popLayout">
            <div className="space-y-3">
              {visible.map(bm => (
                <BookmarkCard
                  key={bm.id}
                  bm={bm}
                  onDelete={id => deleteMutation.mutate(id)}
                />
              ))}
            </div>
          </AnimatePresence>
        )}
      </div>
    </div>
  )
}

