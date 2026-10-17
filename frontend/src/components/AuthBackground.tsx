interface Props {
  onBrand?: boolean
}

const CENTER_X = 400
const CENTER_Y = 230
const OUTER_R = 168

function polar(radius: number, angleDeg: number) {
  const rad = ((angleDeg - 90) * Math.PI) / 180
  return [CENTER_X + radius * Math.cos(rad), CENTER_Y + radius * Math.sin(rad)] as const
}

const MINOR_TICKS = Array.from({ length: 40 }, (_, i) => i * 9)
const MAJOR_TICKS = Array.from({ length: 8 }, (_, i) => i * 45)

const TRACES: [number, number][][] = [
  [[298, 96], [298, 44], [58, 44]],
  [[502, 96], [502, 26], [742, 26]],
  [[268, 352], [150, 352], [150, 432]],
  [[540, 358], [666, 358], [666, 432]],
]

export function AuthBackground({ onBrand = false }: Props) {
  return (
    <div className={`auth-bg ${onBrand ? 'auth-bg--on-brand' : ''}`} aria-hidden="true">
      <svg className="auth-bg-meter" viewBox="0 0 800 460" preserveAspectRatio="xMidYMid slice">
        {TRACES.map((points, i) => (
          <g key={i}>
            <polyline points={points.map((p) => p.join(',')).join(' ')} fill="none" stroke="currentColor" strokeWidth="1.5" />
            <circle cx={points[0][0]} cy={points[0][1]} r="3" fill="currentColor" />
            <circle cx={points[1][0]} cy={points[1][1]} r="2.5" fill="currentColor" />
            <circle cx={points[2][0]} cy={points[2][1]} r="3" fill="currentColor" />
          </g>
        ))}

        <circle cx={CENTER_X} cy={CENTER_Y} r={OUTER_R} fill="none" stroke="currentColor" strokeWidth="1.5" />
        <circle cx={CENTER_X} cy={CENTER_Y} r={OUTER_R - 38} fill="none" stroke="currentColor" strokeWidth="1" />

        {MINOR_TICKS.map((angle) => {
          const [x1, y1] = polar(OUTER_R, angle)
          const [x2, y2] = polar(OUTER_R + 9, angle)
          return <line key={angle} x1={x1} y1={y1} x2={x2} y2={y2} stroke="currentColor" strokeWidth="1" />
        })}
        {MAJOR_TICKS.map((angle) => {
          const [x1, y1] = polar(OUTER_R, angle)
          const [x2, y2] = polar(OUTER_R + 17, angle)
          return <line key={angle} x1={x1} y1={y1} x2={x2} y2={y2} stroke="currentColor" strokeWidth="1.75" />
        })}

        <g className="auth-bg-needle">
          <line x1={CENTER_X} y1={CENTER_Y} x2={CENTER_X - 88} y2={CENTER_Y - 66} stroke="currentColor" strokeWidth="2" />
          <circle cx={CENTER_X} cy={CENTER_Y} r="6" fill="currentColor" />
        </g>

        <rect x={CENTER_X - 30} y={CENTER_Y + 20} width="60" height="26" rx="3" fill="none" stroke="currentColor" strokeWidth="1.5" />
        <line x1={CENTER_X - 15} y1={CENTER_Y + 20} x2={CENTER_X - 15} y2={CENTER_Y + 46} stroke="currentColor" strokeWidth="1" />
        <line x1={CENTER_X} y1={CENTER_Y + 20} x2={CENTER_X} y2={CENTER_Y + 46} stroke="currentColor" strokeWidth="1" />
        <line x1={CENTER_X + 15} y1={CENTER_Y + 20} x2={CENTER_X + 15} y2={CENTER_Y + 46} stroke="currentColor" strokeWidth="1" />
      </svg>
    </div>
  )
}
