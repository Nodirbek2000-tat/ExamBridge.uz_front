/* Small drawn pictures of Word Battle: level emblems, the duel invitation, the podium, the hourglass. */
import { useId } from 'react'
import { LEVEL_META } from './theme'

function Disc({ color, id, children, size }) {
  return (
    <svg viewBox="0 0 48 48" width={size} height={size} aria-hidden="true" className="flex-shrink-0">
      <defs>
        <radialGradient id={`${id}g`} cx=".35" cy=".3" r=".9">
          <stop offset="0" stopColor={color} stopOpacity=".32" />
          <stop offset="1" stopColor={color} stopOpacity=".08" />
        </radialGradient>
      </defs>
      <circle cx="24" cy="24" r="23" fill={`url(#${id}g)`} />
      <circle cx="24" cy="24" r="22.5" fill="none" stroke={color} strokeOpacity=".35" />
      {children}
    </svg>
  )
}

/* A2 sprout · B1 open book · B2 mountain with a flag · C1 crown · SAT pencil and tick */
export function LevelEmblem({ level, size = 44 }) {
  const id = useId().replace(/:/g, '')
  const color = LEVEL_META[level]?.color || '#5CC2FF'
  const art = {
    A2: (
      <g>
        <path d="M24 36V22" stroke="#7EE2B8" strokeWidth="2.6" strokeLinecap="round" />
        <path d="M24 25C24 18 18 14 12 15C12 22 17 26 24 25Z" fill="#34D399" />
        <path d="M24 22C24 15 30 11 36 12C36 19 31 23 24 22Z" fill="#6EE7B7" />
        <path d="M16 36H32" stroke="#7EE2B8" strokeWidth="2.6" strokeLinecap="round" opacity=".6" />
      </g>
    ),
    B1: (
      <g>
        <path d="M11 16Q18 13 24 17V35Q18 31 11 34Z" fill="#BFE7FF" />
        <path d="M37 16Q30 13 24 17V35Q30 31 37 34Z" fill="#5CC2FF" />
        <path d="M14 21Q18 19.5 21 21M14 25Q18 23.5 21 25M27 21Q30 19.5 34 21" stroke="#2C8FD6" strokeWidth="1.4" strokeLinecap="round" fill="none" />
      </g>
    ),
    B2: (
      <g>
        <path d="M8 35L20 17L26 25L30 20L40 35Z" fill="#A78BFA" />
        <path d="M20 17L24 23L21.5 22L19 24L17 21Z" fill="#EDE9FE" />
        <path d="M30 20V9" stroke="#EDE9FE" strokeWidth="1.8" strokeLinecap="round" />
        <path d="M30 9.5L37 12L30 14.5Z" fill="#FDE68A" />
      </g>
    ),
    C1: (
      <g>
        <path d="M11 32L9 17L17 23L24 13L31 23L39 17L37 32Z" fill="#F5B14C" />
        <path d="M11 32H37V35.5H11Z" fill="#D9922B" />
        <circle cx="24" cy="25" r="2.6" fill="#FFF3D6" />
        <circle cx="17" cy="27" r="1.7" fill="#FFF3D6" opacity=".8" />
        <circle cx="31" cy="27" r="1.7" fill="#FFF3D6" opacity=".8" />
      </g>
    ),
    SAT: (
      <g>
        <path d="M14 34L13 37L16 36L35 17L32 14Z" fill="#FFB4BE" />
        <path d="M32 14L35 17L37 15Q38 13 36 12L35 11Q33 10 32 11.5Z" fill="#FF7A8A" />
        <path d="M14 34L13 37L16 36Z" fill="#3B2A2E" />
        <path d="M12 22L16 26L23 17" stroke="#FFF" strokeWidth="2.6" fill="none" strokeLinecap="round" strokeLinejoin="round" />
      </g>
    ),
  }[level]
  return <Disc color={color} id={id} size={size}>{art}</Disc>
}

/* The duel invitation: an envelope sealed with a lightning bolt, the two bears' colours. */
export function DuelArt({ className = '' }) {
  const id = useId().replace(/:/g, '')
  return (
    <svg viewBox="0 0 160 120" className={className} aria-hidden="true">
      <defs>
        <linearGradient id={`${id}e`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#1C2533" />
          <stop offset="1" stopColor="#141A24" />
        </linearGradient>
        <radialGradient id={`${id}glow`}>
          <stop offset="0" stopColor="#5CC2FF" stopOpacity=".35" />
          <stop offset="1" stopColor="#5CC2FF" stopOpacity="0" />
        </radialGradient>
      </defs>
      <circle cx="80" cy="60" r="58" fill={`url(#${id}glow)`} />
      <rect x="26" y="30" width="108" height="70" rx="10" fill={`url(#${id}e)`} stroke="#5CC2FF" strokeOpacity=".45" />
      <path d="M28 34L80 70L132 34" stroke="#5CC2FF" strokeOpacity=".55" strokeWidth="2" fill="none" strokeLinejoin="round" />
      <path d="M28 96L66 62M132 96L94 62" stroke="#FFFFFF" strokeOpacity=".08" strokeWidth="2" />
      <circle cx="80" cy="70" r="15" fill="#FF9F43" />
      <circle cx="80" cy="70" r="15" fill="none" stroke="#FFD3A6" strokeOpacity=".6" />
      <path d="M83 59L73 72H80L77 81L87 68H80Z" fill="#fff" />
      <circle cx="30" cy="18" r="3" fill="#5CC2FF" />
      <circle cx="136" cy="20" r="2.2" fill="#FF9F43" />
      <circle cx="146" cy="44" r="1.6" fill="#5CC2FF" />
    </svg>
  )
}

/* An empty podium (no one on the weekly board yet). */
export function PodiumArt({ className = '' }) {
  return (
    <svg viewBox="0 0 120 80" className={className} aria-hidden="true">
      <rect x="44" y="30" width="32" height="44" rx="4" fill="#5CC2FF" fillOpacity=".22" stroke="#5CC2FF" strokeOpacity=".5" />
      <rect x="12" y="44" width="32" height="30" rx="4" fill="#FFFFFF" fillOpacity=".06" stroke="#FFFFFF" strokeOpacity=".16" />
      <rect x="76" y="52" width="32" height="22" rx="4" fill="#FF9F43" fillOpacity=".14" stroke="#FF9F43" strokeOpacity=".4" />
      <text x="60" y="58" textAnchor="middle" fontSize="16" fontWeight="800" fill="#BFE7FF">1</text>
      <path d="M60 8l3 6.2 6.8 1-4.9 4.8 1.2 6.7L60 23.5l-6.1 3.2 1.2-6.7-4.9-4.8 6.8-1z" fill="#F5B14C" />
    </svg>
  )
}

/* An hourglass that has run out (expired duel). */
export function HourglassArt({ className = '' }) {
  return (
    <svg viewBox="0 0 80 96" className={className} aria-hidden="true">
      <path d="M18 8H62M18 88H62" stroke="#94A3B8" strokeWidth="4" strokeLinecap="round" />
      <path d="M22 10Q22 34 40 48Q22 62 22 86H58Q58 62 40 48Q58 34 58 10Z" fill="#FFFFFF" fillOpacity=".05" stroke="#94A3B8" strokeOpacity=".6" strokeWidth="2" />
      <path d="M27 84Q30 68 40 64Q50 68 53 84Z" fill="#FF9F43" fillOpacity=".75" />
      <path d="M40 50V62" stroke="#FF9F43" strokeOpacity=".5" strokeWidth="1.6" strokeDasharray="2 3" />
    </svg>
  )
}
