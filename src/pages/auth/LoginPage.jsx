import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { useAuthStore } from '../../store/authStore'
import { Eye, EyeOff, CheckCircle2 } from 'lucide-react'
import { GoogleLogin } from '@react-oauth/google'
import Logo from '../../components/Logo.jsx'

export default function LoginPage() {
  const [form, setForm] = useState({ email: '', password: '' })
  const [showPw, setShowPw] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)
  const login = useAuthStore((s) => s.login)
  const googleLogin = useAuthStore((s) => s.googleLogin)
  const loading = useAuthStore((s) => s.loading)
  const navigate = useNavigate()

  const handleSuccess = (user) => {
    setSuccess(true)
    setTimeout(() => navigate(user?.is_staff ? '/admin-panel' : '/app'), 1200)
  }

  const submit = async (e) => {
    e.preventDefault()
    setError('')
    const res = await login(form.email, form.password)
    if (res.success) handleSuccess(res.user)
    else setError(res.error)
  }

  return (
    <div className="min-h-screen bg-white flex items-center justify-center px-4">
      {/* Success toast */}
      <AnimatePresence>
        {success && (
          <motion.div
            initial={{ opacity: 0, y: -60 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -60 }}
            transition={{ duration: 0.35, ease: 'easeOut' }}
            className="fixed top-5 left-1/2 -translate-x-1/2 z-[999] flex items-center gap-3 bg-emerald-500 text-white px-6 py-3.5 rounded-2xl shadow-xl shadow-emerald-500/30 font-semibold text-sm"
          >
            <CheckCircle2 size={18} />
            Login successful! Redirecting…
          </motion.div>
        )}
      </AnimatePresence>

      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-1/3 w-96 h-96 bg-sky-200 rounded-full blur-[100px] opacity-30" />
        <div className="absolute bottom-1/4 right-1/4 w-64 h-64 bg-slate-200 rounded-full blur-[80px] opacity-20" />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="relative w-full max-w-md"
      >
        <div className="bg-white rounded-3xl shadow-glow border border-sky-100 p-8">
          <div className="text-center mb-8">
            <Link to="/" className="inline-flex items-center mb-6">
              <Logo className="h-10 w-auto" />
            </Link>
            <h1 className="text-2xl font-black">Welcome back</h1>
            <p className="text-gray-500 text-sm mt-1">Sign in to your account</p>
          </div>

          {/* Google button */}
          <div className="flex justify-center mb-5">
            <GoogleLogin
              onSuccess={async (credentialResponse) => {
                const res = await googleLogin(credentialResponse.credential)
                if (res.success) handleSuccess(res.user)
                else setError(res.error)
              }}
              onError={() => setError('Google login failed. Try again.')}
              theme="outline"
              size="large"
              width="400"
              text="signin_with"
            />
          </div>

          <div className="relative flex items-center mb-5">
            <div className="flex-1 border-t border-gray-100" />
            <span className="px-3 text-xs text-gray-400 font-medium">or sign in with email</span>
            <div className="flex-1 border-t border-gray-100" />
          </div>

          <form onSubmit={submit} className="space-y-4">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1.5">Email</label>
              <input
                type="email"
                required
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                className="w-full px-4 py-3 rounded-xl border border-sky-100 bg-sky-50/30 focus:outline-none focus:border-sky-400 focus:ring-2 focus:ring-sky-100 transition-all text-sm"
                placeholder="you@example.com"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1.5">Password</label>
              <div className="relative">
                <input
                  type={showPw ? 'text' : 'password'}
                  required
                  value={form.password}
                  onChange={(e) => setForm({ ...form, password: e.target.value })}
                  className="w-full px-4 py-3 rounded-xl border border-sky-100 bg-sky-50/30 focus:outline-none focus:border-sky-400 focus:ring-2 focus:ring-sky-100 transition-all text-sm pr-11"
                  placeholder="••••••••"
                />
                <button
                  type="button"
                  onClick={() => setShowPw(!showPw)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  {showPw ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            {error && (
              <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="text-red-500 text-sm text-center bg-red-50 px-4 py-2 rounded-xl"
              >
                {error}
              </motion.p>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3.5 rounded-xl gradient-primary text-white font-bold text-sm shadow-glow hover:opacity-90 transition-all disabled:opacity-50"
            >
              {loading ? 'Signing in...' : 'Sign In'}
            </button>
          </form>

          <p className="text-center text-sm text-gray-500 mt-6">
            Don't have an account?{' '}
            <Link to="/register" className="text-sky-600 font-semibold hover:text-sky-700">
              Sign up
            </Link>
          </p>
        </div>
      </motion.div>
    </div>
  )
}
