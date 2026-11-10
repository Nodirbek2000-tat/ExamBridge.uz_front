import { useCallback, useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { ArrowRight } from 'lucide-react'
import { useAuthStore } from '../../store/authStore'
import Logo from '../../components/Logo.jsx'
import { NAV } from './data'
import { REDUCED_MOTION } from './useMedia'

const SOLID_AFTER = 8     // px scrolled before the bar gets its background
const HIDE_AFTER = 120    // px scrolled before scrolling down hides the bar

function focusables(root) {
  return [...root.querySelectorAll('a[href], button:not([disabled])')].filter(
    (el) => el.offsetParent !== null && !el.closest('[inert]'),
  )
}

export default function Navbar() {
  const user = useAuthStore((s) => s.user)
  const [solid, setSolid] = useState(false)
  const [hidden, setHidden] = useState(false)
  const [open, setOpen] = useState(false)
  const rootRef = useRef(null)
  const toggleRef = useRef(null)

  // Solid after the top, hide on scroll down, show on scroll up.
  useEffect(() => {
    let lastY = window.scrollY
    let frame = 0
    const update = () => {
      frame = 0
      const y = window.scrollY
      setSolid(y > SOLID_AFTER)
      if (window.matchMedia(REDUCED_MOTION).matches || y < HIDE_AFTER) setHidden(false)
      else if (y > lastY + 4) setHidden(true)
      else if (y < lastY - 4) setHidden(false)
      lastY = y
    }
    const onScroll = () => { if (!frame) frame = requestAnimationFrame(update) }
    update()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => {
      window.removeEventListener('scroll', onScroll)
      cancelAnimationFrame(frame)
    }
  }, [])

  const close = useCallback((restoreFocus = false) => {
    setOpen(false)
    if (restoreFocus) toggleRef.current?.focus()
  }, [])

  // Mobile menu: lock page scroll, close on Escape, keep Tab inside, close on desktop width.
  useEffect(() => {
    if (!open) return
    const root = rootRef.current
    const html = document.documentElement
    const prevOverflow = html.style.overflow
    html.style.overflow = 'hidden'

    const onKey = (e) => {
      if (e.key === 'Escape') { e.preventDefault(); close(true); return }
      if (e.key !== 'Tab') return
      const items = focusables(root)
      if (!items.length) return
      const first = items[0]
      const last = items[items.length - 1]
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus() }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus() }
    }
    const desktop = window.matchMedia('(min-width: 1024px)')
    const onDesktop = (e) => { if (e.matches) close() }

    document.addEventListener('keydown', onKey)
    desktop.addEventListener('change', onDesktop)
    return () => {
      html.style.overflow = prevOverflow
      document.removeEventListener('keydown', onKey)
      desktop.removeEventListener('change', onDesktop)
    }
  }, [open, close])

  const authDesktop = user ? (
    <Link to="/app" className="eb-btn eb-btn-primary eb-btn-sm">
      Dashboard <ArrowRight aria-hidden="true" className="eb-arrow h-3.5 w-3.5" />
    </Link>
  ) : (
    <>
      <Link to="/login" className="eb-ulink hidden text-[14px] font-medium text-(--muted) transition-colors hover:text-(--ink) sm:inline-flex sm:h-11 sm:items-center lg:h-10">
        Sign in
      </Link>
      <Link to="/register" className="eb-btn eb-btn-primary eb-btn-sm">
        Get started
      </Link>
    </>
  )

  return (
    <header ref={rootRef} onFocus={() => setHidden(false)}>
      <div
        className="eb-nav fixed inset-x-0 top-0 z-[100]"
        data-solid={solid || open}
        data-hidden={hidden && !open}
      >
        <div className="eb-nav-bg" aria-hidden="true" />
        <nav aria-label="Main" className="eb-container relative flex h-16 items-center justify-between gap-4">
          <Link to="/" className="flex h-11 shrink-0 items-center rounded-lg" onClick={() => close()}>
            <Logo className="h-8 w-[126px]" alt="ExamBridge — home" />
          </Link>

          <ul className="absolute left-1/2 hidden -translate-x-1/2 items-center gap-7 lg:flex">
            {NAV.map((item) => (
              <li key={item.href}>
                <Link
                  to={item.href}
                  className="inline-flex h-10 items-center gap-1.5 text-[14px] font-medium text-(--muted) transition-colors hover:text-(--ink)"
                >
                  <span className="eb-ulink">{item.label}</span>
                  {item.isNew && <span className="eb-new">New</span>}
                </Link>
              </li>
            ))}
          </ul>

          <div className="flex items-center gap-2 sm:gap-5">
            <div className="flex items-center gap-5">{authDesktop}</div>
            <button
              ref={toggleRef}
              type="button"
              className="eb-burger -mr-2 flex h-11 w-11 flex-col items-center justify-center rounded-full lg:hidden"
              aria-expanded={open}
              aria-controls="eb-mobile-menu"
              aria-label={open ? 'Close menu' : 'Open menu'}
              onClick={() => setOpen((v) => !v)}
            >
              <span aria-hidden="true" />
              <span aria-hidden="true" />
            </button>
          </div>
        </nav>
      </div>

      {/* Full-screen mobile menu. A sibling of the bar: the bar's transform would trap a fixed child. */}
      <div
        id="eb-mobile-menu"
        className="eb-menu fixed inset-0 z-[90] overflow-y-auto bg-white pt-16 lg:hidden"
        data-open={open}
        inert={!open}
      >
        <div className="eb-container flex min-h-full flex-col pb-10 pt-6">
          <ul className="flex flex-col">
            {NAV.map((item, i) => (
              <li key={item.href} className="eb-menu-item border-b border-(--line)" style={{ '--i': i }}>
                <Link
                  to={item.href}
                  onClick={() => close()}
                  className="flex min-h-16 items-center justify-between gap-3 py-3 text-[32px] font-semibold tracking-[-0.03em]"
                >
                  <span className="flex items-center gap-3">
                    {item.label}
                    {item.isNew && <span className="eb-new">New</span>}
                  </span>
                  <ArrowRight aria-hidden="true" className="h-5 w-5 text-(--subtle)" />
                </Link>
              </li>
            ))}
          </ul>

          <div className="eb-menu-item mt-auto flex flex-col gap-3 pt-10" style={{ '--i': NAV.length }}>
            {user ? (
              <Link to="/app" onClick={() => close()} className="eb-btn eb-btn-primary eb-btn-lg w-full">
                Dashboard
              </Link>
            ) : (
              <>
                <Link to="/register" onClick={() => close()} className="eb-btn eb-btn-primary eb-btn-lg w-full">
                  Get started
                </Link>
                <Link to="/login" onClick={() => close()} className="eb-btn eb-btn-ghost eb-btn-lg w-full">
                  Sign in
                </Link>
              </>
            )}
          </div>
        </div>
      </div>
    </header>
  )
}
