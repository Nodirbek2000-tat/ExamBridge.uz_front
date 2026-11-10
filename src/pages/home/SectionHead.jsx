import Lines from './Lines'

/** Eyebrow + line-revealed h2 + optional lead. Motion comes from useScrollMotion. */
export default function SectionHead({ id, eyebrow, lines, lead, className = '' }) {
  return (
    <div className={className}>
      <p className="eb-eyebrow" data-reveal>{eyebrow}</p>
      <h2 id={id} className="eb-h2 mt-5" data-lines>
        <Lines lines={lines} />
      </h2>
      {lead && <p className="eb-lead mt-6 max-w-[460px]" data-reveal>{lead}</p>}
    </div>
  )
}
