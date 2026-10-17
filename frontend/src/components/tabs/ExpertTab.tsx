import { useEffect, useState } from 'react'
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { useLiveReading } from '../../hooks/useLiveReading'
import { ApiError, getReadings, type ReadingOut } from '../../lib/api'
import { useI18n } from '../../lib/i18n'
import { ClaimDeviceCard } from '../ClaimDeviceCard'
import { ChartBarIcon, GaugeIcon } from '../icons'

interface Props {
  deviceId: string
}

type MetricKey = 'power' | 'voltage' | 'current' | 'frequency' | 'power_factor' | 'energy'

const tooltipStyle = {
  background: 'var(--color-surface)',
  border: '1px solid var(--color-border)',
  borderRadius: 8,
  color: 'var(--color-text)',
  fontSize: 12,
}

export function ExpertTab({ deviceId }: Props) {
  const { t, language } = useI18n()
  const reading = useLiveReading(deviceId)
  const [readings, setReadings] = useState<ReadingOut[]>([])
  const [notClaimed, setNotClaimed] = useState(false)
  const [error, setError] = useState('')

  const locale = language === 'pt' ? 'pt-BR' : 'en-US'

  const METRICS: {
    key: MetricKey
    label: string
    unit: string
    color: string
    decimals: number
  }[] = [
    { key: 'power', label: t.expert.power, unit: 'W', color: 'var(--chart-series-1)', decimals: 0 },
    { key: 'voltage', label: t.expert.voltage, unit: 'V', color: 'var(--chart-series-2)', decimals: 1 },
    { key: 'current', label: t.expert.current, unit: 'A', color: 'var(--chart-series-3)', decimals: 2 },
    { key: 'frequency', label: t.expert.frequency, unit: 'Hz', color: 'var(--chart-series-4)', decimals: 2 },
    { key: 'power_factor', label: t.expert.powerFactor, unit: '', color: 'var(--chart-series-5)', decimals: 3 },
    { key: 'energy', label: t.expert.energyMeter, unit: 'Wh', color: 'var(--chart-series-6)', decimals: 1 },
  ]

  function formatTime(iso: string): string {
    return new Date(iso).toLocaleTimeString(locale, { hour: '2-digit', minute: '2-digit' })
  }

  async function loadReadings() {
    setError('')
    try {
      const to = new Date()
      const from = new Date(to.getTime() - 24 * 60 * 60 * 1000)
      const result = await getReadings(deviceId, from, to)
      setReadings(result)
      setNotClaimed(false)
    } catch (err) {
      if (err instanceof ApiError && err.status === 404) {
        setNotClaimed(true)
      } else {
        setError(err instanceof Error ? err.message : t.expert.loadError)
      }
    }
  }

  useEffect(() => {
    loadReadings()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [deviceId])

  return (
    <div className="chart-grid">
      <div className="card chart-card chart-grid-full">
        <p className="card-title">
          <GaugeIcon width={15} height={15} />
          {t.expert.instantReading}
        </p>
        <p className="card-subtitle">{deviceId}</p>
        {reading ? (
          <div className="metric-grid">
            <div className="metric-tile">
              <p className="label">{t.expert.power}</p>
              <p className="metric-tile-value">{reading.power.toFixed(2)} W</p>
            </div>
            <div className="metric-tile">
              <p className="label">{t.expert.voltage}</p>
              <p className="metric-tile-value">{reading.voltage?.toFixed(2) ?? '—'} V</p>
            </div>
            <div className="metric-tile">
              <p className="label">{t.expert.current}</p>
              <p className="metric-tile-value">{reading.current?.toFixed(3) ?? '—'} A</p>
            </div>
            <div className="metric-tile">
              <p className="label">{t.expert.frequency}</p>
              <p className="metric-tile-value">{reading.frequency?.toFixed(1) ?? '—'} Hz</p>
            </div>
            <div className="metric-tile">
              <p className="label">{t.expert.powerFactor}</p>
              <p className="metric-tile-value">{reading.power_factor?.toFixed(3) ?? '—'}</p>
            </div>
            <div className="metric-tile">
              <p className="label">{t.expert.energyMeter}</p>
              <p className="metric-tile-value">{reading.energy?.toFixed(1) ?? '—'} Wh</p>
            </div>
          </div>
        ) : (
          <p className="waiting">{t.expert.waitingReading}</p>
        )}
      </div>

      {notClaimed && (
        <div className="chart-grid-full">
          <ClaimDeviceCard deviceId={deviceId} onClaimed={loadReadings} />
        </div>
      )}

      {!notClaimed && (
        <>
          {error && <p className="error-text chart-grid-full">{error}</p>}

          {readings.length === 0 && !error && (
            <div className="card chart-grid-full">
              <p className="waiting">{t.expert.noReadings24h}</p>
            </div>
          )}

          {readings.length > 0 &&
            METRICS.map((metric) => {
              const points = readings
                .filter((r) => r[metric.key] != null)
                .map((r) => ({ time: formatTime(r.timestamp), value: r[metric.key] as number }))

              return (
                <div className="card chart-card" key={metric.key}>
                  <p className="card-title">
                    <ChartBarIcon width={14} height={14} />
                    {metric.label} {t.expert.last24h}
                  </p>
                  {points.length > 0 ? (
                    <ResponsiveContainer width="100%" height={200}>
                      <LineChart data={points}>
                        <CartesianGrid strokeDasharray="3 3" stroke="var(--chart-grid)" />
                        <XAxis dataKey="time" tick={{ fontSize: 10, fill: 'var(--chart-axis)' }} />
                        <YAxis
                          tick={{ fontSize: 10, fill: 'var(--chart-axis)' }}
                          unit={metric.unit}
                          domain={['auto', 'auto']}
                          tickFormatter={(v: number) => v.toFixed(metric.decimals)}
                        />
                        <Tooltip contentStyle={tooltipStyle} formatter={(v: number) => v.toFixed(metric.decimals)} />
                        <Line
                          type="monotone"
                          dataKey="value"
                          stroke={metric.color}
                          strokeWidth={2}
                          dot={false}
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  ) : (
                    <p className="waiting">
                      {t.expert.doesNotReport} {metric.label.toLowerCase()}.
                    </p>
                  )}
                </div>
              )
            })}
        </>
      )}
    </div>
  )
}
