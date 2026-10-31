import { useEffect, useRef, useState } from 'react'

// Validated with the dataviz palette script against the white card surface.
export const CHART_BLUE = '#2a78d6'
export const CHART_ORANGE = '#eb6834'

const MARGIN = { top: 12, left: 30, bottom: 22 }
const LABEL_GAP = 13

function useWidth(paused) {
  const ref = useRef(null)
  const [width, setWidth] = useState(0)
  useEffect(() => {
    if (!ref.current) return undefined
    const observer = new ResizeObserver(([entry]) => setWidth(entry.contentRect.width))
    observer.observe(ref.current)
    return () => observer.disconnect()
  }, [paused])                         // the plot unmounts while the table is showing
  return [ref, width]
}

function niceMax(value, fractional) {
  if (value <= 0) return fractional ? 1 : 4
  if (!fractional && value <= 4) return 4
  const step = 10 ** Math.floor(Math.log10(value))
  const nice = [1, 2, 2.5, 5, 10].map((n) => n * step).find((n) => n >= value)
  return nice ?? value
}

/** End-of-line labels, pushed apart when two series finish close together. */
function endLabels(series, last, y) {
  const labels = series
    .map((s) => ({ ...s, value: last[s.key], y: y(last[s.key]) }))
    .sort((a, b) => a.y - b.y)
  for (let i = 1; i < labels.length; i += 1) {
    if (labels[i].y - labels[i - 1].y < LABEL_GAP) labels[i].y = labels[i - 1].y + LABEL_GAP
  }
  return labels
}

/**
 * Bars for one series, lines for two or more — one y-axis, same unit.
 * data:   [{ [xKey]: ..., [series.key]: number }]
 * series: [{ key, label, color }]
 */
