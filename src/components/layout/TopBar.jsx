import { useEffect, useRef, useState } from 'react'
import { Menu, LogOut, ChevronDown } from 'lucide-react'
import { useAuthStore } from '../../store/authStore'
import { NavLink, useNavigate } from 'react-router-dom'
import Logo from '../Logo.jsx'

export default function TopBar({ onMenuClick }) {
  const user = useAuthStore((s) => s.user)
  const logout = useAuthStore((s) => s.logout)
  const navigate = useNavigate()
  const [open, setOpen] = useState(false)
  const ref = useRef(null)

  const initial = user?.first_name?.[0]?.toUpperCase()
    || user?.full_name?.[0]?.toUpperCase()
    || user?.email?.[0]?.toUpperCase()
    || 'U'

  useEffect(() => {
    const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false) }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const handleLogout = async () => {
    setOpen(false)
    await logout()
    navigate('/login')
  }

  return (
    <header className="h-16 glass border-b border-sky-100 flex items-center px-6 gap-4 sticky top-0 z-10">
      <button
        onClick={onMenuClick}
        className="lg:hidden p-2 rounded-lg hover:bg-sky-50 text-gray-600"
      >
        <Menu size={20} />
      </button>

      <div className="flex-1" />

      <NavLink
        to="/app/subscription"
        className="hidden sm:flex items-center gap-2 px-4 py-1.5 rounded-full gradient-primary text-white text-sm font-semibold shadow-glow hover:opacity-90 transition-opacity"
      >
        <span>⚡</span> Upgrade
      </NavLink>

      <div ref={ref} className="relative">
        <button
          type="button"
          onClick={() => setOpen((p) => !p)}
          className={`flex items-center gap-2 sm:gap-2.5 rounded-full border bg-white pl-1.5 pr-2 sm:pr-3 py-1 shadow-sm shadow-sky-500/5 outline-none transition-colors ${
            open ? 'border-sky-300 ring-2 ring-sky-100' : 'border-sky-100 hover:border-sky-200 hover:bg-sky-50/60'
          }`}
          aria-expanded={open}
          aria-haspopup="menu"
          title={user?.full_name || user?.email}
        >
          <span className="w-9 h-9 rounded-full gradient-primary flex items-center justify-center shadow-glow shrink-0">
            <span className="text-white font-bold text-sm">{initial}</span>
          </span>
          <span className="hidden sm:flex flex-col items-start max-w-[9.5rem] min-w-0 text-left">
            <span className="text-xs font-bold text-gray-900 truncate w-full">{user?.full_name || user?.first_name || 'Account'}</span>
            <span className={`text-[10px] font-semibold truncate w-full ${user?.is_premium ? 'text-amber-600' : 'text-sky-600'}`}>
              {user?.is_premium ? '⚡ Premium' : 'Free'}
            </span>
          </span>
          <ChevronDown size={16} strokeWidth={2.25} className={`text-sky-500 shrink-0 transition-transform ${open ? 'rotate-180' : ''}`} />
        </button>

        {open && (
          <div
            role="menu"
            className="absolute right-0 top-[calc(100%+10px)] w-64 bg-white rounded-2xl shadow-xl shadow-sky-500/15 border border-sky-100 py-2 z-50 overflow-hidden ring-1 ring-sky-500/10"
          >
            <div className="px-4 py-3.5 bg-gradient-to-br from-sky-50 via-white to-sky-50/40 border-b border-sky-100">
              <div className="flex items-start gap-3">
                <div className="w-11 h-11 rounded-full gradient-primary flex items-center justify-center shadow-glow shrink-0 ring-2 ring-white">
                  <span className="text-white font-bold text-base">{initial}</span>
                </div>
                <div className="min-w-0 flex-1 pt-0.5">
                  <p className="text-sm font-bold text-gray-900 truncate">{user?.full_name || user?.first_name || 'User'}</p>
                  <p className="text-xs text-gray-500 truncate mt-0.5">{user?.email}</p>
                  <span
                    className={`inline-flex mt-2 text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                      user?.is_premium
                        ? 'bg-amber-50 text-amber-800 border-amber-200'
                        : 'bg-sky-100 text-sky-700 border-sky-200'
                    }`}
                  >
                    {user?.is_premium ? '⚡ Premium' : 'Free'}
                  </span>
                </div>
              </div>
            </div>
            <button
              type="button"
              role="menuitem"
              onClick={handleLogout}
              className="w-full flex items-center gap-3 px-4 py-2.5 text-sm font-medium text-sky-900 hover:bg-sky-50 transition-colors"
            >
              <LogOut size={15} className="text-sky-500" strokeWidth={2.25} />
              Log out
            </button>
          </div>
        )}
      </div>
    </header>
  )
}
