/*
 * TOBY RUN — results (RUNNER_PLAN §B4.4): the score (the server's when it answers), what was said, one
 * chip per item (✓ / ~ / ✗ — shape and colour), "Toby eshitdi: …", ▶ the model voice, 🎙 one more try,
 * and the Tuzat drill: the red items again (at most 5), calm, no world — +10 coins per fix.
 * Retries go to POST /runner/practice/ (no box change; due moves). Honest words: "Toby tushundi".
 *
 * Below: missions finished in this run (their coins are already in the wallet), today's missions, and a
 * way to the weekly boards.
 */
import { useEffect, useMemo, useState } from 'react'
import { createPortal } from 'react-dom'
import { AnimatePresence, motion as Motion } from 'framer-motion'
import { Check, ChevronLeft, Home, Loader2, Mic, Play, RotateCcw, Trophy, Volume2, Wrench, X } from 'lucide-react'
import { sayLine, stopVoice } from '../../../games/voice/voiceTts'
import { judge, tipFor } from './engine/judge.js'
import { COINS } from './engine/levels.js'
import { ACCENT, LEVEL_INFO } from './content'
import { getBoard, postPractice } from './api'
import { MicRow, Picture, WordLine } from './PromptCard'
import { MissionList, MissionRow } from './MissionsScreen'
import { Coin } from './art'

const CARD = 'rounded-[24px] border border-white/[0.08] bg-[#111118]'
const LABEL = 'text-[11px] font-bold uppercase tracking-[0.2em] text-white/40 lg:text-xs'
const STATUS = {
  ok: { icon: Check, cls: 'bg-emerald-400 text-[#0B0B10]', label: 'Birinchi urinishda' },
  close: { icon: null, cls: 'bg-amber-300 text-[#0B0B10]', label: 'Deyarli' },
  miss: { icon: X, cls: 'bg-rose-400 text-[#0B0B10]', label: 'Mashq kerak' },
  skip: { icon: null, cls: 'bg-white/[0.12] text-white/60', label: 'Eshitilmadi' },
  fixed: { icon: Check, cls: 'bg-[#A98BFF] text-[#0B0B10]', label: 'Tuzatildi' },
}

/* one row per item: the best it reached in this run */
function itemsOf(outcomes) {
  const map = new Map()
  for (const o of outcomes) {
    const key = `${o.k}:${o.id}:${o.m === 's' ? 's' : 'b'}`
    let it = map.get(key)
    if (!it) { it = { key, o, list: [] }; map.set(key, it) }
    it.list.push(o)
  }
  return [...map.values()].map(({ key, o, list }) => {
    const firstOk = list.some(x => x.tries <= 1 && x.v === 'ok')
    const pass = list.some(x => x.v === 'ok' || x.v === 'close')
    const status = firstOk ? 'ok' : pass ? 'close' : list.some(x => x.v === 'miss') ? 'miss' : 'skip'
    const wrong = [...list].reverse().find(x => x.v === 'miss' && x.heard)
    const heard = wrong?.heard || list[list.length - 1].heard || ''
    return { key, o, status, heard, tip: wrong ? tipFor(o.kind === 'answer' ? '' : o.text, wrong.heard)?.text || '' : '' }
  })
}

// a retry is always "say it like the model" (an answer → its model answer, a fill → the whole sentence)
const asOf = (o) => (o.as === 'picture' || o.kind === 'word' ? 'word' : 'echo')

function Stat({ value, label, tone = 'text-white' }) {
  return (
    <div className={`${CARD} px-3 py-3 lg:px-4 lg:py-4`}>
      <p className={`text-2xl font-black tabular-nums lg:text-3xl ${tone}`}>{value}</p>
      <p className="mt-0.5 text-[12px] font-semibold leading-tight text-white/50 lg:text-[13px]">{label}</p>
    </div>
  )
}

