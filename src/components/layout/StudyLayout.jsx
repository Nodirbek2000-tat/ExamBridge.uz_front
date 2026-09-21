import { Outlet, NavLink, useNavigate } from 'react-router-dom'
import { Newspaper, Repeat2, PenLine, Mic2, Headphones } from 'lucide-react'
import LazyBoundary from '../LazyBoundary'
import Logo from '../Logo.jsx'
import { useAuthStore } from '../../store/authStore'

// Left rail — the Study Tools sections
export const STUDY_NAV = [
  { key: 'articles', label: 'Articles', to: '/study/articles', icon: Newspaper },
  { key: 'shadowing', label: 'Shadowing', to: '/study/shadowing', icon: Repeat2 },
  { key: 'writing', label: 'Writing Samples', to: '/study/writing-samples', icon: PenLine },
  { key: 'speaking', label: 'Speaking Samples', to: '/study/speaking-samples', icon: Mic2 },
  { key: 'podcasts', label: 'Podcasts', to: '/study/podcasts', icon: Headphones },
]

// Top bar — the same primary destinations as the landing header
const TOP_NAV = [
  { label: 'SAT', to: '/app/sat' },
  { label: 'IELTS', to: '/app/ielts' },
  { label: 'CEFR', to: '/app/cefr' },
  { label: 'Games', to: '/games' },
  { label: 'Study Tools', to: '/study' },
]

export default function StudyLayout() {
  const navigate = useNavigate()
  const user = useAuthStore((s) => s.user)

  return (
    <div className="min-h-screen bg-[#F7F8FB]">
      {/* Top bar — primary sections, slightly larger */}
      <header className="sticky top-0 z-30 border-b border-slate-200/70 bg-white/90 backdrop-blur-md">
        <div className="mx-auto flex h-[72px] max-w-[1400px] items-center gap-8 px-4 sm:px-8">
          <button type="button" onClick={() => navigate('/app')} className="flex-shrink-0">
            <Logo className="h-10 w-auto" />
          </button>

          <nav className="hidden flex-1 items-center gap-2 md:flex">
            {TOP_NAV.map(({ label, to }) => (
              <NavLink
                key={to}
                to={to}
                className={({ isActive }) =>
                  `rounded-xl px-4 py-2.5 text-[15px] font-semibold transition-colors ${
                    isActive
                      ? 'bg-slate-900 text-white'
                      : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                  }`
                }
              >
                {label}
              </NavLink>
            ))}
          </nav>

          <button
            type="button"
            onClick={() => navigate('/app/profile')}
            className="ml-auto flex flex-shrink-0 items-center gap-2.5 rounded-full border border-slate-200 bg-white py-1.5 pl-1.5 pr-4 shadow-sm transition-colors hover:border-sky-200"
          >
            <span className="flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br from-sky-500 to-blue-600 text-sm font-bold text-white">
              {user?.first_name?.[0]?.toUpperCase() || user?.email?.[0]?.toUpperCase() || 'U'}
            </span>
            <span className="hidden text-sm font-bold text-slate-800 sm:inline">
              {user?.full_name || user?.email}
            </span>
          </button>
        </div>

        {/* Mobile: top nav scrolls */}
        <div className="flex gap-1.5 overflow-x-auto px-4 pb-3 md:hidden">
          {TOP_NAV.map(({ label, to }) => (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) =>
                `flex-shrink-0 rounded-full px-3.5 py-1.5 text-xs font-bold whitespace-nowrap transition-colors ${
                  isActive ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-600'
                }`
              }
            >
              {label}
            </NavLink>
          ))}
        </div>
      </header>

      <div className="mx-auto flex max-w-[1400px] gap-6 px-4 py-6 sm:px-8">
        {/* Left rail — Study sections */}
        <aside className="hidden w-60 flex-shrink-0 lg:block">
          <nav className="sticky top-[92px] space-y-2">
            {STUDY_NAV.map(({ key, label, to, icon: Icon }) => (
              <NavLink
                key={key}
                to={to}
                className={({ isActive }) =>
                  `flex items-center gap-3 rounded-2xl border px-4 py-3 text-[15px] font-bold transition-all ${
                    isActive
                      ? 'border-violet-300 bg-violet-50 text-violet-700 shadow-sm'
                      : 'border-slate-200 bg-white text-slate-700 hover:border-violet-200 hover:bg-violet-50/40'
                  }`
                }
              >
                {({ isActive }) => (
                  <>
                    <span
                      className={`flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl transition-colors ${
                        isActive ? 'bg-violet-500 text-white' : 'bg-slate-100 text-slate-500'
                      }`}
                    >
                      <Icon size={17} />
                    </span>
                    {label}
                  </>
                )}
              </NavLink>
            ))}
          </nav>
        </aside>

        {/* Mobile: section rail scrolls horizontally */}
        <div className="min-w-0 flex-1">
          <div className="mb-5 flex gap-2 overflow-x-auto lg:hidden">
            {STUDY_NAV.map(({ key, label, to, icon: Icon }) => (
              <NavLink
                key={key}
                to={to}
                className={({ isActive }) =>
                  `flex flex-shrink-0 items-center gap-2 rounded-2xl border px-3.5 py-2 text-sm font-bold whitespace-nowrap transition-colors ${
                    isActive
                      ? 'border-violet-300 bg-violet-50 text-violet-700'
                      : 'border-slate-200 bg-white text-slate-600'
                  }`
                }
              >
                <Icon size={15} />
                {label}
              </NavLink>
            ))}
          </div>

          <LazyBoundary>
            <Outlet />
          </LazyBoundary>
        </div>
      </div>
    </div>
  )
}
