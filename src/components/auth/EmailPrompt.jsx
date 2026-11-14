import { useState } from 'react'
import { Mail, X } from 'lucide-react'
import { FaTelegramPlane } from 'react-icons/fa'
import { useAuthStore } from '../../store/authStore'
import ContactEmailForm from './ContactEmailForm'

const SKIP_KEY = 'eb-email-prompt-skipped'

function skippedThisSession() {
  try { return sessionStorage.getItem(SKIP_KEY) === '1' } catch { return false }
}

/**
 * Shown once per visit to students who signed up in the Telegram bot and have
 * not given an e-mail yet. "Later" hides it until the next visit.
 */
export default function EmailPrompt() {
  const needsEmail = useAuthStore((s) => s.user?.needs_email)
  const [hidden, setHidden] = useState(skippedThisSession)

  if (!needsEmail || hidden) return null

  const skip = () => {
    try { sessionStorage.setItem(SKIP_KEY, '1') } catch { /* private mode */ }
    setHidden(true)
  }

  return (
    <div className="fixed inset-0 z-[60] flex items-end justify-center bg-black/40 p-4 sm:items-center" role="dialog" aria-modal="true" aria-labelledby="eb-email-prompt-title">
      <div className="relative w-full max-w-md rounded-3xl bg-white p-6 shadow-2xl dark:bg-gray-900">
        <button
          type="button"
          onClick={skip}
          aria-label="Close"
          className="absolute right-4 top-4 rounded-full p-1.5 text-gray-400 transition hover:bg-gray-100 hover:text-gray-700 dark:hover:bg-gray-800"
        >
          <X size={18} />
        </button>
        <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-sky-50 text-sky-600 dark:bg-sky-900/40 dark:text-sky-400">
          <Mail size={22} />
        </span>
        <h2 id="eb-email-prompt-title" className="mt-4 text-xl font-black text-gray-900 dark:text-white">Add your e-mail</h2>
        <p className="mt-1.5 text-sm leading-relaxed text-gray-500 dark:text-gray-400">
          So we can reach you about your results, payments and important updates.
        </p>
        <p className="mt-2 flex items-center gap-1.5 text-xs font-medium text-sky-700 dark:text-sky-400">
          <FaTelegramPlane size={12} /> You keep signing in with Telegram.
        </p>
        <div className="mt-5">
          <ContactEmailForm onDone={() => setHidden(true)} onSkip={skip} />
        </div>
      </div>
    </div>
  )
}
