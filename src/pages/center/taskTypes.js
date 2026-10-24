/**
 * Learning-center task types, shared by the teacher's "New Task" panel,
 * the monitoring page and the student's My Tasks.
 *
 * `startTask` opens the exact test a task points to (task_ref_id +
 * task_ref_kind) the same way the exam's own list page does, so the result
 * is saved normally and the backend can complete the task by itself.
 */
import api from '../../api/client'

export const EXAMS = [
  { key: 'ielts', label: 'IELTS' },
  { key: 'cefr', label: 'CEFR' },
  { key: 'sat', label: 'SAT' },
]

export const TASK_TYPES = [
  { value: 'ielts_reading',   exam: 'ielts', label: 'IELTS Reading',   skill: 'Reading' },
  { value: 'ielts_listening', exam: 'ielts', label: 'IELTS Listening', skill: 'Listening' },
  { value: 'ielts_writing',   exam: 'ielts', label: 'IELTS Writing',   skill: 'Writing' },
  { value: 'ielts_speaking',  exam: 'ielts', label: 'IELTS Speaking',  skill: 'Speaking' },
  { value: 'cefr_reading',    exam: 'cefr',  label: 'CEFR Reading',    skill: 'Reading' },
  { value: 'cefr_listening',  exam: 'cefr',  label: 'CEFR Listening',  skill: 'Listening' },
  { value: 'cefr_writing',    exam: 'cefr',  label: 'CEFR Writing',    skill: 'Writing' },
  { value: 'cefr_speaking',   exam: 'cefr',  label: 'CEFR Speaking',   skill: 'Speaking' },
  { value: 'sat_mock',        exam: 'sat',   label: 'SAT Full Test',   skill: 'Full test' },
  { value: 'sat_english',     exam: 'sat',   label: 'SAT Reading & Writing', skill: 'R&W module' },
  { value: 'sat_math',        exam: 'sat',   label: 'SAT Math',        skill: 'Math module' },
]

// Older tasks may still carry this type; it is no longer offered.
const LEGACY = { cefr_test: { exam: 'cefr', label: 'CEFR Test', skill: 'Test' } }

export function taskMeta(type) {
  return TASK_TYPES.find((t) => t.value === type) || LEGACY[type] || { exam: 'other', label: type, skill: type }
}
export const taskLabel = (type) => taskMeta(type).label

// One quiet tint per exam (full class names so Tailwind keeps them).
export const EXAM_TINT = {
  ielts: { chip: 'text-violet-700 bg-violet-50 ring-violet-100', dot: 'bg-violet-500', solid: 'bg-violet-600' },
  cefr:  { chip: 'text-rose-700 bg-rose-50 ring-rose-100',       dot: 'bg-rose-500',   solid: 'bg-rose-600' },
  sat:   { chip: 'text-sky-700 bg-sky-50 ring-sky-100',          dot: 'bg-sky-500',    solid: 'bg-sky-600' },
  other: { chip: 'text-slate-600 bg-slate-50 ring-slate-100',    dot: 'bg-slate-400',  solid: 'bg-slate-600' },
}
export const examTint = (type) => EXAM_TINT[taskMeta(type).exam] || EXAM_TINT.other
export const taskColor = (type) => examTint(type).chip

export const KIND_LABEL = {
  mock: 'Full mock', passage: 'Passage', section: 'Part', task: 'Task', test: 'Test',
}

/* Where to send the student when there is no exact test to open. */
function listUrl(type) {
  switch (type) {
    case 'ielts_reading': return '/app/ielts/skills?tab=reading'
    case 'ielts_listening': return '/app/ielts/skills?tab=listening'
    case 'ielts_writing': return '/app/ielts/skills?tab=writing'
    case 'ielts_speaking': return '/app/ielts/skills?tab=speaking'
    case 'cefr_reading': return '/app/cefr/skills?tab=reading'
    case 'cefr_listening': return '/app/cefr/skills?tab=listening'
    case 'cefr_writing': return '/app/cefr/skills?tab=writing'
    case 'cefr_speaking': return '/app/cefr/skills?tab=speaking'
    case 'cefr_test': return '/app/cefr/skills'
    default: return '/app/sat/tests'
  }
}

const q = (title) => `title=${encodeURIComponent(title || '')}`

/**
 * Create (or resume) the attempt for one test and say where its exam screen
 * is. Returns { url, ref } — `ref` is the attempt / response id the exam
 * screen runs on (full mocks remember it to know when the section is done).
 */
