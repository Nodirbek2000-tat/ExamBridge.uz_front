/*
 * WORD BATTLE — a vocabulary duel: 15 words × 7 seconds, the polar bear (you) against the
 * brown bear (a recorded real player, a labelled bot, or a friend by link).
 * Screens live in the URL, so the browser / Android Back button works:
 *   /games/word-battle                 levels, start, my duels, weekly board
 *   /games/word-battle?r=<round id>    a round: play it (active) or its result (finished)
 *   /games/word-battle?duel=<code>     a duel: share / accept / compare
 * Leaving a round with Back keeps it open on the server; the start screen offers to continue it.
 */
import { useCallback, useEffect, useState } from 'react'
import { MotionConfig } from 'framer-motion'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useGameOpen } from '../../../games/useGameOpen'
import { errorText, fetchRound, startRound } from './api'
import DuelScreen from './DuelScreen'
import HomeScreen from './HomeScreen'
import PlayScreen from './PlayScreen'
import ResultScreen from './ResultScreen'
import { unlockSfx } from './sfx'
import { GhostButton, Spinner } from './ui'

const CSS = `
.wb-breathe { animation: wb-breathe 3.4s ease-in-out infinite; transform-origin: 50% 100%; }
@keyframes wb-breathe { 0%, 100% { transform: scaleY(1); } 50% { transform: scaleY(1.02) translateY(-1px); } }
.wb-wave { animation: wb-wave .9s ease-in-out infinite; transform-origin: 50% 100%; }
@keyframes wb-wave { 0%, 100% { transform: scaleY(.35); } 50% { transform: scaleY(1); } }
.wb-pulse { animation: wb-pulse 1.2s ease-out infinite; }
@keyframes wb-pulse { 0% { box-shadow: 0 0 0 0 rgba(92,194,255,.55); } 100% { box-shadow: 0 0 0 18px rgba(92,194,255,0); } }
@media (prefers-reduced-motion: reduce) {
  .wb-breathe, .wb-wave, .wb-pulse { animation: none; }
  .wb-arena svg * { transition: none !important; }
}
`

function RoundView({ id, live, result, onFinished, onHome, onAgain, onDuel, again }) {
  const known = (result && result.id === id && result) || (live && live.id === id && live) || null
  const { data, error, isLoading } = useQuery({
    queryKey: ['wb-round', id],
    queryFn: () => fetchRound(id),
    enabled: !known,
    staleTime: 0,
    gcTime: 0,                       // a resumed round is always read fresh
    refetchOnWindowFocus: false,     // …and never swapped under a round being played
    refetchOnReconnect: false,
    retry: 1,
  })
  const round = known || data
  if (!round) {
    if (isLoading) return <div className="flex min-h-[60vh] items-center justify-center"><Spinner /></div>
    return (
      <div className="mx-auto max-w-sm px-4 py-24 text-center">
        <p className="text-lg font-bold">Raund topilmadi</p>
        <p className="mt-1 text-[15px] text-white/55">{errorText(error)}</p>
        <GhostButton className="mt-5" onClick={onHome}>Word Battle</GhostButton>
      </div>
    )
  }
  if (round.status === 'active') {
    return <div className="wb-arena"><PlayScreen key={round.id} round={round} onFinished={onFinished} onExit={onHome} /></div>
  }
  return (
    <ResultScreen result={round} fresh={round === result} onHome={onHome} onAgain={() => onAgain(round.level)}
      onDuel={onDuel} again={again} />
  )
}

export default function WordBattleGame() {
  useGameOpen('word-battle')
  const [params, setParams] = useSearchParams()
  const navigate = useNavigate()
  const qc = useQueryClient()
  const r = params.get('r')
  const duel = (params.get('duel') || '').toUpperCase()
  const [live, setLive] = useState(null)        // a round just started (no extra fetch)
  const [result, setResult] = useState(null)    // a round just finished
  const [again, setAgain] = useState({ busy: false, error: '' })
  const screen = duel ? `d${duel}` : r ? `r${r}` : 'home'
  useEffect(() => { window.scrollTo?.(0, 0) }, [screen])
  // a round left with Back is read fresh when it is resumed: its clock, score and marks have moved on
  // since it started (the kept copy would replay the 3-2-1 intro while the open question's time runs)
  if (live && r !== live.id) setLive(null)

  const home = useCallback(() => {
    qc.invalidateQueries({ queryKey: ['wb-home'] })
    setParams({}, { replace: false })
  }, [qc, setParams])

  const play = useCallback((round, { replace = false } = {}) => {
    setLive(round)
    setResult(null)
    setParams({ r: round.id }, { replace })
  }, [setParams])

  const finished = useCallback((res) => {
    setResult(res)
    setLive(null)
    qc.setQueryData(['wb-round', res.id], res)
    qc.invalidateQueries({ queryKey: ['wb-home'] })
    qc.invalidateQueries({ queryKey: ['wb-leaderboard'] })
  }, [qc])

  const playAgain = useCallback(async (level) => {
    unlockSfx()
    setAgain({ busy: true, error: '' })
    try {
      const round = await startRound(level)
      setAgain({ busy: false, error: '' })
      play(round, { replace: true })
    } catch (e) {
      setAgain({ busy: false, error: errorText(e) })
    }
  }, [play])

  const openDuel = useCallback((code) => setParams({ duel: code }), [setParams])

  return (
    <MotionConfig reducedMotion="user">
      <style>{CSS}</style>
      <div className="min-h-[100dvh] bg-[#0B0B10] text-white">
        {duel ? (
          <DuelScreen code={duel} onHome={home} onDuel={openDuel}
            onPlay={(round) => { unlockSfx(); play(round) }} />
        ) : r ? (
          <RoundView id={r} live={live} result={result} onFinished={finished} onHome={home}
            onAgain={playAgain} onDuel={openDuel} again={again} />
        ) : (
          <HomeScreen onExit={() => navigate('/games')} onPlay={(round) => play(round)}
            onResume={(id) => setParams({ r: id })} onDuel={openDuel} />
        )}
      </div>
    </MotionConfig>
  )
}
