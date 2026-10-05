/*
 * The end of a round: who won, the numbers, what was learned, and every mistake with its
 * translation, an example and the teacher's voice (▶).
 */
import { useEffect, useRef, useState } from 'react'
import { AnimatePresence, motion as Motion } from 'framer-motion'
import { ChevronDown, Play, RotateCcw, Share2, Swords, Trophy } from 'lucide-react'
import { sayLine } from '../../../games/voice/voiceTts'
import { createDuel, errorText } from './api'
import { Bear } from './Bears'
import { sfx } from './sfx'
import { LEVEL_META, POS_UZ, TYPE_META, fmtNum, fmtSec } from './theme'
import { Card, GhostButton, PrimaryButton, TopBar } from './ui'

const TITLES = {
  win: ['G‘alaba!', 'Raqibingizdan ko‘proq ball to‘pladingiz.'],
  lose: ['Bu safar raqib kuchliroq', 'Xatolarni ko‘rib chiqing — keyingi jangda qaytaring.'],
  draw: ['Durang', 'Ballar teng — kuchlar teng.'],
  pending: ['Natija kutilmoqda', 'Do‘stingiz o‘ynab bo‘lgach, natijalar solishtiriladi.'],
  stopped: ['Raund to‘xtatildi', 'Javob berilgan savollar saqlandi, natija reytingga kirmadi.'],
}

