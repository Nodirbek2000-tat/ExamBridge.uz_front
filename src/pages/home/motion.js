import { useLayoutEffect } from 'react'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { CustomEase } from 'gsap/CustomEase'

gsap.registerPlugin(ScrollTrigger, CustomEase)

// cubic-bezier(0.22, 1, 0.36, 1) — the one easing used across the landing page
export const EASE = CustomEase.create('eb-out', '0.22,1,0.36,1')

export { gsap, ScrollTrigger }

const QUERIES = {
  motion: '(prefers-reduced-motion: no-preference)',
  desktop: '(min-width: 1024px)',
}

/** Fade-and-rise for [data-reveal], line masks for [data-lines], count-up for [data-count]. */
function revealBasics(scope) {
  const q = gsap.utils.selector(scope)

  const items = q('[data-reveal]')
  if (items.length) {
    gsap.set(items, { opacity: 0, y: 28 })
    ScrollTrigger.batch(items, {
      start: 'top 88%',
      once: true,
      onEnter: (batch) =>
        gsap.to(batch, { opacity: 1, y: 0, duration: 0.85, ease: EASE, stagger: 0.08, overwrite: true }),
    })
  }

  q('[data-lines]').forEach((heading) => {
    gsap.from(heading.querySelectorAll('.eb-line-in'), {
      yPercent: 105,
      duration: 0.9,
      ease: EASE,
      stagger: 0.08,
      scrollTrigger: { trigger: heading, start: 'top 88%', once: true },
    })
  })

  q('[data-count]').forEach((el) => {
    const to = parseFloat(el.dataset.count)
    const from = parseFloat(el.dataset.countFrom || '0')
    const decimals = parseInt(el.dataset.decimals || '0', 10)
    const state = { v: from }
    const write = () => { el.textContent = state.v.toFixed(decimals) }
    write()
    gsap.to(state, {
      v: to,
      duration: 1.4,
      ease: EASE,
      onUpdate: write,
      scrollTrigger: { trigger: el, start: 'top 90%', once: true },
    })
  })
}

/**
 * Scroll animations for one section, scoped to `ref`.
 * Nothing runs under prefers-reduced-motion — the markup is already in its final
 * state. Every tween and ScrollTrigger is reverted on unmount (gsap.matchMedia).
 *
 * `extra(conditions, q)` adds section-specific motion; conditions = { motion, desktop }.
 */
export function useScrollMotion(ref, extra) {
  useLayoutEffect(() => {
    const scope = ref.current
    if (!scope) return
    const mm = gsap.matchMedia(scope)
    mm.add(QUERIES, (ctx) => {
      const { motion } = ctx.conditions
      if (!motion) return
      revealBasics(scope)
      extra?.(ctx.conditions, gsap.utils.selector(scope))
    })
    return () => mm.revert()
    // `extra` is defined inline by each section and only read once on mount.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ref])
}
