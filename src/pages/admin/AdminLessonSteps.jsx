import { useState } from 'react'
import { useMutation } from '@tanstack/react-query'
import { AnimatePresence, motion as Motion } from 'framer-motion'
import { Mic, Pencil, X } from 'lucide-react'
import api from '../../api/client'

const inputCls = 'w-full px-3 py-2 text-sm text-gray-800 placeholder:text-gray-400 rounded-lg border border-gray-200 focus:outline-none focus:border-sky-400'
const errorOf = (e) => e?.response?.data?.error || e?.response?.data?.detail || e.message

function StepModal({ step, onClose, onSaved }) {
  const [say, setSay] = useState(step.say)
  const [board, setBoard] = useState(() => JSON.stringify(step.board, null, 2))
  const [jsonError, setJsonError] = useState('')

  const save = useMutation({
    mutationFn: (parsed) => api.put(`/admin/ai-lessons/steps/${step.id}/`, { say, board: parsed }),
    onSuccess: onSaved,
  })

  const submit = () => {
    let parsed
    try {
      parsed = JSON.parse(board)
    } catch {
      setJsonError('The board is not valid JSON.')
      return
    }
    setJsonError('')
    save.mutate(parsed)
  }

  const dropsVoice = step.voiced && say.trim() !== step.say

  return (
    <Motion.div
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4"
      onMouseDown={onClose}
    >
      <Motion.div
        initial={{ scale: 0.96, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.96, opacity: 0 }}
        transition={{ duration: 0.15 }}
        role="dialog"
        aria-label={`Edit step ${step.order + 1}`}
        className="bg-white rounded-2xl shadow-xl w-full max-w-2xl max-h-[90vh] flex flex-col"
        onMouseDown={(e) => e.stopPropagation()}
      >
        <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
          <h3 className="font-bold text-gray-900">Step {step.order + 1}</h3>
          <button type="button" onClick={onClose} aria-label="Close" className="text-gray-400 hover:text-gray-700"><X size={18} /></button>
        </div>
        <div className="p-5 space-y-4 overflow-y-auto">
          <div>
            <p className="text-xs font-semibold text-gray-500 mb-1">What the teacher says</p>
            <textarea value={say} onChange={(e) => setSay(e.target.value)} maxLength={4000} rows={6} className={inputCls} />
            {dropsVoice && <p className="text-[11px] text-amber-700 mt-1">Changing the words removes this step's recording. Record it again afterwards.</p>}
          </div>
          <div>
            <p className="text-xs font-semibold text-gray-500 mb-1">Board (JSON)</p>
            <textarea value={board} onChange={(e) => setBoard(e.target.value)} rows={10} spellCheck={false} className={`${inputCls} font-mono text-xs`} />
          </div>
        </div>
        <div className="px-5 py-4 border-t border-gray-100 flex items-center justify-end gap-3">
          {(jsonError || save.error) && (
            <p className="text-sm text-red-500 mr-auto">{jsonError || errorOf(save.error)}</p>
          )}
          <button type="button" onClick={onClose} className="px-4 py-2 text-sm font-semibold text-gray-500 hover:text-gray-700">Cancel</button>
          <button
            type="button"
            disabled={!say.trim() || save.isPending}
            onClick={submit}
            className="px-4 py-2 rounded-lg bg-sky-500 hover:bg-sky-600 text-white text-sm font-semibold disabled:opacity-50"
          >
            {save.isPending ? 'Saving…' : 'Save step'}
          </button>
        </div>
      </Motion.div>
    </Motion.div>
  )
}

/** The written lesson, step by step, for reading and correcting before the voice is recorded. */
export default function LessonSteps({ lesson, busy, onChanged }) {
  const [editing, setEditing] = useState(null)
  if (!lesson.steps.length) return null

  return (
    <section className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5 space-y-3">
      <div>
        <h3 className="font-bold text-gray-900 text-sm">Steps</h3>
        <p className="text-xs text-gray-400 mt-0.5">Read them before recording: a fix here is free, a new recording is not.</p>
      </div>
      <ol className="divide-y divide-gray-50 max-h-96 overflow-y-auto">
        {lesson.steps.map((step) => (
          <li key={step.id} className="py-2.5 flex items-start gap-3">
            <span className="w-6 text-xs font-bold text-gray-400 tabular-nums flex-shrink-0 pt-0.5">{step.order + 1}</span>
            <p className="min-w-0 flex-1 text-sm text-gray-700 line-clamp-2">{step.say}</p>
            {step.voiced && <Mic size={14} className="text-emerald-500 flex-shrink-0 mt-0.5" aria-label="Recorded" />}
            {!busy && (
              <button type="button" aria-label={`Edit step ${step.order + 1}`} onClick={() => setEditing(step)} className="p-1 text-gray-300 hover:text-sky-600 transition-colors">
                <Pencil size={14} />
              </button>
            )}
          </li>
        ))}
      </ol>
      <AnimatePresence>
        {editing && (
          <StepModal
            step={editing}
            onClose={() => setEditing(null)}
            onSaved={() => {
              setEditing(null)
              onChanged()
            }}
          />
        )}
      </AnimatePresence>
    </section>
  )
}
