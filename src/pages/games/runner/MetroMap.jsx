/*
 * TOBY RUN — the metro map (RUNNER_PLAN §B9.1 MetroMap): one line per level (A1 red, A2 blue, B1 green,
 * B2 amber, C1 violet), the topics are its stations, each with a ring that fills as the learner masters
 * its words (GET /games/runner/me/?level= → topics: total, said, mastered, pct). "Hammasi" is the
 * interchange (all topics mixed). Tapping a station picks the topic for the next run.
 */
import { useEffect, useMemo, useState } from 'react'
import { motion as Motion } from 'framer-motion'
import { LEVELS_LIST, TOPICS, topicTitle } from './content'
import { getMe } from './api'
import { useWide } from '../voice-drive/useWide'
import { ACCENT, CARD, LABEL, Screen, TopBar } from './ui'

const DEFAULT_TOPICS = ['metro', 'bozor', 'park', 'home', 'food', 'general']

function layout(n, wide) {
  const cols = wide ? 4 : 3
  const W = wide ? 1000 : 360
  const mx = wide ? 110 : 62
  const dx = cols > 1 ? (W - mx * 2) / (cols - 1) : 0
  const dy = wide ? 150 : 132
  const top = 70
  const pts = []
  for (let i = 0; i < n; i++) {
    const r = Math.floor(i / cols)
    const c = i % cols
    const cc = r % 2 ? cols - 1 - c : c
    pts.push({ x: mx + cc * dx, y: top + r * dy, r, last: c === cols - 1 })
  }
  // the line: straight along a row, a round turn at the row's end (metro-map style)
  let d = ''
  pts.forEach((p, i) => {
    if (!i) { d = `M${p.x} ${p.y}`; return }
    const q = pts[i - 1]
    if (p.r === q.r) { d += ` L${p.x} ${p.y}`; return }
    // the next row starts under the last station: a rounded "U" just outside it
    const out = q.r % 2 ? -1 : 1
    const k = 44
    const sw = out > 0 ? 1 : 0
    d += ` A${k} ${k} 0 0 ${sw} ${q.x + out * k} ${q.y + k} L${q.x + out * k} ${p.y - k} A${k} ${k} 0 0 ${sw} ${p.x} ${p.y}`
  })
  const rows = Math.max(1, Math.ceil(n / cols))
  return { pts, d, W, H: top + (rows - 1) * dy + 92 }
}

