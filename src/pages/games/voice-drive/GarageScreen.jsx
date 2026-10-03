/*
 * VOICE DRIVE garage: five cars, stronger one by one. Buy with the coins earned
 * on the road, pick the one to drive, and tune it step by step (engine, turbo).
 */
import { useState } from 'react'
import { AnimatePresence, motion as Motion } from 'framer-motion'
import { Check, ChevronLeft, Coins, Flame, Gauge, Lock, Play, Sparkles, Wrench } from 'lucide-react'
import { CARS, MAX_LEVEL, UPGRADES, buyCar, carBars, selectCar, upgradeCar, upgradePrice } from './cars'
import { CoinBadge, StatBar, Turntable } from './ui'
import CarSvg from './CarSvg'

const GLOW = { klassik: '#f43f5e', sedan: '#94a3b8', van: '#38bdf8', jip: '#6366f1', sport: '#facc15' }

function UpgradeRow({ kind, icon, car, garage, onUpgrade }) {
  const Icon = icon
  const owned = garage.owned.includes(car.id)
  const cur = (garage.up[car.id] || [1, 1])[kind === 'engine' ? 0 : 1]
  const max = cur >= MAX_LEVEL
  const price = max ? 0 : upgradePrice(car.id, kind, cur + 1)
  const can = owned && !max && garage.bank >= price
  return (
    <div className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/[0.04] p-3 lg:p-4">
      <span className={`flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-xl lg:h-12 lg:w-12 ${kind === 'engine' ? 'bg-sky-500/20 text-sky-300' : 'bg-orange-500/20 text-orange-300'}`}><Icon size={22} /></span>
      <div className="min-w-0 flex-1">
        <p className="flex items-center gap-2 text-base font-black lg:text-lg">
          {UPGRADES[kind].uz}
          <span className="flex gap-1">
            {[1, 2, 3].map(i => <span key={i} className={`h-2.5 w-5 rounded-full lg:w-6 ${i <= cur ? (kind === 'engine' ? 'bg-sky-400' : 'bg-orange-400') : 'bg-white/15'}`} />)}
          </span>
        </p>
        <p className="truncate text-[13px] font-semibold text-white/55 lg:text-sm">{UPGRADES[kind].note[max ? cur - 1 : cur]}</p>
      </div>
      <button type="button" onClick={() => onUpgrade(kind)} disabled={!can}
        className={`flex h-11 flex-shrink-0 items-center gap-1.5 rounded-xl px-3.5 text-sm font-black transition lg:h-12 lg:px-5 lg:text-base ${max ? 'bg-emerald-500/20 text-emerald-300' : can ? 'btn-glass bg-amber-400 text-black' : 'bg-white/10 text-white/40'}`}>
        {max ? <><Check size={16} /> Maks</> : <><Coins size={15} /> {price}</>}
      </button>
    </div>
  )
}

