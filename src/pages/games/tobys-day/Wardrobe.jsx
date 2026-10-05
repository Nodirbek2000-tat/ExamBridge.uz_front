/*
 * TOBY'S WARDROBE — accessories that unlock with stars (zones + play room).
 * Pick one and Toby wears it everywhere (map, zones, results, play room).
 * Rules (thresholds) live in room.js → accUnlocks; the choice is saved in
 * data.wardrobe = { owned, worn, t }.
 */
import { useEffect, useState } from 'react'
import { AnimatePresence, motion as Motion } from 'framer-motion'
import { Check, Lock, Shirt, X } from 'lucide-react'
import { TobyAvatar } from './Toby'
import { accName, accUnlocks, allStars, newAccs, nextUnlock, ownedAccs, wornAcc } from './room'
import { StarIcon } from './ui'

/* the accessory on its own (cards, tiles) — Toby.jsx draws it on his head */
export function AccIcon({ acc, size = 48, className = '' }) {
  return (
    <svg viewBox="-24 -24 48 48" width={size} height={size} className={className} aria-hidden>
      {acc === 'cap' && (
        <g>
          <path d="M-16 4C-16-14 16-14 16 4z" fill="#EF4444" />
          <path d="M8 2h16q2 4-3 6H6z" fill="#B91C1C" />
          <circle cy="-12" r="2.5" fill="#B91C1C" />
          <path d="M-6-8a7 7 0 0 1 8-3" stroke="#fff" strokeWidth="2" fill="none" opacity="0.6" strokeLinecap="round" />
        </g>
      )}
      {acc === 'bow' && (
        <g>
          <path d="M0 0-18-11v22zM0 0l18-11v22z" fill="#F472B6" stroke="#DB2777" strokeWidth="1.6" strokeLinejoin="round" />
          <circle r="5" fill="#DB2777" />
          <circle cx="-10" cy="-3" r="1.6" fill="#fff" opacity="0.7" />
          <circle cx="10" cy="3" r="1.6" fill="#fff" opacity="0.7" />
        </g>
      )}
      {acc === 'glasses' && (
        <g stroke="#1E293B" strokeWidth="3" fill="#BAE6FD" fillOpacity="0.55">
          <circle cx="-10" cy="0" r="8" />
          <circle cx="10" cy="0" r="8" />
          <path d="M-2-1q2-3 4 0M-18-2l-4-3M18-2l4-3" fill="none" />
        </g>
      )}
      {acc === 'scarf' && (
        <g>
          <path d="M-18-6q18 10 36 0v8q-18 10-36 0z" fill="#3B82F6" />
          <path d="M6 0h9v20h-9z" fill="#3B82F6" />
          <path d="M-12-3v8M-4-1v8M4-1v8M12-3v8M6 9h9M6 15h9" stroke="#fff" strokeWidth="2.4" />
          <path d="M6 20v3M10.5 20v3M15 20v3" stroke="#3B82F6" strokeWidth="2" strokeLinecap="round" />
        </g>
      )}
      {acc === 'headphones' && (
        <g>
          <path d="M-16 4v-4a16 16 0 0 1 32 0v4" stroke="#7C3AED" strokeWidth="4" fill="none" strokeLinecap="round" />
          <rect x="-21" y="0" width="10" height="16" rx="4" fill="#A855F7" />
          <rect x="11" y="0" width="10" height="16" rx="4" fill="#A855F7" />
          <rect x="-19" y="3" width="4" height="10" rx="2" fill="#E9D5FF" />
          <rect x="15" y="3" width="4" height="10" rx="2" fill="#E9D5FF" />
        </g>
      )}
      {acc === 'party' && (
        <g>
          <path d="M0-20 14 16H-14z" fill="#22D3EE" />
          <path d="M-5-7 9 2M-9 3 12 12M-2-15 4-11" stroke="#F472B6" strokeWidth="3.4" strokeLinecap="round" />
          <circle cy="-20" r="4.5" fill="#FDE047" />
          <path d="M-15 16h30" stroke="#0891B2" strokeWidth="3" strokeLinecap="round" />
        </g>
      )}
      {acc === 'crown' && (
        <g>
          <path d="M-18 12V-8l9 8 9-14 9 14 9-8v20z" fill="#FACC15" stroke="#CA8A04" strokeWidth="1.8" strokeLinejoin="round" />
          <rect x="-18" y="8" width="36" height="6" rx="2" fill="#EAB308" />
          <circle cx="0" cy="3" r="3.2" fill="#F43F5E" />
          <circle cx="-10" cy="5" r="2.4" fill="#38BDF8" />
          <circle cx="10" cy="5" r="2.4" fill="#22C55E" />
        </g>
      )}
      {!acc && (
        <g stroke="#94A3B8" strokeWidth="3" fill="none" strokeLinecap="round">
          <circle r="13" />
          <path d="M-9 9 9-9" />
        </g>
      )}
    </svg>
  )
}

