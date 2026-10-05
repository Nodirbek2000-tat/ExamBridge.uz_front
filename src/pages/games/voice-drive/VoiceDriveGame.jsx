/*
 * VOICE DRIVE — a Subway-Surfers-style endless drive steered by spoken English.
 * Start (level, missions, the car) ⇄ Garage (buy / pick / tune cars) → Play
 * (3D road with a 2D fallback, hands-free mic) → Result (stars, coins → bank, mistakes, weekly board).
 */
import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { speechSupported } from '../../../games/voice/useSpeech'
import { useGameOpen } from '../../../games/useGameOpen'
import { levelById } from './content'
import { loadAll, mergeBest, readLocal, rememberHear, rememberLevel, rememberSound, saveGarage } from './progress'
import GarageScreen from './GarageScreen'
import PlayScreen from './PlayScreen'
import ResultScreen from './ResultScreen'
import StartScreen from './StartScreen'

export default function VoiceDriveGame() {
  useGameOpen('voice-drive')
  const navigate = useNavigate()
  const [local] = useState(readLocal)
  const [stage, setStage] = useState('start')          // start | garage | play | result
  const [levelId, setLevelId] = useState(local.level)
  const [best, setBest] = useState(local.best)
  const [garage, setGarage] = useState(local.garage)
  const [hear, setHear] = useState(local.hear)
  const [sound, setSound] = useState(local.sound)
  const [runGarage, setRunGarage] = useState(null)     // the garage the run started with (car, upgrades, missions)
  const [summary, setSummary] = useState(null)
  const [round, setRound] = useState(0)
  const [supported] = useState(speechSupported)

  useEffect(() => {
    let alive = true
    // merge, never replace: a run may have set a new best while this was loading
    loadAll().then(({ best: b, garage: g }) => {
      if (!alive) return
      setBest(prev => mergeBest(prev, b))
      setGarage(g)
    })
    return () => { alive = false }
  }, [])

  useEffect(() => { window.scrollTo?.(0, 0) }, [stage])

  const level = levelById(levelId)
  // the device copy is always the freshest (a run is credited there first, before the server answers)
  const freshGarage = () => {
    const g = readLocal().garage
    setGarage(g)
    setRunGarage(g)
  }
  const play = () => { freshGarage(); setRound(r => r + 1); setStage('play') }
  // leaving the results before their save answered: the screen state still has the bank from before the run —
  // a purchase made from it would overwrite the coins just credited on this device
  const goTo = (s) => { setGarage(readLocal().garage); setStage(s) }
  const chooseLevel = (id) => { setLevelId(id); rememberLevel(id) }
  const changeHear = (id, on) => {
    const next = { ...hear, [id]: on }
    setHear(next)
    rememberHear(next)
  }
  const changeSound = (on) => { setSound(on); rememberSound(on) }
  const changeGarage = (g) => setGarage(saveGarage(g))

  if (stage === 'play') {
    return (
      <PlayScreen key={round} level={level} garage={runGarage || garage} best={best[level.id] || 0}
        hearFirst={!!hear[level.id]} sound={sound} onSound={changeSound}
        onExit={() => goTo('start')}
        onRestart={() => { freshGarage(); setRound(r => r + 1) }}
        onOver={(s) => { setSummary(s); setStage('result') }} />
    )
  }

  if (stage === 'result' && summary) {
    return (
      <ResultScreen summary={summary} knownBest={best} garage={runGarage || garage} onBest={setBest} onGarageChange={setGarage}
        onAgain={play} onLevels={() => goTo('start')} onHub={() => navigate('/games')} onGarage={() => goTo('garage')} />
    )
  }

  if (stage === 'garage') {
    return <GarageScreen garage={garage} onChange={changeGarage} onBack={() => goTo('start')} onPlay={play} />
  }

  return (
    <StartScreen levelId={levelId} onLevel={chooseLevel} best={best} garage={garage} hear={hear} onHear={changeHear}
      supported={supported} onStart={play} onGarage={() => goTo('garage')} onBack={() => navigate('/games')} />
  )
}