export default function ResultScreen({ result, progress, speech, onFix, onAgain, onStart, onHub, onScreen }) {
  const { summary, server, pending } = result
  // red items fixed earlier on this result (the screen can be left for the board and come back: no second reward)
  const [rows, setRows] = useState(() => itemsOf(summary.outcomes).map(r => (result.fixedKeys?.includes(r.key) ? { ...r, status: 'fixed' } : r)))
  const [playing, setPlaying] = useState('')
  const [trying, setTrying] = useState('')         // key of the chip being retried
  const [drill, setDrill] = useState(null)          // { queue: [keys], i, state, heard, words }
  const [fixes, setFixes] = useState(() => result.fixedKeys?.length || 0)
  const [board, setBoard] = useState(null)
  const level = summary.level
  const score = server?.score ?? summary.score_client
  const ranked = server ? server.ranked : summary.mode === 'voice'
  const spoken = summary.outcomes.filter(o => o.v !== 'skip').length
  const firstTry = summary.passes
  const isNew = server ? server.new_best : score > 0 && score >= (progress.best[level] || 0)

  useEffect(() => () => stopVoice(), [])
  useEffect(() => {
    if (pending || !server) return
    getBoard().then(setBoard).catch(() => {})
  }, [pending, server])

  const red = rows.filter(r => r.status === 'miss')
  const counts = useMemo(() => ({
    newWords: server?.srs?.new ?? new Set(summary.outcomes.filter(o => o.pt === 'hear').map(o => `${o.k}:${o.id}`)).size,
    strengthened: server?.srs?.strengthened ?? 0,
    weak: rows.filter(r => r.status === 'miss').length,
  }), [server, summary, rows])

  const play = (o) => {
    setPlaying(o.uid || o.text)
    Promise.race([sayLine(o.text, { voice: o.voice || 'teacher' }), new Promise(r => setTimeout(r, 6000))])
      .then(() => setPlaying(p => (p === (o.uid || o.text) ? '' : p)))
  }

  /* one more try for an item → ok/close fixes it (practice: the server moves its due date) */
  const tryOnce = async (row) => {
    const o = row.o
    stopVoice()
    speech.prime()
    const { alternatives } = await speech.listen({ maxMs: o.kind === 'word' ? 6000 : 9000 })
    const r = judge({ ...o, say_also: [] }, alternatives, { level, final: true, as: asOf(o) })
    const ok = r.v === 'ok' || r.v === 'close'
    if (ok && row.status !== 'fixed') {
      setRows(rs => rs.map(x => (x.key === row.key ? { ...x, status: x.status === 'miss' ? 'fixed' : x.status, heard: r.heard } : x)))
      if (row.status === 'miss' && fixes < COINS.fixMax) {
        setFixes(f => f + 1)
        onFix?.(COINS.fix, row.key)
      }
      if (result.deck && (o.k === 'w' || o.k === 'p')) postPractice(result.deck, [{ k: o.k, id: o.id, v: r.v, heard: r.heard, ms: null }]).catch(() => {})
    } else {
      setRows(rs => rs.map(x => (x.key === row.key ? { ...x, heard: r.heard || x.heard } : x)))
    }
    return { ok, r }
  }

  const retryChip = async (row) => {
    if (trying) return
    setTrying(row.key)
    try { await tryOnce(row) } finally { setTrying('') }
  }

  /* the Tuzat drill: model voice → the learner says it → next */
  const startDrill = () => setDrill({ queue: red.slice(0, 5).map(r => r.key), i: 0, state: 'intro', heard: '', words: null })
  useEffect(() => {
    if (!drill || drill.state !== 'intro') return undefined
    let alive = true
    const row = rows.find(r => r.key === drill.queue[drill.i])
    if (!row) return undefined
    Promise.race([sayLine(row.o.text, { voice: row.o.voice || 'teacher' }), new Promise(r => setTimeout(r, 6000))]).then(async () => {
      if (!alive) return
      setDrill(d => ({ ...d, state: 'listen' }))
      const { ok, r } = await tryOnce(row)
      if (!alive) return
      setDrill(d => ({ ...d, state: ok ? 'ok' : 'miss', heard: r.heard, words: r.words }))
    })
    return () => { alive = false }
  }, [drill?.i, drill?.state]) // eslint-disable-line react-hooks/exhaustive-deps

  const drillNext = () => setDrill(d => (d.i + 1 < d.queue.length ? { ...d, i: d.i + 1, state: 'intro', heard: '', words: null } : { ...d, state: 'done' }))
  const drillRow = drill ? rows.find(r => r.key === drill.queue[drill.i]) : null
  const L = LEVEL_INFO[level]

  return (
    <div className="min-h-screen bg-[#0B0B10] text-white">
      <div className="mx-auto w-full max-w-lg px-4 pb-10 pt-[max(14px,env(safe-area-inset-top))] lg:max-w-[1200px] lg:px-8">
        <div className="mb-4 flex items-center gap-3">
          <button type="button" onClick={onStart} aria-label="Orqaga"
            className="flex h-11 w-11 items-center justify-center rounded-full border border-white/[0.08] bg-[#111118] text-white/80 transition hover:bg-white/[0.06]">
            <ChevronLeft size={21} />
          </button>
          <div className="min-w-0 flex-1">
            <p className={LABEL}>TOBY RUN · {level}</p>
            <p className="truncate text-base font-bold lg:text-lg">Natija</p>
          </div>
          <span className="flex h-11 items-center gap-2 rounded-full border border-white/[0.08] bg-[#111118] px-4 text-[15px] font-bold tabular-nums">
            <span className="h-3.5 w-3.5 rounded-full bg-[#F5B14C] shadow-[inset_0_0_0_2px_#FFE3A6]" />{progress.coins.toLocaleString('en-US')}
          </span>
        </div>

        <div className="lg:grid lg:grid-cols-12 lg:gap-6">
          <div className="lg:col-span-5">
            <Motion.div initial={{ y: 12, opacity: 0 }} animate={{ y: 0, opacity: 1 }}
              className="relative overflow-hidden rounded-[28px] border border-white/[0.08] bg-[radial-gradient(ellipse_at_50%_0%,#2a2440_0%,#14131c_60%,#111118_100%)] p-5 lg:p-7">
              <p className="text-[11px] font-bold uppercase tracking-[0.22em]" style={{ color: L?.color || ACCENT }}>{L?.title}</p>
              <div className="mt-1 flex items-end gap-3">
                <p className="text-[56px] font-black leading-none tracking-tight tabular-nums lg:text-[72px]">{score.toLocaleString('en-US')}</p>
                {pending && <Loader2 size={20} className="mb-3 animate-spin text-white/40" />}
              </div>
              <div className="mt-3 flex flex-wrap items-center gap-2">
                {isNew && <span className="inline-flex items-center gap-1.5 rounded-full bg-[#F5B14C] px-3 py-1 text-[13px] font-black text-[#0B0B10]"><Trophy size={14} /> Yangi rekord!</span>}
                <span className="rounded-full bg-white/[0.07] px-3 py-1 text-[13px] font-semibold text-white/75">{summary.distance_m} m · {Math.round(summary.duration_s)} s</span>
                <span className="inline-flex items-center gap-1.5 rounded-full bg-white/[0.07] px-3 py-1 text-[13px] font-semibold text-white/75"><span className="h-3 w-3 rounded-full bg-[#F5B14C] shadow-[inset_0_0_0_2px_#FFE3A6]" /> +{summary.coins} tanga</span>
                {board?.me?.rank && ranked && <span className="rounded-full bg-[#A98BFF]/15 px-3 py-1 text-[13px] font-bold text-[#cbb9ff]">Haftalik reyting: #{board.me.rank}</span>}
              </div>
              <p className="mt-3 text-[13px] font-medium text-white/45">
                {!ranked ? (summary.mode === 'listen' ? 'Tinglash rejimi — reytingga kirmaydi, so‘zlarning ma’nosi mashq qilindi.' : 'Bu o‘yin reytingga kirmadi.')
                  : result.error ? 'Internet yo‘q — natija shu qurilmada saqlandi.' : `Ko‘paytiruvchi ×${(1 + 0.1 * Math.min(firstTry, 20)).toFixed(1)} — har birinchi urinishdagi javob +0.1.`}
              </p>
            </Motion.div>

            <div className="mt-3 grid grid-cols-3 gap-2">
              <Stat value={spoken} label="marta gapirdingiz" />
              <Stat value={firstTry} label="birinchi urinishda" tone="text-emerald-300" />
              <Stat value={counts.newWords} label="yangi so‘z" tone="text-[#cbb9ff]" />
              <Stat value={counts.strengthened} label="mustahkamlandi" />
              <Stat value={counts.weak} label="mashq kerak" tone={counts.weak ? 'text-rose-300' : 'text-white'} />
              <Stat value={summary.stations} label="bekat" />
            </div>

            {red.length > 0 && (
              <button type="button" onClick={startDrill}
                className="mt-3 flex w-full items-center gap-3 rounded-[22px] border border-[#A98BFF]/40 bg-[#A98BFF]/[0.1] p-4 text-left transition hover:bg-[#A98BFF]/[0.16]">
                <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#A98BFF] text-[#0B0B10]"><Wrench size={20} /></span>
                <span className="min-w-0 flex-1">
                  <span className="block text-[16px] font-black">Tuzat · {Math.min(5, red.length)} ta</span>
                  <span className="block text-[13px] font-medium text-white/55">Qizil so‘zlarni yana bir bor ayting — har biri +{COINS.fix} tanga</span>
                </span>
                <Play size={18} className="fill-current text-[#A98BFF]" />
              </button>
            )}

            {/* missions */}
            <div className="mb-2.5 mt-5 flex items-end justify-between">
              <h2 className={LABEL}>Missiyalar</h2>
              <button type="button" onClick={() => onScreen?.('board')} className="text-[12px] font-bold text-[#cbb9ff] hover:text-white">Haftalik reyting →</button>
            </div>
            {result.missions?.length > 0 && (
              <div className="mb-2 space-y-2">
                {result.missions.map(c => (
                  <Motion.div key={c.id} initial={{ scale: 0.96, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
                    className="relative rounded-[22px] border border-emerald-400/40 bg-emerald-400/[0.08] p-3">
                    <MissionRow a={{ id: c.id, p: 0 }} compact done />
                    <span className="absolute right-3 top-3 flex items-center gap-1 rounded-full bg-[#F5B14C] px-2 py-0.5 text-[12px] font-black text-[#0B0B10]"><Coin size={12} />+{c.reward}</span>
                  </Motion.div>
                ))}
              </div>
            )}
            <div className={`${CARD} p-3.5`}>
              <MissionList missions={progress.missions} compact />
            </div>

            <div className="mt-4 hidden gap-2 lg:grid">
              <button type="button" onClick={onAgain} className="flex h-14 items-center justify-center gap-2 rounded-2xl text-lg font-black text-[#0B0B10]" style={{ background: ACCENT }}>
                <RotateCcw size={19} /> Yana yugurish
              </button>
              <div className="grid grid-cols-2 gap-2">
                <button type="button" onClick={onStart} className="flex h-12 items-center justify-center gap-2 rounded-2xl bg-white/[0.07] font-bold text-white hover:bg-white/[0.11]">Darajalar</button>
                <button type="button" onClick={onHub} className="flex h-12 items-center justify-center gap-2 rounded-2xl bg-white/[0.07] font-bold text-white hover:bg-white/[0.11]"><Home size={17} /> O‘yinlar</button>
              </div>
            </div>
          </div>

          <div className="min-w-0 lg:col-span-7">
            <div className="mb-2.5 mt-6 flex items-end justify-between lg:mt-0">
              <h2 className={LABEL}>Aytganlaringiz · {rows.length}</h2>
              <p className="text-[12px] font-semibold text-white/40">Toby tushundi: ✓ · ~ · ✗</p>
            </div>
            <div className="grid gap-2 sm:grid-cols-2">
              {rows.map((row) => {
                const st = STATUS[row.status]
                const o = row.o
                return (
                  <div key={row.key} className={`${CARD} flex min-w-0 items-center gap-3 p-3`}>
                    <span className={`flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full text-sm font-black ${st.cls}`} aria-label={st.label}>
                      {st.icon ? <st.icon size={16} strokeWidth={3} /> : row.status === 'close' ? '~' : '–'}
                    </span>
                    {o.picture ? <Picture name={o.picture} size={40} className="rounded-xl" /> : null}
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-[16px] font-bold leading-snug">{o.kind === 'answer' ? o.prompt || o.text : o.text}</p>
                      <p className="truncate text-[12px] font-medium text-white/45">
                        {row.status === 'ok' || row.status === 'fixed' ? o.uz || st.label : row.heard ? <>Toby eshitdi: <span className="text-white/75">«{row.heard}»</span></> : st.label}
                      </p>
                      {row.tip && row.status === 'miss' && <p className="mt-0.5 text-[11px] font-medium leading-snug text-white/40">{row.tip}</p>}
                    </div>
                    <button type="button" onClick={() => play(o)} aria-label={`Listen: ${o.text}`}
                      className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-white/[0.06] text-white/80 hover:bg-white/[0.12]">
                      {playing === (o.uid || o.text) ? <Loader2 size={16} className="animate-spin" /> : <Volume2 size={16} />}
                    </button>
                    {row.status !== 'ok' && row.status !== 'fixed' && (
                      <button type="button" onClick={() => retryChip(row)} disabled={!!trying} aria-label={`Qayta ayting: ${o.text}`}
                        className={`flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full transition ${trying === row.key ? 'bg-[#A98BFF] text-[#0B0B10]' : 'bg-[#A98BFF]/15 text-[#A98BFF] hover:bg-[#A98BFF]/25'} disabled:opacity-50`}>
                        {trying === row.key ? <Loader2 size={16} className="animate-spin" /> : <Mic size={16} />}
                      </button>
                    )}
                  </div>
                )
              })}
              {!rows.length && <p className={`${CARD} p-4 text-[14px] font-medium text-white/55`}>Bu safar hech narsa aytilmadi. Keyingi sharda inglizcha ayting!</p>}
            </div>
          </div>
        </div>

        <div className="sticky bottom-0 z-10 -mx-4 mt-6 bg-gradient-to-t from-[#0B0B10] from-75% to-transparent px-4 pb-[max(16px,env(safe-area-inset-bottom))] pt-6 lg:hidden">
          <button type="button" onClick={onAgain} className="flex h-14 w-full items-center justify-center gap-2 rounded-2xl text-lg font-black text-[#0B0B10]" style={{ background: ACCENT }}>
            <RotateCcw size={19} /> Yana yugurish
          </button>
          <div className="mt-2 grid grid-cols-2 gap-2">
            <button type="button" onClick={onStart} className="flex h-12 items-center justify-center rounded-2xl border border-white/[0.08] bg-[#17171F] font-bold text-white">Darajalar</button>
            <button type="button" onClick={onHub} className="flex h-12 items-center justify-center gap-2 rounded-2xl border border-white/[0.08] bg-[#17171F] font-bold text-white"><Home size={17} /> O‘yinlar</button>
          </div>
        </div>
      </div>

      {createPortal(<AnimatePresence>
        {drill && (
          <Motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-4 backdrop-blur-sm">
            <Motion.div initial={{ scale: 0.95, y: 10 }} animate={{ scale: 1, y: 0 }}
              className="w-full max-w-[400px] rounded-[28px] border border-white/[0.08] bg-[#111118] p-5 text-center shadow-2xl lg:max-w-[460px] lg:p-7">
              <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-[#A98BFF]">Tuzat · {Math.min(drill.i + 1, drill.queue.length)} / {drill.queue.length}</p>
              {drill.state === 'done' ? (
                <>
                  <p className="mt-2 text-2xl font-black">{fixes ? `${fixes} ta so‘z tuzatildi!` : 'Keyingi safar albatta!'}</p>
                  <p className="mt-1 text-[14px] font-medium text-white/55">{fixes ? `+${fixes * COINS.fix} tanga. Bu so‘zlar ertaga yana chiqadi.` : 'So‘zlar keyingi o‘yinda yana chiqadi.'}</p>
                  <button type="button" onClick={() => setDrill(null)} className="mt-5 h-12 w-full rounded-2xl font-black text-[#0B0B10]" style={{ background: ACCENT }}>Tayyor</button>
                </>
              ) : drillRow && (
                <>
                  <div className="mt-4 flex flex-col items-center gap-3">
                    {drillRow.o.picture ? <Picture name={drillRow.o.picture} size={92} /> : null}
                    <WordLine text={drillRow.o.text} words={drill.words} className="text-[32px] lg:text-[38px]" />
                    {drillRow.o.uz && <p className="text-[15px] font-medium text-white/50">{drillRow.o.uz}</p>}
                  </div>
                  <div className="mt-4 text-left">
                    {drill.state === 'intro' && <p className="flex items-center justify-center gap-2 text-[15px] font-semibold text-white/60"><Volume2 size={17} className="animate-pulse text-[#A98BFF]" /> Tinglang…</p>}
                    {drill.state === 'listen' && <MicRow listening={speech.listening} busy={speech.busy} interim={speech.interim} level={speech.level} serverMode={speech.mode === 'server'} idleText="Ayting!" />}
                    {(drill.state === 'ok' || drill.state === 'miss') && (
                      <p className={`text-center text-[16px] font-bold ${drill.state === 'ok' ? 'text-emerald-300' : 'text-rose-200'}`}>
                        {drill.state === 'ok' ? `Zo‘r! +${COINS.fix} tanga` : drill.heard ? `Toby eshitdi: «${drill.heard}»` : 'Eshitilmadi'}
                      </p>
                    )}
                  </div>
                  {(drill.state === 'ok' || drill.state === 'miss') && (
                    <div className="mt-5 grid grid-cols-2 gap-2">
                      {drill.state === 'miss'
                        ? <button type="button" onClick={() => setDrill(d => ({ ...d, state: 'intro' }))} className="h-12 rounded-2xl bg-white/[0.08] font-bold">Yana</button>
                        : <span />}
                      <button type="button" onClick={drillNext} className="h-12 rounded-2xl font-black text-[#0B0B10]" style={{ background: ACCENT }}>Keyingisi</button>
                    </div>
                  )}
                  <button type="button" onClick={() => { stopVoice(); speech.stop({ discard: true }); setDrill(null) }} className="mt-3 h-10 rounded-full px-4 text-sm font-semibold text-white/50 hover:bg-white/[0.05]">Yopish</button>
                </>
              )}
            </Motion.div>
          </Motion.div>
        )}
      </AnimatePresence>, document.body)}
    </div>
  )
}
