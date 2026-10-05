/*
 * SPEAKING — read a text aloud, the AI checks every word.
 * Screens live in the URL, so the browser / Android Back button works:
 *   /games/speaking?level=B1          lesson list
 *   /games/speaking?lesson=12         read + record
 *   /games/speaking?attempt=55        checking → result
 *   /games/speaking?attempt=55&w=7    … with the sheet of word 7 open
 */
import { useCallback, useEffect } from 'react'
import { MotionConfig } from 'framer-motion'
import { useLocation, useNavigate, useSearchParams } from 'react-router-dom'
import { useGameOpen } from '../../../games/useGameOpen'
import AttemptScreen from './AttemptScreen'
import LessonList from './LessonList'
import ReadScreen from './ReadScreen'

const LEVEL_KEY = 'speaking-level'
const rememberLevel = (lv) => { try { sessionStorage.setItem(LEVEL_KEY, lv || '') } catch { /* private mode */ } }
const savedLevel = () => { try { return sessionStorage.getItem(LEVEL_KEY) || '' } catch { return '' } }

export default function SpeakingGame() {
  useGameOpen('speaking')
  const [params, setParams] = useSearchParams()
  const navigate = useNavigate()
  const location = useLocation()
  const lesson = params.get('lesson')
  const attempt = params.get('attempt')
  const level = (params.get('level') || '').toUpperCase()
  const w = params.get('w')
  const from = location.state?.from

  const screen = attempt ? `a${attempt}` : lesson ? `l${lesson}` : 'list'
  useEffect(() => { window.scrollTo?.(0, 0) }, [screen])

  const go = useCallback((next, opts = {}) => setParams(next, opts), [setParams])
  const toList = useCallback(() => {
    // came straight from the list: step back, so the list's history entry is reused
    if (from === 'list') navigate(-1)
    else {
      const lv = savedLevel()
      go(lv ? { level: lv } : {}, { replace: true })
    }
  }, [from, navigate, go])

  const openWord = useCallback((i) => go({ attempt, w: String(i) }, { state: { ...location.state, sheet: true } }), [go, attempt, location.state])
  const closeWord = useCallback(() => {
    if (location.state?.sheet) navigate(-1)
    else go({ attempt }, { replace: true, state: location.state })
  }, [go, attempt, location.state, navigate])
  const switchWord = useCallback((i) => go({ attempt, w: String(i) }, { replace: true, state: location.state }), [go, attempt, location.state])
  const premium = () => navigate('/app/subscription')

  return (
    <MotionConfig reducedMotion="user">
      <div className="min-h-[100dvh] bg-[#0B0B10] text-white">
        {/* the reading keeps a comfortable line length; the list and the result use a wide screen */}
        <div className={`mx-auto w-full max-w-[760px] px-4 sm:px-6 ${lesson && !attempt ? '' : 'lg:max-w-[1180px]'}`}>
          {attempt ? (
            <AttemptScreen attemptId={attempt} wordIndex={w != null && w !== '' ? Number(w) : null}
              onBack={toList} onList={toList}
              onOpenWord={openWord} onCloseWord={closeWord} onSwitchWord={switchWord}
              onNext={(id) => go({ lesson: String(id) }, { state: { from: 'result' } })}
              onRedo={(id) => go({ lesson: String(id) }, { state: { from: 'result' } })} />
          ) : lesson ? (
            <ReadScreen key={lesson} lessonId={lesson} onBack={toList} onPremium={premium}
              onUploaded={(id) => go({ attempt: String(id) }, { replace: true, state: { from } })} />
          ) : (
            <LessonList level={level}
              onLevel={(lv) => { rememberLevel(lv); go(lv ? { level: lv } : {}, { replace: true }) }}
              onOpen={(id) => go({ lesson: String(id) }, { state: { from: 'list' } })}
              onExit={() => navigate('/games')} onPremium={premium} />
          )}
        </div>
      </div>
    </MotionConfig>
  )
}
