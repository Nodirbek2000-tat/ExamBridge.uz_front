import { useRef } from 'react'
import { Link } from 'react-router-dom'
import { ArrowRight } from 'lucide-react'
import { FINE_POINTER, REDUCED_MOTION } from './useMedia'

const PULL = 0.28   // share of the pointer offset the button follows
const LIMIT = 10    // px

/**
 * A router link styled as a button that leans toward the pointer.
 * Desktop pointers only; touch and reduced motion get a plain button.
 */
export default function Magnetic({ to, children, variant = 'primary', size = '', arrow = false, className = '' }) {
  const ref = useRef(null)
  const frame = useRef(0)

  const active = () =>
    window.matchMedia(FINE_POINTER).matches && !window.matchMedia(REDUCED_MOTION).matches

  const onMove = (e) => {
    if (!active()) return
    const el = ref.current
    const r = el.getBoundingClientRect()
    const dx = Math.max(-LIMIT, Math.min(LIMIT, (e.clientX - r.left - r.width / 2) * PULL))
    const dy = Math.max(-LIMIT, Math.min(LIMIT, (e.clientY - r.top - r.height / 2) * PULL))
    cancelAnimationFrame(frame.current)
    frame.current = requestAnimationFrame(() => {
      el.style.transitionDuration = '0.25s'
      el.style.transform = `translate3d(${dx}px, ${dy}px, 0)`
    })
  }

  const onLeave = () => {
    cancelAnimationFrame(frame.current)
    const el = ref.current
    if (!el) return
    el.style.transitionDuration = ''
    el.style.transform = ''
  }

  return (
    <Link
      ref={ref}
      to={to}
      onPointerMove={onMove}
      onPointerLeave={onLeave}
      className={`eb-btn eb-btn-${variant} ${size} ${className}`}
    >
      {children}
      {arrow && <ArrowRight aria-hidden="true" className="eb-arrow h-4 w-4" strokeWidth={2} />}
    </Link>
  )
}
