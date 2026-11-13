import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import api from '../../api/client'
import { useAuthStore } from '../../store/authStore'

/** Shown until the server answers, and if it never does. */
export const FALLBACK = {
  accepting: true,
  bot_url: null,
  refund_hours: 24,
  plans: [
    { id: '1month', months: 1, days: 30, price: 49000 },
    { id: '3month', months: 3, days: 90, price: 119000 },
  ],
}

/** What Premium opens — only things the app really locks behind it. */
export const PREMIUM_FEATURES = [
  'Every premium SAT, IELTS and CEFR mock test',
  'IELTS & CEFR Speaking and Writing with AI band scores',
  'Full mock exams in the real test-day format',
  'Premium study articles and every Speaking-game level',
]

/** 49000 → "49 000" */
export function formatSom(value) {
  // A no-break space, so "119 000" never splits across two lines.
  return Math.round(value).toLocaleString('en-US').replace(/,/g, ' ')
}

export function usePlans() {
  const { data } = useQuery({
    queryKey: ['payment-plans'],
    queryFn: () => api.get('/payments/plans/').then((r) => r.data),
    staleTime: 5 * 60 * 1000,
    retry: 1,
  })
  const info = data ?? FALLBACK
  const [monthly, longer] = info.plans
  // How much cheaper the 3-month plan is than paying monthly.
  const saving = monthly && longer
    ? Math.round((1 - longer.price / (monthly.price * longer.months)) * 100)
    : 0
  return { ...info, saving }
}

/**
 * Opens our Telegram bot. A signed-in student gets a link that ties the bot to
 * this account, so the payment lands on it. Anyone else opens the bot plainly
 * and registers there.
 */
export function useTelegramCheckout(botUrl) {
  const user = useAuthStore((s) => s.user)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  const open = async () => {
    setError('')
    if (!user) {
      if (botUrl) window.open(`${botUrl}?start=premium`, '_blank', 'noopener')
      else setError('Telegram payments are not available right now. Please try again later.')
      return
    }
    // Open the tab now, while the click still counts as a user action —
    // a window opened after the request finishes would be blocked as a popup.
    const tab = window.open('', '_blank')
    setBusy(true)
    try {
      const { data } = await api.post('/payments/telegram/')
      if (tab) tab.location.href = data.url
      else window.location.href = data.url
    } catch (err) {
      tab?.close()
      setError(err?.response?.data?.detail || 'Could not open Telegram. Please try again.')
    } finally {
      setBusy(false)
    }
  }

  return { open, busy, error, signedIn: Boolean(user) }
}
