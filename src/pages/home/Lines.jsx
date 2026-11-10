/**
 * Splits a headline into masked lines. Each line's inner span is what slides
 * up — by CSS in the hero (.eb-hero-in) and by GSAP further down the page.
 * Screen readers get the sentence once, without the line breaks.
 */
export default function Lines({ lines, start = 0, accentFrom = -1 }) {
  return (
    <>
      <span className="sr-only">{lines.join(' ')}</span>
      <span aria-hidden="true">
        {lines.map((line, i) => (
          <span key={i} className="eb-line">
            <span className={`eb-line-in${i >= accentFrom && accentFrom >= 0 ? ' eb-accent' : ''}`} style={{ '--i': start + i }}>
              {line}
            </span>
          </span>
        ))}
      </span>
    </>
  )
}
