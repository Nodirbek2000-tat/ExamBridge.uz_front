import { useState, useEffect, useRef, useMemo } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { motion, AnimatePresence } from 'framer-motion'
import {
  ArrowLeft, Loader2, Headphones, Video, Lock, CheckCircle2,
  Play, Pause, RotateCcw, RotateCw, Volume2, VolumeX,
} from 'lucide-react'
import api from '../../api/client'

const SPEEDS = [0.75, 1, 1.25, 1.5]
// Short hop — shadowing works best when you can nudge back a phrase, not a whole thought
const SKIP_SECONDS = 5

const fmt = (s) => {
  const t = Math.max(0, Math.floor(s || 0))
  return `${Math.floor(t / 60)}:${String(t % 60).padStart(2, '0')}`
}

/* ── Card ─────────────────────────────────────────────────────────────── */
function PodcastCard({ podcast, index, onOpen, busy }) {
  const locked = podcast.is_premium
  const isVideo = podcast.media_kind === 'video'

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.04, duration: 0.35 }}
      className="flex flex-col overflow-hidden rounded-2xl border border-sky-100 bg-gradient-to-b from-sky-50/70 to-sky-100/60 shadow-sm transition-shadow hover:shadow-md"
    >
      {/* Thumbnail strip */}
      <div className="relative flex h-32 items-center justify-center overflow-hidden bg-gradient-to-br from-sky-400/20 to-blue-500/25">
        {podcast.cover_url ? (
          <img src={podcast.cover_url} alt="" className="h-full w-full object-cover" />
        ) : isVideo ? (
          <Video size={34} className="text-sky-500/70" />
        ) : (
          <Headphones size={34} className="text-sky-500/70" />
        )}
        <span className="absolute left-3 top-3 rounded-full bg-white/85 px-2.5 py-1 text-[11px] font-black uppercase tracking-wide text-sky-600 backdrop-blur-sm">
          {isVideo ? 'Video' : 'Audio'}
        </span>
        {podcast.is_listened && (
          <span className="absolute right-3 top-3 inline-flex items-center gap-1.5 rounded-full bg-white/85 px-2.5 py-1 text-xs font-bold text-sky-600 backdrop-blur-sm">
            <CheckCircle2 size={13} /> Seen
          </span>
        )}
      </div>

      <div className="flex flex-1 flex-col p-5">
        <p className="text-[17px] font-bold leading-snug text-slate-900">{podcast.title}</p>
        {podcast.author && <p className="mt-1 text-sm text-slate-500">{podcast.author}</p>}

        <div className="mt-auto flex items-center justify-between gap-3 border-t border-sky-200/60 pt-4">
          <button
            type="button"
            onClick={() => onOpen(podcast)}
            disabled={busy}
            className={`flex items-center gap-1.5 rounded-full px-5 py-2.5 text-sm font-bold text-white transition-colors disabled:opacity-60 ${
              locked ? 'bg-slate-400' : 'bg-sky-500 hover:bg-sky-600'
            }`}
          >
            {busy ? (
              <Loader2 size={15} className="animate-spin" />
            ) : locked ? (
              <><Lock size={13} /> Upgrade Plan</>
            ) : isVideo ? 'Start Watching' : 'Start Listening'}
          </button>
          <span className="rounded-full bg-white/80 px-3 py-1.5 text-xs font-semibold text-slate-500">
            {podcast.duration_label} minutes
          </span>
        </div>
      </div>
    </motion.div>
  )
}

