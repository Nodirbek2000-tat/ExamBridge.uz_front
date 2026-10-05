/*
 * VOICE DRIVE garage: five cars, stronger one by one. Buy with the coins earned
 * on the road, pick the one to drive, tune it (engine, turbo) — the upgrades
 * show on the 3D car (chrome → gold rims, neon, exhaust flame).
 */
import { useState } from 'react'
import { AnimatePresence, motion as Motion } from 'framer-motion'
import { Check, ChevronLeft, Lock, Play } from 'lucide-react'
import { CARS, MAX_LEVEL, UPGRADES, buyCar, carBars, selectCar, upgradeCar, upgradePrice } from './cars'
import { CoinBadge, StatBar } from './ui'
import ActionIcon, { CoinIcon } from './ActionIcon'
import CarStage from './CarStage'
import CarSvg from './CarSvg'

const CARD = 'rounded-[24px] border border-white/[0.08] bg-[#111118]'
const LABEL = 'text-[11px] font-bold uppercase tracking-[0.2em] text-white/40 lg:text-xs'

function UpgradeRow({ kind, car, garage, onUpgrade }) {
  const owned = garage.owned.includes(car.id)
  const cur = (garage.up[car.id] || [1, 1])[kind === 'engine' ? 0 : 1]
  const max = cur >= MAX_LEVEL
  const price = max ? 0 : upgradePrice(car.id, kind, cur + 1)
  const can = owned && !max && garage.bank >= price
  return (
    <div className="flex items-center gap-3 px-3.5 py-3 lg:px-4 lg:py-3.5">
      <span className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-2xl bg-white/[0.06] text-white/80">
        <ActionIcon action={kind === 'engine' ? 'fast' : 'turbo'} size={26} />
      </span>
      <div className="min-w-0 flex-1">
        <p className="flex items-center gap-2.5 text-[15px] font-bold lg:text-base">
          {UPGRADES[kind].uz}
          <span className="flex gap-1">
            {[1, 2, 3].map(i => <span key={i} className={`h-1.5 w-5 rounded-full ${i <= cur ? 'bg-[#FFB224]' : 'bg-white/[0.12]'}`} />)}
          </span>
        </p>
        <p className="truncate text-[13px] font-medium text-white/45">{UPGRADES[kind].note[max ? cur - 1 : cur]}</p>
      </div>
      <button type="button" onClick={() => onUpgrade(kind)} disabled={!can}
        className={`flex h-10 flex-shrink-0 items-center gap-1.5 rounded-full px-3.5 text-sm font-bold transition lg:h-11 lg:px-4 ${max ? 'bg-emerald-400/10 text-emerald-300' : can ? 'bg-[#FFB224] text-[#0B0B10] hover:brightness-105' : 'bg-white/[0.06] text-white/35'}`}>
        {max ? <><Check size={15} /> Maks</> : <><CoinIcon size={15} /> {price}</>}
      </button>
    </div>
  )
}

