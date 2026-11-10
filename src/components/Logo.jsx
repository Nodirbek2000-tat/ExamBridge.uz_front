import logoSrc from '../assets/logo.png'
import logoDarkSrc from '../assets/logo-dark.png'

/**
 * The ExamBridge wordmark on a transparent background.
 *
 * `variant`:
 *   'light' (default) — for places that stay light in dark mode too (landing, auth, admin)
 *   'auto'            — switches to the lightened mark when the app is in dark mode;
 *                       use it only where the background follows the theme (the sidebar)
 *
 * @param {string} className — Tailwind size classes, height first (default h-10)
 */
export default function Logo({ className = 'h-10 w-auto', alt = 'ExamBridge', variant = 'light' }) {
  const img = (src, extra = '', label = alt) => (
    <img
      src={src}
      alt={label}
      className={`object-contain shrink-0 ${extra} ${className}`}
      width={528}
      height={128}
      decoding="async"
    />
  )
  if (variant !== 'auto') return img(logoSrc)
  return (
    <>
      {img(logoSrc, 'dark:hidden')}
      {img(logoDarkSrc, 'hidden dark:block', '')}
    </>
  )
}
