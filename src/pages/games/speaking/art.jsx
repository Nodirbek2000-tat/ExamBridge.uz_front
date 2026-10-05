/* Hand-drawn SVG pictures of the Speaking game (no stock icons as pictures). */
import { motion as Motion, useReducedMotion } from 'framer-motion'

const V = '#7C3AED'
const V2 = '#A78BFA'
const V3 = '#DDD6FE'

/* List header: a page of text and the voice reading it */
export function HeroArt({ className = '' }) {
  return (
    <svg viewBox="0 0 168 120" className={className} aria-hidden="true">
      <circle cx="78" cy="62" r="54" fill={V} opacity="0.10" />
      <circle cx="78" cy="62" r="38" fill={V} opacity="0.08" />
      <g transform="rotate(-6 60 64)">
        <rect x="24" y="22" width="68" height="84" rx="12" fill="#1C1C26" stroke="rgba(255,255,255,0.10)" />
        <rect x="35" y="36" width="34" height="5" rx="2.5" fill="rgba(255,255,255,0.55)" />
        <rect x="35" y="48" width="46" height="4" rx="2" fill="rgba(255,255,255,0.18)" />
        <rect x="35" y="58" width="40" height="4" rx="2" fill={V2} />
        <rect x="35" y="68" width="44" height="4" rx="2" fill="rgba(255,255,255,0.18)" />
        <rect x="35" y="78" width="30" height="4" rx="2" fill="rgba(255,255,255,0.18)" />
        <rect x="35" y="88" width="38" height="4" rx="2" fill="rgba(255,255,255,0.12)" />
      </g>
      <g fill="none" strokeLinecap="round">
        <path d="M104 50 a18 18 0 0 1 0 26" stroke={V2} strokeWidth="5" />
        <path d="M116 40 a32 32 0 0 1 0 46" stroke={V2} strokeWidth="5" opacity="0.6" />
        <path d="M128 30 a46 46 0 0 1 0 66" stroke={V2} strokeWidth="5" opacity="0.3" />
      </g>
      <circle cx="142" cy="22" r="3" fill={V3} opacity="0.8" />
      <circle cx="18" cy="96" r="2.5" fill={V3} opacity="0.5" />
      <path d="M150 92 l2.2 5 5 2.2 -5 2.2 -2.2 5 -2.2 -5 -5 -2.2 5 -2.2z" fill={V3} opacity="0.7" />
    </svg>
  )
}

/* Microphone drawn for the big record button */
export function MicArt({ size = 34, color = '#fff' }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" aria-hidden="true">
      <rect x="11" y="3" width="10" height="17" rx="5" fill={color} />
      <path d="M7 15.5a9 9 0 0 0 18 0" fill="none" stroke={color} strokeWidth="2.4" strokeLinecap="round" />
      <path d="M16 24.5V29M11.5 29h9" fill="none" stroke={color} strokeWidth="2.4" strokeLinecap="round" />
      <rect x="13.5" y="7" width="5" height="1.6" rx="0.8" fill={V} opacity="0.35" />
      <rect x="13.5" y="10.5" width="5" height="1.6" rx="0.8" fill={V} opacity="0.35" />
    </svg>
  )
}

/* Equaliser that breathes while the AI checks the reading */
export function ProcessingArt({ size = 132 }) {
  const reduce = useReducedMotion()
  const bars = [0.35, 0.6, 0.9, 0.55, 1, 0.7, 0.45, 0.8, 0.4]
  return (
    <svg width={size} height={size} viewBox="0 0 132 132" aria-hidden="true">
      <circle cx="66" cy="66" r="62" fill={V} opacity="0.08" />
      <circle cx="66" cy="66" r="46" fill={V} opacity="0.10" />
      {bars.map((h, i) => {
        const x = 26 + i * 10
        const full = 54 * h
        return reduce ? (
          <rect key={i} x={x} y={66 - full / 2} width="6" height={full} rx="3" fill={i % 3 === 1 ? V3 : V2} />
        ) : (
          <Motion.rect key={i} x={x} width="6" rx="3" fill={i % 3 === 1 ? V3 : V2}
            initial={{ height: full * 0.4, y: 66 - full * 0.2 }}
            animate={{ height: [full * 0.4, full, full * 0.55, full * 0.85, full * 0.4], y: [66 - full * 0.2, 66 - full / 2, 66 - full * 0.275, 66 - full * 0.425, 66 - full * 0.2] }}
            transition={{ duration: 1.6, repeat: Infinity, delay: i * 0.09, ease: 'easeInOut' }} />
        )
      })}
    </svg>
  )
}

