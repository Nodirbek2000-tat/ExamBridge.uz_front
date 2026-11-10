import { MARQUEE_ITEMS } from './data'

function Group({ hidden = false }) {
  return (
    <ul className="flex shrink-0 items-center gap-12 pr-12" aria-hidden={hidden || undefined}>
      {MARQUEE_ITEMS.map((item) => (
        <li key={item.text} className="flex items-center gap-2.5 whitespace-nowrap text-[14px] text-(--subtle)">
          <item.icon aria-hidden="true" className="h-4 w-4 text-(--subtle)" strokeWidth={1.75} />
          {item.text}
        </li>
      ))}
    </ul>
  )
}

/** Quiet feature strip. Pure CSS loop; pauses on hover; static under reduced motion. */
export default function Marquee() {
  return (
    <section aria-label="Highlights" className="border-y border-(--line)">
      <div className="eb-marquee overflow-hidden py-6">
        <div className="eb-marquee-track">
          <Group />
          <Group hidden />
        </div>
      </div>
    </section>
  )
}
