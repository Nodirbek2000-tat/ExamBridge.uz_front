/*
 * TOBY RUN — "Yugur, ayt va uch!" (RUNNER_PLAN): a 3D runner where thumbs steer and the voice flies.
 * Route root /games/runner: Start ⇄ Play (3D world or Card mode, balloon rides, Bekats) → Result (score,
 * chips, Tuzat, missions); around them the shop, the metro map, today's missions and the weekly board.
 * One useSpeech({ game: 'runner' }) lives here, so the Start tap primes the same mic the run uses (iOS).
 */
import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useSpeech } from '../../../games/voice/useSpeech'
import { useGameOpen } from '../../../games/useGameOpen'
import { finishBody, getDeck, newRef, postFinish } from './api'
import { creditFix, creditRun, ensureMissions, loadProgress, readLocal, saveProgress } from './progress'
import { playSfx, setMusic, unlockSfx } from './sfx'
import { preloadRunnerScene } from './webgl'
import StartScreen from './StartScreen'
import PlayScreen from './PlayScreen'
import ResultScreen from './ResultScreen'
import ShopScreen from './ShopScreen'
import MetroMap from './MetroMap'
import MissionsScreen from './MissionsScreen'
import LeaderboardScreen from './LeaderboardScreen'

export default function RunnerGame() {
  useGameOpen('runner')
  const navigate = useNavigate()
  const speech = useSpeech({ game: 'runner' })
  const [progress, setProgress] = useState(readLocal)
  const [stage, setStage] = useState('start')            // start | loading | play | result | shop | map | missions | board
  const [deckData, setDeckData] = useState(null)
  const [config, setConfig] = useState(null)
  const [result, setResult] = useState(null)              // { summary, ref, deck, server, pending, error, missions }
  const [round, setRound] = useState(0)
  const [runLevel, setRunLevel] = useState(progress.level)
  const runRef = useRef(null)
  const server = speech.mode === 'server'

  useEffect(() => {
    let alive = true
    loadProgress().then(() => { if (alive) setProgress(ensureMissions(server)) })
    preloadRunnerScene()
    return () => { alive = false; setMusic(false) }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { window.scrollTo?.(0, 0) }, [stage])

  // a browser that can neither recognise nor record speech plays in Listen mode
  const settings = speech.supported ? progress.settings : { ...progress.settings, listen: true }
  const update = (patch) => setProgress(saveProgress(patch))
  const sfx = (name) => { if (settings.sound !== false) { unlockSfx(); playSfx(name) } }

  const start = async () => {
    // inside the tap: the mic (iOS) and the sound
    unlockSfx()
    speech.prime()
    setStage('loading')
    let dd = null
    try {
      dd = await getDeck(progress.level, progress.topic)
      setConfig(dd.config)
    } catch { dd = null }
    runRef.current = { ref: newRef(), deck: dd?.deck || '', level: progress.level }
    setRunLevel(progress.level)
    setDeckData(dd)
    setRound(r => r + 1)
    setStage('play')
  }

  const over = (summary) => {
    const run = runRef.current || { ref: newRef(), deck: '' }
    const coins = summary.coins
    const credit = creditRun({ ref: run.ref, level: summary.level, coins, score: summary.score_client, summary, server: summary.stt === 'server' })
    setProgress(credit.progress)
    setResult({
      summary, ref: run.ref, deck: run.deck, server: null, pending: !!run.deck,
      coinsBefore: credit.progress.coins - (credit.already ? 0 : coins + credit.reward),
      missions: credit.completed,
    })
    setStage('result')
    if (!run.deck) return
    const body = finishBody(summary, run.deck, run.ref)
    if (window.__rnDebug) window.__rnFinish = { body, server: null }
    // a dropped connection is retried with the same ref (the server answers a repeat with the stored run)
    const send = (left) => postFinish(body)
      .then((res) => {
        if (window.__rnDebug) window.__rnFinish = { body, server: res }
        setResult(r => (r && r.ref === run.ref ? { ...r, server: res, pending: false } : r))
        if (res?.score > (readLocal().best[summary.level] || 0)) setProgress(saveProgress({ best: { ...readLocal().best, [summary.level]: res.score } }))
      })
      .catch((e) => {
        const status = e?.response?.status
        if (left > 0 && (!status || status >= 500)) { setTimeout(() => send(left - 1), 3000); return }
        setResult(r => (r && r.ref === run.ref ? { ...r, pending: false, error: true } : r))
      })
    send(2)
  }

  /* a fix on the results screen: +coins and the "fix 3 red words" mission */
  const fixed = (coins, key) => {
    const r = creditFix(coins, server)
    setProgress(r.progress)
    setResult(x => (x ? { ...x, fixedKeys: [...(x.fixedKeys || []), key], missions: r.completed.length ? [...(x.missions || []), ...r.completed] : x.missions } : x))
  }

  const back = () => setStage('start')

  if (stage === 'play') {
    return (
      <PlayScreen key={round} level={runLevel} deckData={deckData} settings={settings}
        outfit={progress.equip.outfit} carpet={progress.equip.carpet} runner={progress.equip.runner} upgrades={progress.up} speech={speech}
        sound={settings.sound !== false} onSound={(on) => update({ settings: { ...settings, sound: on } })}
        onOver={over} onExit={back} onRestart={start} />
    )
  }
  if (stage === 'result' && result) {
    return (
      <ResultScreen result={result} progress={progress} speech={speech} onFix={fixed}
        onAgain={start} onStart={back} onHub={() => navigate('/games')} onScreen={setStage} />
    )
  }
  if (stage === 'shop') return <ShopScreen progress={progress} onProgress={setProgress} onBack={back} onSfx={sfx} />
  if (stage === 'map') {
    return (
      <MetroMap progress={progress} onBack={back}
        onLevel={(lv) => update({ level: lv })}
        onPick={(topic) => { setProgress(saveProgress({ topic })); sfx('chime'); setStage('start') }} />
    )
  }
  if (stage === 'missions') return <MissionsScreen progress={progress} onBack={back} />
  if (stage === 'board') return <LeaderboardScreen progress={progress} onBack={back} />

  return (
    <StartScreen progress={progress} config={config} speech={speech} loading={stage === 'loading'}
      onChange={update} onStart={start} onBack={() => navigate('/games')} onScreen={setStage} />
  )
}