/* ── Player: media on top, transcript scrolling underneath ────────────── */
function PodcastPlayer({ podcast, onClose }) {
  const mediaRef = useRef(null)
  const activeRef = useRef(null)
  const scrollRef = useRef(null)
  const saveRef = useRef(0)

  const [playing, setPlaying] = useState(false)
  const [time, setTime] = useState(0)
  const [duration, setDuration] = useState(podcast.duration_sec || 0)
  const [speed, setSpeed] = useState(1)
  const [muted, setMuted] = useState(false)

  const words = podcast.words || []
  const isVideo = podcast.media_kind === 'video'

  // Which word is being spoken right now — the transcript follows the media.
  const activeIndex = useMemo(() => {
    if (!words.length) return -1
    let lo = 0
    let hi = words.length - 1
    let found = -1
    while (lo <= hi) {
      const mid = (lo + hi) >> 1
      if (words[mid].start <= time) { found = mid; lo = mid + 1 } else { hi = mid - 1 }
    }
    return found
  }, [time, words])

  // Keep the spoken word centred inside the transcript pane (not the page)
  useEffect(() => {
    const el = activeRef.current
    const box = scrollRef.current
    if (!el || !box) return
    const target = el.offsetTop - box.clientHeight / 2 + el.clientHeight / 2
    box.scrollTo({ top: target, behavior: 'smooth' })
  }, [activeIndex])

  useEffect(() => {
    const m = mediaRef.current
    if (m && podcast.position_sec > 1) m.currentTime = podcast.position_sec
  }, [podcast.position_sec])

  useEffect(() => {
    const m = mediaRef.current
    if (m) m.playbackRate = speed
  }, [speed])

  const onTimeUpdate = (e) => {
    const t = e.target.currentTime
    setTime(t)
    if (Math.abs(t - saveRef.current) > 5) {
      saveRef.current = t
      api.put(`/study/podcasts/${podcast.id}/position/`, { position_sec: t }).catch(() => {})
    }
  }

  const toggle = () => {
    const m = mediaRef.current
    if (!m) return
    if (playing) { m.pause(); setPlaying(false) } else { m.play(); setPlaying(true) }
  }

  const skip = (sec) => {
    const m = mediaRef.current
    if (!m) return
    m.currentTime = Math.max(0, Math.min(duration, m.currentTime + sec))
  }

  const seek = (e) => {
    const m = mediaRef.current
    if (!m || !duration) return
    const rect = e.currentTarget.getBoundingClientRect()
    m.currentTime = ((e.clientX - rect.left) / rect.width) * duration
  }

  const mediaProps = {
    ref: mediaRef,
    src: isVideo ? podcast.video_url : podcast.audio_url,
    onTimeUpdate,
    onLoadedMetadata: (e) => setDuration(e.target.duration || podcast.duration_sec),
    onEnded: () => setPlaying(false),
    onClick: toggle,
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[90] flex flex-col bg-slate-50"
    >
      {/* Top bar */}
      <div className="flex h-16 flex-shrink-0 items-center gap-3 bg-white px-4 shadow-sm sm:px-6">
        <button
          type="button"
          onClick={onClose}
          className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-900"
        >
          <ArrowLeft size={20} />
        </button>
        <p className="min-w-0 flex-1 truncate text-[17px] font-bold text-slate-900">{podcast.title}</p>

        <button
          type="button"
          onClick={() => setSpeed(SPEEDS[(SPEEDS.indexOf(speed) + 1) % SPEEDS.length])}
          className="flex h-9 min-w-[3rem] items-center justify-center rounded-full border border-slate-200 px-3 text-sm font-bold text-slate-600 transition-colors hover:bg-slate-50"
        >
          {speed}x
        </button>
        <button
          type="button"
          onClick={() => {
            const m = mediaRef.current
            if (!m) return
            m.muted = !muted
            setMuted((v) => !v)
          }}
          className="flex h-9 w-9 items-center justify-center rounded-full text-slate-600 transition-colors hover:bg-slate-100"
        >
          {muted ? <VolumeX size={19} /> : <Volume2 size={19} />}
        </button>
      </div>

      {/* Media stage — video gets a black stage; audio has nothing to show,
          so it stays invisible and the transcript takes the whole screen. */}
      {isVideo ? (
        <div className="flex-shrink-0 bg-black">
          <video
            {...mediaProps}
            playsInline
            className="mx-auto max-h-[45vh] w-full max-w-4xl cursor-pointer bg-black object-contain"
          />
        </div>
      ) : (
        <audio {...mediaProps} />
      )}

      {/* Transcript — spoken words stay dark, upcoming ones fade out.
          Audio-only centres the text; video keeps it flowing under the clip. */}
      <div
        ref={scrollRef}
        className={`min-h-0 flex-1 overflow-y-auto px-4 sm:px-6 ${
          isVideo ? 'py-8' : 'flex flex-col justify-center py-10'
        }`}
      >
        {words.length === 0 ? (
          <p className="mx-auto max-w-2xl text-center text-sm text-slate-400">
            Bu media uchun transkript yo'q.
          </p>
        ) : (
          <p className="mx-auto max-w-3xl text-center text-[21px] leading-[1.85] tracking-[0.01em] sm:text-[25px]">
            {words.map((w, i) => {
              const spoken = i <= activeIndex
              const distance = i - activeIndex
              const opacity = spoken ? 1 : distance <= 3 ? 0.45 : distance <= 8 ? 0.22 : 0.1
              return (
                <span
                  key={i}
                  ref={i === activeIndex ? activeRef : null}
                  onClick={() => {
                    const m = mediaRef.current
                    if (m) m.currentTime = w.start
                  }}
                  className={`cursor-pointer transition-colors duration-200 ${
                    i === activeIndex ? 'font-semibold text-sky-600' : 'text-slate-700'
                  }`}
                  style={{ opacity }}
                >
                  {w.word}{' '}
                </span>
              )
            })}
          </p>
        )}
      </div>

      {/* Controls */}
      <div className="flex-shrink-0 border-t border-slate-200 bg-white px-4 pb-6 pt-4 sm:px-6">
        <div className="mx-auto max-w-2xl">
          <div className="h-1.5 cursor-pointer rounded-full bg-slate-200" onClick={seek}>
            <div
              className="h-full rounded-full bg-sky-500"
              style={{ width: duration ? `${(time / duration) * 100}%` : '0%' }}
            />
          </div>
          <div className="mt-2 flex justify-between text-xs font-semibold tabular-nums text-slate-400">
            <span>{fmt(time)}</span>
            <span>{fmt(duration)}</span>
          </div>

          <div className="mt-4 flex items-center justify-center gap-7">
            <button
              type="button"
              onClick={() => skip(-SKIP_SECONDS)}
              title={`${SKIP_SECONDS} sekund orqaga`}
              className="relative flex h-11 w-11 items-center justify-center rounded-full border border-slate-200 text-slate-500 transition-colors hover:bg-slate-50 hover:text-sky-600"
            >
              <RotateCcw size={22} />
              <span className="absolute text-[9px] font-black tabular-nums">{SKIP_SECONDS}</span>
            </button>
            <button
              type="button"
              onClick={toggle}
              className="flex h-14 w-14 items-center justify-center rounded-full bg-sky-500 text-white shadow-lg shadow-sky-500/30 transition-transform hover:scale-105"
            >
              {playing ? <Pause size={24} /> : <Play size={24} className="ml-1" />}
            </button>
            <button
              type="button"
              onClick={() => skip(SKIP_SECONDS)}
              title={`${SKIP_SECONDS} sekund oldinga`}
              className="relative flex h-11 w-11 items-center justify-center rounded-full border border-slate-200 text-slate-500 transition-colors hover:bg-slate-50 hover:text-sky-600"
            >
              <RotateCw size={22} />
              <span className="absolute text-[9px] font-black tabular-nums">{SKIP_SECONDS}</span>
            </button>
          </div>
        </div>
      </div>
    </motion.div>
  )
}

