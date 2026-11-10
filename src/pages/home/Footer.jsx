import { Link } from 'react-router-dom'
import { FaTelegramPlane, FaInstagram } from 'react-icons/fa'
import Logo from '../../components/Logo.jsx'
import { SOCIALS } from './data'

const COLUMNS = [
  {
    title: 'Exams',
    links: [
      { label: 'SAT', to: '/app/sat' },
      { label: 'IELTS', to: '/app/ielts' },
      { label: 'CEFR', to: '/app/cefr' },
    ],
  },
  {
    title: 'Explore',
    links: [
      { label: 'Games', to: '/games' },
      { label: 'Study Tools', to: '/study' },
    ],
  },
  {
    title: 'Account',
    links: [
      { label: 'Sign in', to: '/login' },
      { label: 'Create account', to: '/register' },
    ],
  },
  {
    title: 'Support',
    links: [
      { label: 'Telegram Support', href: SOCIALS.support },
      { label: SOCIALS.phone.label, href: SOCIALS.phone.href },
    ],
  },
]

const SOCIAL_ICONS = [
  { label: 'ExamBridge on Telegram', href: SOCIALS.channel, icon: FaTelegramPlane },
  { label: 'ExamBridge on Instagram', href: SOCIALS.instagram, icon: FaInstagram },
]

const linkClass = 'inline-flex min-h-11 items-center lg:min-h-9 text-[14px] text-(--muted) transition-colors hover:text-(--ink)'

export default function Footer() {
  return (
    <footer className="border-t border-(--line)">
      <div className="eb-container eb-grid gap-y-12 py-16 lg:py-20">
        <div className="col-span-12 lg:col-span-4">
          <Link to="/" className="inline-flex h-11 items-center rounded-lg">
            <Logo className="h-9 w-auto" alt="ExamBridge — home" />
          </Link>
          <p className="mt-5 max-w-[280px] text-[15px] leading-relaxed text-(--muted)">
            Modern preparation platform for SAT, IELTS, and CEFR.
          </p>
          <ul className="mt-6 flex gap-2">
            {SOCIAL_ICONS.map((s) => (
              <li key={s.href}>
                <a
                  href={s.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={s.label}
                  className="grid h-11 w-11 place-items-center rounded-full text-(--muted) shadow-[inset_0_0_0_1px_var(--line-strong)] transition-colors hover:text-(--ink)"
                >
                  <s.icon aria-hidden="true" className="h-4 w-4" />
                </a>
              </li>
            ))}
          </ul>
        </div>

        <nav aria-label="Footer" className="col-span-12 grid grid-cols-2 gap-x-4 gap-y-10 sm:grid-cols-4 lg:col-span-8">
          {COLUMNS.map((col) => (
            <div key={col.title}>
              <h2 className="text-[13px] font-medium text-(--ink)">{col.title}</h2>
              <ul className="mt-3 flex flex-col">
                {col.links.map((l) => (
                  <li key={l.label}>
                    {l.to ? (
                      <Link to={l.to} className={linkClass}><span className="eb-ulink">{l.label}</span></Link>
                    ) : (
                      <a
                        href={l.href}
                        className={linkClass}
                        {...(l.href.startsWith('http') ? { target: '_blank', rel: 'noopener noreferrer' } : {})}
                      >
                        <span className="eb-ulink">{l.label}</span>
                      </a>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </nav>
      </div>

      <div className="eb-container">
        <div className="flex flex-col gap-2 border-t border-(--line) py-6 text-[13px] text-(--subtle) sm:flex-row sm:items-center sm:justify-between">
          <p>© {new Date().getFullYear()} ExamBridge. All rights reserved.</p>
          <p>SAT · IELTS · CEFR</p>
        </div>
      </div>
    </footer>
  )
}
