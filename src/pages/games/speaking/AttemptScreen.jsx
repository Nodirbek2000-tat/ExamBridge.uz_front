/* After a reading: waiting for the AI (polls with backoff) → "Natija" with every word scored. */
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { motion as Motion } from 'framer-motion'
import { Pause, Play, RotateCcw, Volume2 } from 'lucide-react'
import { errorText, fetchAttempt, loadClip } from './api'
import { EmptyArt, FixGlyph, OkGlyph, ProcessingArt, RetryArt, SilentArt, SkipGlyph } from './art'
import { STATUS_TONE, fmtClock, tone } from './theme'
import { Card, GhostButton, LevelBadge, PrimaryButton, TopBar } from './ui'
import { useClipPlayer } from './useClipPlayer'
import WordSheet from './WordSheet'

const GIVE_UP_MS = 3 * 60 * 1000

function verdict(acc) {
  if (acc >= 90) return 'A’lo! Deyarli har bir so‘z aniq.'
  if (acc >= 75) return 'Yaxshi natija — sariq so‘zlarni mashq qiling.'
  if (acc >= 50) return 'Yomon emas. Sariq va qizil so‘zlarni eshitib, qayta urinib ko‘ring.'
  return 'Boshlanishi bor! Sekinroq va aniqroq o‘qib ko‘ring.'
}

function Processing({ timedOut, onRetryPoll, onRedo }) {
  return (
    <div className="mx-auto flex max-w-sm flex-col items-center pt-16 text-center">
      <ProcessingArt size={140} />
      {timedOut ? (
        <>
          <h2 className="mt-6 text-[22px] font-bold">Natija kechikmoqda</h2>
          <p className="mt-2 text-[15px] leading-relaxed text-white/55">Server band bo‘lishi mumkin. Birozdan keyin yana tekshirib ko‘ring.</p>
          <PrimaryButton className="mt-6" onClick={onRetryPoll}><RotateCcw size={17} /> Qayta tekshirish</PrimaryButton>
          <GhostButton className="mt-2" onClick={onRedo}>Qaytadan o‘qish</GhostButton>
        </>
      ) : (
        <>
          <h2 className="mt-6 text-[22px] font-bold">AI har bir so‘zni tekshirmoqda</h2>
          <p className="mt-2 text-[15px] text-white/50">Odatda 5–20 soniya davom etadi</p>
        </>
      )}
    </div>
  )
}

function Failed({ error, onRedo, onList }) {
  const silent = error === 'no-speech'
  return (
    <div className="mx-auto flex max-w-sm flex-col items-center pt-12 text-center">
      {silent ? <SilentArt size={132} /> : <RetryArt size={132} />}
      <h2 className="mt-5 text-[22px] font-bold">{silent ? 'Matn eshitilmadi' : 'Tekshirib bo‘lmadi'}</h2>
      <p className="mt-2 text-[15px] leading-relaxed text-white/55">
        {silent ? 'Yozuvda matndagi so‘zlar topilmadi. Mikrofonga yaqinroq bo‘lib, matnni baland va aniq o‘qing.'
          : error === 'bad-audio' ? 'Yozuv fayli o‘qilmadi. Qaytadan yozib ko‘ring.'
            : 'Xizmat vaqtincha ishlamadi. Birozdan keyin qayta urinib ko‘ring — bu urinish limitga hisoblanmaydi.'}
      </p>
      <PrimaryButton className="mt-6" onClick={onRedo}>Qaytadan o‘qish</PrimaryButton>
      <GhostButton className="mt-2" onClick={onList}>Darslar ro‘yxati</GhostButton>
    </div>
  )
}

function CompareBar({ label, value, color }) {
  return (
    <div className="grid grid-cols-[4.5rem_minmax(0,1fr)_3rem] items-center gap-3">
      <span className="text-[13px] font-medium text-white/50">{label}</span>
      <div className="h-2.5 overflow-hidden rounded-full bg-white/[0.07]">
        {value != null && (
          <Motion.div className="h-full rounded-full" style={{ background: color }}
            initial={{ width: 0 }} animate={{ width: `${Math.max(2, value)}%` }} transition={{ duration: 0.9, ease: 'easeOut' }} />
        )}
      </div>
      <span className="text-right text-[14px] font-bold tabular-nums text-white/85">{value != null ? `${value}%` : '—'}</span>
    </div>
  )
}