export async function startTest({ type, id, kind, title }) {
  switch (type) {
    case 'ielts_reading': {
      if (kind === 'mock') {
        const { data } = await api.post(`/ielts/reading/mock/${id}/start/`)
        const ids = (data.passages || []).map((p) => p.id)
        const parts = ids.length ? `&passage=${ids[0]}&parts=${ids.join(',')}` : ''
        return { ref: data.attempt_id, url: `/exam/ielts/reading/${data.attempt_id}?${q(title)}${parts}` }
      }
      const { data } = await api.post(`/ielts/reading/${id}/start/`)
      return { ref: data.attempt_id, url: `/exam/ielts/reading/${data.attempt_id}?passage=${id}&${q(title)}` }
    }
    case 'ielts_listening': {
      if (kind === 'mock') {
        const { data } = await api.post(`/ielts/listening/mock/${id}/start/`)
        let ids = (data.sections || []).map((s) => s.id)
        if (!ids.length) {
          // a resumed mock does not list its parts — read them from the test list
          const list = await api.get('/ielts/listening/').then((r) => r.data).catch(() => null)
          const mock = (list?.mocks || []).find((m) => m.id === id)
          ids = (mock?.sections || mock?.parts || []).map((s) => s.id)
        }
        const parts = ids.length ? `&section=${ids[0]}&parts=${ids.join(',')}` : ''
        return { ref: data.attempt_id, url: `/exam/ielts/listening/${data.attempt_id}?${q(title)}${parts}` }
      }
      const { data } = await api.post(`/ielts/listening/${id}/start/`)
      return { ref: data.attempt_id, url: `/exam/ielts/listening/${data.attempt_id}?section=${id}&${q(title)}` }
    }
    case 'ielts_writing': {
      const { data } = await api.post(`/ielts/writing/${id}/start/`)
      return { ref: data.attempt_id, url: `/exam/ielts/writing/${data.attempt_id}?task=${id}` }
    }
    case 'ielts_speaking': {
      const { data } = await api.post('/ielts/attempt/start/', { task_type: 'speaking', task_id: id })
      return { ref: data.attempt_id, url: `/exam/ielts/speaking/${id}?attempt=${data.attempt_id}` }
    }
    case 'cefr_reading': {
      if (kind === 'mock') {
        const { data } = await api.post(`/cefr/reading/full-mock/${id}/start/`)
        return { ref: data.attempt_id, url: `/exam/cefr/reading/${data.attempt_id}?parts=${data.passage_ids.join(',')}&${q(title)}` }
      }
      const { data } = await api.post(`/cefr/reading/${id}/start/`)
      return { ref: data.attempt_id, url: `/exam/cefr/reading/${data.attempt_id}?passage=${id}&${q(title)}` }
    }
    case 'cefr_listening': {
      if (kind === 'mock') {
        const { data } = await api.post(`/cefr/listening/full-mock/${id}/start/`)
        return { ref: data.attempt_id, url: `/exam/cefr/listening/${data.attempt_id}?parts=${data.section_ids.join(',')}&${q(title)}` }
      }
      const { data } = await api.post(`/cefr/listening/${id}/start/`)
      return { ref: data.attempt_id, url: `/exam/cefr/listening/${data.attempt_id}?section=${id}&${q(title)}` }
    }
    case 'cefr_writing': {
      const { data } = await api.post(`/cefr/writing/${id}/start/`)
      return { ref: data.response_id, url: `/exam/cefr/writing/${data.response_id}` }
    }
    case 'cefr_speaking': {
      if (kind === 'task') {
        const { data } = await api.post('/ielts/attempt/start/', { task_type: 'speaking', task_id: id })
        return { ref: data.attempt_id, url: `/exam/cefr/speaking/${id}?attempt=${data.attempt_id}` }
      }
      const { data } = await api.post(`/cefr/speaking/${id}/start/`)
      return { ref: data.response_id, url: `/exam/cefr/speaking/test/${data.response_id}` }
    }
    case 'sat_mock': {
      const { data } = await api.post(`/sat/tests/${id}/start/`, {})
      return { ref: data.attempt_id, url: `/exam/sat/${data.attempt_id}` }
    }
    case 'sat_english':
    case 'sat_math':
      return { ref: null, url: `/app/sat/modules/${id}` }
    default:
      return { ref: null, url: listUrl(type) }
  }
}

/** Resolve the URL that starts a center task's test. Creates the attempt. */
export async function startUrl(task) {
  const { task_type: type, task_ref_id: id, task_ref_kind: kind, task_title: title } = task
  if (!id) return listUrl(type)
  return (await startTest({ type, id, kind, title })).url
}

export { listUrl }
