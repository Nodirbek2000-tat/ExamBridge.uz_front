import { useEffect, useState } from 'react'
import api from '../api/client'
import { speakingLimit } from '../utils/speakingLimit'

const CHECKING = { gate: 'checking', attemptId: null, limit: null }

/*
 * IELTS-style speaking pages (IELTS tasks and the CEFR practice tasks) ask the server for their
 * attempt before anything is recorded. So a page opened from "Try again", a bookmark or an old
 * link never records a whole test that the daily speaking limit would then refuse, and never
 * re-uses an attempt that was already submitted.
 *
 *   gate 'checking' → 'ok'    go on (attemptId null = practice without saving, as before)
 *                   → 'limit' show `limit.message`, record nothing
 */
export function useSpeakingAttempt(taskId, urlAttemptId) {
  const [state, setState] = useState(null)

  useEffect(() => {
    let alive = true
    api.post('/ielts/attempt/start/', { task_type: 'speaking', task_id: taskId })
      .then(r => {
        if (alive) setState({ taskId, gate: 'ok', attemptId: String(r.data.attempt_id), limit: null })
      })
      .catch(err => {
        if (!alive) return
        const limit = speakingLimit(err)
        // any other failure: keep the attempt from the link (or practise without saving), as before
        setState(limit
          ? { taskId, gate: 'limit', attemptId: null, limit }
          : { taskId, gate: 'ok', attemptId: urlAttemptId, limit: null })
      })
    return () => { alive = false }
    // the attempt in the link is only a fallback — a new link must not restart the check
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [taskId])

  return state?.taskId === taskId ? state : CHECKING
}