export default function GarageScreen({ garage, onChange, onBack, onPlay }) {
  const [viewId, setViewId] = useState(garage.car)
  const [flash, setFlash] = useState(null)
  const car = CARS.find(c => c.id === viewId) || CARS[0]
  const owned = garage.owned.includes(car.id)
  const selected = garage.car === car.id
  const up = garage.up[car.id] || [1, 1]
  const bars = carBars(car.id, up)
  const short = Math.max(0, car.price - garage.bank)

  const apply = (next, msg) => {
    if (!next) return
    onChange(next)
    setFlash({ id: Date.now(), msg })
  }

  return (
    <div className="mx-auto flex min-h-screen w-full max-w-lg flex-col px-4 pb-[max(20px,env(safe-area-inset-bottom))] pt-[max(16px,env(safe-area-inset-top))] lg:max-w-[1440px] lg:px-8">
      <div className="mb-4 flex items-center gap-3">
        <button type="button" onClick={onBack} aria-label="Orqaga"
          className="flex h-11 w-11 items-center justify-center rounded-full bg-white/5 text-white/80 transition hover:bg-white/10 lg:h-12 lg:w-12">
          <ChevronLeft size={22} />
        </button>
        <div className="min-w-0 flex-1">
          <p className="text-[11px] font-black uppercase tracking-[0.18em] text-white/40 lg:text-xs">Voice Drive</p>
          <p className="truncate text-xl font-black lg:text-3xl">Garaj</p>
        </div>
        <CoinBadge value={garage.bank} />
      </div>

      <div className="lg:grid lg:grid-cols-12 lg:gap-8">
        <div className="lg:col-span-7">
          <div className="relative overflow-hidden rounded-[30px] bg-[radial-gradient(ellipse_at_top,#1e293b_0%,#0b1020_70%)] px-4 pb-4 pt-5 shadow-2xl lg:rounded-[40px] lg:px-10 lg:pb-8 lg:pt-8">
            <div className="pointer-events-none absolute left-1/2 top-0 h-full w-2/3 -translate-x-1/2 bg-[conic-gradient(from_180deg_at_50%_0%,transparent_40%,rgba(255,255,255,0.08)_50%,transparent_60%)]" />
            <div className="relative flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="text-3xl font-black tracking-tight lg:text-6xl">{car.name}</p>
                <p className="mt-0.5 text-sm font-semibold text-white/60 lg:text-lg">{car.uz}</p>
              </div>
              {selected && <span className="flex flex-shrink-0 items-center gap-1 rounded-full bg-emerald-500/20 px-3 py-1 text-sm font-black text-emerald-300 lg:text-base"><Check size={15} /> Tanlangan</span>}
              {!owned && <span className="flex flex-shrink-0 items-center gap-1 rounded-full bg-white/10 px-3 py-1 text-sm font-black text-white/70 lg:text-base"><Lock size={14} /> Yopiq</span>}
            </div>
            <div className="relative mx-auto mt-2 w-full max-w-[640px]">
              <Turntable key={car.id} model={car.id} up={up} locked={!owned} glow={GLOW[car.id]} />
              {!owned && (
                <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
                  <span className="flex h-16 w-16 items-center justify-center rounded-full bg-black/60 ring-2 ring-white/20 backdrop-blur lg:h-20 lg:w-20"><Lock size={30} /></span>
                </div>
              )}
            </div>
            <p className={`relative mt-2 flex items-center gap-2 rounded-2xl px-3 py-2 text-[15px] font-bold lg:text-lg ${car.perk ? 'bg-amber-400/15 text-amber-200' : 'bg-white/5 text-white/70'}`}>
              <Sparkles size={17} className="flex-shrink-0" /> {car.perkUz}
            </p>
            <div className="relative mt-4 grid grid-cols-3 gap-3 lg:gap-5">
              <StatBar label="Tezlik" value={bars.speed} tone="from-sky-400 to-indigo-500" />
              <StatBar label="Kuch" value={bars.power} tone="from-rose-400 to-orange-500" />
              <StatBar label="Bonus" value={bars.bonus} tone="from-amber-300 to-emerald-400" />
            </div>
            <AnimatePresence>
              {flash && (
                <Motion.p key={flash.id} initial={{ opacity: 0, y: 10, scale: 0.9 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0 }}
                  onAnimationComplete={() => setTimeout(() => setFlash(f => (f?.id === flash.id ? null : f)), 1400)}
                  className="pointer-events-none absolute inset-x-0 top-1/3 mx-auto w-fit rounded-full bg-emerald-500 px-5 py-2 text-lg font-black shadow-2xl lg:text-2xl">
                  {flash.msg}
                </Motion.p>
              )}
            </AnimatePresence>
          </div>
        </div>

        <div className="flex flex-col lg:col-span-5">
          <div className="order-2 mt-4 space-y-2.5 lg:order-1 lg:mt-0">
            {!owned ? (
              <button type="button" onClick={() => apply(buyCar(garage, car.id), `${car.name} sizniki!`)} disabled={short > 0}
                className="btn-glass flex h-16 w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-amber-400 to-orange-500 text-xl font-black text-black disabled:cursor-not-allowed disabled:from-white/10 disabled:to-white/10 disabled:text-white/50 lg:h-20 lg:text-2xl">
                <Coins size={22} /> {short > 0 ? `${car.price} tanga · yana ${short} kerak` : `Sotib olish · ${car.price}`}
              </button>
            ) : !selected ? (
              <button type="button" onClick={() => apply(selectCar(garage, car.id), `${car.name} tanlandi`)}
                className="btn-glass flex h-16 w-full items-center justify-center gap-2 rounded-2xl bg-emerald-500 text-xl font-black text-white lg:h-20 lg:text-2xl">
                <Check size={22} /> Shu mashinani tanlash
              </button>
            ) : (
              <button type="button" onClick={onPlay}
                className="btn-glass flex h-16 w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-sky-500 to-indigo-600 text-xl font-black text-white lg:h-20 lg:text-2xl">
                <Play size={22} className="fill-white" /> Shu mashinada o‘ynash
              </button>
            )}
            <h2 className="flex items-center gap-2 pt-2 text-xs font-black uppercase tracking-[0.18em] text-white/50 lg:text-sm"><Wrench size={14} /> Kuchaytirish</h2>
            {owned ? (
              <>
                <UpgradeRow kind="engine" icon={Gauge} car={car} garage={garage} onUpgrade={(k) => apply(upgradeCar(garage, car.id, k), 'Dvigatel kuchaydi!')} />
                <UpgradeRow kind="turbo" icon={Flame} car={car} garage={garage} onUpgrade={(k) => apply(upgradeCar(garage, car.id, k), 'Turbo kuchaydi!')} />
              </>
            ) : (
              <p className="rounded-2xl border border-white/10 bg-white/[0.03] p-3 text-sm font-semibold text-white/55 lg:text-base">Avval mashinani oching — keyin dvigatel va turboni kuchaytirasiz.</p>
            )}
          </div>

          <div className="order-1 lg:order-2">
          <h2 className="mb-2 mt-5 text-xs font-black uppercase tracking-[0.18em] text-white/50 lg:mt-6 lg:text-sm">Mashinalar · birin-ketin kuchliroq</h2>
          <div className="-mx-4 flex snap-x gap-2.5 overflow-x-auto px-4 pb-2 lg:mx-0 lg:grid lg:grid-cols-3 lg:overflow-visible lg:px-0">
            {CARS.map((c, i) => {
              const have = garage.owned.includes(c.id)
              const on = c.id === car.id
              return (
                <button key={c.id} type="button" onClick={() => setViewId(c.id)} aria-pressed={on}
                  className={`relative w-36 flex-shrink-0 snap-start rounded-2xl border p-2.5 text-left transition lg:w-auto ${on ? 'border-white/50 bg-white/10 ring-2 ring-white/25' : 'border-white/10 bg-white/[0.03] hover:bg-white/[0.07]'}`}>
                  <span className="absolute left-2 top-2 rounded-full bg-black/40 px-1.5 text-[10px] font-black text-white/60">{i + 1}</span>
                  <CarSvg model={c.id} up={garage.up[c.id] || [1, 1]} locked={!have} className="mt-2 w-full" />
                  <p className="mt-1 truncate text-sm font-black">{c.name}</p>
                  <p className="flex items-center gap-1 text-xs font-bold">
                    {garage.car === c.id ? <span className="text-emerald-300">Tanlangan</span>
                      : have ? <span className="text-white/60">Sizniki</span>
                        : <span className={garage.bank >= c.price ? 'text-amber-300' : 'text-white/45'}><Lock size={11} className="mr-0.5 inline" />{c.price}</span>}
                  </p>
                </button>
              )
            })}
          </div>
          </div>
        </div>
      </div>
    </div>
  )
}
