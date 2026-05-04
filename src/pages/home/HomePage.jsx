import { useEffect, useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuthStore } from '../../store/authStore'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import {
  Calculator, Globe, BookOpen,
  Headphones, Mic, PenLine,
  ArrowRight, Shield, BarChart3, Sparkles,
  Star, Zap, Brain, Target, Trophy, Layers, TrendingUp, ChevronDown, LogOut,
  Send,
} from 'lucide-react'
import { FaTelegramPlane, FaInstagram, FaYoutube, FaFacebookF } from 'react-icons/fa'
import Logo from '../../components/Logo.jsx'

gsap.registerPlugin(ScrollTrigger)

// ─── Color tokens ─────────────────────────────────────────────────────────────
// Neon cyan: #00D4FF  |  Sky: #0EA5E9  |  Blue: #2563EB
// All light sections: pure white (#fff) with blue/cyan neon accents

// ─── Data ─────────────────────────────────────────────────────────────────────
const NAV = [
  { label: 'SAT',      href: '/app/sat' },
  { label: 'IELTS',    href: '/app/ielts' },
  { label: 'CEFR',     href: '/app/cefr' },
  { label: 'Features', href: '#features' },
  { label: 'Pricing',  href: '#pricing' },
]

const EXAMS = [
  {
    icon: Calculator, name: 'SAT', href: '/app/sat',
    desc: 'Full-length adaptive SAT with timed Math & Reading/Writing modules.',
    from: '#0EA5E9', to: '#2563EB', glow: 'rgba(14,165,233,0.25)',
    skills: ['Math', 'Reading & Writing', 'Mock Tests'],
    badge: '400 – 1600',
  },
  {
    icon: Globe, name: 'IELTS', href: '/app/ielts',
    desc: 'Academic & General paths — AI writing scores and speaking evaluation.',
    from: '#6366F1', to: '#0EA5E9', glow: 'rgba(99,102,241,0.22)',
    skills: ['Reading', 'Listening', 'Speaking', 'Writing'],
    badge: 'Band 0 – 9',
  },
  {
    icon: BookOpen, name: 'CEFR', href: '/app/cefr',
    desc: 'Level-based English from A1 to C2 with structured grammar practice.',
    from: '#8B5CF6', to: '#00D4FF', glow: 'rgba(139,92,246,0.22)',
    skills: ['Grammar', 'Reading', 'A1 → C2'],
    badge: 'A1 → C2',
  },
]

const FEATURES = [
  { icon: Shield,   title: 'Real Exam Mode',        desc: 'Fullscreen, timed, locked-down exam simulation — just like test day.' },
  { icon: Sparkles, title: 'AI Feedback',            desc: 'Writing and speaking analyzed with scores and improvement hints.' },
  { icon: BarChart3,title: 'Progress Analytics',     desc: 'Weak areas, accuracy by topic, streaks — all in one dashboard.' },
  { icon: Star,     title: 'Premium Question Bank',  desc: 'Curated exam-style questions updated for serious test prep.' },
]

const MARQUEE_ITEMS = [
  { icon: Trophy,  text: 'SAT Full Mocks' },
  { icon: Zap,     text: 'AI Speaking Eval' },
  { icon: Brain,   text: 'Adaptive Practice' },
  { icon: Target,  text: 'IELTS Band 9 Prep' },
  { icon: Layers,  text: 'CEFR A1 → C2' },
  { icon: Shield,  text: 'Real Exam Mode' },
  { icon: BarChart3,text: 'Progress Tracking' },
  { icon: Star,    text: 'Premium Questions' },
  { icon: Sparkles,text: 'AI Writing Scores' },
  { icon: Globe,   text: 'Digital SAT 2025' },
]

// ─── Custom Cursor (neon glow) ────────────────────────────────────────────────
function CustomCursor() {
  const dotRef  = useRef(null)
  const ringRef = useRef(null)
  const trailRef = useRef(null)
  const mouse   = useRef({ x: -300, y: -300 })
  const ring    = useRef({ x: -300, y: -300 })

  useEffect(() => {
    if (!window.matchMedia('(pointer: fine)').matches) return
    const dot  = dotRef.current
    const ro   = ringRef.current
    const tr   = trailRef.current
    if (!dot || !ro) return

    gsap.set([dot, ro, tr].filter(Boolean), { xPercent: -50, yPercent: -50, opacity: 0 })

    const onMove = (e) => {
      mouse.current = { x: e.clientX, y: e.clientY }
      gsap.set(dot, { x: e.clientX, y: e.clientY })
      gsap.to([dot, ro, tr].filter(Boolean), { opacity: 1, duration: 0.35, overwrite: 'auto' })
    }

    let raf
    const followRing = () => {
      ring.current.x += (mouse.current.x - ring.current.x) * 0.09
      ring.current.y += (mouse.current.y - ring.current.y) * 0.09
      gsap.set(ro, { x: ring.current.x, y: ring.current.y })
      if (tr) gsap.set(tr, { x: ring.current.x + (mouse.current.x - ring.current.x) * 0.5, y: ring.current.y + (mouse.current.y - ring.current.y) * 0.5 })
      raf = requestAnimationFrame(followRing)
    }
    raf = requestAnimationFrame(followRing)

    // Hover effects
    const grow = () => {
      gsap.to(ro, { scale: 2.4, background: 'rgba(0,212,255,0.08)', borderColor: 'rgba(0,212,255,1)', duration: 0.3, ease: 'power2.out' })
      gsap.to(dot, { scale: 0.5, background: '#00D4FF', duration: 0.25 })
    }
    const shrink = () => {
      gsap.to(ro, { scale: 1, background: 'transparent', borderColor: 'rgba(0,212,255,0.5)', duration: 0.35, ease: 'power2.out' })
      gsap.to(dot, { scale: 1, background: '#00D4FF', duration: 0.3 })
    }

    const onOver = (e) => { if (e.target.closest('a, button, [data-hover]')) grow() }
    const onOut  = (e) => { if (e.target.closest('a, button, [data-hover]')) shrink() }
    document.addEventListener('mouseover',  onOver)
    document.addEventListener('mouseout',   onOut)
    window.addEventListener('mousemove', onMove, { passive: true })

    return () => {
      window.removeEventListener('mousemove', onMove)
      document.removeEventListener('mouseover', onOver)
      document.removeEventListener('mouseout',  onOut)
      cancelAnimationFrame(raf)
    }
  }, [])

  return (
    <>
      {/* Soft trailing glow */}
      <div
        ref={trailRef}
        className="fixed top-0 left-0 w-7 h-7 rounded-full pointer-events-none z-[9998] will-change-transform"
        style={{ background: 'rgba(0,212,255,0.22)', filter: 'blur(6px)' }}
      />
      {/* Neon dot */}
      <div
        ref={dotRef}
        className="fixed top-0 left-0 w-2.5 h-2.5 rounded-full pointer-events-none z-[9999] will-change-transform"
        style={{ background: '#00D4FF', boxShadow: '0 0 10px 3px rgba(0,212,255,0.8), 0 0 22px 6px rgba(0,212,255,0.3)' }}
      />
      {/* Lagging ring */}
      <div
        ref={ringRef}
        className="fixed top-0 left-0 w-10 h-10 rounded-full border-2 pointer-events-none z-[9999] will-change-transform"
        style={{ borderColor: 'rgba(0,212,255,0.5)', boxShadow: '0 0 14px rgba(0,212,255,0.25)' }}
      />
    </>
  )
}

