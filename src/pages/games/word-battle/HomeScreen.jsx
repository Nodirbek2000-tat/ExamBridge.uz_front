/* The start: level picker, start / duel buttons, an unfinished round, my duels and the weekly board. */
import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { ChevronRight, Play, RotateCcw, Swords, Zap } from 'lucide-react'
import { createDuel, errorText, fetchHome, startRound } from './api'
import { LevelEmblem } from './art'
import { FaceOff } from './Bears'
import Leaderboard from './Leaderboard'
import { unlockSfx } from './sfx'
import { LEVELS, LEVEL_META, duelStatus, fmtNum } from './theme'
import { GhostButton, PrimaryButton, SoundToggle, TopBar } from './ui'

const LEVEL_KEY = 'wb-level'
const savedLevel = () => { try { return localStorage.getItem(LEVEL_KEY) || 'B1' } catch { return 'B1' } }
const saveLevel = (lv) => { try { localStorage.setItem(LEVEL_KEY, lv) } catch { /* private mode */ } }

function DuelRow({ d, onOpen }) {
  const other = (d.role === 'creator' ? d.opponent?.name : d.creator?.name)
    || (d.status === 'expired' ? 'Qabul qilinmadi' : 'Ochiq duel')
  const [label, cls] = duelStatus(d)
  return (
    <button type="button" onClick={() => onOpen(d.code)}
      className="flex w-full items-center gap-3 px-4 py-3 text-left transition hover:bg-white/[0.03]">
      <LevelEmblem level={d.level} size={34} />
      <span className="min-w-0 flex-1">
        <span className="block truncate text-[15px] font-semibold text-white/90">{other}</span>
        <span className="block truncate text-[12px] text-white/40">{d.level} · kod {d.code}</span>
      </span>
      <span className={`flex-shrink-0 rounded-full px-2.5 py-1 text-[12px] font-bold ${cls}`}>{label}</span>
      <ChevronRight size={16} className="flex-shrink-0 text-white/25" />
    </button>
  )
}

