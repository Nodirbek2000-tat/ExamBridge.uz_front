import { useState } from 'react'
import { useMutation } from '@tanstack/react-query'
import { AnimatePresence, motion as Motion } from 'framer-motion'
import { AlertTriangle, Pencil, Plus, Trash2, X } from 'lucide-react'
import api from '../../api/client'
import RichText from '../../components/lesson/RichText'

const HOMEWORK = 'homework'
const MAX_OPTIONS = 6
const MIN_OPTIONS = 2
const inputCls = 'w-full px-3 py-2 text-sm text-gray-800 placeholder:text-gray-400 rounded-lg border border-gray-200 focus:outline-none focus:border-sky-400'
const errorOf = (e) => e?.response?.data?.error || e?.response?.data?.detail || e.message

function emptyForm(lesson) {
  return {
    place: lesson.steps[0] ? String(lesson.steps[0].id) : HOMEWORK,
    kind: 'CHOICE',
    prompt: '',
    options: ['', '', '', ''],
    correct: null,
    rubric: '',
    explanation: '',
  }
}

function formOf(question) {
  return {
    place: question.is_homework ? HOMEWORK : String(question.step ?? ''),
    kind: question.kind,
    prompt: question.prompt,
    options: question.kind === 'CHOICE' ? question.options : ['', '', '', ''],
    correct: question.correct,
    rubric: question.rubric,
    explanation: question.explanation,
  }
}

function Field({ label, hint, children }) {
  return (
    <div className="min-w-0">
      <p className="text-xs font-semibold text-gray-500 mb-1">{label}</p>
      {children}
      {hint && <p className="text-[11px] text-gray-400 mt-1">{hint}</p>}
    </div>
  )
}

function OptionsEditor({ form, onChange }) {
  const setOption = (i, value) => {
    onChange({ ...form, options: form.options.map((o, at) => (at === i ? value : o)) })
  }
  const remove = (i) => {
    const correct = form.correct === i ? null : form.correct > i ? form.correct - 1 : form.correct
    onChange({ ...form, options: form.options.filter((_, at) => at !== i), correct })
  }

  return (
    <Field label="Options" hint="Mark the correct one. Math works as \( x^2 \).">
      <div className="space-y-2">
        {form.options.map((option, i) => (
          <div key={i} className="flex items-center gap-2">
            <input
              type="radio"
              name="correct-option"
              aria-label={`Option ${i + 1} is correct`}
              checked={form.correct === i}
              onChange={() => onChange({ ...form, correct: i })}
              className="accent-emerald-500"
            />
            <input
              value={option}
              onChange={(e) => setOption(i, e.target.value)}
              maxLength={300}
              className={inputCls}
              placeholder={`Option ${i + 1}`}
            />
            {form.options.length > MIN_OPTIONS && (
              <button type="button" aria-label={`Remove option ${i + 1}`} onClick={() => remove(i)} className="p-1 text-gray-300 hover:text-red-500">
                <X size={15} />
              </button>
            )}
          </div>
        ))}
      </div>
      {form.options.length < MAX_OPTIONS && (
        <button
          type="button"
          onClick={() => onChange({ ...form, options: [...form.options, ''] })}
          className="mt-2 text-xs font-semibold text-sky-600 hover:underline"
        >
          Add option
        </button>
      )}
    </Field>
  )
}

function QuestionModal({ lesson, question, onClose, onSaved }) {
  const [form, setForm] = useState(() => (question ? formOf(question) : emptyForm(lesson)))
  const set = (key) => (e) => setForm({ ...form, [key]: e.target.value })

  const save = useMutation({
    mutationFn: () => {
      const { place, kind, prompt, options, correct, rubric, explanation } = form
      const body = {
        kind, prompt, options, correct, rubric, explanation,
        is_homework: place === HOMEWORK,
        step: place === HOMEWORK ? null : Number(place),
      }
      return question
        ? api.put(`/admin/ai-lessons/questions/${question.id}/`, body)
        : api.post(`/admin/ai-lessons/${lesson.id}/questions/`, body)
    },
    onSuccess: onSaved,
  })

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
        aria-label={question ? 'Edit question' : 'New question'}
        className="bg-white rounded-2xl shadow-xl w-full max-w-2xl max-h-[90vh] flex flex-col"
        onMouseDown={(e) => e.stopPropagation()}
      >
        <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
          <h3 className="font-bold text-gray-900">{question ? 'Edit question' : 'New question'}</h3>
          <button type="button" onClick={onClose} aria-label="Close" className="text-gray-400 hover:text-gray-700"><X size={18} /></button>
        </div>

        <div className="p-5 space-y-4 overflow-y-auto">
          <div className="grid sm:grid-cols-2 gap-3">
            <Field label="Where">
              <select value={form.place} onChange={set('place')} className={inputCls}>
                {lesson.steps.map((s) => (
                  <option key={s.id} value={s.id}>After step {s.order + 1}: {s.say.slice(0, 40)}</option>
                ))}
                <option value={HOMEWORK}>Homework</option>
              </select>
            </Field>
            <Field label="Type">
              <select value={form.kind} onChange={set('kind')} className={inputCls}>
                <option value="CHOICE">Multiple choice</option>
                <option value="WRITTEN">Written answer</option>
              </select>
            </Field>
          </div>

          <Field label="Question" hint="**bold** and \( math \) work here too.">
            <textarea value={form.prompt} onChange={set('prompt')} maxLength={1000} rows={3} className={inputCls} />
          </Field>

          {form.kind === 'CHOICE' ? (
            <OptionsEditor form={form} onChange={setForm} />
          ) : (
            <Field label="How to judge the answer" hint="Students never see this. The AI uses it once written answers are checked.">
              <textarea value={form.rubric} onChange={set('rubric')} maxLength={2000} rows={2} className={inputCls} />
            </Field>
          )}

          <Field label="Explanation" hint="Shown to the student after they answer.">
            <textarea value={form.explanation} onChange={set('explanation')} maxLength={2000} rows={2} className={inputCls} />
          </Field>
        </div>

        <div className="px-5 py-4 border-t border-gray-100 flex items-center justify-end gap-3">
          {save.error && <p className="text-sm text-red-500 mr-auto">{errorOf(save.error)}</p>}
          <button type="button" onClick={onClose} className="px-4 py-2 text-sm font-semibold text-gray-500 hover:text-gray-700">Cancel</button>
          <button
            type="button"
            disabled={!form.prompt.trim() || save.isPending}
            onClick={() => save.mutate()}
            className="px-4 py-2 rounded-lg bg-sky-500 hover:bg-sky-600 text-white text-sm font-semibold disabled:opacity-50"
          >
            {save.isPending ? 'Saving…' : 'Save question'}
          </button>
        </div>
      </Motion.div>
    </Motion.div>
  )
}