// ─── Navbar ────────────────────────────────────────────────────────────────────
function Navbar() {
  const navRef = useRef(null)
  const dropRef = useRef(null)
  const [scrolled, setScrolled] = useState(false)
  const [dropOpen, setDropOpen] = useState(false)
  const user = useAuthStore((s) => s.user)
  const logout = useAuthStore((s) => s.logout)
  const navigate = useNavigate()

  const initial = user
    ? (user.first_name?.[0] || user.full_name?.[0] || user.email?.[0] || 'U').toUpperCase()
    : null

  const displayName = user
    ? (() => {
        const fn = user.first_name?.trim()
        const ln = user.last_name?.trim()
        if (fn && ln) return `${fn} ${ln}`
        if (user.full_name?.trim()) return user.full_name.trim()
        if (fn) return fn
        return user.email?.split('@')[0] || 'User'
      })()
    : ''

  useEffect(() => {
    gsap.fromTo(navRef.current, { y: -28, opacity: 0 }, { y: 0, opacity: 1, duration: 0.9, ease: 'power3.out', delay: 0.15 })
    const fn = () => setScrolled(window.scrollY > 36)
    window.addEventListener('scroll', fn, { passive: true })
    return () => window.removeEventListener('scroll', fn)
  }, [])

  useEffect(() => {
    const handler = (e) => { if (dropRef.current && !dropRef.current.contains(e.target)) setDropOpen(false) }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const handleLogout = async () => {
    setDropOpen(false)
    await logout()
    navigate('/login')
  }

  return (
    <nav
      ref={navRef}
      className={`fixed top-0 left-0 right-0 z-[100] transition-all duration-500 ${
        scrolled
          ? 'bg-white/95 backdrop-blur-xl border-b border-slate-200/60 shadow-sm'
          : 'bg-white/70 backdrop-blur-md border-b border-slate-200/40'
      }`}
    >
      <div className="max-w-6xl mx-auto px-5 sm:px-6 h-16 flex items-center justify-between">
        <Link to="/" className="z-10 shrink-0"><Logo className="h-9 w-auto" /></Link>

        <div className="hidden lg:flex absolute left-1/2 -translate-x-1/2 items-center gap-0.5">
          {NAV.map(item => (
            <Link
              key={item.label} to={item.href}
              className="px-4 py-2 text-[13px] font-medium text-slate-600 hover:text-slate-900 transition-colors"
            >
              {item.label}
            </Link>
          ))}
        </div>

        <div className="flex items-center gap-2">
          {user ? (
            <div ref={dropRef} className="relative">
              <button
                type="button"
                onClick={() => setDropOpen((p) => !p)}
                className={`flex items-center gap-2 rounded-full border bg-white/90 pl-1.5 pr-2 py-1 shadow-sm backdrop-blur-sm transition-colors ${
                  dropOpen ? 'border-sky-400 ring-2 ring-sky-100' : 'border-sky-200/80 hover:border-sky-300 hover:bg-sky-50/50'
                }`}
                aria-expanded={dropOpen}
                title={displayName}
              >
                <span className="w-9 h-9 rounded-full gradient-primary flex items-center justify-center text-white font-bold text-sm shadow-glow shrink-0">
                  {initial}
                </span>
                <span className="min-w-0 pl-0.5 pr-0.5 hidden min-[380px]:block text-left">
                  <span className="text-[12px] sm:text-[13px] font-bold text-slate-800 truncate block max-w-[8rem] sm:max-w-[13rem]">
                    {displayName}
                  </span>
                </span>
                <ChevronDown size={16} className={`text-sky-500 shrink-0 transition-transform ${dropOpen ? 'rotate-180' : ''}`} />
              </button>
              {dropOpen && (
                <div className="absolute right-0 top-[calc(100%+10px)] w-60 bg-white rounded-2xl shadow-xl shadow-sky-500/15 border border-sky-100 py-2 z-50 overflow-hidden ring-1 ring-sky-500/10">
                  <div className="px-4 py-3.5 bg-gradient-to-br from-sky-50 via-white to-sky-50/40 border-b border-sky-100">
                    <div className="flex items-start gap-3">
                      <span className="w-10 h-10 rounded-full gradient-primary flex items-center justify-center text-white font-bold shrink-0 ring-2 ring-white shadow-glow">
                        {initial}
                      </span>
                      <div className="min-w-0 flex-1 pt-0.5">
                        <p className="text-sm font-bold text-gray-900 truncate">{displayName}</p>
                        <p className="text-xs text-gray-500 truncate mt-0.5">{user.email}</p>
                        <span
                          className={`inline-flex mt-2 text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                            user?.is_premium ? 'bg-amber-50 text-amber-800 border-amber-200' : 'bg-sky-100 text-sky-700 border-sky-200'
                          }`}
                        >
                          {user?.is_premium ? '⚡ Premium' : 'Free'}
                        </span>
                      </div>
                    </div>
                  </div>
                  <Link
                    to="/app"
                    onClick={() => setDropOpen(false)}
                    className="flex items-center gap-3 px-4 py-2.5 text-sm font-medium text-sky-950 hover:bg-sky-50 transition-colors"
                  >
                    Go to Dashboard
                  </Link>
                  <button
                    type="button"
                    onClick={handleLogout}
                    className="w-full flex items-center gap-3 px-4 py-2.5 text-sm font-medium text-sky-900 hover:bg-sky-50 transition-colors"
                  >
                    <LogOut size={15} className="text-sky-500 shrink-0" strokeWidth={2.25} />
                    Log out
                  </button>
                </div>
              )}
            </div>
          ) : (
            <>
              <Link to="/login" className="hidden sm:inline px-3 py-2 text-[13px] font-medium text-slate-600 hover:text-slate-900 transition-colors">
                Sign in
              </Link>
              <Link
                to="/register"
                className="inline-flex items-center gap-1.5 rounded-full px-5 py-2.5 text-sm font-bold text-white transition-all"
                style={{ background: 'linear-gradient(135deg,#0EA5E9,#00D4FF)', boxShadow: '0 4px 18px rgba(0,212,255,0.35)' }}
              >
                Get Started <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </>
          )}
        </div>
      </div>
    </nav>
  )
}

// ─── Char-split reveal ─────────────────────────────────────────────────────────
function RevealText({ text, el: Tag = 'h1', delay = 0, className }) {
  const ref = useRef(null)
  useEffect(() => {
    if (!ref.current) return
    gsap.fromTo(
      ref.current.querySelectorAll('.c'),
      { yPercent: 120, opacity: 0 },
      { yPercent: 0, opacity: 1, duration: 0.8, stagger: 0.022, ease: 'power4.out', delay }
    )
  }, [delay])
  return (
    <Tag ref={ref} className={className} aria-label={text}>
      {text.split('').map((ch, i) => (
        <span key={i} className="inline-block overflow-hidden" style={{ verticalAlign: 'bottom' }}>
          <span className="c inline-block">{ch === ' ' ? '\u00A0' : ch}</span>
        </span>
      ))}
    </Tag>
  )
}

// ─── Magnetic Button ───────────────────────────────────────────────────────────
function MagBtn({ to, children, variant = 'neon', className = '' }) {
  const wrap  = useRef(null)
  const inner = useRef(null)
  const move  = (e) => {
    const r = wrap.current.getBoundingClientRect()
    const dx = e.clientX - (r.left + r.width / 2)
    const dy = e.clientY - (r.top  + r.height / 2)
    gsap.to(wrap.current,  { x: dx * 0.3, y: dy * 0.3, duration: 0.4, ease: 'power2.out' })
    gsap.to(inner.current, { x: dx * 0.1, y: dy * 0.1, duration: 0.4, ease: 'power2.out' })
  }
  const leave = () => gsap.to([wrap.current, inner.current], { x: 0, y: 0, duration: 0.65, ease: 'elastic.out(1,0.5)' })

  const variants = {
    neon:    { style: { background: 'linear-gradient(135deg,#0EA5E9,#00D4FF)', boxShadow: '0 4px 24px rgba(0,212,255,0.4)' }, cls: 'text-white' },
    ghost:   { style: { background: '#fff', border: '1.5px solid rgba(14,165,233,0.25)', boxShadow: '0 2px 12px rgba(14,165,233,0.08)' }, cls: 'text-sky-600' },
    white:   { style: { background: '#fff', border: '1.5px solid rgba(255,255,255,0.3)', boxShadow: '0 4px 20px rgba(0,0,0,0.18)' }, cls: 'text-slate-900' },
    outline: { style: { border: '1.5px solid rgba(255,255,255,0.22)', background: 'rgba(255,255,255,0.07)' }, cls: 'text-white/90' },
    dark:    { style: { background: '#0B1628', border: '1.5px solid rgba(14,165,233,0.35)', boxShadow: '0 4px 20px rgba(0,0,0,0.2)' }, cls: 'text-white' },
  }
  const v = variants[variant]

  return (
    <div ref={wrap} className="inline-block will-change-transform">
      <Link
        to={to}
        onMouseMove={move}
        onMouseLeave={leave}
        style={v.style}
        className={`inline-flex items-center gap-2 px-8 py-3.5 rounded-full text-[15px] font-bold transition-opacity overflow-hidden group relative ${v.cls} ${className}`}
      >
        <span aria-hidden className="absolute inset-0 pointer-events-none translate-x-[-120%] group-hover:translate-x-[120%] transition-transform duration-700 ease-out bg-gradient-to-r from-transparent via-white/25 to-transparent" />
        <span ref={inner} className="relative z-10 inline-flex items-center gap-2 will-change-transform">{children}</span>
      </Link>
    </div>
  )
}

// ─── Floating Hero Card ────────────────────────────────────────────────────────
function FloatCard({ style, children, delay = 0 }) {
  const ref = useRef(null)
  useEffect(() => {
    if (!ref.current) return
    gsap.fromTo(ref.current, { opacity: 0, y: 32, scale: 0.88 }, { opacity: 1, y: 0, scale: 1, duration: 1.1, delay, ease: 'power3.out' })
    gsap.to(ref.current, { y: '-=16', duration: 2.6 + delay * 0.5, repeat: -1, yoyo: true, ease: 'sine.inOut', delay: delay * 0.4 })
  }, [delay])
  return (
    <div ref={ref} className="absolute hidden lg:block pointer-events-none select-none" style={{ ...style, opacity: 0 }}>
      {children}
    </div>
  )
}

// ─── Hero ──────────────────────────────────────────────────────────────────────
function Hero() {
  const badgeRef  = useRef(null)
  const subRef    = useRef(null)
  const btnsRef   = useRef(null)
  const scrollRef = useRef(null)
  const orb1Ref   = useRef(null)
  const orb2Ref   = useRef(null)

  useEffect(() => {
    gsap.timeline({ defaults: { ease: 'power3.out' } })
      .fromTo(badgeRef.current,  { opacity: 0, y: 18 }, { opacity: 1, y: 0, duration: 0.65 }, 0.45)
      .fromTo(subRef.current,    { opacity: 0, y: 24 }, { opacity: 1, y: 0, duration: 0.7  }, 1.2)
      .fromTo(btnsRef.current,   { opacity: 0, y: 18 }, { opacity: 1, y: 0, duration: 0.65 }, 1.45)
      .fromTo(scrollRef.current, { opacity: 0 },        { opacity: 1, duration: 0.5 }, 1.95)

    const onMove = (e) => {
      const nx = (e.clientX / window.innerWidth  - 0.5)
      const ny = (e.clientY / window.innerHeight - 0.5)
      gsap.to(orb1Ref.current, { x: nx * 70, y: ny * 50, duration: 1.6, ease: 'power1.out' })
      gsap.to(orb2Ref.current, { x: nx * -45, y: ny * -30, duration: 2, ease: 'power1.out' })
    }
    window.addEventListener('mousemove', onMove, { passive: true })
    return () => window.removeEventListener('mousemove', onMove)
  }, [])

  const whiteCard = 'bg-white rounded-2xl border border-slate-200/80 shadow-[0_8px_32px_-8px_rgba(14,165,233,0.18)]'

  return (
    <section
      className="relative min-h-[100vh] flex flex-col items-center justify-center pt-20 pb-14 px-5 overflow-hidden bg-white"
    >
      {/* Very subtle dot grid */}
      <div className="absolute inset-0 pointer-events-none" style={{
        backgroundImage: 'radial-gradient(circle, rgba(14,165,233,0.12) 1px, transparent 1px)',
        backgroundSize: '40px 40px',
      }} />

      {/* Soft orb glows — move with mouse */}
      <div ref={orb1Ref} className="absolute pointer-events-none will-change-transform" style={{ width: 900, height: 700, top: '-15%', left: '30%', background: 'radial-gradient(ellipse,rgba(0,212,255,0.1) 0%,rgba(14,165,233,0.04) 40%,transparent 68%)' }} />
      <div ref={orb2Ref} className="absolute pointer-events-none will-change-transform" style={{ width: 600, height: 500, bottom: '5%', left: '0%', background: 'radial-gradient(ellipse,rgba(99,102,241,0.09) 0%,transparent 62%)' }} />

      {/* Floating white cards */}
      <FloatCard style={{ top: '20%', right: '5.5%' }} delay={1.7}>
        <div className={`${whiteCard} px-5 py-4 min-w-[152px]`}>
          <p className="text-[10px] text-slate-400 font-semibold mb-1.5 uppercase tracking-widest">SAT Score</p>
          <p className="text-[1.65rem] font-black text-slate-900 leading-none mb-2">1540<span className="text-slate-300 text-base">/1600</span></p>
          <div className="h-1.5 w-full rounded-full overflow-hidden bg-slate-100">
            <div className="h-full rounded-full" style={{ width: '96%', background: 'linear-gradient(90deg,#0EA5E9,#00D4FF)', boxShadow: '0 0 8px rgba(0,212,255,0.5)' }} />
          </div>
          <p className="text-[10px] mt-1.5 font-bold text-sky-500">Top 3%</p>
        </div>
      </FloatCard>

      <FloatCard style={{ top: '52%', right: '4%' }} delay={2.0}>
        <div className={`${whiteCard} px-5 py-4`}>
          <p className="text-[10px] text-slate-400 font-semibold mb-1.5 uppercase tracking-widest">IELTS</p>
          <p className="text-[1.65rem] font-black text-slate-900 leading-none">8.5</p>
          <p className="text-[10px] mt-1 font-bold text-sky-500">Expert Level</p>
        </div>
      </FloatCard>

      <FloatCard style={{ top: '26%', left: '4.5%' }} delay={2.2}>
        <div className={`${whiteCard} px-5 py-4`}>
          <p className="text-[10px] text-slate-400 font-semibold mb-1.5 uppercase tracking-widest">CEFR</p>
          <p className="text-[1.65rem] font-black text-slate-900 leading-none">C1</p>
          <p className="text-[10px] mt-1 font-bold" style={{ color: '#8B5CF6' }}>Advanced</p>
        </div>
      </FloatCard>

      <FloatCard style={{ bottom: '24%', left: '5.5%' }} delay={2.45}>
        <div className={`${whiteCard} px-4 py-3 flex items-center gap-3`}>
          <span className="w-2 h-2 rounded-full flex-shrink-0 animate-pulse bg-emerald-400" style={{ boxShadow: '0 0 6px rgba(74,222,128,0.7)' }} />
          <span className="text-[12px] text-slate-600 font-medium">AI feedback ready</span>
        </div>
      </FloatCard>

      {/* Main content */}
      <div className="relative z-10 max-w-[900px] mx-auto text-center flex flex-col items-center">
        <div ref={badgeRef} className="opacity-0 mb-9">
          <span
            className="inline-flex items-center gap-2.5 px-5 py-2.5 rounded-full text-sm font-bold text-sky-600"
            style={{ background: 'rgba(14,165,233,0.08)', border: '1px solid rgba(14,165,233,0.2)' }}
          >
            <span className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ background: '#00D4FF', boxShadow: '0 0 8px #00D4FF' }} />
            AI-powered exam preparation
          </span>
        </div>

        {/* Headline */}
        <RevealText
          text="Your path to the"
          el="div"
          delay={0.55}
          className="text-[2.5rem] sm:text-5xl lg:text-[4rem] font-black leading-none tracking-[-0.03em] text-slate-900"
        />
        <div className="overflow-hidden mt-1 mb-8">
          <div className="c-line">
            <RevealText
              text="perfect score."
              el="div"
              delay={0.8}
              className="text-[2.5rem] sm:text-5xl lg:text-[4rem] font-black leading-none tracking-[-0.03em]"
            />
          </div>
        </div>
        {/* "perfect score." — neon cyan gradient */}
        <style>{`
          .c-line .c { background: linear-gradient(90deg,#0EA5E9 0%,#00D4FF 50%,#0EA5E9 100%); -webkit-background-clip:text; -webkit-text-fill-color:transparent; background-clip:text; }
        `}</style>

        <p ref={subRef} className="opacity-0 text-slate-500 text-base sm:text-[1.125rem] max-w-[500px] mx-auto mb-11 leading-relaxed">
          SAT, IELTS, and CEFR — full mocks, real exam mode, adaptive practice, and AI feedback that moves your score.
        </p>

        <div ref={btnsRef} className="opacity-0 flex flex-wrap gap-3.5 justify-center">
          <MagBtn to="/register" variant="neon">
            Start free <ArrowRight className="w-4 h-4" />
          </MagBtn>
          <MagBtn to="/app/sat" variant="ghost">
            Explore exams
          </MagBtn>
        </div>
      </div>

      {/* Scroll indicator */}
      <div ref={scrollRef} className="opacity-0 absolute bottom-8 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2">
        <span className="text-[10px] font-semibold tracking-[0.25em] uppercase text-slate-300">Scroll</span>
        <div className="w-5 h-8 rounded-full flex justify-center pt-1.5 border-2 border-slate-200">
          <div className="w-1 h-1.5 rounded-full bg-sky-400" style={{ animation: 'sdot 2s ease-in-out infinite' }} />
        </div>
      </div>
      <style>{`@keyframes sdot{0%,100%{transform:translateY(0);opacity:.7}55%{transform:translateY(10px);opacity:.15}}`}</style>
    </section>
  )
}