function Tile({ glyph, count, label, color, soft }) {
  return (
    // a zero is quiet: nothing to look at there
    <div className={`flex flex-col items-start gap-2 rounded-2xl border border-white/[0.06] p-3.5 ${count ? soft : 'bg-white/[0.02]'}`}>
      <span className={count ? '' : 'opacity-40 grayscale'}>{glyph}</span>
      <span className="text-[22px] font-bold leading-none tabular-nums" style={{ color: count ? color : 'rgba(255,255,255,0.35)' }}>{count} <span className="text-[14px] font-semibold">ta</span></span>
      <span className="text-[12.5px] font-medium leading-tight text-white/60">{label}</span>
    </div>
  )
}

/* bars from the decoded file, or — when the browser cannot decode it — from the word times */
function useBars(peaks, words, duration, n = 72) {
  return useMemo(() => {
    if (peaks?.length) return peaks
    const out = []
    for (let k = 0; k < n; k++) {
      const t0 = (k / n) * (duration || 1)
      const t1 = ((k + 1) / n) * (duration || 1)
      const speaking = words.some(w => w.start != null && w.start < t1 && w.end > t0)
      out.push(speaking ? 0.45 + 0.5 * Math.abs(Math.sin(k * 1.7)) : 0.1)
    }
    return out
  }, [peaks, words, duration, n])
}

