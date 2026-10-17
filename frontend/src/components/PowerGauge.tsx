interface Props {
  watts: number | null
  label: string
  waitingLabel: string
}

const CX = 110
const CY = 118
const R = 92
const TRACK_WIDTH = 10

function pointAt(fraction: number, radius: number) {
  const theta = ((180 - fraction * 180) * Math.PI) / 180
  return [CX + radius * Math.cos(theta), CY - radius * Math.sin(theta)] as const
}

function arcPath(fromFraction: number, toFraction: number, radius: number) {
  const [x1, y1] = pointAt(fromFraction, radius)
  const [x2, y2] = pointAt(toFraction, radius)
  return `M ${x1} ${y1} A ${radius} ${radius} 0 0 1 ${x2} ${y2}`
}

function scaleMax(watts: number) {
  if (!watts || watts <= 0) return 2000
  const target = watts * 1.35
  const step = target > 4000 ? 1000 : 500
  return Math.max(step * 2, Math.ceil(target / step) * step)
}

const ZONES: [number, number, string][] = [
  [0, 0.6, 'var(--color-good)'],
  [0.6, 0.85, 'var(--color-warning)'],
  [0.85, 1, 'var(--color-critical)'],
]

export function PowerGauge({ watts, label, waitingLabel }: Props) {
  const max = scaleMax(watts ?? 0)
  const fraction = watts != null ? Math.min(1, Math.max(0, watts / max)) : 0
  const ticks = Array.from({ length: 9 }, (_, i) => i / 8)
  const needleTip = pointAt(fraction, R - TRACK_WIDTH - 6)

  return (
    <div className="power-gauge">
      <svg className="power-gauge-svg" viewBox="0 0 220 132">
        <path
          d={arcPath(0, 1, R)}
          fill="none"
          stroke="var(--color-border)"
          strokeWidth={TRACK_WIDTH}
          strokeLinecap="round"
        />
        {ZONES.map(([from, to, color]) => (
          <path
            key={color}
            d={arcPath(from, to, R)}
            fill="none"
            stroke={color}
            strokeWidth={TRACK_WIDTH}
            opacity={0.32}
          />
        ))}
        {ticks.map((t) => {
          const [x1, y1] = pointAt(t, R - TRACK_WIDTH - 2)
          const [x2, y2] = pointAt(t, R - TRACK_WIDTH - 10)
          return <line key={t} x1={x1} y1={y1} x2={x2} y2={y2} stroke="var(--color-text-muted)" strokeWidth={1.25} />
        })}
        <line
          className="power-gauge-needle"
          x1={CX}
          y1={CY}
          x2={needleTip[0]}
          y2={needleTip[1]}
          stroke="var(--color-accent)"
          strokeWidth={2.5}
          strokeLinecap="round"
        />
        {watts != null && <circle className="power-gauge-pulse" cx={CX} cy={CY} r={5} fill="var(--color-accent)" />}
        <circle cx={CX} cy={CY} r={5} fill="var(--color-accent)" />
      </svg>
      <div className="power-gauge-readout">
        {watts != null ? (
          <>
            <span className="power-gauge-value">{watts.toFixed(0)}</span>
            <span className="power-gauge-unit">W</span>
          </>
        ) : (
          <span className="power-gauge-waiting">{waitingLabel}</span>
        )}
      </div>
      <p className="power-gauge-label">{label}</p>
    </div>
  )
}
