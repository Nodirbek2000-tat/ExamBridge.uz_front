/*
 * TOBY'S DAY — a My-Talking-Tom style voice game about daily routines.
 * Say the line, Toby does it. Map → zone (PlayScreen) → results → map,
 * and the Play Room (RoomScreen: give Toby commands) from the map or the hub
 * (/games/tobys-day?room=1). Toby wears the accessory picked in the wardrobe
 * on every screen.
 *
 * Progress: GET/PUT /games/voice/tobys-day/progress/, POST …/runs/,
 * GET …/leaderboard/ — every call falls back to localStorage (progress.js).
 * data.room and data.wardrobe (room.js), data.daily and data.bonus (missions.js)
 * are saved inside the same JSON. Every open is counted for the admin
 * (useGameOpen → /api/games/stats/open/).
 */
import { useCallback, useEffect, useRef, useState } from 'react'
import { useLocation, useNavigate, useSearchParams } from 'react-router-dom'
import { AnimatePresence, motion as Motion, useReducedMotion } from 'framer-motion'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useGameOpen } from '../../../games/useGameOpen'
import { SLUG, ZONES } from './content'
import { applyRun, mergeProgress } from './logic'
import { bumpDaily, claimMission, runDelta, stepDelta } from './missions'
import { loadLeaderboard, loadProgress, postRun, readLocal, saveProgress, writeLocal } from './progress'
import { addSaid, newAccs, ownedAccs, wornAcc } from './room'
import ZoneMap from './ZoneMap'
import PlayScreen from './PlayScreen'
import EndScreen from './EndScreen'
import RoomScreen from './RoomScreen'
import { WardrobeSheet } from './Wardrobe'

const fade = { initial: { opacity: 0 }, animate: { opacity: 1 }, exit: { opacity: 0 }, transition: { duration: 0.2 } }
const SAVE_DELAY = 1500       // room commands / wardrobe: one save for a burst of changes

