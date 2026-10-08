/*
 * The hidden daily speaking limit (backend api/speaking_limit.py): IELTS and CEFR speaking tests
 * share it. When it is hit the server answers 429 with
 *   { code: 'speaking_daily_limit', detail, retry_after_seconds, unlock_at }
 * and `detail` is the ready-to-show Uzbek message. Any other 429 (the API rate limiter) is not it.
 */
export const SPEAKING_LIMIT_CODE = 'speaking_daily_limit'

/** { message, unlockAt, retryAfter } for a speaking-limit error, otherwise null. */
export function speakingLimit(err) {
  const res = err?.response
  if (res?.status !== 429 || res.data?.code !== SPEAKING_LIMIT_CODE) return null
  return {
    message: res.data.detail || 'Kunlik limitingiz tugadi.',
    unlockAt: res.data.unlock_at || null,
    retryAfter: res.data.retry_after_seconds ?? null,
  }
}