/* ── Shared library page ──────────────────────────────────────────────── */
/**
 * Drives both Study Tools shelves. The only differences are which section the
 * API returns, the copy, and the base route — cards and player are shared.
 *   section="shadowing" → audio or video
 *   section="podcast"   → video only
 */
export default function MediaLibraryPage({
  section = 'podcast',
  title = 'Podcasts',
  subtitle = 'Videoni tomosha qiling — matn pastda video bilan birga harakatlanadi.',
  basePath = '/study/podcasts',
  emptyText = "Hozircha video yo'q",
  emptyHint = 'Admin panel → Study Tools → Podcasts orqali video yuklang.',
}) {
  const queryClient = useQueryClient()
  const navigate = useNavigate()
  const { podcastId, trackId } = useParams()
  const openId = podcastId || trackId
  const [open, setOpen] = useState(null)
  const [opening, setOpening] = useState(null)

  const { data: podcasts = [], isLoading } = useQuery({
    queryKey: ['study-podcasts', section],
    queryFn: () => api.get(`/study/podcasts/?section=${section}`).then((r) => r.data),
  })

  useEffect(() => {
    if (!openId) { setOpen(null); return }
    if (open?.id === Number(openId)) return

    let cancelled = false
    setOpening(Number(openId))
    api.get(`/study/podcasts/${openId}/`)
      .then(({ data }) => {
        if (cancelled) return
        setOpen(data)
        queryClient.invalidateQueries({ queryKey: ['study-podcasts'] })
      })
      .catch((err) => {
        if (cancelled) return
        if (err?.response?.status === 403) alert('Bu media Premium foydalanuvchilar uchun.')
        navigate(basePath, { replace: true })
      })
      .finally(() => { if (!cancelled) setOpening(null) })

    return () => { cancelled = true }
  }, [openId]) // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-black tracking-tight text-slate-900 sm:text-3xl">{title}</h1>
        <p className="mt-1.5 text-sm text-slate-500">{subtitle}</p>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-20">
          <Loader2 size={28} className="animate-spin text-slate-300" />
        </div>
      ) : podcasts.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-300 bg-white py-20 text-center">
          <Video size={38} className="mx-auto mb-3 text-slate-300" />
          <p className="font-semibold text-slate-600">{emptyText}</p>
          <p className="mt-1 text-sm text-slate-400">{emptyHint}</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {podcasts.map((p, i) => (
            <PodcastCard
              key={p.id}
              podcast={p}
              index={i}
              busy={opening === p.id}
              onOpen={(pod) => navigate(`${basePath}/${pod.id}`)}
            />
          ))}
        </div>
      )}

      <AnimatePresence>
        {open && <PodcastPlayer podcast={open} onClose={() => navigate(basePath)} />}
      </AnimatePresence>
    </div>
  )
}