function Steps({ qn, sec }) {
  return (
    <ol className="space-y-3.5">
      {[
        [`${qn} ta so‘z, har biriga ${sec} soniya`, 'Ma’no, sinonim, antonim, gapni to‘ldirish va tinglash.'],
        ['Tez va aniq — ko‘proq ball', '100 ball + 50 gacha tezlik bonusi. 3 ta ketma-ket to‘g‘ri — ×1.5.'],
        ['Raqib — haqiqiy o‘yinchi', 'Yozib olingan o‘yin yoki bot. Do‘stingizni havola bilan chaqiring.'],
      ].map(([t, d], i) => (
        <li key={t} className="flex gap-3">
          <span className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full border border-[#5CC2FF]/30 text-[12px] font-bold text-[#8FD5FF]">{i + 1}</span>
          <span className="min-w-0">
            <span className="block text-[14px] font-semibold text-white/85">{t}</span>
            <span className="mt-0.5 block text-[13px] leading-relaxed text-white/45">{d}</span>
          </span>
        </li>
      ))}
    </ol>
  )
}

export default function HomeScreen({ onExit, onPlay, onResume, onDuel }) {
  const { data, error, refetch, isFetching } = useQuery({ queryKey: ['wb-home'], queryFn: fetchHome, staleTime: 0 })
  const [level, setLevel] = useState(savedLevel)
  const [busy, setBusy] = useState('')
  const [err, setErr] = useState('')
  const levels = data?.levels || LEVELS.map(lv => ({ level: lv, words: null, best: 0, open: true }))
  const info = levels.find(l => l.level === level && l.open) || levels.find(l => l.open) || levels[0]
  const meta = LEVEL_META[info.level]
  const active = data?.active
  const duels = data?.duels || []
  const showBoard = data?.config?.leaderboard !== false
  const qn = data?.config?.questions || 15
  const sec = Math.round((data?.config?.question_ms || 7000) / 1000)

  const choose = (lv) => { setLevel(lv); saveLevel(lv); setErr('') }
  const start = async () => {
    unlockSfx()
    setBusy('start')
    setErr('')
    try {
      onPlay(await startRound(info.level))
    } catch (e) {
      setErr(errorText(e))
      setBusy('')
    }
  }
  const duel = async () => {
    setBusy('duel')
    setErr('')
    try {
      const d = await createDuel({ level: info.level })
      onDuel(d.code)
    } catch (e) {
      setErr(errorText(e))
      setBusy('')
    }
  }

  return (
    <div className="mx-auto w-full max-w-[1180px] px-4 pb-[calc(env(safe-area-inset-bottom)+40px)] sm:px-6">
      <TopBar onBack={onExit} backLabel="O‘yinlarga qaytish" title="" right={<SoundToggle />} />

      <div className="lg:grid lg:grid-cols-[minmax(0,1fr)_380px] lg:items-start lg:gap-10">
        <div className="min-w-0">
          <section className="flex flex-col-reverse gap-2 sm:flex-row sm:items-center sm:gap-6">
            <div className="min-w-0 flex-1">
              <h1 className="text-[32px] font-black leading-none tracking-tight sm:text-[44px]">Word Battle</h1>
              <p className="mt-3 max-w-md text-[15px] leading-relaxed text-white/55 sm:text-[16px]">
                So‘z dueli: {qn} ta so‘z, har biriga {sec} soniya. Kim tezroq va aniqroq — o‘sha g‘olib.
              </p>
            </div>
            <FaceOff className="mx-auto w-full max-w-[300px] sm:mx-0 sm:w-[300px] lg:w-[340px] lg:max-w-[340px]" />
          </section>

          {active && (
            <button type="button" onClick={() => onResume(active.id)}
              className="mt-5 flex w-full items-center gap-3 rounded-2xl border border-[#5CC2FF]/25 bg-[#5CC2FF]/[0.07] px-4 py-3.5 text-left transition hover:bg-[#5CC2FF]/[0.11]">
              <span className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-[#5CC2FF] text-[#04121D]"><Play size={18} fill="currentColor" /></span>
              <span className="min-w-0 flex-1">
                <span className="block text-[15px] font-bold">Tugallanmagan jang</span>
                <span className="block text-[13px] text-white/55">{active.level} · {active.cursor}/{active.n} savol · {active.mode === 'duel' ? 'duel' : 'davom ettirish mumkin'}</span>
              </span>
              <ChevronRight size={18} className="text-white/40" />
            </button>
          )}

          <section className="mt-7">
            <h2 className="px-1 text-[13px] font-semibold uppercase tracking-[0.08em] text-white/45">Daraja</h2>
            <div className="mt-2.5 grid grid-cols-5 gap-2" role="radiogroup" aria-label="Daraja">
              {levels.map(l => {
                const on = l.level === info.level
                return (
                  <button key={l.level} type="button" role="radio" aria-checked={on} disabled={!l.open} onClick={() => choose(l.level)}
                    className={`flex flex-col items-center gap-1.5 rounded-2xl border px-1 py-3 transition disabled:cursor-not-allowed disabled:opacity-35 sm:py-4
                      ${on ? 'border-[#5CC2FF]/60 bg-[#5CC2FF]/[0.09] shadow-[0_10px_30px_-18px_rgba(92,194,255,.9)]' : 'border-white/[0.08] bg-[#111118] hover:border-white/20'}`}>
                    <LevelEmblem level={l.level} size={36} />
                    <span className={`text-[14px] font-black tracking-wide sm:text-[15px] ${on ? 'text-white' : 'text-white/70'}`}>{l.level}</span>
                  </button>
                )
              })}
            </div>

            <div className="mt-3 flex items-center gap-4 rounded-2xl border border-white/[0.08] bg-[#111118] px-4 py-3.5">
              <LevelEmblem level={info.level} size={48} />
              <div className="min-w-0 flex-1">
                <p className="text-[16px] font-bold">{meta.title} <span className="text-white/35">· {info.level}</span></p>
                <p className="text-[13px] text-white/50">{meta.hint}{info.words != null ? ` · ${fmtNum(info.words)} so‘z` : ''}</p>
              </div>
              <div className="text-right">
                <p className="text-[11px] font-semibold uppercase tracking-wide text-white/35">Rekord</p>
                <p className="text-[18px] font-black tabular-nums">{info.best ? fmtNum(info.best) : '—'}</p>
              </div>
            </div>

            <div className="mt-4 grid gap-2 sm:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]">
              <PrimaryButton onClick={start} busy={busy === 'start'} disabled={!info.open || Boolean(busy)}>
                <Zap size={18} fill="currentColor" /> Jangni boshlash
              </PrimaryButton>
              <GhostButton onClick={duel} busy={busy === 'duel'} disabled={!info.open || Boolean(busy)} className="sm:h-14">
                <Swords size={17} /> Do‘stni chaqirish
              </GhostButton>
            </div>
            {err && <p className="mt-2 text-center text-[14px] text-rose-300">{err}</p>}
            {data && !levels.some(l => l.open) && (
              <p className="mt-3 rounded-2xl border border-white/[0.06] bg-white/[0.02] px-4 py-3 text-center text-[14px] text-white/55">
                So‘zlar to‘plami tayyorlanmoqda — janglar tez orada ochiladi.
              </p>
            )}
            {error && (
              <p className="mt-3 flex items-center justify-center gap-2 text-[14px] text-white/50">
                Ma’lumot yuklanmadi.
                <button type="button" onClick={() => refetch()} disabled={isFetching} className="inline-flex items-center gap-1 font-semibold text-[#8FD5FF]">
                  <RotateCcw size={14} /> Qayta
                </button>
              </p>
            )}
          </section>

          <section className="mt-8 hidden border-t border-white/[0.06] pt-6 lg:block"><Steps qn={qn} sec={sec} /></section>
        </div>

        <aside className="mt-8 space-y-4 lg:sticky lg:top-[76px] lg:mt-1">
          {duels.length > 0 && (
            <div className="overflow-hidden rounded-3xl border border-white/[0.08] bg-[#111118]">
              <h2 className="px-5 pb-1 pt-4 text-[15px] font-bold">Duellarim</h2>
              <div className="divide-y divide-white/[0.05]">{duels.map(d => <DuelRow key={d.code} d={d} onOpen={onDuel} />)}</div>
            </div>
          )}
          {showBoard && <Leaderboard level={info.level} />}
          <section className="rounded-3xl border border-white/[0.08] bg-[#111118] p-5 lg:hidden"><Steps qn={qn} sec={sec} /></section>
        </aside>
      </div>
    </div>
  )
}
