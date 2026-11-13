import { useEffect, useRef, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { Loader2 } from 'lucide-react'
import { FaTelegramPlane } from 'react-icons/fa'
import { useAuthStore } from '../../store/authStore'
import Logo from '../../components/Logo.jsx'

/**
 * /auth/telegram?token=… — the one-time sign-in link from our Telegram bot.
 * The token is exchanged for the usual JWT pair, then the student lands in the app.
 */
export default function TelegramAuthPage() {
  const [params] = useSearchParams()
  const token = params.get('token')
  const telegramLogin = useAuthStore((s) => s.telegramLogin)
  const navigate = useNavigate()
  const [error, setError] = useState(
    token ? '' : 'This sign-in link is incomplete. Open the bot and tap “Saytga kirish” again.',
  )
  const started = useRef(false)

  useEffect(() => {
    // StrictMode runs effects twice in development; the token works only once.
    if (!token || started.current) return
    started.current = true
    telegramLogin(token).then((res) => {
      if (res.success) navigate('/app', { replace: true })
      else setError(res.error)
    })
  }, [token, telegramLogin, navigate])

  return (
    <div className="min-h-screen bg-white text-gray-900 flex items-center justify-center px-4">
      <div className="w-full max-w-sm text-center">
        <Logo className="mx-auto h-10 w-auto" />
        {!error ? (
          <div className="mt-10 flex flex-col items-center gap-3 text-gray-500">
            <Loader2 className="h-6 w-6 animate-spin text-sky-500" />
            <p className="text-sm">Signing you in…</p>
          </div>
        ) : (
          <div className="mt-10 rounded-3xl border border-gray-200 p-6">
            <p className="font-bold">Could not sign you in</p>
            <p className="mt-2 text-sm text-gray-500">{error}</p>
            <div className="mt-6 flex flex-col gap-2">
              <Link to="/login" className="rounded-xl bg-gray-900 py-3 text-sm font-bold text-white hover:bg-gray-800">
                Sign in with e-mail
              </Link>
              <p className="flex items-center justify-center gap-1.5 text-xs text-gray-400">
                <FaTelegramPlane /> Or get a new link in the bot
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
