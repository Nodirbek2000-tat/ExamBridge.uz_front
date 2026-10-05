/*
 * TOBY RUN — the shop (RUNNER_PLAN §B7, §B9.1 ShopScreen): outfits (the Toby's Day SVG wardrobe + a
 * do'ppi), carpets (swatches drawn by the 3D ornament code), power-up upgrades (5 levels each) and the
 * optional teen runners Lola and Bek. Cosmetics and upgrades only — no consumables that buy survival.
 * A purchase needs a second tap ("Tasdiqlash") so little fingers do not spend by accident.
 */
import { useEffect, useState } from 'react'
import { AnimatePresence, motion as Motion } from 'framer-motion'
import { Check, Lock } from 'lucide-react'
import { CARPETS } from '../../../games/three/ornaments'
import { AccIcon } from '../tobys-day/Wardrobe'
import { CARPET_PRICES, OUTFITS, RUNNER_LIST, UPGRADES, UPGRADE_PRICES, upgradeSeconds } from './content'
import { Coin, Doppi, KidArt, PowerBadge, RunnerLook, Swatch } from './art'
import { buy, saveProgress } from './progress'
import { ACCENT, CARD, LABEL, Screen, Tabs, TopBar } from './ui'

const TABS = [
  { id: 'outfit', label: 'Kiyimlar' },
  { id: 'carpet', label: 'Gilamlar' },
  { id: 'up', label: 'Kuchlar' },
  { id: 'runner', label: 'Qahramon' },
]

function PriceButton({ price, coins, owned, equipped, onBuy, onEquip, armed, onArm }) {
  if (equipped) {
    return (
      <span className="flex h-10 items-center justify-center gap-1.5 rounded-xl bg-emerald-400/15 text-[13px] font-black text-emerald-300">
        <Check size={15} strokeWidth={3} /> Tanlangan
      </span>
    )
  }
  if (owned) {
    return (
      <button type="button" onClick={onEquip} className="h-10 rounded-xl bg-white/[0.08] text-[13px] font-black text-white transition hover:bg-white/[0.13]">Tanlash</button>
    )
  }
  const short = coins < price
  if (short) {
    return (
      <span className="flex h-10 items-center justify-center gap-1.5 rounded-xl bg-white/[0.04] text-[13px] font-bold tabular-nums text-white/40">
        <Lock size={13} /> {price.toLocaleString('en-US')}
      </span>
    )
  }
  return (
    <button type="button" onClick={armed ? onBuy : onArm}
      className={`flex h-10 items-center justify-center gap-1.5 rounded-xl text-[13px] font-black tabular-nums transition ${armed ? 'text-[#0B0B10]' : 'bg-[#F5B14C]/15 text-[#F5B14C] hover:bg-[#F5B14C]/25'}`}
      style={armed ? { background: ACCENT } : undefined}>
      {armed ? 'Tasdiqlash' : <><Coin size={15} /> {price.toLocaleString('en-US')}</>}
    </button>
  )
}

function OutfitIcon({ id, size = 64 }) {
  if (id === 'doppi') {
    return (
      <svg viewBox="52 2 96 56" width={size * 1.15} height={size * 0.67} aria-hidden="true">
        <ellipse cx="100" cy="54" rx="44" ry="6" fill="#000" opacity=".3" />
        <path d="M58 52Q100 36 142 52L134 20Q100 6 66 20Z" fill="none" stroke="#F6EBD9" strokeOpacity=".6" strokeWidth="4" strokeLinejoin="round" />
        <Doppi />
      </svg>
    )
  }
  if (!id) {
    return (
      <svg viewBox="-24 -24 48 48" width={size * 0.8} height={size * 0.8} aria-hidden="true">
        <circle r="17" fill="none" stroke="rgba(255,255,255,0.25)" strokeWidth="3" strokeDasharray="5 5" />
      </svg>
    )
  }
  return <AccIcon acc={id} size={size} />
}

function ItemCard({ art, title, note, children, selected }) {
  return (
    <div className={`${CARD} flex min-w-0 flex-col gap-2.5 p-3 transition ${selected ? 'border-[#A98BFF]/50 bg-[#A98BFF]/[0.06]' : ''}`}>
      <div className="flex h-[84px] items-center justify-center rounded-[18px] bg-[radial-gradient(ellipse_at_50%_60%,#2a2440_0%,#17171F_75%)]">{art}</div>
      <div className="min-w-0 px-0.5">
        <p className="truncate text-[15px] font-black">{title}</p>
        {note && <p className="truncate text-[12px] font-semibold text-white/45">{note}</p>}
      </div>
      {children}
    </div>
  )
}