// ─── Marquee / Ticker ─────────────────────────────────────────────────────────
function Marquee() {
  const trackRef = useRef(null)

  useEffect(() => {
    const track = trackRef.current
    if (!track) return
    // Duplicate items for seamless loop
    track.innerHTML += track.innerHTML
    const totalW = track.scrollWidth / 2
    gsap.to(track, { x: -totalW, duration: totalW / 55, ease: 'none', repeat: -1 })
  }, [])

  return (
    <div className="relative py-5 overflow-hidden bg-white border-y border-slate-100">
      {/* Fade edges */}
      <div className="absolute left-0 top-0 bottom-0 w-24 z-10 pointer-events-none" style={{ background: 'linear-gradient(90deg,#fff,transparent)' }} />
      <div className="absolute right-0 top-0 bottom-0 w-24 z-10 pointer-events-none" style={{ background: 'linear-gradient(270deg,#fff,transparent)' }} />

      <div ref={trackRef} className="flex items-center gap-10 whitespace-nowrap will-change-transform">
        {MARQUEE_ITEMS.map((item, i) => (
          <div key={i} className="inline-flex items-center gap-2.5 flex-shrink-0">
            <div className="w-6 h-6 rounded-md flex items-center justify-center" style={{ background: 'rgba(14,165,233,0.1)' }}>
              <item.icon className="w-3.5 h-3.5 text-sky-500" />
            </div>
            <span className="text-sm font-semibold text-slate-700">{item.text}</span>
            <span className="w-1 h-1 rounded-full bg-sky-300/60 ml-2 flex-shrink-0" />
          </div>
        ))}
      </div>
    </div>
  )
}

