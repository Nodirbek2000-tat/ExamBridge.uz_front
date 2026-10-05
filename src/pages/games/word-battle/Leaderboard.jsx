/* This week's best scores at one level (ranked rounds only), with my own place. */
import { useQuery } from '@tanstack/react-query'
import { fetchLeaderboard } from './api'
import { PodiumArt } from './art'
import { fmtNum } from './theme'

const MEDAL = ['#F5B14C', '#C9D6E3', '#D99A6C']

export default function Leaderboard({ level }) {
  const { data, isLoading, error } = useQuery({
    queryKey: ['wb-leaderboard', level],
    queryFn: () => fetchLeaderboard(level),
    staleTime: 30_000,
  })
  const top = data?.top || []
  const me = data?.me
  const meInTop = top.some(t => t.is_me)
  return (
    <div className="rounded-3xl border border-white/[0.08] bg-[#111118]">
      <div className="flex items-baseline justify-between px-5 pb-2 pt-4">
        <h2 className="text-[15px] font-bold">Haftalik reyting</h2>
        <span className="text-[12px] font-semibold text-white/40">{level} · 7 kun</span>
      </div>
      {isLoading && (
        <div className="space-y-2 px-5 pb-5" aria-hidden="true">
          {[0, 1, 2, 3].map(i => <div key={i} className="h-9 animate-pulse rounded-xl bg-white/[0.04]" />)}
        </div>
      )}
      {error && <p className="px-5 pb-5 text-[14px] text-white/50">Reyting yuklanmadi.</p>}
      {!isLoading && !error && !top.length && (
        <div className="flex flex-col items-center px-5 pb-6 pt-2 text-center">
          <PodiumArt className="w-28" />
          <p className="mt-2 text-[14px] font-semibold text-white/80">Bu hafta hali hech kim yo‘q</p>
          <p className="mt-0.5 text-[13px] text-white/45">Birinchi bo‘ling — {level} darajasida jang qiling.</p>
        </div>
      )}
      {top.length > 0 && (
        <ol className="px-2 pb-2">
          {top.map((t, i) => (
            <li key={`${i}-${t.name}`} className={`flex items-center gap-3 rounded-xl px-3 py-2 ${t.is_me ? 'bg-[#5CC2FF]/[0.08]' : ''}`}>
              <span className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full text-[13px] font-black tabular-nums"
                style={i < 3 ? { background: `${MEDAL[i]}22`, color: MEDAL[i] } : { color: 'rgba(255,255,255,.4)' }}>
                {i + 1}
              </span>
              <span className={`min-w-0 flex-1 truncate text-[15px] ${t.is_me ? 'font-bold text-[#BFE7FF]' : 'text-white/85'}`}>
                {t.name}{t.is_me && <span className="ml-1.5 text-[12px] font-semibold text-[#8FD5FF]">(siz)</span>}
              </span>
              <span className="text-[15px] font-bold tabular-nums text-white/90">{fmtNum(t.score)}</span>
            </li>
          ))}
          {me?.rank && !meInTop && (
            <li className="mt-1 flex items-center gap-3 rounded-xl border-t border-white/[0.06] bg-[#5CC2FF]/[0.06] px-3 py-2">
              <span className="w-7 text-center text-[13px] font-black tabular-nums text-[#8FD5FF]">{me.rank}</span>
              <span className="flex-1 text-[15px] font-bold text-[#BFE7FF]">Siz</span>
              <span className="text-[15px] font-bold tabular-nums">{fmtNum(me.best)}</span>
            </li>
          )}
        </ol>
      )}
    </div>
  )
}
