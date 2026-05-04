import logoSrc from '../assets/logo.jpg'

/**
 * ExamBridge mark from `src/assets/logo.jpg` — use in header, auth, sidebar.
 * @param {string} className — Tailwind size/classes (default 32×32)
 * @param {string} alt
 */
export default function Logo({ className = 'h-10 w-auto', alt = 'ExamBridge' }) {
  return (
    <img
      src={logoSrc}
      alt={alt}
      className={`object-contain shrink-0 ${className}`}
      width={32}
      height={32}
      decoding="async"
    />
  )
}
