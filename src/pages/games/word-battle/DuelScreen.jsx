/*
 * /games/word-battle?duel=CODE — an async duel by link (valid 48 h, the same 15 questions for both).
 *   creator: share the link (Telegram, copy), play your side, wait for the result
 *   invited: accept and play · when both have played: the comparison
 */
import { useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { Check, Copy, Send, Share2, Swords } from 'lucide-react'
import { acceptDuel, createDuel, errorText, fetchDuel } from './api'
import { DuelArt, HourglassArt, LevelEmblem } from './art'
import { Bear, FaceOff } from './Bears'
import { LEVEL_META, fmtNum, leftText } from './theme'
import { Card, GhostButton, PrimaryButton, Spinner, TopBar } from './ui'

function linkFor(code) {
  return `${window.location.origin}/games/word-battle?duel=${code}`
}

const secs = (d) => Math.round((d.question_ms || 7000) / 1000)
const hoursOpen = (d) => Math.max(1, Math.round((new Date(d.expires_at) - new Date(d.created_at)) / 3.6e6)) || 48

function shareText(d) {
  const mine = d.role === 'creator' ? d.creator : d.opponent
  const lv = `${d.level} (${LEVEL_META[d.level]?.title || ''})`
  return mine?.score != null
    ? `Word Battle dueli: ${lv} darajasida ${fmtNum(mine.score)} ball oldim. ${d.n} ta so‘z, har biriga ${secs(d)} soniya — meni yeng!`
    : `Word Battle: ${lv} darajasida so‘z dueli! ${d.n} ta so‘z, har biriga ${secs(d)} soniya. Kim tezroq?`
}

function ShareBox({ d }) {
  const [copied, setCopied] = useState(false)
  const link = linkFor(d.code)
  const text = shareText(d)
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(link)
    } catch {
      const el = document.createElement('textarea')
      el.value = link
      document.body.appendChild(el)
      el.select()
      try { document.execCommand('copy') } catch { /* no clipboard */ }
      el.remove()
    }
    setCopied(true)
    setTimeout(() => setCopied(false), 1800)
  }
  const native = typeof navigator !== 'undefined' && navigator.share
  return (
    <div className="mt-5 text-left">
      <p className="text-[12px] font-semibold uppercase tracking-[0.08em] text-white/40">Havola</p>
      <div className="mt-1.5 flex items-center gap-2 rounded-2xl border border-white/[0.08] bg-[#0B0B10] p-1.5 pl-3.5">
        <span className="min-w-0 flex-1 truncate text-[14px] text-white/80" title={link}>{link.replace(/^https?:\/\//, '')}</span>
        <button type="button" onClick={copy}
          className="flex h-10 flex-shrink-0 items-center gap-1.5 rounded-xl bg-white/[0.06] px-3 text-[13px] font-semibold text-white/85 transition hover:bg-white/[0.1]">
          {copied ? <Check size={15} className="text-emerald-300" /> : <Copy size={15} />} {copied ? 'Nusxa olindi' : 'Nusxa'}
        </button>
      </div>
      <div className="mt-2.5 grid grid-cols-2 gap-2">
        <a href={`https://t.me/share/url?url=${encodeURIComponent(link)}&text=${encodeURIComponent(text)}`} target="_blank" rel="noopener noreferrer"
          className="flex h-12 items-center justify-center gap-2 rounded-2xl bg-[#2AABEE] text-[15px] font-bold text-white transition hover:bg-[#3DB7F2]">
          <Send size={16} /> Telegram
        </a>
        {native ? (
          <GhostButton onClick={() => navigator.share({ title: 'Word Battle dueli', text, url: link }).catch(() => {})}>
            <Share2 size={16} /> Ulashish
          </GhostButton>
        ) : (
          <GhostButton onClick={copy}><Copy size={16} /> Matn bilan</GhostButton>
        )}
      </div>
    </div>
  )
}

/* the picture beside the text on a wide screen, above it on a phone */
function Split({ art, children }) {
  return (
    <div className="mx-auto grid max-w-[1000px] grid-cols-[minmax(0,1fr)] items-center gap-6 py-2 lg:grid-cols-[minmax(0,1fr)_minmax(0,440px)] lg:gap-16 lg:py-12">
      <div className="mx-auto w-full max-w-[320px] lg:max-w-[460px]">{art}</div>
      <div className="mx-auto w-full max-w-md text-center lg:mx-0 lg:text-left">{children}</div>
    </div>
  )
}

function Compare({ d }) {
  const me = d.role === 'opponent' ? d.opponent : d.creator
  const them = d.role === 'opponent' ? d.creator : d.opponent
  const guest = d.role === 'guest'
  const left = guest ? d.creator : me
  const right = guest ? d.opponent : them
  const leftWon = guest ? d.winner === 'creator' : d.result === 'me'
  const rightWon = guest ? d.winner === 'opponent' : d.result === 'them'
  const rows = d.compare || []
  const swap = d.role === 'opponent'
  const title = d.winner === 'draw' ? 'Durang!' : guest ? `${(leftWon ? left : right)?.name} g‘olib` : leftWon ? 'Siz yutdingiz!' : `${right?.name} yutdi`
  return (
    <Card className="relative overflow-hidden px-5 pb-6 pt-4 text-center">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-40 bg-[radial-gradient(ellipse_at_top,rgba(255,159,67,0.12),transparent_70%)]" />
      <p className="relative text-[12px] font-semibold uppercase tracking-[0.1em] text-white/40">{d.level} · duel</p>
      <div className="relative mx-auto mt-2 flex max-w-[320px] items-end justify-center gap-4">
        <div className="w-1/2"><Bear kind="polar" pose={leftWon ? 'win' : rightWon ? 'lose' : 'idle'} /></div>
        <div className="w-1/2"><Bear kind="brown" pose={rightWon ? 'win' : leftWon ? 'lose' : 'idle'} flip /></div>
      </div>
      <div className="relative mt-3 grid grid-cols-[1fr_auto_1fr] items-end gap-3">
        <div className="min-w-0">
          <p className="truncate text-[13px] text-white/45">{guest ? left?.name : 'Siz'} · {left?.correct}/{d.n}</p>
          <p className="text-[30px] font-black tabular-nums leading-tight">{fmtNum(left?.score)}</p>
        </div>
        <span className="pb-2 text-[20px] font-black text-white/20">:</span>
        <div className="min-w-0">
          <p className="truncate text-[13px] text-white/45">{right?.name} · {right?.correct}/{d.n}</p>
          <p className="text-[30px] font-black tabular-nums leading-tight text-[#FFD9B5]">{fmtNum(right?.score)}</p>
        </div>
      </div>
      <h1 className="relative mt-2 text-[26px] font-black tracking-tight">{title}</h1>
      {rows.length > 0 && (
        <div className="relative mt-4 space-y-1.5" aria-label="Savollar bo‘yicha">
          {[0, 1].map(side => (
            <div key={side} className="flex gap-[3px]">
              {rows.map((r, i) => {
                const ok = r[(side === 0) === !swap ? 0 : 1]
                return <span key={i} className={`h-2.5 flex-1 rounded-sm ${ok ? (side === 0 ? 'bg-[#5CC2FF]' : 'bg-[#FF9F43]') : 'bg-white/[0.08]'}`} />
              })}
            </div>
          ))}
        </div>
      )}
    </Card>
  )
}

export default function DuelScreen({ code, onHome, onPlay, onDuel }) {
  const qc = useQueryClient()
  const { data: d, error, isLoading } = useQuery({
    queryKey: ['wb-duel', code],
    queryFn: () => fetchDuel(code),
    // waiting for the other side: look again now and then (cheap, cached on the server side by status)
    refetchInterval: (q) => (q.state.data && ['open', 'playing'].includes(q.state.data.status) ? 20_000 : false),
  })
  const [busy, setBusy] = useState('')
  const [err, setErr] = useState('')

  const play = async () => {
    setBusy('play')
    setErr('')
    try {
      const round = await acceptDuel(code)
      qc.invalidateQueries({ queryKey: ['wb-home'] })
      onPlay(round)
    } catch (e) {
      setErr(errorText(e))
      setBusy('')
      qc.invalidateQueries({ queryKey: ['wb-duel', code] })
    }
  }
  const rematch = async () => {
    setBusy('new')
    setErr('')
    try {
      const nd = await createDuel({ level: d?.level || 'B1' })
      onDuel(nd.code)
      setBusy('')
    } catch (e) {
      setErr(errorText(e))
      setBusy('')
    }
  }

  let body
  if (isLoading) {
    body = <div className="flex justify-center py-24"><Spinner /></div>
  } else if (error || !d) {
    body = (
      <div className="mx-auto max-w-sm py-16 text-center">
        <HourglassArt className="mx-auto w-16" />
        <p className="mt-3 text-lg font-bold">{error?.response?.status === 404 ? 'Duel topilmadi' : 'Duel yuklanmadi'}</p>
        <p className="mt-1 text-[15px] text-white/55">{error?.response?.status === 404 ? 'Havola noto‘g‘ri yoki eskirgan.' : errorText(error)}</p>
        <PrimaryButton className="mt-5" onClick={onHome}>Word Battle</PrimaryButton>
      </div>
    )
  } else {
    const mine = d.role === 'creator' ? d.creator : d.role === 'opponent' ? d.opponent : null
    const other = d.role === 'creator' ? d.opponent : d.creator
    const lv = (
      <span className="inline-flex items-center gap-2 rounded-full border border-white/[0.08] bg-white/[0.03] py-1 pl-1 pr-3 text-[13px] font-semibold text-white/75">
        <LevelEmblem level={d.level} size={24} /> {d.level} · {LEVEL_META[d.level]?.title}
      </span>
    )
    if (d.status === 'done') {
      body = (
        <div className="mx-auto max-w-[640px]">
          <Compare d={d} />
          <div className="mt-4 grid gap-2 sm:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]">
            {d.role !== 'guest' && <PrimaryButton onClick={rematch} busy={busy === 'new'}><Swords size={17} /> Revansh — yangi duel</PrimaryButton>}
            <GhostButton onClick={onHome} className="sm:h-14">Word Battle</GhostButton>
          </div>
        </div>
      )
    } else if (d.status === 'expired') {
      body = (
        <Split art={<HourglassArt className="mx-auto w-20 lg:w-36" />}>
          <h1 className="text-[26px] font-black tracking-tight lg:text-[34px]">Duel muddati tugagan</h1>
          <p className="mt-2 text-[15px] text-white/55">Duel {hoursOpen(d)} soat ichida o‘ynalishi kerak edi. Yangisini yarating.</p>
          <PrimaryButton className="mt-6" onClick={rematch} busy={busy === 'new'}><Swords size={17} /> Yangi duel</PrimaryButton>
          <GhostButton className="mt-2" onClick={onHome}>Word Battle</GhostButton>
        </Split>
      )
    } else if (d.role === 'guest' && !d.can_play) {
      body = (
        <Split art={<DuelArt className="mx-auto w-44 lg:w-full" />}>
          <h1 className="text-[26px] font-black tracking-tight lg:text-[34px]">Bu duel band</h1>
          <p className="mt-2 text-[15px] text-white/55">Uni boshqa o‘yinchi qabul qilgan. O‘zingiz yangi duel yarating.</p>
          <PrimaryButton className="mt-6" onClick={rematch} busy={busy === 'new'}><Swords size={17} /> Yangi duel</PrimaryButton>
        </Split>
      )
    } else if (d.role === 'guest' || (d.role === 'opponent' && d.can_play)) {
      body = (
        <Split art={<FaceOff className="mx-auto w-full" right="ready" />}>
          <p>{lv}</p>
          <h1 className="mt-3 text-[26px] font-black leading-tight tracking-tight sm:text-[30px] lg:text-[38px]">
            {d.creator.name} sizni duelga chaqirdi!
          </h1>
          <p className="mt-3 text-[15px] leading-relaxed text-white/55 lg:text-[16px]">
            {d.n} ta so‘z, har biriga {secs(d)} soniya. Ikkalangizga bir xil savollar — natijalar ikkalangiz ham o‘ynab bo‘lgach solishtiriladi.
          </p>
          {d.creator.played && <p className="mt-2 text-[14px] text-[#FFC48A]">{d.creator.name} allaqachon o‘ynagan. Uning natijasi siz tugatgach ochiladi.</p>}
          <PrimaryButton className="mt-6" onClick={play} busy={busy === 'play'}>
            <Swords size={18} /> {d.my_round_active ? 'Davom ettirish' : 'Qabul qilish va boshlash'}
          </PrimaryButton>
          <p className="mt-2 text-[13px] text-white/35">{leftText(d.left_s)}</p>
        </Split>
      )
    } else {
      // my side: the creator before / after playing, or the invited one who has played
      const waiting = mine?.played
      body = (
        <Split art={<DuelArt className="mx-auto w-48 lg:w-full" />}>
          <p>{lv}</p>
          <h1 className="mt-3 text-[26px] font-black leading-tight tracking-tight lg:text-[36px]">
            {waiting ? (other?.name ? `${other.name} o‘ynashi kutilmoqda` : 'Raqib kutilmoqda') : 'Duel tayyor!'}
          </h1>
          <p className="mt-2 text-[15px] leading-relaxed text-white/55">
            {waiting
              ? `Siz ${fmtNum(mine.score)} ball oldingiz (${mine.correct}/${d.n}). Natijalar ${other?.name || 'do‘stingiz'} o‘ynab bo‘lgach solishtiriladi.`
              : d.role === 'creator'
                ? 'Havolani do‘stingizga yuboring. Siz ham o‘z navbatingizni o‘ynang — tartib muhim emas.'
                : 'Navbat sizda.'}
          </p>
          {d.can_play && (
            <PrimaryButton className="mt-5" onClick={play} busy={busy === 'play'}>
              <Swords size={18} /> {d.my_round_active ? 'Davom ettirish' : 'Hozir o‘ynash'}
            </PrimaryButton>
          )}
          {d.role === 'creator' && !d.opponent && <ShareBox d={d} />}
          <p className="mt-4 text-[13px] text-white/35">{leftText(d.left_s)} · kod {d.code}</p>
          <GhostButton className="mt-4" onClick={onHome}>Word Battle</GhostButton>
        </Split>
      )
    }
  }

  return (
    <div className="mx-auto w-full max-w-[1180px] px-4 pb-[calc(env(safe-area-inset-bottom)+40px)] sm:px-6">
      <TopBar onBack={onHome} backLabel="Word Battle" title="Duel" />
      <div className="pt-2 sm:pt-6">{body}</div>
      {err && <p className="mx-auto mt-3 max-w-md text-center text-[14px] text-rose-300">{err}</p>}
    </div>
  )
}