function Player({ player, words }) {
  const bars = useBars(player.peaks, words, player.duration)
  const dur = player.duration || 0
  const frac = dur ? Math.min(1, player.time / dur) : 0
  const marks = words.filter(w => w.status === 'fix' && w.start != null)
  const seekAt = (e) => {
    if (!dur) return
    const r = e.currentTarget.getBoundingClientRect()
    player.seek(((e.clientX - r.left) / r.width) * dur)
  }
  const n = bars.length
  return (
    <Card className="p-4 sm:p-5">
      <div className="flex items-center gap-4">
        <button type="button" onClick={player.toggle} disabled={!player.available}
          aria-label={player.playing === 'full' ? 'Pauza' : 'Yozuvni tinglash'}
          className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-full bg-[#7C3AED] text-white transition hover:bg-[#8B5CF6] disabled:bg-white/10 disabled:text-white/30">
          {player.playing === 'full' ? <Pause size={20} fill="currentColor" strokeWidth={0} /> : <Play size={20} fill="currentColor" strokeWidth={0} className="ml-0.5" />}
        </button>
        <div className="min-w-0 flex-1">
          <div role="slider" tabIndex={0} aria-label="Yozuv" aria-valuemin={0} aria-valuemax={Math.round(dur)} aria-valuenow={Math.round(player.time)}
            onClick={seekAt} className="relative h-12 cursor-pointer">
            <svg viewBox={`0 0 ${n * 4} 40`} preserveAspectRatio="none" className="h-10 w-full" aria-hidden="true">
              {bars.map((h, i) => {
                const bh = Math.max(3, h * 38)
                return <rect key={i} x={i * 4 + 0.6} y={20 - bh / 2} width="2.4" height={bh} rx="1.2"
                  fill={(i + 0.5) / n <= frac ? '#A78BFA' : 'rgba(255,255,255,0.18)'} />
              })}
            </svg>
            {dur > 0 && marks.map(w => (
              <span key={w.i} className="absolute bottom-0 h-1 w-1 rounded-full bg-amber-300/80" style={{ left: `${Math.min(99, (w.start / dur) * 100)}%` }} />
            ))}
          </div>
          <div className="mt-0.5 flex justify-between text-[12px] tabular-nums text-white/40">
            <span>{fmtClock(player.time)}</span>
            <span>{player.available ? fmtClock(dur) : 'Yozuv saqlanmagan'}</span>
          </div>
        </div>
      </div>
    </Card>
  )
}

function WordChip({ w, onOpen }) {
  const t = STATUS_TONE[w.status] || STATUS_TONE.skip
  return (
    <button type="button" onClick={() => onOpen(w.i)}
      className={`inline-flex h-10 items-center gap-2 rounded-xl border pl-3 pr-2 text-[15px] font-semibold transition active:scale-95 ${t.ring} ${t.soft} hover:brightness-125`}>
      <span className="text-white/90">{w.say}</span>
      <span className={`flex items-center gap-1 rounded-md bg-black/25 px-1.5 py-0.5 text-[12px] font-bold tabular-nums ${t.text}`}>
        {w.status === 'skip' && <Volume2 size={12} />}{w.score}
      </span>
    </button>
  )
}

function Result({ a, wordIndex, onOpenWord, onCloseWord, onSwitchWord, onNext, onRedo, onList }) {
  const [clip, setClip] = useState(null)
  const [tried, setTried] = useState({})
  const [filter, setFilter] = useState('all')
  const player = useClipPlayer(clip, { duration: a.duration_sec })

  useEffect(() => {
    let alive = true
    loadClip(a).then((b) => { if (alive) setClip(b) }).catch(() => {})
    return () => { alive = false }
  }, [a])

  const words = useMemo(() => (a.words || []).map((w) => {
    const t = tried[w.i]
    return t && t.score > w.score ? { ...w, score: t.score, status: t.status, tried: true } : w
  }), [a.words, tried])
  const problemIdx = useMemo(() => (a.words || []).filter(w => w.status !== 'ok').map(w => w.i), [a.words])
  const onTried = useCallback((i, r) => setTried(prev => ({ ...prev, [i]: !prev[i] || r.score > prev[i].score ? r : prev[i] })), [])
  const shown = filter === 'all' ? words : words.filter(w => problemIdx.includes(w.i))
  const acc = a.accuracy
  const tc = tone(acc)
  const next = a.next && !a.next.locked ? a.next : null

  const actions = (
    <>
      <button type="button" onClick={onRedo} aria-label="Qaytadan o‘qish" title="Qaytadan o‘qish"
        className="flex h-14 w-14 flex-shrink-0 items-center justify-center rounded-2xl border border-white/[0.08] bg-[#111118] text-white/75 hover:bg-[#17171F] hover:text-white">
        <RotateCcw size={20} />
      </button>
      <PrimaryButton onClick={() => (next ? onNext(next.id) : onList())}>{next ? 'Keyingi dars' : 'Darslar ro‘yxati'}</PrimaryButton>
    </>
  )

  return (
    <div className="pb-[calc(env(safe-area-inset-bottom)+150px)] lg:grid lg:grid-cols-[minmax(0,400px)_minmax(0,1fr)] lg:items-start lg:gap-10 lg:pb-16">
      {/* left on a wide screen: the score, the counts, the recording and what to do next */}
      <div className="[@media(min-width:1024px)_and_(min-height:760px)]:sticky [@media(min-width:1024px)_and_(min-height:760px)]:top-[84px]">
      <section className="pt-2">
        <p className="truncate text-[14px] text-white/45">{a.lesson.title}</p>
        <Card className="mt-3 p-5 sm:p-6">
          <p className="text-[14px] font-medium text-white/55">Talaffuz aniqligi</p>
          <div className="mt-1 flex items-end gap-3">
            <Motion.span initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
              className="text-[64px] font-bold leading-none tracking-tight tabular-nums" style={{ color: tc.hex }}>
              {acc}<span className="text-[36px]">%</span>
            </Motion.span>
            {a.fluency_wpm > 0 && <span className="mb-2 text-[13px] text-white/40">{a.fluency_wpm} so‘z/daq</span>}
          </div>
          <p className="mt-2 text-[15px] leading-relaxed text-white/70">{verdict(acc)}</p>
          <div className="mt-5 space-y-2.5">
            <CompareBar label="Hozirgi" value={acc} color="#A78BFA" />
            <CompareBar label="Avvalgi" value={a.previous?.accuracy ?? null} color="rgba(255,255,255,0.35)" />
          </div>
          {!a.previous && <p className="mt-2 text-[12.5px] text-white/35">Bu dars bo‘yicha birinchi urinishingiz</p>}
        </Card>
      </section>

      <div className="mt-3 grid grid-cols-3 gap-2.5 sm:gap-3">
        <Tile glyph={<OkGlyph />} count={a.ok} label="To‘g‘ri" color="#34D399" soft="bg-emerald-400/[0.06]" />
        <Tile glyph={<FixGlyph />} count={a.fix} label="Tuzatish kerak" color="#FBBF24" soft="bg-amber-400/[0.06]" />
        <Tile glyph={<SkipGlyph />} count={a.skip} label="O‘tkazildi" color="#F87171" soft="bg-rose-400/[0.06]" />
      </div>

      <div className="mt-3"><Player player={player} words={words} /></div>
      <div className="mt-4 hidden gap-2.5 lg:flex">{actions}</div>
      </div>

      <section className="mt-7 lg:mt-2 lg:pt-1">
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-[18px] font-bold">So‘zlar bo‘yicha</h2>
          {problemIdx.length > 0 && problemIdx.length < words.length && (
            <div className="flex rounded-full border border-white/[0.08] bg-[#111118] p-0.5 text-[13px] font-semibold">
              {[['all', 'Hammasi'], ['errors', `Xatolar · ${problemIdx.length}`]].map(([k, label]) => (
                <button key={k} type="button" onClick={() => setFilter(k)}
                  className={`h-8 rounded-full px-3 transition ${filter === k ? 'bg-white/[0.1] text-white' : 'text-white/50 hover:text-white'}`}>{label}</button>
              ))}
            </div>
          )}
        </div>
        <p className="mt-1.5 text-[14px] leading-relaxed text-white/45">
          {problemIdx.length ? 'Sariq va qizil so‘zni bosing — o‘z talaffuzingizni va to‘g‘risini eshiting.'
            : 'Hamma so‘z to‘g‘ri! Istalgan so‘zni bosib, o‘zingizni va to‘g‘ri talaffuzni eshiting.'}
        </p>
        <div className="mt-4 flex flex-wrap gap-2">
          {shown.map(w => <WordChip key={w.i} w={w} onOpen={onOpenWord} />)}
        </div>
      </section>

      <div className="fixed inset-x-0 bottom-0 z-20 lg:hidden">
        <div className="pointer-events-none h-8 bg-gradient-to-t from-[#0B0B10] to-transparent" />
        <div className="bg-[#0B0B10] px-4 pb-[calc(env(safe-area-inset-bottom)+16px)] sm:px-0">
          <div className="mx-auto flex max-w-[760px] gap-2.5 sm:px-6">{actions}</div>
        </div>
      </div>

      <WordSheet words={words} original={a.words} index={wordIndex} player={player} problemIdx={problemIdx}
        onClose={onCloseWord} onSwitch={onSwitchWord} onTried={onTried} />
    </div>
  )
}

export default function AttemptScreen({ attemptId, wordIndex, onBack, onOpenWord, onCloseWord, onSwitchWord, onNext, onRedo, onList }) {
  const qc = useQueryClient()
  const started = useRef(0)
  const giveUp = useRef(false)
  const [timedOut, setTimedOut] = useState(false)
  const { data: a, error, refetch } = useQuery({
    queryKey: ['speaking-attempt', String(attemptId)],
    queryFn: () => {
      if (!started.current) started.current = Date.now()
      return fetchAttempt(attemptId)
    },
    refetchInterval: (q) => {
      const d = q.state.data
      if (!d || d.status !== 'PROCESSING' || giveUp.current) return false
      return Math.min(5000, 1000 + q.state.dataUpdateCount * 500)      // 1.5 s, 2 s, 2.5 s … 5 s
    },
    retry: (n, e) => e?.response?.status !== 404 && n < 3,
  })
  const processing = a?.status === 'PROCESSING'

  useEffect(() => {
    if (!processing || timedOut) return undefined
    const left = GIVE_UP_MS - (started.current ? Date.now() - started.current : 0)
    const t = setTimeout(() => { giveUp.current = true; setTimedOut(true) }, Math.max(1000, left))
    return () => clearTimeout(t)
  }, [processing, timedOut])

  // the list and the lesson now show a new best / done
  const ready = a?.status === 'READY'
  useEffect(() => {
    if (!ready) return
    qc.invalidateQueries({ queryKey: ['speaking-lessons'] })
    qc.invalidateQueries({ queryKey: ['speaking-lesson'] })
  }, [ready, qc])

  const retryPoll = () => {
    started.current = Date.now()
    giveUp.current = false
    setTimedOut(false)
    refetch()
  }

  return (
    <div>
      <TopBar onBack={onBack} title={ready ? 'Natija' : processing ? 'Tekshirilmoqda' : a?.lesson?.title || 'Speaking'}
        right={a?.lesson && <LevelBadge level={a.lesson.level} />} />
      {/* (a failed poll while the result is known keeps showing it — polling goes on) */}
      {error && !a && (
        <div className="mx-auto mt-12 flex max-w-sm flex-col items-center text-center">
          <EmptyArt size={120} />
          <p className="mt-3 text-lg font-bold">{error.response?.status === 404 ? 'Natija topilmadi' : 'Natija yuklanmadi'}</p>
          <p className="mt-1 text-[15px] leading-relaxed text-white/55">
            {error.response?.status === 404 ? 'Havola eskirgan yoki bu natija boshqa hisobga tegishli.' : errorText(error)}
          </p>
          <GhostButton className="mx-auto mt-5 max-w-[240px]" onClick={onList}>Darslar ro‘yxati</GhostButton>
        </div>
      )}
      {!a && !error && <Processing />}
      {processing && <Processing timedOut={timedOut} onRetryPoll={retryPoll} onRedo={() => onRedo(a.lesson.id)} />}
      {a?.status === 'FAILED' && <Failed error={a.error} onRedo={() => onRedo(a.lesson.id)} onList={onList} />}
      {ready && (
        <Result a={a} wordIndex={wordIndex} onOpenWord={onOpenWord} onCloseWord={onCloseWord} onSwitchWord={onSwitchWord}
          onNext={onNext} onRedo={() => onRedo(a.lesson.id)} onList={onList} />
      )}
    </div>
  )
}
