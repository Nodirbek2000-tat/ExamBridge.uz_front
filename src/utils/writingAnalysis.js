import api from '../api/client'

// ── IELTS Writing AI Analysis ─────────────────────────────────────────────────
// Calls our Django backend which securely calls OpenAI API

export async function analyzeWriting({ text, task, wordCount, ownTitle }) {
  const res = await api.post('/ielts/writing/analyze/', {
    text,
    task_type:  task?.task_type  ?? 2,
    prompt:     task?.prompt     ?? '',
    word_count: wordCount        ?? 0,
    own_title:  ownTitle         ?? '',
  })
  return res.data
}