function escapeRe(s) { return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') }

function Example({ text, word }) {
  if (!text) return null
  // whole words only: "act" must not light up inside "actually" (\b, not a look-behind: older iPhones lack it)
  const parts = word ? text.split(new RegExp(`\\b(${escapeRe(word)})\\b`, 'i')) : [text]
  return (
    <p className="mt-2 text-[14px] italic leading-relaxed text-white/55" lang="en">
      {parts.map((p, i) => (i % 2 === 1
        ? <mark key={i} className="rounded-sm bg-[#5CC2FF]/15 not-italic font-semibold text-[#BFE7FF]">{p}</mark>
        : <span key={i}>{p}</span>))}
    </p>
  )
}

function PlayButton({ text, label }) {
  return (
    <button type="button" onClick={() => sayLine(text, { voice: 'teacher' })} aria-label={label || `Tinglash: ${text}`}
      className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full border border-white/[0.1] bg-white/[0.04] text-[#8FD5FF] transition hover:bg-[#5CC2FF]/15 active:scale-95">
      <Play size={15} className="translate-x-[1px]" fill="currentColor" />
    </button>
  )
}

function Mistake({ it }) {
  const meta = TYPE_META[it.t] || TYPE_META.en_uz
  const mine = it.choice != null ? it.options[it.choice] : null
  const right = it.options[it.key]
  return (
    <li className="rounded-2xl border border-white/[0.07] bg-[#111118] p-4 sm:p-5">
      <div className="flex items-start gap-3">
        <PlayButton text={it.word} />
        <div className="min-w-0 flex-1">
          <p className="flex flex-wrap items-baseline gap-x-2">
            <span className="text-[19px] font-bold text-white" lang="en">{it.word}</span>
            {POS_UZ[it.pos] && <span className="text-[12px] text-white/35">{POS_UZ[it.pos]}</span>}
            <span className="text-[15px] text-white/70">— {it.uz}</span>
          </p>
          <p className="mt-1 text-[11px] font-semibold uppercase tracking-[0.08em] text-white/35">{meta.short}</p>
          <div className="mt-2.5 grid gap-1.5 text-[14px]">
            <p className="flex gap-2 text-rose-200/90">
              <span className="w-[86px] flex-shrink-0 text-white/40">Siz:</span>
              <span className="min-w-0">{it.timeout || mine == null ? 'vaqt tugadi' : mine}</span>
            </p>
            <p className="flex gap-2 text-emerald-200">
              <span className="w-[86px] flex-shrink-0 text-white/40">To‘g‘ri:</span>
              <span className="min-w-0 font-semibold">{right}</span>
            </p>
          </div>
          {/* the sentence with the right word in its place (a cloze shows its own sentence, now filled in) */}
          <Example text={it.example} word={it.word} />
        </div>
      </div>
    </li>
  )
}

function Stat({ label, value, sub }) {
  return (
    <div className="rounded-2xl border border-white/[0.07] bg-[#111118] px-4 py-3">
      <p className="text-[12px] font-medium text-white/45">{label}</p>
      <p className="mt-0.5 text-[22px] font-black tabular-nums text-white">{value}</p>
      {sub && <p className="text-[12px] text-white/35">{sub}</p>}
    </div>
  )
}

/* fresh: the round has just been played here (not an old result opened by its link) — it gets a fanfare */
export default function ResultScreen({ result, onAgain, onHome, onDuel, again, fresh = false }) {
  const [openRight, setOpenRight] = useState(false)
  const [duelBusy, setDuelBusy] = useState(false)
  const [duelErr, setDuelErr] = useState('')
  const stopped = result.status !== 'finished'
  const outcome = stopped ? 'stopped' : result.outcome || 'draw'
  const [title, sub] = TITLES[outcome] || TITLES.draw
  const o = result.opponent || {}
  const served = result.items.filter(i => i.served)
  const wrong = served.filter(i => !i.correct)
  const right = served.filter(i => i.correct)
  const myPose = outcome === 'win' ? 'win' : outcome === 'lose' ? 'lose' : outcome === 'pending' ? 'think' : 'idle'
  const oppPose = outcome === 'win' ? 'lose' : outcome === 'lose' ? 'win' : 'idle'
  const srs = result.srs || {}
  const canChallenge = result.complete && result.mode === 'solo'
  const cheered = useRef(false)
  useEffect(() => {
    if (!fresh || cheered.current) return
    cheered.current = true
    if (outcome === 'win') sfx('win')
    else if (outcome === 'lose') sfx('lose')
  }, [fresh, outcome])
  const duel = result.duel_info

  const challenge = async () => {
    setDuelBusy(true)
    setDuelErr('')
    try {
      const d = await createDuel({ round: result.id })
      onDuel(d.code)
    } catch (e) {
      setDuelErr(errorText(e))
      setDuelBusy(false)
    }
  }

  return (
    <div className="mx-auto w-full max-w-[1180px] px-4 pb-[calc(env(safe-area-inset-bottom)+40px)] sm:px-6">
      <TopBar onBack={onHome} backLabel="Word Battle" title={`Word Battle · ${result.level}`} />
      <div className="lg:grid lg:grid-cols-[400px_minmax(0,1fr)] lg:items-start lg:gap-10">
        <aside className="lg:sticky lg:top-[76px]">
          <Card className="relative overflow-hidden px-5 pb-5 pt-5">
            <div className="pointer-events-none absolute inset-x-0 top-0 h-48 bg-[radial-gradient(45%_70%_at_30%_40%,rgba(92,194,255,0.14),transparent),radial-gradient(45%_70%_at_70%_40%,rgba(255,159,67,0.10),transparent)]" />
            <p className="relative text-center text-[12px] font-semibold uppercase tracking-[0.1em] text-white/40">
              {result.level} · {LEVEL_META[result.level]?.title}
            </p>
            <div className="relative mx-auto mt-2 flex max-w-[300px] items-end justify-center gap-4">
              <div className="w-1/2"><Bear kind="polar" pose={myPose} label="Siz" /></div>
              <div className="w-1/2"><Bear kind="brown" pose={oppPose} flip dim={o.kind === 'wait' && outcome === 'pending'} label={o.name} /></div>
            </div>
            <div className="relative mt-3 grid grid-cols-[1fr_auto_1fr] items-end gap-3 text-center">
              <div className="min-w-0">
                <p className="truncate text-[13px] text-white/45">Siz</p>
                <p className="text-[30px] font-black tabular-nums leading-tight">{fmtNum(result.score)}</p>
              </div>
              <span className="pb-2 text-[20px] font-black text-white/20">:</span>
              <div className="min-w-0">
                <p className="flex items-center justify-center gap-1.5 text-[13px] text-white/45">
                  <span className="truncate">{o.name}</span>
                  {o.label && <span className="flex-shrink-0 rounded-md border border-white/[0.08] px-1 py-px text-[9px] font-bold uppercase tracking-wide text-white/45">{o.label}</span>}
                </p>
                <p className="text-[30px] font-black tabular-nums leading-tight text-[#FFD9B5]">{o.score != null ? fmtNum(o.score) : '?'}</p>
              </div>
            </div>
            <div className="relative mt-3 text-center">
              <h1 className="text-[26px] font-black tracking-tight sm:text-[30px]">{title}</h1>
              <p className="mt-1 text-[14px] text-white/55">{sub}</p>
              {result.new_best && (
                <p className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-[#F5B14C]/15 px-3 py-1 text-[13px] font-bold text-[#FFD08A]">
                  <Trophy size={14} /> Yangi rekord!
                </p>
              )}
            </div>
          </Card>

          <div className="mt-3 grid grid-cols-2 gap-2.5">
            <Stat label="To‘g‘ri javob" value={`${result.correct}/${result.n}`} sub={stopped ? 'to‘xtatilgan' : null} />
            <Stat label="Eng uzun seriya" value={result.best_streak} sub={result.best_streak >= 4 ? '×1.5 ishladi' : null} />
            <Stat label="O‘rtacha vaqt" value={fmtSec(result.avg_ms)} />
            <Stat label="Haftalik o‘rin" value={result.rank ? `#${result.rank}` : '—'} sub={result.ranked ? `eng yaxshisi ${fmtNum(result.best)}` : 'reytingga kirmadi'} />
          </div>

          {(srs.strengthened > 0 || srs.new > 0 || srs.weak > 0) && (
            <div className="mt-3 rounded-2xl border border-white/[0.07] bg-[#111118] px-4 py-3 text-[13px] text-white/60">
              <p className="flex flex-wrap gap-x-4 gap-y-1">
                <span><b className="text-emerald-300">{srs.strengthened || 0}</b> mustahkamlandi</span>
                <span><b className="text-[#8FD5FF]">{srs.new || 0}</b> yangi so‘z</span>
                <span><b className="text-rose-300">{srs.weak || 0}</b> takrorlash kerak</span>
              </p>
              {srs.weak > 0 && <p className="mt-1 text-[12px] text-white/35">Xato so‘zlar keyingi janglarda yana keladi.</p>}
            </div>
          )}
          {result.flags?.includes('too-fast') && (
            <p className="mt-3 rounded-2xl border border-amber-300/20 bg-amber-300/[0.06] px-4 py-3 text-[13px] text-amber-100/80">
              Javoblar juda tez bosildi — bu raund reytingga kirmadi.
            </p>
          )}
          {duel && duel.status !== 'done' && (
            <button type="button" onClick={() => onDuel(duel.code)}
              className="mt-3 w-full rounded-2xl border border-[#FF9F43]/25 bg-[#FF9F43]/[0.06] px-4 py-3 text-left text-[14px] text-[#FFD9B5] transition hover:bg-[#FF9F43]/10">
              Duel: {(duel.role === 'creator' ? duel.opponent?.name : duel.creator?.name) || 'do‘stingiz'} hali o‘ynamagan. Havolani yana yuborish →
            </button>
          )}

          <div className="mt-4 space-y-2">
            <PrimaryButton onClick={onAgain} busy={again.busy}><RotateCcw size={17} /> Yana jang</PrimaryButton>
            {again.error && <p className="text-center text-[13px] text-rose-300">{again.error}</p>}
            {canChallenge && (
              <GhostButton onClick={challenge} busy={duelBusy}><Swords size={17} /> Do‘stni shu savollar bilan chaqirish</GhostButton>
            )}
            {duelErr && <p className="text-center text-[13px] text-rose-300">{duelErr}</p>}
            {duel && duel.status === 'done' && (
              <GhostButton onClick={() => onDuel(duel.code)}><Share2 size={16} /> Duel natijasi</GhostButton>
            )}
          </div>
        </aside>

        <section className="mt-8 lg:mt-1">
          <h2 className="flex items-baseline gap-2 px-1 text-[13px] font-semibold uppercase tracking-[0.08em] text-white/45">
            Xatolar <span className="text-white/30">{wrong.length}</span>
          </h2>
          {wrong.length ? (
            <ul className="mt-2 space-y-2.5">{wrong.map(it => <Mistake key={it.idx} it={it} />)}</ul>
          ) : (
            <p className="mt-2 rounded-2xl border border-emerald-400/20 bg-emerald-400/[0.05] px-4 py-4 text-[15px] text-emerald-100/85">
              {served.length ? 'Birorta ham xato yo‘q — ajoyib!' : 'Bu raundda savollarga javob berilmadi.'}
            </p>
          )}

          {right.length > 0 && (
            <div className="mt-6">
              <button type="button" onClick={() => setOpenRight(v => !v)} aria-expanded={openRight}
                className="flex w-full items-center gap-2 px-1 text-left text-[13px] font-semibold uppercase tracking-[0.08em] text-white/45 hover:text-white/70">
                To‘g‘ri javoblar <span className="text-white/30">{right.length}</span>
                <ChevronDown size={16} className={`ml-auto transition ${openRight ? 'rotate-180' : ''}`} />
              </button>
              <AnimatePresence initial={false}>
                {openRight && (
                  <Motion.ul initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }}
                    className="mt-2 divide-y divide-white/[0.05] overflow-hidden rounded-2xl border border-white/[0.07] bg-[#111118]">
                    {right.map(it => (
                      <li key={it.idx} className="flex items-center gap-3 px-4 py-2.5">
                        <PlayButton text={it.word} />
                        <span className="min-w-0 flex-1 truncate text-[15px]">
                          <b className="font-semibold" lang="en">{it.word}</b> <span className="text-white/55">— {it.uz}</span>
                        </span>
                        <span className="text-[13px] tabular-nums text-white/40">{fmtSec(it.ms)}</span>
                        <span className="w-12 text-right text-[13px] font-bold tabular-nums text-emerald-300">+{it.points}</span>
                      </li>
                    ))}
                  </Motion.ul>
                )}
              </AnimatePresence>
            </div>
          )}
        </section>
      </div>
    </div>
  )
}
