import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { useAuthStore } from '../../store/authStore'
import { Eye, EyeOff } from 'lucide-react'
import { GoogleLogin } from '@react-oauth/google'
import Logo from '../../components/Logo.jsx'

export default function RegisterPage() {
  const [form, setForm] = useState({ first_name: '', last_name: '', email: '', password: '' })
  const [showPw, setShowPw] = useState(false)
  const [errors, setErrors] = useState({})
  const register = useAuthStore((s) => s.register)
  const googleLogin = useAuthStore((s) => s.googleLogin)
  const loading = useAuthStore((s) => s.loading)
  const navigate = useNavigate()

  const submit = async (e) => {
    e.preventDefault()
    setErrors({})
    const res = await register({ ...form, username: form.email })
    if (res.success) navigate('/onboarding')
    else setErrors(res.error || {})
  }

  const field = (name, label, type = 'text', placeholder = '') => (
    <div>
      <label className="block text-sm font-semibold text-gray-700 mb-1.5">{label}</label>
      <div className="relative">
        <input
          type={type === 'password' && showPw ? 'text' : type}
          required
          value={form[name]}
          onChange={(e) => setForm({ ...form, [name]: e.target.value })}
          className="w-full px-4 py-3 rounded-xl border border-sky-100 bg-sky-50/30 text-gray-900 placeholder-gray-400 focus:outline-none focus:border-sky-400 focus:ring-2 focus:ring-sky-100 transition-all text-sm pr-11"
          placeholder={placeholder}
        />
        {type === 'password' && (
          <button
            type="button"
            onClick={() => setShowPw(!showPw)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400"
          >
            {showPw ? <EyeOff size={18} /> : <Eye size={18} />}
          </button>
        )}
      </div>
      {errors[name] && <p className="text-red-500 text-xs mt-1">{errors[name]?.[0]}</p>}
    </div>
  )

  return (
    <div className="min-h-screen bg-white flex items-center justify-center px-4 py-10">
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 right-1/3 w-96 h-96 bg-slate-200 rounded-full blur-[100px] opacity-30" />
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
            <h1 className="text-2xl font-black text-gray-900">Create account</h1>
            <p className="text-gray-500 text-sm mt-1">Start your exam journey today</p>
          </div>

          {/* Google button */}
          <div className="flex justify-center mb-5">
            <GoogleLogin
              onSuccess={async (credentialResponse) => {
                const res = await googleLogin(credentialResponse.credential)
                if (res.success) {
                  navigate(res.created ? '/onboarding' : '/app')
                } else setErrors({ non_field_errors: [res.error] })
              }}
              onError={() => setErrors({ non_field_errors: ['Google signup failed. Try again.'] })}
              theme="outline"
              size="large"
              width="400"
              text="signup_with"
            />
          </div>

          <div className="relative flex items-center mb-5">
            <div className="flex-1 border-t border-gray-100" />
            <span className="px-3 text-xs text-gray-400 font-medium">or sign up with email</span>
            <div className="flex-1 border-t border-gray-100" />
          </div>

          <form onSubmit={submit} className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              {field('first_name', 'First name', 'text', 'John')}
              {field('last_name', 'Last name', 'text', 'Doe')}
            </div>
            {field('email', 'Email', 'email', 'you@example.com')}
            {field('password', 'Password', 'password', '••••••••')}

            {errors.non_field_errors && (
              <p className="text-red-500 text-sm text-center bg-red-50 px-4 py-2 rounded-xl">
                {errors.non_field_errors?.[0]}
              </p>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3.5 rounded-xl gradient-primary text-white font-bold text-sm shadow-glow hover:opacity-90 transition-all disabled:opacity-50"
            >
              {loading ? 'Creating account...' : 'Create Account'}
            </button>
          </form>

          <p className="text-center text-sm text-gray-500 mt-6">
            Already have an account?{' '}
            <Link to="/login" className="text-sky-600 font-semibold hover:text-sky-700">
              Sign in
            </Link>
          </p>
        </div>
      </motion.div>
    </div>
  )
}