/* "Kiyimlar" button with a dot for accessories unlocked but not seen yet */
export function WardrobeButton({ progress, onClick, compact = false, className = '' }) {
  const fresh = newAccs(progress).length
  return (
    <Motion.button type="button" onClick={onClick} whileTap={{ scale: 0.94 }}
      className={`relative flex flex-shrink-0 items-center gap-2 rounded-full border border-white/[0.08] bg-[#111118] font-bold text-white transition hover:bg-[#17171F]
        ${compact ? 'h-10 w-10 justify-center' : 'h-10 px-4 text-[14px] lg:h-11 lg:text-[15px]'} ${className}`}
      aria-label="Toby’ning kiyimlari">
      <Shirt size={compact ? 18 : 19} />
      {!compact && <span>Kiyimlar</span>}
      {fresh > 0 && (
        <span className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-[#FFB020] px-1 text-[11px] font-extrabold text-[#1A1203] shadow-lg">
          {fresh}
        </span>
      )}
    </Motion.button>
  )
}

function Tile({ acc, name, need, stars, owned, worn, onPick }) {
  const locked = acc && !owned
  return (
    <Motion.button type="button" onClick={() => onPick(acc)} whileTap={{ scale: 0.95 }}
      className={`relative flex flex-col items-center justify-center rounded-3xl px-2 pb-3 pt-3 text-center transition
        ${worn ? 'bg-[#FFB020]/[0.12] ring-2 ring-[#FFB020]' : locked ? 'bg-white/[0.03] ring-1 ring-white/[0.05]' : 'bg-[#17171F] ring-1 ring-white/[0.07] hover:bg-[#1D1D27]'}`}
      aria-label={locked ? `${name} — ${need} ★ kerak` : name}>
      <span className={locked ? 'opacity-35 grayscale' : ''}><AccIcon acc={acc} size={58} /></span>
      <span className="mt-1.5 text-[13.5px] font-bold leading-tight text-white lg:text-[15px]">{name}</span>
      {locked ? (
        <span className="mt-1 flex items-center gap-1 rounded-full bg-white/[0.06] px-2 py-0.5 text-[11.5px] font-semibold text-white/60">
          <Lock size={11} /> {need} ★ kerak
        </span>
      ) : worn ? (
        <span className="mt-1 flex items-center gap-1 text-[12px] font-bold text-[#FFC95C]"><Check size={12} strokeWidth={3} /> Kiyilgan</span>
      ) : (
        <span className="mt-1 text-[12px] font-semibold text-white/45">Kiyish</span>
      )}
      {locked && (
        <span className="mt-1.5 h-1.5 w-[70%] overflow-hidden rounded-full bg-white/10">
          <span className="block h-full rounded-full bg-[#FFB020]" style={{ width: `${Math.min(100, (stars / need) * 100)}%` }} />
        </span>
      )}
    </Motion.button>
  )
}

function Sheet({ progress, onWear, onClose, reduced }) {
  const stars = allStars(progress)
  const owned = ownedAccs(progress)
  const worn = wornAcc(progress)
  const next = nextUnlock(stars)
  const [hop, setHop] = useState(0)
  const [nope, setNope] = useState(null)       // { acc, need } — a locked tile was tapped

  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  const pick = (acc) => {
    if (acc && !owned.includes(acc)) {
      const need = accUnlocks.find(a => a.acc === acc)?.need || 0
      setNope({ acc, need, id: Date.now() })
      return
    }
    setNope(null)
    if (acc !== worn) {
      setHop(h => h + 1)
      onWear(acc)
    }
  }

  return (
    <Motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 z-[70] flex items-end justify-center bg-black/65 backdrop-blur-sm sm:items-center sm:p-6" onClick={onClose}>
      <Motion.div role="dialog" aria-modal="true" aria-label="Toby’ning kiyimlari"
        initial={{ y: 60, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 60, opacity: 0 }} transition={{ type: 'spring', stiffness: 320, damping: 30 }}
        onClick={e => e.stopPropagation()}
        className="max-h-[94dvh] w-full overflow-y-auto rounded-t-[30px] border border-white/[0.08] bg-[#111118] p-4 pb-[max(18px,env(safe-area-inset-bottom))] shadow-2xl sm:max-w-[920px] sm:rounded-[32px] sm:p-6">
        <div className="flex items-center gap-3">
          <div className="min-w-0 flex-1">
            <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-[#FFB020]">Garderob</p>
            <h2 className="text-[21px] font-extrabold leading-tight tracking-tight sm:text-[26px]">Toby’ning kiyimlari</h2>
          </div>
          <span className="flex items-center gap-1.5 rounded-full border border-white/[0.08] bg-[#17171F] px-3 py-1.5 text-[14.5px] font-bold tabular-nums">
            <StarIcon size={15} /> {stars}
          </span>
          <button type="button" onClick={onClose} aria-label="Yopish" className="flex h-10 w-10 items-center justify-center rounded-full border border-white/[0.08] bg-[#17171F] text-white/75 hover:bg-[#1D1D27]">
            <X size={18} />
          </button>
        </div>

        <div className="mt-4 grid gap-4 sm:grid-cols-[260px_1fr] lg:grid-cols-[320px_1fr]">
          {/* preview */}
          <div className="relative flex flex-col items-center overflow-hidden rounded-[26px] border border-white/[0.06] bg-[#17171F] p-3 sm:p-4"
            style={{ backgroundImage: 'radial-gradient(80% 60% at 50% 30%, rgba(255,176,32,0.20) 0%, transparent 70%)' }}>
            <div className="relative h-40 w-36 sm:h-60 sm:w-52 lg:h-72 lg:w-60">
              <TobyAvatar className="h-full w-full" acc={worn} mood={hop ? 'proud' : 'happy'} pose={hop ? 'up' : 'wave'} jump={hop} reduced={reduced} />
            </div>
            <p className="relative mt-1 text-[16px] font-extrabold text-white">{worn ? accName(worn) : 'Hech narsa kiymagan'}</p>
            <p className="relative text-[12.5px] font-medium text-white/50">Toby buni hamma joyda kiyadi</p>
          </div>

          {/* items */}
          <div>
            <div className="grid grid-cols-3 gap-2.5 sm:grid-cols-4">
              <Tile acc={null} name="Hech narsa" owned worn={!worn} stars={stars} onPick={pick} />
              {accUnlocks.map(a => (
                <Tile key={a.acc} acc={a.acc} name={a.name} need={a.need} stars={stars} owned={owned.includes(a.acc)} worn={worn === a.acc} onPick={pick} />
              ))}
            </div>
            <AnimatePresence>
              {nope && (
                <Motion.p key={nope.id} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0, x: reduced ? 0 : [0, -6, 6, -3, 0] }} exit={{ opacity: 0 }}
                  className="mt-3 rounded-2xl bg-rose-500/[0.10] px-3 py-2 text-center text-[14px] font-semibold text-rose-100 ring-1 ring-rose-400/20">
                  «{accName(nope.acc)}» uchun {nope.need} ★ kerak — sizda {stars} ★. Zonalarda va o‘yin xonasida yulduz yig‘ing!
                </Motion.p>
              )}
            </AnimatePresence>
            <div className="mt-3 rounded-2xl bg-[#17171F] p-3">
              {next ? (
                <>
                  <div className="flex items-center gap-2.5">
                    <AccIcon acc={next.acc} size={34} className="flex-shrink-0" />
                    <p className="min-w-0 flex-1 text-[14px] font-medium leading-snug text-white/70">
                      Keyingi sovg‘a: <b className="font-bold text-white">{next.name}</b> — yana <b className="font-bold text-[#FFC95C]">{next.need - stars} ★</b>
                    </p>
                  </div>
                  <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-white/[0.08]">
                    <div className="h-full rounded-full bg-[#FFB020]" style={{ width: `${Math.min(100, (stars / next.need) * 100)}%` }} />
                  </div>
                </>
              ) : (
                <p className="text-center text-[14px] font-bold text-[#FFC95C]">Hammasi ochildi — siz zo‘rsiz!</p>
              )}
            </div>
            <button type="button" onClick={onClose}
              className="mt-3 w-full rounded-full bg-[#FFB020] py-3.5 text-[16px] font-extrabold text-[#1A1203]">
              Tayyor
            </button>
          </div>
        </div>
      </Motion.div>
    </Motion.div>
  )
}

export function WardrobeSheet({ open, progress, onWear, onClose, reduced = false }) {
  return (
    <AnimatePresence>
      {open && <Sheet key="wardrobe" progress={progress} onWear={onWear} onClose={onClose} reduced={reduced} />}
    </AnimatePresence>
  )
}