export default function Chart({
  data, series, xKey, formatX, formatValue = (v) => v, fractional = false, kind = 'bar', height = 180, tickEvery,
}) {
  const [hover, setHover] = useState(null)
  const [asTable, setAsTable] = useState(false)
  const [ref, width] = useWidth(asTable)

  const isLine = kind === 'line'
  const multi = series.length > 1
  const marginRight = isLine ? 78 : 8
  const plotW = Math.max(0, width - MARGIN.left - marginRight)
  const plotH = height - MARGIN.top - MARGIN.bottom
  const top = niceMax(Math.max(0, ...data.flatMap((d) => series.map((s) => d[s.key]))), fractional)
  const slot = data.length ? plotW / data.length : 0

  const x = (i) => MARGIN.left + slot * i + slot / 2
  const y = (v) => MARGIN.top + plotH - (v / top) * plotH
  const every = tickEvery ?? Math.max(1, Math.ceil(data.length / 6))
  const barW = Math.max(2, Math.min(slot - 2, 22))
  const hovered = hover === null ? null : data[hover]

  return (
    <div>
      <div className="flex items-center justify-between gap-3 mb-2 min-h-[18px]">
        {multi ? (
          <ul className="flex flex-wrap gap-x-4 gap-y-1">
            {series.map((s) => (
              <li key={s.key} className="flex items-center gap-1.5 text-[11px] text-gray-500">
                <span className="w-3 h-0.5 rounded" style={{ background: s.color }} />
                {s.label}
              </li>
            ))}
          </ul>
        ) : <span />}
        <button
          type="button"
          onClick={() => setAsTable((v) => !v)}
          className="text-[11px] font-semibold text-gray-400 hover:text-sky-600 transition-colors"
        >
          {asTable ? 'Chart' : 'Table'}
        </button>
      </div>

      {asTable ? (
        <div className="overflow-auto" style={{ maxHeight: height }}>
          <table className="w-full text-xs">
            <thead>
              <tr className="text-left text-gray-400">
                <th className="py-1 pr-3 font-semibold">{' '}</th>
                {series.map((s) => <th key={s.key} className="py-1 pr-3 font-semibold text-right">{s.label}</th>)}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {data.map((d) => (
                <tr key={d[xKey]}>
                  <td className="py-1 pr-3 text-gray-500">{formatX(d[xKey])}</td>
                  {series.map((s) => <td key={s.key} className="py-1 pr-3 text-right font-semibold text-gray-700 tabular-nums">{formatValue(d[s.key])}</td>)}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div ref={ref} className="relative" style={{ height }} onMouseLeave={() => setHover(null)}>
          {width > 0 && (
            <svg width={width} height={height} role="img" aria-label={series.map((s) => s.label).join(', ')}>
              {[0, fractional ? top / 2 : Math.round(top / 2), top].map((tick) => (
                <g key={tick}>
                  <line x1={MARGIN.left} x2={MARGIN.left + plotW} y1={y(tick)} y2={y(tick)} stroke="#f1f1ef" />
                  <text x={MARGIN.left - 6} y={y(tick) + 3} textAnchor="end" fontSize="10" fill="#9ca3af">
                    {formatValue(tick)}
                  </text>
                </g>
              ))}

              {data.map((d, i) => (i % every === 0 ? (
                <text key={d[xKey]} x={x(i)} y={height - 6} textAnchor="middle" fontSize="10" fill="#9ca3af">
                  {formatX(d[xKey])}
                </text>
              ) : null))}

              {isLine && hovered && (
                <line x1={x(hover)} x2={x(hover)} y1={MARGIN.top} y2={MARGIN.top + plotH} stroke="#d1d5db" />
              )}

              {isLine ? series.map((s) => (
                <polyline
                  key={s.key}
                  points={data.map((d, i) => `${x(i)},${y(d[s.key])}`).join(' ')}
                  fill="none"
                  stroke={s.color}
                  strokeWidth="2"
                  strokeLinejoin="round"
                  strokeLinecap="round"
                />
              )) : data.map((d, i) => {
                const h = Math.max(d[series[0].key] > 0 ? 2 : 0, (d[series[0].key] / top) * plotH)
                const r = Math.min(4, barW / 2, h)
                const left = x(i) - barW / 2
                const base = MARGIN.top + plotH
                return (
                  <path
                    key={d[xKey]}
                    d={`M${left},${base} v${-(h - r)} q0,${-r} ${r},${-r} h${barW - 2 * r} q${r},0 ${r},${r} v${h - r} z`}
                    fill={series[0].color}
                    opacity={hover === null || hover === i ? 1 : 0.55}
                  />
                )
              })}

              {isLine && hovered && series.map((s) => (
                <circle key={s.key} cx={x(hover)} cy={y(hovered[s.key])} r="4" fill={s.color} stroke="#fff" strokeWidth="2" />
              ))}

              {isLine && data.length > 0 && endLabels(series, data[data.length - 1], y).map((l) => (
                <text key={l.key} x={MARGIN.left + plotW + 6} y={l.y + 3} fontSize="10" fill="#6b7280">
                  {l.label} {l.value}
                </text>
              ))}

              {data.map((d, i) => (
                <rect
                  key={d[xKey]}
                  x={MARGIN.left + slot * i}
                  y={0}
                  width={slot}
                  height={height}
                  fill="transparent"
                  onMouseEnter={() => setHover(i)}
                />
              ))}
            </svg>
          )}

          {hovered && (
            <div
              className="absolute z-10 pointer-events-none bg-white border border-gray-100 shadow-md rounded-lg px-3 py-2 text-xs whitespace-nowrap"
              style={{
                top: 0,
                left: Math.min(Math.max(0, x(hover) + 10), Math.max(0, width - 150)),
              }}
            >
              <p className="font-semibold text-gray-700 mb-0.5">{formatX(hovered[xKey])}</p>
              {series.map((s) => (
                <p key={s.key} className="flex items-center justify-between gap-4 text-gray-500">
                  <span className="flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full" style={{ background: s.color }} />
                    {s.label}
                  </span>
                  <span className="font-bold text-gray-800 tabular-nums">{formatValue(hovered[s.key])}</span>
                </p>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