function placeLabel(question, lesson) {
  if (question.is_homework) return 'Homework'
  const step = lesson.steps.find((s) => s.id === question.step)
  return step ? `After step ${step.order + 1}` : 'No step: students will not see it'
}

function QuestionRow({ question, lesson, busy, onEdit, onDelete, deleting }) {
  const orphan = !question.is_homework && !question.step
  const marked = question.kind === 'CHOICE' && question.answers > 0
  return (
    <li className="py-3 flex items-start gap-3">
      <div className="min-w-0 flex-1">
        <p className="text-sm font-semibold text-gray-800 line-clamp-2"><RichText text={question.prompt} /></p>
        <p className={`text-xs mt-0.5 ${orphan ? 'text-red-500' : 'text-gray-400'}`}>
          {placeLabel(question, lesson)} · {question.kind === 'CHOICE' ? 'Multiple choice' : 'Written'}
          {question.answers > 0 && ` · ${question.answers} answers`}
          {marked && `, ${Math.round((question.right_answers / question.answers) * 100)}% right`}
          {question.origin === 'AI' && ' · Written by AI'}
        </p>
        {question.ai_verdict === 'BAD' && (
          <p className="flex items-start gap-1 text-xs text-amber-700 mt-1">
            <AlertTriangle size={12} className="mt-0.5 flex-shrink-0" /> {question.ai_note || 'The AI check found a problem.'}
          </p>
        )}
      </div>
      {!busy && (
        <>
          <button type="button" aria-label="Edit question" onClick={onEdit} className="p-1.5 text-gray-300 hover:text-sky-600 transition-colors">
            <Pencil size={15} />
          </button>
          <button type="button" aria-label="Delete question" disabled={deleting} onClick={onDelete} className="p-1.5 text-gray-300 hover:text-red-500 disabled:opacity-50 transition-colors">
            <Trash2 size={15} />
          </button>
        </>
      )}
    </li>
  )
}

export default function LessonQuestions({ lesson, busy, onChanged }) {
  // undefined: closed. null: a new question. A question: editing it.
  const [editing, setEditing] = useState(undefined)

  const remove = useMutation({
    mutationFn: (id) => api.delete(`/admin/ai-lessons/questions/${id}/`),
    onSuccess: onChanged,
  })

  const confirmDelete = (question) => {
    if (window.confirm('Delete this question and the answers given to it?')) remove.mutate(question.id)
  }

  return (
    <section className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5 space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className="font-bold text-gray-900 text-sm">Questions and homework</h3>
          <p className="text-xs text-gray-400 mt-0.5">The lesson pauses for a question after its step. Homework opens when the lesson ends.</p>
        </div>
        {!busy && (
          <button
            type="button"
            onClick={() => setEditing(null)}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-sky-50 text-sky-700 text-xs font-semibold hover:bg-sky-100"
          >
            <Plus size={14} /> Add question
          </button>
        )}
      </div>

      {lesson.questions.length > 0 ? (
        <ul className="divide-y divide-gray-50">
          {lesson.questions.map((q) => (
            <QuestionRow
              key={q.id}
              question={q}
              lesson={lesson}
              busy={busy}
              deleting={remove.isPending}
              onEdit={() => setEditing(q)}
              onDelete={() => confirmDelete(q)}
            />
          ))}
        </ul>
      ) : (
        <p className="py-4 text-center text-sm text-gray-400">No questions yet.</p>
      )}
      {remove.error && <p className="text-xs text-red-500">{errorOf(remove.error)}</p>}

      <AnimatePresence>
        {editing !== undefined && (
          <QuestionModal
            lesson={lesson}
            question={editing}
            onClose={() => setEditing(undefined)}
            onSaved={() => {
              setEditing(undefined)
              onChanged()
            }}
          />
        )}
      </AnimatePresence>
    </section>
  )
}