export default function ShopScreen({ progress, onProgress, onBack, onSfx }) {
  const [tab, setTab] = useState('outfit')
  const [armed, setArmed] = useState('')
  const [flash, setFlash] = useState('')
  const p = progress
  const coins = p.coins
  const owned = new Set(p.owned)

  useEffect(() => {
    if (!armed) return undefined
    const id = setTimeout(() => setArmed(''), 3500)
    return () => clearTimeout(id)
  }, [armed])
  useEffect(() => {
    if (!flash) return undefined
    const id = setTimeout(() => setFlash(''), 1600)
    return () => clearTimeout(id)
  }, [flash])

  const purchase = (key, price, patch, label) => {
    const next = buy(price, patch)
    setArmed('')
    if (!next) return
    onProgress(next)
    onSfx?.('power')
    setFlash(label)
  }
  const equip = (slot, id) => {
    onProgress(saveProgress({ equip: { ...p.equip, [slot]: id } }))
    onSfx?.('swoosh')
  }

  const runnerTitle = RUNNER_LIST.find(r => r.id === p.equip.runner)?.title || 'Toby'
  return (
    <Screen>
      <TopBar title="Do‘kon" coins={coins} onBack={onBack} />
      <div className="lg:grid lg:grid-cols-12 lg:gap-6">
        {/* the preview */}
        <div className="lg:col-span-5">
          <div className="relative overflow-hidden rounded-[28px] border border-white/[0.08] bg-[radial-gradient(ellipse_at_50%_20%,#2c2547_0%,#15141d_62%,#111118_100%)] px-5 pb-5 pt-5 lg:sticky lg:top-6 lg:pb-7">
            <p className={LABEL}>Sizning {runnerTitle}</p>
            <div className="relative mx-auto mt-2 flex h-[230px] w-full max-w-[300px] items-end justify-center lg:h-[340px]">
              <div className="absolute bottom-1 left-1/2 h-[54px] w-[170px] -translate-x-1/2 [perspective:300px] lg:h-[70px] lg:w-[220px]">
                <div className="h-full w-full overflow-hidden rounded-md shadow-[0_18px_30px_-12px_rgba(0,0,0,0.8)] [transform:rotateX(58deg)]">
                  <Swatch ornament={p.equip.carpet || 'carpet-klassik'} size={220} className="!h-full !w-full" />
                </div>
              </div>
              <Motion.div key={`${p.equip.runner}-${p.equip.outfit}`} initial={{ y: 10, opacity: 0.4 }} animate={{ y: 0, opacity: 1 }}
                className="relative z-10 mb-4 h-[200px] w-[170px] lg:mb-6 lg:h-[290px] lg:w-[250px]">
                <RunnerLook runner={p.equip.runner} outfit={p.equip.outfit} className="h-full w-full" cheer={!!flash} />
              </Motion.div>
            </div>
            <div className="mt-1 flex flex-wrap justify-center gap-1.5 text-[12px] font-bold text-white/60">
              <span className="rounded-full bg-white/[0.06] px-2.5 py-1">{OUTFITS.find(o => o.id === p.equip.outfit)?.title || 'Kiyimsiz'}</span>
              <span className="rounded-full bg-white/[0.06] px-2.5 py-1">{CARPETS.find(c => c.id === p.equip.carpet)?.title || 'Klassik'} gilam</span>
            </div>
            <AnimatePresence>
              {flash && (
                <Motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                  className="absolute inset-x-5 top-4 rounded-2xl bg-emerald-400/15 px-3 py-2 text-center text-[14px] font-black text-emerald-200 backdrop-blur">
                  {flash} — sizniki!
                </Motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>

        <div className="mt-5 lg:col-span-7 lg:mt-0">
          <Tabs tabs={TABS} value={tab} onChange={(t) => { setTab(t); setArmed('') }} />

          {tab === 'outfit' && (
            <div className="mt-4 grid grid-cols-2 gap-2.5 sm:grid-cols-3 lg:grid-cols-4">
              <ItemCard art={<OutfitIcon id="" />} title="Kiyimsiz" note="Oddiy" selected={!p.equip.outfit}>
                <PriceButton price={0} coins={coins} owned equipped={!p.equip.outfit} onEquip={() => equip('outfit', '')} />
              </ItemCard>
              {OUTFITS.map(o => (
                <ItemCard key={o.id} art={<OutfitIcon id={o.id} />} title={o.title} note={owned.has(o.id) ? 'Sizda bor' : `${o.price.toLocaleString('en-US')} tanga`} selected={p.equip.outfit === o.id}>
                  <PriceButton price={o.price} coins={coins} owned={owned.has(o.id)} equipped={p.equip.outfit === o.id}
                    armed={armed === o.id} onArm={() => setArmed(o.id)} onEquip={() => equip('outfit', o.id)}
                    onBuy={() => purchase(o.id, o.price, (q) => ({ owned: [...q.owned, o.id], equip: { ...q.equip, outfit: o.id } }), o.title)} />
                </ItemCard>
              ))}
            </div>
          )}

          {tab === 'carpet' && (
            <div className="mt-4 grid grid-cols-2 gap-2.5 sm:grid-cols-3">
              {CARPETS.map(c => {
                const price = CARPET_PRICES[c.id] || 0
                const has = price === 0 || owned.has(c.id)
                return (
                  <ItemCard key={c.id} selected={p.equip.carpet === c.id}
                    art={<Swatch ornament={c.key} size={68} className="rounded-lg shadow-[0_10px_24px_-10px_rgba(0,0,0,0.9)]" />}
                    title={c.title} note={has ? 'Sizda bor' : `${price.toLocaleString('en-US')} tanga`}>
                    <PriceButton price={price} coins={coins} owned={has} equipped={p.equip.carpet === c.id}
                      armed={armed === c.id} onArm={() => setArmed(c.id)} onEquip={() => equip('carpet', c.id)}
                      onBuy={() => purchase(c.id, price, (q) => ({ owned: [...q.owned, c.id], equip: { ...q.equip, carpet: c.id } }), `${c.title} gilam`)} />
                  </ItemCard>
                )
              })}
            </div>
          )}

          {tab === 'up' && (
            <div className="mt-4 space-y-2.5">
              {UPGRADES.map(u => {
                const lvl = p.up[u.id] || 0
                const max = lvl >= 5
                const price = UPGRADE_PRICES[Math.min(4, lvl)]
                return (
                  <div key={u.id} className={`${CARD} flex items-center gap-3 p-3.5 lg:p-4`}>
                    <PowerBadge kind={u.id} size={52} className="flex-shrink-0" />
                    <div className="min-w-0 flex-1">
                      <p className="text-[16px] font-black">{u.title}</p>
                      <p className="text-[13px] font-semibold text-white/50">{u.note} · {upgradeSeconds(u, lvl)} s{!max && <span className="text-emerald-300"> → {upgradeSeconds(u, lvl + 1)} s</span>}</p>
                      <div className="mt-2 flex gap-1" aria-label={`${lvl} / 5`}>
                        {[0, 1, 2, 3, 4].map(i => <span key={i} className={`h-1.5 flex-1 rounded-full ${i < lvl ? 'bg-[#A98BFF]' : 'bg-white/[0.1]'}`} />)}
                      </div>
                    </div>
                    <div className="w-[118px] flex-shrink-0">
                      {max ? <span className="flex h-10 items-center justify-center rounded-xl bg-emerald-400/15 text-[13px] font-black text-emerald-300">Eng yuqori</span> : (
                        <PriceButton price={price} coins={coins} armed={armed === u.id} onArm={() => setArmed(u.id)}
                          onBuy={() => purchase(u.id, price, (q) => ({ up: { ...q.up, [u.id]: Math.min(5, (q.up[u.id] || 0) + 1) } }), `${u.title} ${lvl + 1}-daraja`)} />
                      )}
                    </div>
                  </div>
                )
              })}
              <p className="px-1 text-[13px] font-medium text-white/40">Kuchlar faqat yo‘lda topilganda ishlaydi. Reytingdagi ball serverda hisoblanadi — uni sotib bo‘lmaydi.</p>
            </div>
          )}

          {tab === 'runner' && (
            <div className="mt-4 grid grid-cols-2 gap-2.5 sm:grid-cols-3">
              {RUNNER_LIST.map(r => {
                const has = r.price === 0 || owned.has(r.id)
                return (
                  <ItemCard key={r.id} selected={p.equip.runner === r.id} title={r.title} note={r.note}
                    art={r.id === 'toby' ? <RunnerLook runner="toby" className="h-[80px] w-[70px]" /> : <KidArt who={r.id} className="h-[80px] w-[70px]" />}>
                    <PriceButton price={r.price} coins={coins} owned={has} equipped={p.equip.runner === r.id}
                      armed={armed === r.id} onArm={() => setArmed(r.id)} onEquip={() => equip('runner', r.id)}
                      onBuy={() => purchase(r.id, r.price, (q) => ({ owned: [...q.owned, r.id], equip: { ...q.equip, runner: r.id } }), r.title)} />
                  </ItemCard>
                )
              })}
            </div>
          )}
        </div>
      </div>
    </Screen>
  )
}
