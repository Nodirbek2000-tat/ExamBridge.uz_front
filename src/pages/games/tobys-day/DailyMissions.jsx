/*
 * TOBY'S DAY (DailyMissions.jsx — not Missions: missions.js would shadow it on a
 * case-insensitive disk) — today's three missions on the map: what to do, how far the
 * learner is, the reward, and «Olish» (claim) once it is done. Rules and saved
 * data: missions.js.
 */
import { AnimatePresence, motion as Motion } from 'framer-motion'
import { Check } from 'lucide-react'
import { missionList } from './missions'
import { Coin, StarIcon } from './ui'

/* small drawn pictures for the missions (no icon font) */
export function MissionIcon({ kind, size = 28 }) {
  return (
    <svg viewBox="-16 -16 32 32" width={size} height={size} aria-hidden>
      {kind === 'perfect' && (
        <g>
          <path d="M0-11l3.2 6.6 7.3 1-5.3 5.1 1.3 7.2L0 5.5l-6.5 3.4 1.3-7.2-5.3-5.1 7.3-1z" fill="#FDE047" stroke="#F59E0B" strokeWidth="1.3" strokeLinejoin="round" />
          <path d="M11-12v5M8.5-9.5h5M-12 7v4M-14 9h4" stroke="#fff" strokeWidth="1.6" strokeLinecap="round" />
        </g>
      )}
      {kind === 'mic' && (
        <g>
          <rect x="-5" y="-13" width="10" height="17" rx="5" fill="#FFB020" />
          <path d="M-3-9v6" stroke="#FFE7B3" strokeWidth="1.6" strokeLinecap="round" />
          <path d="M-9-2a9 9 0 0 0 18 0M0 7v5M-5 12h10" stroke="#E2E8F0" strokeWidth="2" fill="none" strokeLinecap="round" />
        </g>
      )}
      {kind === 'flame' && (
        <g>
          <path d="M0-13c6 6 9 10 9 15a9 9 0 0 1-18 0c0-4 2-6 4-8 0 3 1 5 3 5-1-5 0-9 2-12z" fill="#FB923C" />
          <path d="M0-1c3 3 4 5 4 7a4 4 0 0 1-8 0c0-2 1-4 4-7z" fill="#FDE047" />
        </g>
      )}
      {kind === 'room' && (
        <g>
          <path d="M-11-4-10-13l6 4M11-4l-1-9-6 4" fill="#FFF6EA" stroke="#D9BC9C" strokeWidth="1.2" strokeLinejoin="round" />
          <circle cy="1" r="11" fill="#FFF6EA" stroke="#D9BC9C" strokeWidth="1.3" />
          <ellipse cx="-4" cy="0" rx="1.8" ry="2.4" fill="#1F2937" />
          <ellipse cx="4" cy="0" rx="1.8" ry="2.4" fill="#1F2937" />
          <path d="M-3 5q3 3 6 0" stroke="#9F1239" strokeWidth="1.3" fill="none" strokeLinecap="round" />
          <path d="M9 11q3-2 5 0M11 14q2-1 4 0" stroke="#A78BFA" strokeWidth="1.4" fill="none" strokeLinecap="round" />
        </g>
      )}
      {kind === 'ear' && (
        <g>
          <path d="M-2-12c7-1 11 4 10 9-1 4-4 5-5 8-1 4-4 7-8 5" stroke="#FDA4AF" strokeWidth="3.4" fill="none" strokeLinecap="round" />
          <path d="M-1-5c3-1 5 1 4 4" stroke="#FDA4AF" strokeWidth="2.2" fill="none" strokeLinecap="round" />
          <path d="M-12-6q-3 6 0 12M-8-3q-2 3 0 6" stroke="#FFB020" strokeWidth="1.8" fill="none" strokeLinecap="round" />
        </g>
      )}
      {kind === 'ask' && (
        <g>
          <path d="M-12-10h24a3 3 0 0 1 3 3v11a3 3 0 0 1-3 3H-2l-7 6v-6h-3a3 3 0 0 1-3-3V-7a3 3 0 0 1 3-3z" fill="#38BDF8" />
          <path d="M-3-4q0-4 3.5-4t3.5 3.5q0 2.5-3.5 3.5v2" stroke="#fff" strokeWidth="2.2" fill="none" strokeLinecap="round" />
          <circle cx="0" cy="6" r="1.4" fill="#fff" />
        </g>
      )}
      {kind === 'gap' && (
        <g>
          <rect x="-14" y="-6" width="7" height="4" rx="2" fill="#94A3B8" />
          <rect x="-5" y="-8" width="11" height="8" rx="2" fill="none" stroke="#FFB020" strokeWidth="1.8" strokeDasharray="2.5 2" />
          <rect x="8" y="-6" width="6" height="4" rx="2" fill="#94A3B8" />
          <rect x="-14" y="4" width="11" height="4" rx="2" fill="#475569" />
          <rect x="-1" y="4" width="15" height="4" rx="2" fill="#475569" />
        </g>
      )}
      {kind === 'flag' && (
        <g>
          <path d="M-8-13v26" stroke="#CBD5E1" strokeWidth="2.4" strokeLinecap="round" />
          <path d="M-7-12h17l-4 6 4 6H-7z" fill="#34D399" />
          <path d="M-1-9h3v3h-3zM2-6h3v3H2z" fill="#065F46" opacity="0.5" />
        </g>
      )}
      {kind === 'star' && (
        <g>
          <path d="M-3-9l2 4.2 4.6.6-3.4 3.2.9 4.6L-3 1.4l-4.1 2.2.9-4.6-3.4-3.2 4.6-.6z" fill="#FDE047" stroke="#F59E0B" strokeWidth="1" />
          <path d="M6-2l1.6 3.3 3.6.5-2.6 2.5.6 3.6L6 6.2l-3.2 1.7.6-3.6-2.6-2.5 3.6-.5z" fill="#FDE047" stroke="#F59E0B" strokeWidth="1" />
        </g>
      )}
    </svg>
  )
}