export default function TobysDayGame() {
  useGameOpen(SLUG)
  const navigate = useNavigate()
  const location = useLocation()
  const [params, setParams] = useSearchParams()
  const reduced = !!useReducedMotion()
  const queryClient = useQueryClient()
  const [progress, setProgress] = useState(readLocal)
  const [online, setOnline] = useState(null)              // null = checking · true · false
  const [screen, setScreen] = useState({ name: 'map' })    // map · play {zi, key} · end {zi, run, before, after, saving, saved}
  const [wardrobe, setWardrobe] = useState(false)
  const progressRef = useRef(progress)
  const alive = useRef(true)
  const saveTimer = useRef(0)

  // the play room lives in the URL, so the hub can link to it and Back leaves it
  const inRoom = params.get('room') === '1'
  const view = inRoom ? 'room' : screen.name
  const acc = wornAcc(progress)

  useEffect(() => {
    alive.current = true
    loadProgress().then(({ progress: p, online: o }) => {
      if (!alive.current) return
      // merge, not replace: a zone finished while this was loading must not be lost
      const next = mergeProgress(progressRef.current, p)
      progressRef.current = next
      setProgress(next)
      setOnline(o)
    })
    return () => {
      alive.current = false
      // a room / wardrobe change still waiting to be sent: send it now
      if (saveTimer.current) {
        clearTimeout(saveTimer.current)
        saveTimer.current = 0
        saveProgress(progressRef.current)
      }
    }
  }, [])

  const { data: board } = useQuery({
    queryKey: ['voice-leaderboard', SLUG],
    queryFn: loadLeaderboard,
    staleTime: 60_000,
    retry: false,
  })

  /* ── saving small changes (room commands, wardrobe) ── */
  const flush = useCallback(async () => {
    clearTimeout(saveTimer.current)
    saveTimer.current = 0
    const { saved, progress: stored } = await saveProgress(progressRef.current)
    if (!alive.current || !saved) return
    setOnline(true)
    const next = mergeProgress(progressRef.current, stored)
    progressRef.current = next
    setProgress(next)
  }, [])

  /* save = false: this device only for now — the next save (end of the zone, room, wardrobe) takes it along */
  const update = useCallback((fn, save = true) => {
    const next = fn(progressRef.current)
    progressRef.current = next
    setProgress(next)
    writeLocal(next)                                      // this device has it at once
    if (!save) return
    clearTimeout(saveTimer.current)
    saveTimer.current = setTimeout(flush, SAVE_DELAY)
  }, [flush])

  const onSaid = useCallback((key, todayCount) => {
    update(p => bumpDaily({ ...p, room: addSaid(p.room, key, todayCount) }, { room: 1 }))
  }, [update])

  /* a line passed in a zone → today's mission counters (sent with the save at the end of the zone) */
  const onStep = useCallback((s) => {
    update(p => bumpDaily(p, stepDelta(s)), false)
  }, [update])

  const onClaim = useCallback((id) => {
    update(p => claimMission(p, id))
  }, [update])

  const onWear = useCallback((worn) => {
    update(p => ({ ...p, wardrobe: { owned: ownedAccs(p), worn, t: Date.now() } }))
  }, [update])

  const openWardrobe = useCallback(() => {
    // accessories unlocked since the last visit become owned (the "new" dot goes away)
    if (newAccs(progressRef.current).length) {
      update(p => ({ ...p, wardrobe: { ...(p.wardrobe || { worn: null }), owned: ownedAccs(p) } }))
    }
    setWardrobe(true)
  }, [update])

  /* ── screens ── */
  const start = useCallback((zi) => {
    window.scrollTo({ top: 0 })
    setScreen({ name: 'play', zi, key: Date.now() })
  }, [])

  const toMap = useCallback(() => {
    window.scrollTo({ top: 0 })
    setScreen({ name: 'map' })
  }, [])

  const openRoom = useCallback(() => {
    window.scrollTo({ top: 0 })
    setScreen({ name: 'map' })
    setParams({ room: '1' }, { state: { fromMap: true } })
  }, [setParams])

  const leaveRoom = useCallback(() => {
    if (saveTimer.current) flush()
    window.scrollTo({ top: 0 })
    if (location.state?.fromMap) navigate(-1)
    else setParams({}, { replace: true })
  }, [flush, location.state, navigate, setParams])

  const finish = useCallback(async (zi, run) => {
    const zone = ZONES[zi]
    const before = progressRef.current
    const after = bumpDaily(applyRun(before, zone, run), runDelta(run))
    progressRef.current = after
    setProgress(after)
    clearTimeout(saveTimer.current)                       // this save carries the room / wardrobe changes too
    saveTimer.current = 0
    window.scrollTo({ top: 0 })
    const id = Date.now()
    setScreen({ name: 'end', zi, run, before, after, saving: true, saved: false, id })
    const [{ saved, progress: stored }] = await Promise.all([
      saveProgress(after),
      postRun({
        score: run.coins,
        stars: run.stars,
        accuracy: run.accuracy,
        level: zone.id,
        duration_sec: run.duration,
        lines_said: run.said,
      }),
    ])
    if (!alive.current) return
    if (saved) {
      setOnline(true)
      // the server may know more (another device): keep the best of both
      const next = mergeProgress(progressRef.current, stored)
      progressRef.current = next
      setProgress(next)
    }
    setScreen(s => (s.name === 'end' && s.id === id ? { ...s, saving: false, saved } : s))
    queryClient.invalidateQueries({ queryKey: ['voice-leaderboard', SLUG] })
  }, [queryClient])

  return (
    <div className="min-h-[100dvh] bg-[#0B0B10] text-white">
      <AnimatePresence mode="wait" initial={false}>
        {view === 'map' && (
          <Motion.div key="map" {...fade}>
            <ZoneMap progress={progress} online={online} board={board} acc={acc} onStart={start} onRoom={openRoom}
              onWardrobe={openWardrobe} onClaim={onClaim} onBack={() => navigate('/games')} reduced={reduced} />
          </Motion.div>
        )}
        {view === 'room' && (
          <Motion.div key="room" {...fade}>
            <RoomScreen progress={progress} acc={acc} online={online} paused={wardrobe} onExit={leaveRoom}
              onSaid={onSaid} onWardrobe={openWardrobe} reduced={reduced} />
          </Motion.div>
        )}
        {view === 'play' && (
          <Motion.div key={`play-${screen.key}`} {...fade}>
            <PlayScreen zone={ZONES[screen.zi]} startXp={progress.xp} acc={acc} onExit={toMap} onStep={onStep}
              onFinish={(run) => finish(screen.zi, run)} reduced={reduced} />
          </Motion.div>
        )}
        {view === 'end' && (
          <Motion.div key={`end-${screen.id}`} {...fade}>
            <EndScreen zoneIndex={screen.zi} run={screen.run} before={screen.before} after={screen.after} acc={acc}
              saving={screen.saving} saved={screen.saved} reduced={reduced} onWardrobe={openWardrobe}
              onReplay={() => start(screen.zi)} onNextZone={() => start(screen.zi + 1)} onMap={toMap} />
          </Motion.div>
        )}
      </AnimatePresence>
      <WardrobeSheet open={wardrobe} progress={progress} onWear={onWear} onClose={() => setWardrobe(false)} reduced={reduced} />
    </div>
  )
}
