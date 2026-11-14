// The same colours as each exam's workspace in the sidebar.
export const LOOK = {
  SAT: { chip: 'bg-sky-100 text-sky-800', ink: '#2563eb', active: 'bg-sky-600 text-white' },
  IELTS: { chip: 'bg-violet-100 text-violet-800', ink: '#7c3aed', active: 'bg-violet-600 text-white' },
  CEFR: { chip: 'bg-rose-100 text-rose-800', ink: '#e11d48', active: 'bg-rose-600 text-white' },
  GENERAL: { chip: 'bg-emerald-100 text-emerald-800', ink: '#16a34a', active: 'bg-emerald-600 text-white' },
}

/** Started but not finished. */
export const inProgress = (lesson) => !lesson.progress.completed && lesson.progress.percent > 0