export default function GarageScreen({ garage, onChange, onBack, onPlay }) {
  const [viewId, setViewId] = useState(garage.car)
  const [flash, setFlash] = useState(null)
  const [thumbs, setThumbs] = useState(null)
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

  const primary = !owned ? (
    <button type="button" onClick={() => apply(buyCar(garage, car.id), `${car.name} sizniki!`)} disabled={short > 0}
      className="flex h-16 w-full items-center justify-center gap-2 rounded-[20px] bg-[#FFB224] text-lg font-black text-[#0B0B10] transition hover:brightness-105 disabled:cursor-not-allowed disabled:bg-white/[0.06] disabled:text-white/45 lg:h-[68px] lg:text-xl">
      <CoinIcon size={20} /> {short > 0 ? `${car.price} · yana ${short} kerak` : `Sotib olish · ${car.price}`}
    </button>
  ) : !selected ? (
    <button type="button" onClick={() => apply(selectCar(garage, car.id), `${car.name} tanlandi`)}
      className="flex h-16 w-full items-center justify-center gap-2 rounded-[20px] bg-white text-lg font-black text-[#0B0B10] transition hover:bg-white/90 lg:h-[68px] lg:text-xl">
      <Check size={21} /> Shu mashinani tanlash
    </button>
  ) : (
    <button type="button" onClick={onPlay}
      className="flex h-16 w-full items-center justify-center gap-2 rounded-[20px] bg-[#FFB224] text-lg font-black text-[#0B0B10] transition hover:brightness-105 lg:h-[68px] lg:text-xl">
      <Play size={21} className="fill-current" /> Shu mashinada o‘ynash
    </button>
  )

  return (
    <div className="min-h-screen bg-[#0B0B10] text-white">
      <div className="mx-auto flex w-full max-w-lg flex-col px-4 pb-[max(20px,env(safe-area-inset-bottom))] pt-[max(14px,env(safe-area-inset-top))] lg:max-w-[1440px] lg:px-8">
        <div className="mb-4 flex items-center gap-3">
          <button type="button" onClick={onBack} aria-label="Orqaga"
            className="flex h-11 w-11 items-center justify-center rounded-full border border-white/[0.08] bg-[#111118] text-white/80 transition hover:bg-white/[0.06]">
            <ChevronLeft size={21} />
          </button>
          <div className="min-w-0 flex-1">
            <p className={LABEL}>Voice Drive</p>
            <p className="truncate text-lg font-black lg:text-2xl">Garaj</p>
          </div>
          <CoinBadge value={garage.bank} />
        </div>

        <div className="lg:grid lg:grid-cols-12 lg:gap-6">
          <div className="lg:col-span-7">
            <div className="relative overflow-hidden rounded-[28px] border border-white/[0.08] bg-[radial-gradient(ellipse_at_50%_80%,#272732_0%,#14141b_52%,#0d0d12_100%)] lg:rounded-[32px]">
              <div className="relative flex items-start justify-between gap-3 px-5 pt-5 lg:px-9 lg:pt-8">
                <div className="min-w-0">
                  <p className="text-[32px] font-black leading-none tracking-tight lg:text-6xl">{car.name}</p>
                  <p className="mt-1.5 text-sm font-medium text-white/50 lg:text-lg">{car.uz}</p>
                </div>
                {selected && <span className="flex flex-shrink-0 items-center gap-1 rounded-full bg-emerald-400/10 px-3 py-1 text-[13px] font-bold text-emerald-300 lg:text-sm"><Check size={14} /> Tanlangan</span>}
                {!owned && <span className="flex flex-shrink-0 items-center gap-1 rounded-full bg-white/[0.07] px-3 py-1 text-[13px] font-bold text-white/65 lg:text-sm"><Lock size={13} /> Yopiq</span>}
              </div>
              <div className="relative">
                <CarStage carId={car.id} up={up} locked={!owned} owned={garage.owned} onThumbs={setThumbs} className="aspect-[16/10] w-full lg:aspect-[16/9]" />
                {!owned && (
                  <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
                    <span className="flex h-14 w-14 items-center justify-center rounded-full border border-white/[0.12] bg-black/50 backdrop-blur lg:h-16 lg:w-16"><Lock size={24} /></span>
                  </div>
                )}
                <p className="pointer-events-none absolute bottom-2 left-0 right-0 text-center text-[11px] font-semibold uppercase tracking-[0.2em] text-white/30">Suring — aylantiring</p>
              </div>
              <div className="relative px-5 pb-5 lg:px-9 lg:pb-8">
                <p className={`rounded-2xl px-3.5 py-2.5 text-[14px] font-semibold lg:text-base ${car.perk ? 'bg-[#FFB224]/[0.08] text-[#FFB224]' : 'bg-white/[0.05] text-white/60'}`}>
                  {car.perkUz}
                </p>
                <div className="mt-4 grid grid-cols-3 gap-4 lg:gap-6">
                  <StatBar label="Tezlik" value={bars.speed} />
                  <StatBar label="Kuch" value={bars.power} />
                  <StatBar label="Bonus" value={bars.bonus} />
                </div>
              </div>
              <AnimatePresence>
                {flash && (
                  <Motion.p key={flash.id} initial={{ opacity: 0, y: 8, scale: 0.95 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0 }}
                    onAnimationComplete={() => setTimeout(() => setFlash(f => (f?.id === flash.id ? null : f)), 1400)}
                    className="pointer-events-none absolute inset-x-0 top-1/3 mx-auto w-fit rounded-full bg-[#0B0B10]/85 px-5 py-2.5 text-lg font-black shadow-2xl ring-1 ring-emerald-400/40 backdrop-blur lg:text-2xl">
                    {flash.msg}
                  </Motion.p>
                )}
              </AnimatePresence>
            </div>
          </div>

          <div className="flex flex-col lg:col-span-5">
            <div className="order-2 mt-4 lg:order-1 lg:mt-0">
              {primary}
              <h2 className={`${LABEL} mb-2.5 mt-6`}>Kuchaytirish</h2>
              {owned ? (
                <div className={`${CARD} divide-y divide-white/[0.06]`}>
                  <UpgradeRow kind="engine" car={car} garage={garage} onUpgrade={(k) => apply(upgradeCar(garage, car.id, k), 'Dvigatel kuchaydi')} />
                  <UpgradeRow kind="turbo" car={car} garage={garage} onUpgrade={(k) => apply(upgradeCar(garage, car.id, k), 'Turbo kuchaydi')} />
                </div>
              ) : (
                <p className={`${CARD} p-4 text-sm font-medium text-white/50 lg:text-base`}>Avval mashinani oching — keyin dvigatel va turboni kuchaytirasiz.</p>
              )}
            </div>

            <div className="order-1 lg:order-2">
              <h2 className={`${LABEL} mb-2.5 mt-5 lg:mt-6`}>Mashinalar · birin-ketin kuchliroq</h2>
              <div className="-mx-4 flex snap-x gap-2 overflow-x-auto px-4 pb-1 lg:mx-0 lg:grid lg:grid-cols-3 lg:gap-2.5 lg:overflow-visible lg:px-0">
                {CARS.map((c, i) => {
                  const have = garage.owned.includes(c.id)
                  const on = c.id === car.id
                  return (
                    <button key={c.id} type="button" onClick={() => setViewId(c.id)} aria-pressed={on}
                      className={`relative w-36 flex-shrink-0 snap-start rounded-[20px] border p-2.5 text-left transition lg:w-auto ${on ? 'border-[#FFB224]/70 bg-[#FFB224]/[0.06]' : 'border-white/[0.08] bg-[#111118] hover:bg-[#17171F]'}`}>
                      <span className="absolute left-2.5 top-2 text-[10px] font-bold text-white/35">{i + 1}</span>
                      <div className="mt-2 flex aspect-[16/9] items-center justify-center">
                        {thumbs?.[c.id]
                          ? <img src={thumbs[c.id]} alt="" className="h-full w-full object-contain" draggable="false" />
                          : <CarSvg model={c.id} up={garage.up[c.id] || [1, 1]} locked={!have} className="w-full" />}
                      </div>
                      <p className="mt-1 truncate text-sm font-bold">{c.name}</p>
                      <p className="flex items-center gap-1 text-xs font-semibold">
                        {garage.car === c.id ? <span className="text-emerald-300">Tanlangan</span>
                          : have ? <span className="text-white/50">Sizniki</span>
                            : <span className={`flex items-center gap-1 ${garage.bank >= c.price ? 'text-[#FFB224]' : 'text-white/40'}`}><Lock size={11} />{c.price}</span>}
                      </p>
                    </button>
                  )
                })}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