function Reward({ reward, dark = false }) {
  return (
    <span className={`flex flex-shrink-0 items-center gap-1.5 text-[12.5px] font-bold tabular-nums lg:text-[13.5px] ${dark ? 'text-[#1A1203]' : 'text-white/80'}`}>
      {reward.coins ? <span className="flex items-center gap-0.5"><Coin size={14} />{reward.coins}</span> : null}
      {reward.stars ? <span className="flex items-center gap-0.5"><StarIcon size={14} />{reward.stars}</span> : null}
    </span>
  )
}

export default function MissionsCard({ progress, onClaim, reduced, className = '' }) {
  const list = missionList(progress)
  const done = list.filter(m => m.claimed).length
  return (
    <section className={`flex flex-col rounded-[28px] border border-white/[0.08] bg-[#111118] p-4 lg:p-5 ${className}`}>
      <div className="flex items-baseline justify-between gap-2">
        <h2 className="text-[16px] font-extrabold tracking-tight lg:text-[18px]">Bugungi vazifalar</h2>
        <span className="text-[12px] font-semibold tabular-nums text-white/40 lg:text-[13px]">{done} / {list.length}</span>
      </div>
      <p className="mt-0.5 text-[12.5px] font-medium text-white/40 lg:text-[13px]">Har kuni yangi uchta vazifa</p>
      <ul className="mt-3 flex flex-1 flex-col gap-2 lg:gap-2.5">
        {list.map((m, i) => {
          const ready = m.done && !m.claimed
          return (
            <Motion.li key={m.id} initial={reduced ? false : { opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.06 * i }}
              className={`flex items-center gap-3 rounded-2xl px-3 py-2.5 lg:py-3 ${ready ? 'bg-[#FFB020]/[0.08] ring-1 ring-[#FFB020]/40' : 'bg-[#17171F]'}`}>
              <span className={`flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl bg-white/[0.05] ${m.claimed ? 'opacity-50' : ''}`}>
                <MissionIcon kind={m.icon} size={26} />
              </span>
              <div className="min-w-0 flex-1">
                <p className={`line-clamp-2 text-[14px] font-bold leading-tight lg:text-[15px] ${m.claimed ? 'text-white/45 line-through decoration-white/25' : 'text-white'}`}>{m.title}</p>
                <div className="mt-1.5 flex items-center gap-2">
                  <div className="h-1 flex-1 overflow-hidden rounded-full bg-white/[0.08]">
                    <Motion.div className={`h-full rounded-full ${m.done ? 'bg-emerald-400' : 'bg-[#FFB020]'}`} initial={false}
                      animate={{ width: `${(m.value / m.goal) * 100}%` }} transition={{ duration: reduced ? 0 : 0.6 }} />
                  </div>
                  <span className="text-[11.5px] font-semibold tabular-nums text-white/45">{m.value}/{m.goal}</span>
                </div>
              </div>
              <AnimatePresence mode="wait" initial={false}>
                {ready ? (
                  <Motion.button key="claim" type="button" onClick={() => onClaim(m.id)} whileTap={{ scale: 0.94 }}
                    initial={{ scale: 0.8, opacity: 0 }} animate={reduced ? { scale: 1, opacity: 1 } : { scale: [1, 1.06, 1], opacity: 1 }}
                    transition={reduced ? { duration: 0.15 } : { scale: { duration: 1.4, repeat: Infinity }, opacity: { duration: 0.2 } }}
                    className="flex flex-shrink-0 items-center gap-1.5 rounded-full bg-[#FFB020] px-3 py-1.5 text-[12.5px] font-extrabold text-[#1A1203]">
                    Olish <Reward reward={m.reward} dark />
                  </Motion.button>
                ) : m.claimed ? (
                  <Motion.span key="got" initial={{ scale: 0.6, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
                    className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full bg-emerald-400 text-[#06281B]">
                    <Check size={15} strokeWidth={3} />
                  </Motion.span>
                ) : (
                  <Motion.span key="reward" initial={false}><Reward reward={m.reward} /></Motion.span>
                )}
              </AnimatePresence>
            </Motion.li>
          )
        })}
      </ul>
    </section>
  )
}