export default function MetroMap({ progress, onPick, onLevel, onBack }) {
  const wide = useWide()
  const [level, setLevel] = useState(progress.level)
  const [byLevel, setByLevel] = useState({})        // level → me/ payload, or 'error'
  const L = LEVELS_LIST.find(l => l.id === level) || LEVELS_LIST[0]
  const color = L.color

  useEffect(() => {
    let alive = true
    getMe(level).then((d) => { if (alive) setByLevel(x => ({ ...x, [level]: d })) })
      .catch(() => { if (alive) setByLevel(x => ({ ...x, [level]: x[level] || 'error' })) })
    return () => { alive = false }
  }, [level])
  const err = byLevel[level] === 'error'
  const data = err ? null : byLevel[level] || null

  const stations = useMemo(() => {
    const list = data?.topics?.length ? data.topics : DEFAULT_TOPICS.map(t => ({ topic: t, total: 0, said: 0, mastered: 0, pct: 0 }))
    const total = list.reduce((s, t) => s + t.total, 0)
    const mastered = list.reduce((s, t) => s + t.mastered, 0)
    return [{ topic: 'all', total, said: list.reduce((s, t) => s + t.said, 0), mastered, pct: total ? Math.round(100 * mastered / total) : 0 }, ...list]
  }, [data])
  const { pts, d, W, H } = layout(stations.length, wide)
  const current = progress.topic || 'all'

  const pick = (topic) => {
    if (level !== progress.level) onLevel?.(level)
    onPick(topic)
  }

  return (
    <Screen>
      <TopBar title="Metro xaritasi" coins={progress.coins} onBack={onBack} />
      <div className="flex flex-wrap items-center gap-1.5" role="tablist" aria-label="Darajalar — metro liniyalari">
        {LEVELS_LIST.map(l => {
          const on = l.id === level
          return (
            <button key={l.id} type="button" role="tab" aria-selected={on} onClick={() => setLevel(l.id)}
              className={`flex h-11 items-center gap-2 rounded-full border px-3.5 text-[14px] font-black transition ${on ? 'border-white/25 bg-white/[0.08] text-white' : 'border-white/[0.08] bg-[#111118] text-white/55 hover:text-white'}`}>
              <span className="h-2.5 w-6 rounded-full" style={{ background: l.color }} />{l.id}
            </button>
          )
        })}
      </div>
      <p className="mt-3 px-1 text-[14px] font-semibold text-white/55">
        <b className="text-white/85">{L.id}-liniya</b> · {L.title}. Bekatni tanlang — keyingi yugurish shu mavzu so‘zlari bilan.
      </p>

      <div className={`${CARD} relative mt-4 overflow-hidden p-2 lg:p-4`}>
        <svg viewBox={`0 0 ${W} ${H}`} className="block h-auto w-full" role="group" aria-label={`${L.id} liniyasi bekatlari`}>
          <defs>
            <linearGradient id="rn-anhor" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0" stopColor="#2BB3C0" stopOpacity="0" />
              <stop offset=".5" stopColor="#2BB3C0" stopOpacity=".16" />
              <stop offset="1" stopColor="#2BB3C0" stopOpacity="0" />
            </linearGradient>
          </defs>
          {/* the Anhor canal winding under the city */}
          <path d={`M-20 ${H * 0.62} C ${W * 0.25} ${H * 0.45}, ${W * 0.55} ${H * 0.85}, ${W + 20} ${H * 0.55}`} stroke="url(#rn-anhor)" strokeWidth="22" fill="none" />
          <text x={W * 0.12} y={H * 0.6 - 16} fill="#2BB3C0" fillOpacity=".35" fontSize="11" fontWeight="700" letterSpacing="2">ANHOR</text>
          <path d={d} stroke={color} strokeWidth="11" fill="none" strokeLinecap="round" strokeLinejoin="round" opacity=".95" />
          <path d={d} stroke="#ffffff" strokeOpacity=".18" strokeWidth="2" fill="none" strokeLinecap="round" />
          {pts.map((p, i) => {
            const s = stations[i]
            const on = s.topic === current && level === progress.level
            const hub = s.topic === 'all'
            const circ = 2 * Math.PI * 22
            const pct = Math.max(0, Math.min(100, s.pct || 0))
            const labelUp = false
            return (
              <g key={s.topic} transform={`translate(${p.x} ${p.y})`} className="cursor-pointer" role="button" tabIndex={0}
                aria-label={`${hub ? 'Hammasi' : topicTitle(s.topic)}: ${s.mastered} / ${s.total} so‘z yodda`}
                onClick={() => pick(s.topic)} onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); pick(s.topic) } }}>
                <circle r="30" fill="transparent" />
                {on && <Motion.circle r="30" fill={color} fillOpacity=".18" initial={{ scale: 0.6 }} animate={{ scale: [1, 1.12, 1] }} transition={{ duration: 2, repeat: Infinity }} />}
                <circle r="22" fill="none" stroke="#ffffff" strokeOpacity=".1" strokeWidth="5" />
                {pct > 0 && (
                  <circle r="22" fill="none" stroke={color} strokeWidth="5" strokeLinecap="round"
                    strokeDasharray={`${(pct / 100) * circ} ${circ}`} transform="rotate(-90)" />
                )}
                <circle r={hub ? 15 : 13} fill={on ? color : '#F6EBD9'} stroke={hub ? '#0B0B10' : color} strokeWidth={hub ? 5 : 4} />
                {hub && <circle r="6" fill={on ? '#F6EBD9' : color} />}
                {on && !hub && <path d="M-5 0l3.5 3.5L5.5-4" stroke="#0B0B10" strokeWidth="2.6" fill="none" strokeLinecap="round" strokeLinejoin="round" />}
                <text y={labelUp ? -36 : 44} textAnchor="middle" fill="#ffffff" fontSize={wide ? 15 : 13} fontWeight="800">{hub ? 'Hammasi' : (TOPICS[s.topic] ? topicTitle(s.topic) : 'Boshqa')}</text>
                <text y={labelUp ? -21 : 59} textAnchor="middle" fill="#ffffff" fillOpacity=".5" fontSize={wide ? 12 : 11} fontWeight="700">
                  {s.total ? `${s.mastered}/${s.total} · ${pct}%` : '—'}
                </text>
              </g>
            )
          })}
        </svg>
        {!data && !err && <div className="absolute inset-0 animate-pulse bg-white/[0.02]" aria-hidden="true" />}
      </div>

      <div className="mt-3 grid grid-cols-3 gap-2">
        <div className={`${CARD} px-3 py-3`}>
          <p className="text-xl font-black tabular-nums">{stations[0].mastered}</p>
          <p className="text-[12px] font-semibold leading-tight text-white/50">so‘z yodda ({level})</p>
        </div>
        <div className={`${CARD} px-3 py-3`}>
          <p className="text-xl font-black tabular-nums">{data?.week?.lines ?? 0}</p>
          <p className="text-[12px] font-semibold leading-tight text-white/50">bu hafta aytilgan gap</p>
        </div>
        <div className={`${CARD} px-3 py-3`}>
          <p className="text-xl font-black tabular-nums" style={{ color: ACCENT }}>{data?.week?.first_try_rate != null ? `${Math.round(data.week.first_try_rate * 100)}%` : '—'}</p>
          <p className="text-[12px] font-semibold leading-tight text-white/50">birinchi urinishda</p>
        </div>
      </div>
      <p className={`${LABEL} mt-4 px-1 normal-case tracking-normal text-white/35`}>Halqa — 3 xil kunda eslab aytilgan so‘zlar ulushi. {err ? 'Internet yo‘q: xarita keyinroq to‘ladi.' : ''}</p>
    </Screen>
  )
}
