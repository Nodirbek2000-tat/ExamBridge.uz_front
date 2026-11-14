import { useEffect, useRef, useState } from 'react'
import { Loader2, X } from 'lucide-react'
import { FaTelegramPlane } from 'react-icons/fa'
import api from '../../api/client'
import { useAuthStore } from '../../store/authStore'

const POLL_MS = 3000

/**
 * "Continue with Telegram": opens our bot, the student taps Start (and shares
 * their phone if they are new) and confirms; this page notices and signs in.
 *
 * @param {(result: {user: object, created: boolean}) => void} onSuccess
 */
export default function TelegramAuthButton({ onSuccess, label = 'Continue with Telegram' }) {
  const applySession = useAuthStore((s) => s.applySession)
  const [phase, setPhase] = useState('idle')      // idle | starting | waiting | expired | error
  const [link, setLink] = useState(null)
  const [message, setMessage] = useState('')
  const token = useRef(null)
  const done = useRef(onSuccess)
  useEffect(() => { done.current = onSuccess })

  const start = async () => {
    // Open the tab inside the click, or the browser blocks it as a popup.
    const tab = window.open('', '_blank')
    setPhase('starting')
    setMessage('')
    try {
      const { data } = await api.post('/auth/telegram/start/')
      token.current = data.token
      setLink(data.url)
      if (tab) tab.location.href = data.url
      setPhase('waiting')
    } catch (err) {
      tab?.close()
      setMessage(err?.response?.data?.detail || 'Could not open Telegram. Please try again.')
      setPhase('error')
    }
  }

  useEffect(() => {
    if (phase !== 'waiting') return undefined
    let stopped = false
    const id = setInterval(async () => {
      try {
        const { data } = await api.post('/auth/telegram/poll/', { token: token.current })
        if (stopped) return
        if (data.status === 'ok') {
          stopped = true
          clearInterval(id)
          applySession(data)
          done.current?.({ user: data.user, created: data.created })
        } else if (data.status === 'expired') {
          clearInterval(id)
          setPhase('expired')
        }
      } catch {
        // A dropped request is fine — the next tick asks again.
      }
    }, POLL_MS)
    return () => { stopped = true; clearInterval(id) }
  }, [phase, applySession])

  if (phase === 'waiting' || phase === 'expired') {
    return (
      <div className="rounded-2xl border border-sky-100 bg-sky-50/60 p-4 text-left">
        <div className="flex items-start gap-3">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[#229ED9] text-white">
            <FaTelegramPlane size={16} />
          </span>
          <div className="min-w-0 flex-1">
            {phase === 'waiting' ? (
              <>
                <p className="flex items-center gap-2 text-sm font-bold text-gray-900">
                  <Loader2 size={14} className="animate-spin text-sky-500" /> Waiting for Telegram…
                </p>
                <p className="mt-1 text-xs leading-relaxed text-gray-600">
                  In our bot tap <b>Start</b>, then <b>“✅ Ha, kiraman”</b>. New here? Share your phone in the bot first.
                  This page signs you in by itself.
                </p>
              </>
            ) : (
              <>
                <p className="text-sm font-bold text-gray-900">The request expired</p>
                <p className="mt-1 text-xs text-gray-600">It is valid for 5 minutes. Start again.</p>
              </>
            )}
            <div className="mt-3 flex flex-wrap items-center gap-2">
              {phase === 'waiting' && link && (
                <a
                  href={link}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="rounded-lg bg-[#229ED9] px-3 py-1.5 text-xs font-bold text-white hover:bg-[#1C8EC4]"
                >
                  Open Telegram
                </a>
              )}
              {phase === 'expired' && (
                <button
                  type="button"
                  onClick={start}
                  className="rounded-lg bg-[#229ED9] px-3 py-1.5 text-xs font-bold text-white hover:bg-[#1C8EC4]"
                >
                  Try again
                </button>
              )}
              <button
                type="button"
                onClick={() => setPhase('idle')}
                className="inline-flex items-center gap-1 rounded-lg px-2 py-1.5 text-xs font-semibold text-gray-500 hover:text-gray-800"
              >
                <X size={12} /> Cancel
              </button>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div>
      <button
        type="button"
        onClick={start}
        disabled={phase === 'starting'}
        className="flex h-11 w-full items-center justify-center gap-2.5 rounded-xl bg-[#229ED9] text-sm font-semibold text-white transition-colors hover:bg-[#1C8EC4] disabled:opacity-70"
      >
        {phase === 'starting' ? <Loader2 size={16} className="animate-spin" /> : <FaTelegramPlane size={16} />}
        {label}
      </button>
      {phase === 'error' && <p className="mt-2 text-center text-xs text-red-600">{message}</p>}
    </div>
  )
}
