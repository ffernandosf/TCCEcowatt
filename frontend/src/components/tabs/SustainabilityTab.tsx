import { Fragment, useEffect, useState } from 'react'
import { getCarbon, getHeatmap, getStandby, type CarbonOut, type HeatmapCell, type StandbyOut } from '../../lib/api'
import { useI18n } from '../../lib/i18n'
import { useTheme } from '../../lib/theme'
import { LeafIcon, MoonIcon, ChartBarIcon } from '../icons'

interface Props {
  deviceId: string
}

const HOURS = Array.from({ length: 24 }, (_, h) => h)

function parseRgbVar(varName: string): [number, number, number] {
  const value = getComputedStyle(document.documentElement).getPropertyValue(varName).trim()
  const parts = value.split(',').map((n) => parseInt(n.trim(), 10))
  return [parts[0] ?? 238, parts[1] ?? 246, parts[2] ?? 242]
}

function heatColor(
  value: number,
  max: number,
  cold: [number, number, number],
  hot: [number, number, number],
): string {
  if (max <= 0) return `rgb(${cold.join(', ')})`
  const t = Math.min(value / max, 1)
  const r = Math.round(cold[0] + (hot[0] - cold[0]) * t)
  const g = Math.round(cold[1] + (hot[1] - cold[1]) * t)
  const b = Math.round(cold[2] + (hot[2] - cold[2]) * t)
  return `rgb(${r}, ${g}, ${b})`
}

function last30Days(): [Date, Date] {
  const to = new Date()
  const from = new Date(to.getTime() - 30 * 24 * 60 * 60 * 1000)
  return [from, to]
}

export function SustainabilityTab({ deviceId }: Props) {
  const { t } = useI18n()
  const { theme } = useTheme()
  const [heatmap, setHeatmap] = useState<HeatmapCell[]>([])
  const [standby, setStandby] = useState<StandbyOut | null>(null)
  const [carbon, setCarbon] = useState<CarbonOut | null>(null)
  const [error, setError] = useState('')
  const [heatAnchors, setHeatAnchors] = useState<{
    cold: [number, number, number]
    hot: [number, number, number]
  }>({ cold: [238, 246, 242], hot: [10, 95, 66] })

  useEffect(() => {
    setHeatAnchors({ cold: parseRgbVar('--heatmap-cold'), hot: parseRgbVar('--heatmap-hot') })
  }, [theme])

  useEffect(() => {
    const [from, to] = last30Days()
    setError('')
    Promise.all([getHeatmap(deviceId, from, to), getStandby(deviceId, from, to), getCarbon(deviceId, from, to)])
      .then(([h, s, c]) => {
        setHeatmap(h)
        setStandby(s)
        setCarbon(c)
      })
      .catch((err) => setError(err instanceof Error ? err.message : t.sustainability.loadError))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [deviceId])

  const cellByKey = new Map(heatmap.map((c) => [`${c.weekday}-${c.hour}`, c]))
  const maxPower = heatmap.reduce((max, c) => Math.max(max, c.avg_power), 0)
  const weekdayLabels = t.sustainability.weekdays

  return (
    <>
      {error && <p className="error-text">{error}</p>}

      <div className="card" style={{ maxWidth: 'none' }}>
        <p className="card-title">
          <ChartBarIcon width={15} height={15} />
          {t.sustainability.heatmapTitle}
        </p>
        <p className="card-subtitle">{t.sustainability.heatmapSubtitle}</p>

        {heatmap.length === 0 ? (
          <p className="waiting">{t.sustainability.notEnoughData}</p>
        ) : (
          <div className="heatmap">
            <div className="heatmap-grid">
              <div />
              {HOURS.map((h) => (
                <div key={h} className="heatmap-hour-label">
                  {h % 3 === 0 ? h : ''}
                </div>
              ))}
              {weekdayLabels.map((label, weekday) => (
                <Fragment key={weekday}>
                  <div className="heatmap-day-label">{label}</div>
                  {HOURS.map((hour) => {
                    const cell = cellByKey.get(`${weekday}-${hour}`)
                    const value = cell?.avg_power ?? 0
                    const cellDescription = cell
                      ? `${label} ${hour}h — ${value.toFixed(0)} W`
                      : `${label} ${hour}h — ${t.sustainability.notEnoughData}`
                    return (
                      <div
                        key={`${weekday}-${hour}`}
                        className="heatmap-cell"
                        style={{ background: heatColor(value, maxPower, heatAnchors.cold, heatAnchors.hot) }}
                        title={cellDescription}
                        role="img"
                        aria-label={cellDescription}
                      />
                    )
                  })}
                </Fragment>
              ))}
            </div>
          </div>
        )}
      </div>

      <div className="dashboard-columns">
        <div className="card" style={{ maxWidth: 'none' }}>
          <p className="card-title">
            <MoonIcon width={15} height={15} />
            {t.sustainability.standbyTitle}
          </p>
          <p className="card-subtitle">{t.sustainability.standbySubtitle}</p>
          {standby ? (
            <div className="metric-grid">
              <div className="metric-tile">
                <p className="label">{t.sustainability.standbyTime}</p>
                <p className="metric-tile-value">{standby.standby_hours.toFixed(1)} h</p>
              </div>
              <div className="metric-tile">
                <p className="label">{t.sustainability.wastedEnergy}</p>
                <p className="metric-tile-value">{(standby.standby_energy_wh / 1000).toFixed(2)} kWh</p>
              </div>
              <div className="metric-tile">
                <p className="label">{t.sustainability.estimatedCost}</p>
                <p className="metric-tile-value">R$ {standby.standby_cost_brl.toFixed(2)}</p>
              </div>
              <div className="metric-tile">
                <p className="label">{t.sustainability.episodes}</p>
                <p className="metric-tile-value">{standby.episodes}</p>
              </div>
            </div>
          ) : (
            !error && <p className="waiting">{t.common.loading}</p>
          )}
        </div>

        <div className="card" style={{ maxWidth: 'none' }}>
          <p className="card-title">
            <LeafIcon width={15} height={15} />
            {t.sustainability.carbonTitle}
          </p>
          <p className="card-subtitle">{t.sustainability.carbonSubtitle}</p>
          {carbon ? (
            <>
              <p className="hero-value">{carbon.carbon_kg.toFixed(1)} kg CO₂</p>
              <p className="label" style={{ marginTop: '0.6rem' }}>
                {t.sustainability.carbonEquivalent} {carbon.trees_equivalent.toFixed(2)}{' '}
                {t.sustainability.treesPerYear}
              </p>
            </>
          ) : (
            !error && <p className="waiting">{t.common.loading}</p>
          )}
        </div>
      </div>
    </>
  )
}
