import { useState } from 'react'
import { Loader2 } from 'lucide-react'
import api from '../../api/client'
import { useAuthStore } from '../../store/authStore'

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/

/**
 * Telegram accounts: add or change the e-mail we can reach the student at.
 * It is contact only — they keep signing in with Telegram.
 */
export default function ContactEmailForm({ onDone, onSkip, skipLabel = 'Later', autoFocus = true }) {
  const user = useAuthStore((s) => s.user)
  const applyUser = useAuthStore((s) => s.applyUser)
  const [value, setValue] = useState(user?.email || '')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const save = async (e) => {
    e.preventDefault()
    const email = value.trim().toLowerCase()
    if (!EMAIL_RE.test(email)) {
      setError('Enter a valid e-mail, for example name@gmail.com')
      return
    }
    setSaving(true)
    setError('')
    try {
      const { data } = await api.patch('/auth/profile/', { contact_email: email })
      applyUser(data)
      onDone?.()
    } catch (err) {
      const d = err?.response?.data
      setError(d?.contact_email?.[0] || d?.detail || 'Could not save. Please try again.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <form onSubmit={save} className="space-y-3">
      <input
        type="email"
        inputMode="email"
        autoComplete="email"
        autoFocus={autoFocus}
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder="you@gmail.com"
        className="w-full rounded-xl border border-gray-200 bg-gray-50 px-3.5 py-3 text-sm text-gray-900 placeholder-gray-400 transition focus:border-sky-400 focus:outline-none focus:ring-2 focus:ring-sky-100 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100 dark:focus:ring-sky-900/40"
      />
      {error && <p className="text-xs text-red-500">{error}</p>}
      <div className="flex gap-2">
        {onSkip && (
          <button
            type="button"
            onClick={onSkip}
            className="flex-1 rounded-xl border border-gray-200 py-2.5 text-sm font-semibold text-gray-600 transition hover:bg-gray-50 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-700"
          >
            {skipLabel}
          </button>
        )}
        <button
          type="submit"
          disabled={saving}
          className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-sky-500 py-2.5 text-sm font-semibold text-white transition hover:bg-sky-600 disabled:opacity-50"
        >
          {saving && <Loader2 size={15} className="animate-spin" />} Save
        </button>
      </div>
    </form>
  )
}