/* Tile glyphs: said right · needs fixing · skipped */
export function OkGlyph({ size = 22, color = '#34D399' }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true">
      <circle cx="12" cy="12" r="10" fill={color} opacity="0.18" />
      <path d="M7.5 12.4l3 3 6-6.4" fill="none" stroke={color} strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}
export function FixGlyph({ size = 22, color = '#FBBF24' }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true">
      <circle cx="12" cy="12" r="10" fill={color} opacity="0.18" />
      <path d="M6.5 13c1.4-2.6 2.8-2.6 4.2 0s2.8 2.6 4.2 0 2.1-2 2.6-1" fill="none" stroke={color} strokeWidth="2.2" strokeLinecap="round" />
    </svg>
  )
}
export function SkipGlyph({ size = 22, color = '#F87171' }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true">
      <circle cx="12" cy="12" r="10" fill={color} opacity="0.18" />
      <path d="M8 12h8" stroke={color} strokeWidth="2.4" strokeLinecap="round" />
    </svg>
  )
}

/* Lesson row markers */
export function DoneMark({ size = 40 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 40 40" aria-hidden="true">
      <circle cx="20" cy="20" r="19" fill="#34D399" opacity="0.14" />
      <circle cx="20" cy="20" r="19" fill="none" stroke="#34D399" strokeOpacity="0.45" />
      <path d="M13 20.5l4.6 4.6L27.5 15" fill="none" stroke="#34D399" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}
export function LockMark({ size = 40 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 40 40" aria-hidden="true">
      <circle cx="20" cy="20" r="19" fill="rgba(255,255,255,0.04)" stroke="rgba(255,255,255,0.10)" />
      <path d="M15.5 18.5v-2.6a4.5 4.5 0 0 1 9 0v2.6" fill="none" stroke="#FCD34D" strokeWidth="2" strokeLinecap="round" />
      <rect x="13.5" y="18.5" width="13" height="10" rx="2.6" fill="#FCD34D" />
      <circle cx="20" cy="23.3" r="1.5" fill="#1C1C26" />
    </svg>
  )
}

/* Premium lesson / empty list */
export function PremiumArt({ size = 120 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 120 120" aria-hidden="true">
      <circle cx="60" cy="60" r="56" fill="#FCD34D" opacity="0.07" />
      <circle cx="60" cy="60" r="40" fill="#FCD34D" opacity="0.08" />
      <path d="M46 56v-8a14 14 0 0 1 28 0v8" fill="none" stroke="#FCD34D" strokeWidth="6" strokeLinecap="round" />
      <rect x="38" y="54" width="44" height="34" rx="9" fill="#FCD34D" />
      <circle cx="60" cy="69" r="4.5" fill="#1C1C26" />
      <rect x="58" y="70" width="4" height="9" rx="2" fill="#1C1C26" />
      <path d="M92 26 l2.5 5.5 5.5 2.5 -5.5 2.5 -2.5 5.5 -2.5 -5.5 -5.5 -2.5 5.5 -2.5z" fill="#FDE68A" />
    </svg>
  )
}
export function EmptyArt({ size = 120 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 120 120" aria-hidden="true">
      <circle cx="60" cy="60" r="54" fill={V} opacity="0.08" />
      <rect x="34" y="24" width="52" height="68" rx="10" fill="#1C1C26" stroke="rgba(255,255,255,0.10)" />
      <rect x="44" y="38" width="26" height="4" rx="2" fill="rgba(255,255,255,0.35)" />
      <rect x="44" y="50" width="32" height="3.5" rx="1.75" fill="rgba(255,255,255,0.14)" />
      <rect x="44" y="60" width="28" height="3.5" rx="1.75" fill="rgba(255,255,255,0.14)" />
      <rect x="44" y="70" width="20" height="3.5" rx="1.75" fill="rgba(255,255,255,0.14)" />
      <circle cx="84" cy="86" r="12" fill="none" stroke={V2} strokeWidth="4" />
      <path d="M93 95l8 8" stroke={V2} strokeWidth="4" strokeLinecap="round" />
    </svg>
  )
}

/* "Nothing of the text was heard": a microphone and a quiet ellipsis */
export function SilentArt({ size = 132 }) {
  const A = '#FCD34D'
  return (
    <svg width={size} height={size} viewBox="0 0 132 132" aria-hidden="true">
      <circle cx="66" cy="66" r="62" fill={A} opacity="0.06" />
      <circle cx="66" cy="66" r="44" fill={A} opacity="0.07" />
      <rect x="52" y="28" width="24" height="44" rx="12" fill={A} />
      <rect x="58" y="38" width="12" height="3" rx="1.5" fill="#1C1C26" opacity="0.3" />
      <rect x="58" y="46" width="12" height="3" rx="1.5" fill="#1C1C26" opacity="0.3" />
      <path d="M42 60a22 22 0 0 0 44 0" fill="none" stroke={A} strokeWidth="5" strokeLinecap="round" />
      <path d="M64 82v10M54 94h20" fill="none" stroke={A} strokeWidth="5" strokeLinecap="round" />
      <circle cx="96" cy="50" r="3.2" fill={A} opacity="0.55" />
      <circle cx="106" cy="50" r="3.2" fill={A} opacity="0.35" />
      <circle cx="116" cy="50" r="3.2" fill={A} opacity="0.18" />
    </svg>
  )
}

/* "The check did not work": the waveform waiting, with a small warning mark */
export function RetryArt({ size = 132 }) {
  const hs = [18, 30, 44, 26, 36, 20, 12]
  return (
    <svg width={size} height={size} viewBox="0 0 132 132" aria-hidden="true">
      <circle cx="66" cy="66" r="62" fill={V} opacity="0.07" />
      <circle cx="66" cy="66" r="44" fill={V} opacity="0.08" />
      {hs.map((h, i) => <rect key={i} x={33 + i * 10} y={64 - h / 2} width="6" height={h} rx="3" fill={V2} opacity={0.35 + (i % 3) * 0.15} />)}
      <circle cx="96" cy="92" r="15" fill="#17171F" />
      <path d="M96 79l13 23H83z" fill="#FBBF24" stroke="#FBBF24" strokeWidth="3" strokeLinejoin="round" />
      <path d="M96 87v7" stroke="#1C1C26" strokeWidth="3" strokeLinecap="round" />
      <circle cx="96" cy="98.5" r="1.7" fill="#1C1C26" />
    </svg>
  )
}

/* Little sound wave next to "play" in the word sheet cards */
export function MiniWave({ color = V2, active = false }) {
  const reduce = useReducedMotion()
  const hs = [6, 12, 18, 10, 15, 7, 12, 5]
  return (
    <svg width="54" height="22" viewBox="0 0 54 22" aria-hidden="true">
      {hs.map((h, i) => (active && !reduce ? (
        <Motion.rect key={i} x={i * 7} width="4" rx="2" fill={color}
          animate={{ height: [h * 0.5, h, h * 0.5], y: [11 - h / 4, 11 - h / 2, 11 - h / 4] }}
          transition={{ duration: 0.8, repeat: Infinity, delay: i * 0.07 }} />
      ) : (
        <rect key={i} x={i * 7} y={11 - h / 2} width="4" height={h} rx="2" fill={color} opacity={0.85} />
      )))}
    </svg>
  )
}