// ─── Exam Cards ───────────────────────────────────────────────────────────────
function ExamsSection() {
  const ref = useRef(null)

  useEffect(() => {
    const ctx = gsap.context(() => {
      gsap.fromTo('.ex-hd', { opacity: 0, y: 30 }, {
        opacity: 1, y: 0, duration: 0.75, ease: 'power3.out',
        scrollTrigger: { trigger: ref.current, start: 'top 83%', once: true },
      })
      gsap.fromTo('.ex-card', { opacity: 0, y: 65 }, {
        opacity: 1, y: 0, duration: 0.85, stagger: 0.14, ease: 'power3.out',
        scrollTrigger: { trigger: ref.current, start: 'top 76%', once: true },
      })
    }, ref)
    return () => ctx.revert()
  }, [])

  const tiltMove  = (e, el) => {
    const r  = el.getBoundingClientRect()
    const px = (e.clientX - r.left) / r.width  - 0.5
    const py = (e.clientY - r.top)  / r.height - 0.5
    gsap.to(el, { rotateY: px * 11, rotateX: -py * 11, scale: 1.03, duration: 0.4, ease: 'power2.out', transformPerspective: 900 })
  }
  const tiltLeave = (el) => {
    gsap.to(el, { rotateY: 0, rotateX: 0, scale: 1, duration: 0.7, ease: 'elastic.out(1,0.55)', transformPerspective: 900 })
  }

  return (
    <section id="exams" ref={ref} className="py-24 px-5 sm:px-6 bg-white">
      <div className="max-w-6xl mx-auto">
        <div className="ex-hd opacity-0 text-center mb-14">
          <h2 className="text-3xl sm:text-4xl font-black text-slate-900 mb-3">Three exams. One platform.</h2>
          <p className="text-slate-400 text-lg max-w-lg mx-auto">Each path built for depth — not generic drills.</p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {EXAMS.map(exam => (
            <div key={exam.name} className="ex-card opacity-0 will-change-transform">
              <Link
                to={exam.href}
                className="block h-full rounded-3xl p-6 lg:p-7 bg-white border border-slate-200/60 transition-all duration-300 group"
                style={{ '--glow': exam.glow }}
                onMouseMove={e => { tiltMove(e, e.currentTarget); e.currentTarget.style.boxShadow = `0 20px 60px -15px ${exam.glow}, 0 4px 20px rgba(0,0,0,0.06)` }}
                onMouseLeave={e => { tiltLeave(e.currentTarget); e.currentTarget.style.boxShadow = '' }}
              >
                {/* Icon */}
                <div
                  className="w-14 h-14 rounded-2xl flex items-center justify-center mb-6 shadow-lg"
                  style={{ background: `linear-gradient(135deg,${exam.from},${exam.to})`, boxShadow: `0 8px 28px ${exam.glow}` }}
                >
                  <exam.icon className="w-7 h-7 text-white" />
                </div>
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-2xl font-black text-slate-900">{exam.name}</h3>
                  <span className="text-xs font-bold px-2.5 py-1 rounded-full text-sky-700" style={{ background: 'rgba(14,165,233,0.1)', border: '1px solid rgba(14,165,233,0.2)' }}>
                    {exam.badge}
                  </span>
                </div>
                <p className="text-slate-500 text-sm leading-relaxed mb-5">{exam.desc}</p>
                <div className="flex flex-wrap gap-1.5 mb-5">
                  {exam.skills.map(s => (
                    <span key={s} className="text-xs font-semibold px-2.5 py-1 rounded-full border border-slate-200 text-slate-500 bg-slate-50">{s}</span>
                  ))}
                </div>
                <div className="flex items-center gap-1.5 text-sm font-bold text-sky-500 group-hover:gap-3 transition-all duration-200">
                  Explore <ArrowRight className="w-4 h-4" />
                </div>
              </Link>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

// ─── Skills ────────────────────────────────────────────────────────────────────
function SkillsSection() {
  const ref = useRef(null)
  const ITEMS = [
    { icon: BookOpen,   label: 'Reading',   desc: 'Passages, inference, and timed drills.',       color: '#0EA5E9', glow: 'rgba(14,165,233,0.2)' },
    { icon: Headphones, label: 'Listening', desc: 'Authentic audio and accent exposure.',          color: '#00D4FF', glow: 'rgba(0,212,255,0.2)' },
    { icon: Mic,        label: 'Speaking',  desc: 'AI evaluation with actionable feedback.',       color: '#8B5CF6', glow: 'rgba(139,92,246,0.2)' },
    { icon: PenLine,    label: 'Writing',   desc: 'Band estimates and grammar insights.',          color: '#EC4899', glow: 'rgba(236,72,153,0.2)' },
  ]

  useEffect(() => {
    const ctx = gsap.context(() => {
      gsap.fromTo('.sk-hd', { opacity: 0, y: 28 }, {
        opacity: 1, y: 0, duration: 0.75, ease: 'power3.out',
        scrollTrigger: { trigger: ref.current, start: 'top 83%', once: true },
      })
      gsap.fromTo('.sk-card', { opacity: 0, y: 55 }, {
        opacity: 1, y: 0, duration: 0.75, stagger: 0.1, ease: 'power3.out',
        scrollTrigger: { trigger: ref.current, start: 'top 76%', once: true },
      })
    }, ref)
    return () => ctx.revert()
  }, [])

  return (
    <section id="features" ref={ref} className="py-24 px-5 sm:px-6 bg-white border-t border-slate-100">
      <div className="max-w-6xl mx-auto">
        <div className="sk-hd opacity-0 text-center mb-14">
          <h2 className="text-3xl sm:text-4xl font-black text-slate-900 mb-3">Every skill, elevated</h2>
          <p className="text-slate-400 text-lg">Reading, listening, speaking, and writing — premium surfaces for each.</p>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {ITEMS.map(s => (
            <div
              key={s.label}
              className="sk-card opacity-0 group rounded-2xl p-6 bg-white border border-slate-200/60 transition-all duration-300 cursor-default"
              onMouseEnter={e => { e.currentTarget.style.boxShadow = `0 16px 50px -10px ${s.glow}`; e.currentTarget.style.borderColor = `${s.color}40`; e.currentTarget.style.transform = 'translateY(-6px)' }}
              onMouseLeave={e => { e.currentTarget.style.boxShadow = ''; e.currentTarget.style.borderColor = ''; e.currentTarget.style.transform = '' }}
            >
              <div
                className="w-11 h-11 rounded-xl flex items-center justify-center mb-4 transition-transform duration-300 group-hover:scale-110"
                style={{ background: `${s.color}14`, boxShadow: `0 4px 16px ${s.glow}` }}
              >
                <s.icon className="w-5 h-5" style={{ color: s.color }} />
              </div>
              <h4 className="font-bold text-lg text-slate-900 mb-1.5">{s.label}</h4>
              <p className="text-slate-400 text-sm leading-relaxed">{s.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

// ─── Features ──────────────────────────────────────────────────────────────────
function FeaturesSection() {
  const ref    = useRef(null)
  const GRADS  = ['linear-gradient(135deg,#0EA5E9,#00D4FF)', 'linear-gradient(135deg,#8B5CF6,#0EA5E9)', 'linear-gradient(135deg,#06B6D4,#2563EB)', 'linear-gradient(135deg,#F59E0B,#EF4444)']
  const GLOWS  = ['rgba(0,212,255,0.35)', 'rgba(139,92,246,0.3)', 'rgba(6,182,212,0.3)', 'rgba(245,158,11,0.3)']

  useEffect(() => {
    const ctx = gsap.context(() => {
      gsap.fromTo('.ft-hd', { opacity: 0, y: 28 }, {
        opacity: 1, y: 0, duration: 0.75, ease: 'power3.out',
        scrollTrigger: { trigger: ref.current, start: 'top 83%', once: true },
      })
      gsap.fromTo('.ft-card', { opacity: 0, y: 58, scale: 0.97 }, {
        opacity: 1, y: 0, scale: 1, duration: 0.8, stagger: 0.12, ease: 'power3.out',
        scrollTrigger: { trigger: ref.current, start: 'top 76%', once: true },
      })
    }, ref)
    return () => ctx.revert()
  }, [])

  return (
    <section ref={ref} className="py-24 px-5 sm:px-6 bg-white border-t border-slate-100">
      <div className="max-w-6xl mx-auto">
        <div className="ft-hd opacity-0 text-center mb-14">
          <h2 className="text-3xl sm:text-4xl font-black text-slate-900 mb-3">Built for real results</h2>
          <p className="text-slate-400 text-lg">Product-grade tools — not flat marketing boxes.</p>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
          {FEATURES.map((f, i) => (
            <div
              key={f.title}
              className="ft-card opacity-0 relative overflow-hidden rounded-3xl p-7 lg:p-8 bg-white border border-slate-200/60 transition-all duration-300 group cursor-default"
              onMouseEnter={e => { e.currentTarget.style.boxShadow = `0 20px 60px -15px ${GLOWS[i]}, 0 4px 20px rgba(0,0,0,0.04)` }}
              onMouseLeave={e => { e.currentTarget.style.boxShadow = '' }}
            >
              <div className="absolute top-0 right-0 w-52 h-52 rounded-bl-full pointer-events-none opacity-40" style={{ background: `radial-gradient(ellipse at top right,${GLOWS[i].replace('0.3', '0.12')},transparent 65%)` }} />
              <div
                className="w-11 h-11 rounded-xl flex items-center justify-center mb-4 shadow-lg transition-transform duration-300 group-hover:scale-110"
                style={{ background: GRADS[i], boxShadow: `0 6px 22px ${GLOWS[i]}` }}
              >
                <f.icon className="w-5 h-5 text-white" />
              </div>
              <h4 className="font-black text-xl text-slate-900 mb-2">{f.title}</h4>
              <p className="text-slate-400 text-sm leading-relaxed">{f.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

// ─── AI Dark Section ───────────────────────────────────────────────────────────
function AISection() {
  const ref = useRef(null)

  useEffect(() => {
    const ctx = gsap.context(() => {
      gsap.fromTo('.ai-hd', { opacity: 0, y: 32 }, {
        opacity: 1, y: 0, duration: 0.8, ease: 'power3.out',
        scrollTrigger: { trigger: ref.current, start: 'top 83%', once: true },
      })
      gsap.fromTo('.ai-it', { opacity: 0, y: 40, scale: 0.96 }, {
        opacity: 1, y: 0, scale: 1, duration: 0.75, stagger: 0.1, ease: 'power3.out',
        scrollTrigger: { trigger: ref.current, start: 'top 76%', once: true },
      })
    }, ref)
    return () => ctx.revert()
  }, [])

  return (
    <section
      ref={ref}
      className="py-24 px-5 sm:px-6 relative overflow-hidden"
      style={{ background: 'linear-gradient(160deg,#020C1E 0%,#041226 60%,#030A1A 100%)' }}
    >
      <div className="absolute inset-0 pointer-events-none" style={{
        backgroundImage: 'linear-gradient(rgba(0,212,255,0.055) 1px,transparent 1px),linear-gradient(90deg,rgba(0,212,255,0.055) 1px,transparent 1px)',
        backgroundSize: '48px 48px',
      }} />
      <div className="absolute inset-0 pointer-events-none" style={{ background: 'radial-gradient(ellipse at 50% 0%,rgba(0,212,255,0.14) 0%,transparent 60%)' }} />

      <div className="relative z-10 max-w-5xl mx-auto">
        <div className="ai-hd opacity-0 text-center mb-14">
          <span className="inline-flex items-center gap-2 px-4 py-2 rounded-full text-xs font-bold mb-5" style={{ background: 'rgba(0,212,255,0.1)', border: '1px solid rgba(0,212,255,0.22)', color: '#7DD8F0' }}>
            <Sparkles className="w-3.5 h-3.5" /> AI-powered
          </span>
          <h2 className="text-3xl sm:text-4xl font-black text-white mb-3">Feedback that actually teaches</h2>
          <p className="text-white/45 text-lg max-w-xl mx-auto">Speaking evaluation, writing band estimates, and personalized weak-area signals.</p>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-3xl mx-auto">
          {[
            { icon: Mic,        text: 'Speaking evaluation & fluency cues',    color: '#8B5CF6', glow: 'rgba(139,92,246,0.2)' },
            { icon: PenLine,    text: 'Writing band estimate & structure tips', color: '#00D4FF', glow: 'rgba(0,212,255,0.2)' },
            { icon: BarChart3,  text: 'Grammar and vocabulary suggestions',     color: '#0EA5E9', glow: 'rgba(14,165,233,0.2)' },
            { icon: TrendingUp, text: 'Personalized weak-area detection',       color: '#4ADE80', glow: 'rgba(74,222,128,0.2)' },
          ].map(item => (
            <div
              key={item.text}
              className="ai-it opacity-0 flex items-center gap-4 rounded-2xl p-5 border transition-all duration-300 cursor-default"
              style={{ background: 'rgba(255,255,255,0.04)', borderColor: 'rgba(255,255,255,0.08)' }}
              onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.07)'; e.currentTarget.style.boxShadow = `0 8px 32px ${item.glow}` }}
              onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.04)'; e.currentTarget.style.boxShadow = '' }}
            >
              <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: `${item.color}18`, boxShadow: `0 4px 14px ${item.glow}` }}>
                <item.icon className="w-5 h-5" style={{ color: item.color }} />
              </div>
              <p className="text-white/80 text-sm font-medium leading-snug">{item.text}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

// ─── Pricing Teaser ───────────────────────────────────────────────────────────
function HomePricingTeaser() {
  const ref = useRef(null)
  const navigate = useNavigate()

  const PLANS = [
    {
      name: 'Premium',
      price: "79 000 so'm",
      compareAt: "119 000 so'm",
      billing: '/ month',
      cta: 'Get Premium',
      highlight: false,
      features: [
        'Unlimited SAT full mocks & practice modules',
        'IELTS Speaking — AI scoring, fluency & topic cues',
        'IELTS Writing — AI feedback & structure tips',
        'Score breakdowns & progress snapshots',
        'Telegram support',
      ],
    },
    {
      name: 'Pro',
      tag: 'SAVE 258 000',
      price: "189 000 so'm",
      compareAt: "447 000 so'm",
      billing: '/ 3 months',
      cta: 'Get Pro Access',
      highlight: true,
      features: [
        'Everything in Premium — unlimited SAT, Speaking & Writing',
        '3 months billed once — best value for steady prep',
        'AI progress — weak areas, streaks, and next steps',
        'AI chat — ask anything about SAT / IELTS tasks',
        'AI explanations — step-by-step reasoning on tough items',
        'Private AI teacher — guided prompts tailored to you',
        'Priority Telegram support',
      ],
    },
  ]

  useEffect(() => {
    const ctx = gsap.context(() => {
      gsap.fromTo('.pr-hd', { opacity: 0, y: 28 }, {
        opacity: 1, y: 0, duration: 0.75, ease: 'power3.out',
        scrollTrigger: { trigger: ref.current, start: 'top 83%', once: true },
      })
      gsap.fromTo('.pr-card', { opacity: 0, y: 55 }, {
        opacity: 1, y: 0, duration: 0.8, stagger: 0.14, ease: 'power3.out',
        scrollTrigger: { trigger: ref.current, start: 'top 76%', once: true },
      })
    }, ref)
    return () => ctx.revert()
  }, [])

  return (
    <section id="pricing" ref={ref} className="py-24 px-5 sm:px-6 bg-white border-t border-slate-100 relative overflow-hidden">
      <div className="absolute inset-0 pointer-events-none opacity-[0.45]" style={{
        backgroundImage: 'radial-gradient(circle, rgba(14,165,233,0.09) 1px, transparent 1px)',
        backgroundSize: '28px 28px',
      }} />
      <div className="relative z-10 max-w-3xl mx-auto">
        <div className="pr-hd opacity-0 text-center mb-10 sm:mb-12">
          <p className="text-xs sm:text-sm font-bold text-sky-600 uppercase tracking-[0.18em] mb-2">Early access pricing</p>
          <h2 className="text-3xl sm:text-4xl font-black text-slate-900 mb-3">Choose your plan</h2>
          <p className="text-slate-500 text-sm sm:text-base max-w-xl mx-auto leading-relaxed">
            <span className="text-sky-600 font-semibold">Unlimited practice</span> on SAT, IELTS Speaking & Writing — Pro adds AI progress, chat, explanations, and a private AI teacher.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 sm:gap-6 items-stretch">
          {PLANS.map((p) => (
            <div key={p.name} className="pr-card opacity-0 relative flex min-w-0">
              {p.tag && (
                <div
                  className="absolute -top-1.5 left-3 right-3 z-10 text-center py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wide text-white"
                  style={{ background: 'linear-gradient(135deg,#0EA5E9,#2563EB)' }}
                >
                  {p.tag}
                </div>
              )}
              <div className={`rounded-2xl flex-1 h-full flex flex-col ${p.tag ? 'pt-8' : 'pt-5'} px-4 sm:px-5 pb-5 sm:pb-6 bg-white transition-shadow duration-300 ${
                p.highlight
                  ? 'border-2 border-sky-400 shadow-lg shadow-sky-500/15 ring-2 ring-sky-100/90'
                  : 'border border-slate-200/80 shadow-sm hover:shadow-md hover:border-sky-200'
              }`}>
                <div className="mb-0.5 flex items-center gap-2 flex-wrap">
                  <h3 className="text-lg font-black text-slate-900">{p.name}</h3>
                  {p.highlight && (
                    <span className="text-[9px] font-bold uppercase tracking-wide text-sky-600 px-1.5 py-0.5 rounded-full bg-sky-50 border border-sky-200">
                      Most popular
                    </span>
                  )}
                </div>
                <div className="flex flex-wrap items-baseline gap-x-2 mb-4 mt-3">
                  <span className="text-2xl font-black text-slate-900">{p.price}</span>
                  <span className="text-xs text-slate-400 line-through">{p.compareAt}</span>
                  <span className="text-xs font-medium text-slate-400">{p.billing}</span>
                </div>
                <ul className="flex-1 space-y-2 mb-5">
                  {p.features.map((f) => (
                    <li key={f} className="flex gap-2 text-[11.5px] sm:text-[12.5px] text-slate-600 leading-snug">
                      <span className="shrink-0 mt-0.5 w-4 h-4 rounded-full bg-sky-100 flex items-center justify-center">
                        <svg className="w-2.5 h-2.5 text-sky-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                          <polyline points="20 6 9 17 4 12" />
                        </svg>
                      </span>
                      {f}
                    </li>
                  ))}
                </ul>
                <button
                  type="button"
                  onClick={() => navigate('/app/subscription')}
                  className={`w-full rounded-xl py-2.5 text-[13px] font-bold transition-all mt-auto ${
                    p.highlight
                      ? 'text-white bg-gradient-to-r from-sky-500 to-blue-600 shadow-md shadow-sky-400/30 hover:from-sky-600 hover:to-blue-700'
                      : 'text-slate-800 bg-slate-50 border border-slate-200 hover:border-sky-200 hover:bg-sky-50/80 hover:text-sky-900'
                  }`}
                >
                  {p.cta}
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

// ─── CTA ───────────────────────────────────────────────────────────────────────
function CTASection() {
  const ref = useRef(null)

  useEffect(() => {
    const ctx = gsap.context(() => {
      gsap.fromTo('.cta-in', { opacity: 0, y: 45, scale: 0.97 }, {
        opacity: 1, y: 0, scale: 1, duration: 0.95, ease: 'power3.out',
        scrollTrigger: { trigger: ref.current, start: 'top 82%', once: true },
      })
    }, ref)
    return () => ctx.revert()
  }, [])

  return (
    <section ref={ref} className="py-24 px-5 sm:px-6 bg-white border-t border-slate-100">
      <div className="max-w-4xl mx-auto">
        <div
          className="cta-in opacity-0 relative overflow-hidden rounded-[2.5rem] p-10 sm:p-16 text-center"
          style={{ background: 'linear-gradient(135deg,#EFF6FF 0%,#F0F9FF 50%,#ECFEFF 100%)', border: '1px solid rgba(14,165,233,0.2)', boxShadow: '0 24px 80px -24px rgba(0,212,255,0.25)' }}
        >
          <div className="absolute inset-0 pointer-events-none" style={{ background: 'radial-gradient(ellipse at 75% 5%,rgba(0,212,255,0.12),transparent 55%)' }} />
          <h2 className="relative text-3xl sm:text-[2.8rem] font-black text-slate-900 mb-4 leading-[1.1]">
            Start your preparation{' '}
            <span className="bg-clip-text text-transparent" style={{ backgroundImage: 'linear-gradient(90deg,#0EA5E9,#00D4FF)' }}>
              today
            </span>
          </h2>
          <p className="relative text-slate-500 text-lg mb-8 max-w-md mx-auto">
            Join students who train with realistic mocks, AI feedback, and analytics built for outcomes.
          </p>
          <div className="relative flex flex-wrap justify-center gap-2 mb-8">
            {['SAT', 'IELTS', 'CEFR'].map(chip => (
              <span key={chip} className="px-4 py-1.5 rounded-full text-sm font-bold bg-white text-sky-700" style={{ border: '1px solid rgba(14,165,233,0.3)', boxShadow: '0 2px 10px rgba(14,165,233,0.1)' }}>
                {chip}
              </span>
            ))}
          </div>
          <div className="relative flex justify-center">
            <MagBtn to="/register" variant="dark">
              Create free account <ArrowRight className="w-4 h-4" />
            </MagBtn>
          </div>
        </div>
      </div>
    </section>
  )
}

// ─── Page ──────────────────────────────────────────────────────────────────────
export default function HomePage() {
  return (
    <div
      className="relative overflow-x-hidden text-slate-900"
      style={{ fontFamily: "'Inter', system-ui, sans-serif", cursor: 'none' }}
    >
      <style>{`@media(pointer:coarse){*{cursor:auto!important}}`}</style>
      <CustomCursor />
      <Navbar />
      <Hero />
      <Marquee />
      <ExamsSection />
      <SkillsSection />
      <FeaturesSection />
      <AISection />
      <HomePricingTeaser />
      <CTASection />
      <footer className="py-12 px-6 border-t border-sky-800/50 bg-gradient-to-b from-sky-950 to-blue-950">
        <div className="max-w-6xl mx-auto grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8 text-sm">
          <div>
            <p className="text-white font-bold mb-2">ExamBridge</p>
            <p className="text-sky-100/80 leading-relaxed">
              Modern preparation platform for SAT, IELTS, and CEFR.
            </p>
          </div>

          <div>
            <p className="text-white font-semibold mb-3">Links</p>
            <div className="space-y-2">
              <Link to="/app/sat" className="block text-sky-100/80 hover:text-cyan-300 transition-colors">SAT</Link>
              <Link to="/app/ielts" className="block text-sky-100/80 hover:text-cyan-300 transition-colors">IELTS</Link>
              <Link to="/app/cefr" className="block text-sky-100/80 hover:text-cyan-300 transition-colors">CEFR</Link>
              <a href="#pricing" className="block text-sky-100/80 hover:text-cyan-300 transition-colors">Pricing</a>
            </div>
          </div>

          <div>
            <p className="text-white font-semibold mb-3">Support</p>
            <div className="space-y-2.5">
              <a
                href="https://t.me/nodirbek_shukurov1"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2.5 text-sky-100/90 hover:text-cyan-300 transition-colors"
              >
                <span className="w-6 h-6 rounded-full bg-sky-200/20 text-cyan-300 inline-flex items-center justify-center shrink-0">
                  <FaTelegramPlane className="w-3.5 h-3.5" />
                </span>
                Telegram Support
              </a>
              <a href="tel:+998500056821" className="block text-sky-100/80 hover:text-cyan-300 transition-colors">
                +998 50 005 68 21
              </a>
              <Link to="/login" className="block text-sky-100/80 hover:text-cyan-300 transition-colors">Sign in</Link>
              <Link to="/register" className="block text-sky-100/80 hover:text-cyan-300 transition-colors">Create account</Link>
            </div>
          </div>

          <div>
            <p className="text-white font-semibold mb-3">Social</p>
            <div className="flex items-center gap-2.5 flex-wrap">
              <a
                href="https://t.me/exambridge_uz"
                target="_blank"
                rel="noopener noreferrer"
                className="w-9 h-9 rounded-full bg-sky-200/20 text-cyan-300 inline-flex items-center justify-center shrink-0 hover:bg-sky-200/30 hover:scale-105 transition-all"
                aria-label="Telegram"
                title="Telegram"
              >
                <FaTelegramPlane className="w-4 h-4" />
              </a>
              <a
                href="https://www.instagram.com/exambridge.uz/"
                target="_blank"
                rel="noopener noreferrer"
                className="w-9 h-9 rounded-full bg-pink-300/20 text-pink-300 inline-flex items-center justify-center shrink-0 hover:bg-pink-300/30 hover:scale-105 transition-all"
                aria-label="Instagram"
                title="Instagram"
              >
                <FaInstagram className="w-4 h-4" />
              </a>
              <a
                href="#"
                className="w-9 h-9 rounded-full bg-red-300/20 text-red-300 inline-flex items-center justify-center shrink-0 hover:bg-red-300/30 hover:scale-105 transition-all"
                aria-label="YouTube"
                title="YouTube"
              >
                <FaYoutube className="w-4 h-4" />
              </a>
              <a
                href="#"
                className="w-9 h-9 rounded-full bg-indigo-300/20 text-indigo-300 inline-flex items-center justify-center shrink-0 hover:bg-indigo-300/30 hover:scale-105 transition-all"
                aria-label="Facebook"
                title="Facebook"
              >
                <FaFacebookF className="w-4 h-4" />
              </a>
            </div>
          </div>
        </div>

        <div className="max-w-6xl mx-auto mt-8 pt-5 border-t border-sky-800/50 flex flex-col sm:flex-row items-center justify-between gap-2">
          <p className="text-sky-100 text-xs sm:text-sm font-medium">
            © {new Date().getFullYear()} ExamBridge. All rights reserved.
          </p>
          <p className="text-sky-200/80 text-xs sm:text-sm">
            SAT · IELTS · CEFR
          </p>
        </div>
      </footer>
    </div>
  )
}
