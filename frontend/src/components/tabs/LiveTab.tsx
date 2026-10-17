import { useEffect, useState } from 'react'
import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { useLiveReading } from '../../hooks/useLiveReading'
import {
  ApiError,
  getDashboard,
  getNotifications,
  getReadings,
  type DashboardSummary,
  type NotificationOut,
  type ReadingOut,
} from '../../lib/api'
import { useI18n } from '../../lib/i18n'
import { ClaimDeviceCard } from '../ClaimDeviceCard'
import { PowerGauge } from '../PowerGauge'
import {
  AlertTriangleIcon,
  BellIcon,
  ClockIcon,
  CurrentIcon,
  GaugeIcon,
  PlugIcon,
  ReceiptIcon,
  TargetIcon,
  TrendUpIcon,
} from '../icons'

interface Props {
  deviceId: string
}

function startOfToday(): Date {
  const now = new Date()
  return new Date(now.getFullYear(), now.getMonth(), now.getDate())
}

const NOTIF_ICON: Record<NotificationOut['type'], typeof PlugIcon> = {
  offline: PlugIcon,
  limit: TargetIcon,
  spike: AlertTriangleIcon,
}

const tooltipStyle = {
  background: 'var(--color-surface)',
  border: '1px solid var(--color-border)',
  borderRadius: 8,
  color: 'var(--color-text)',
  fontSize: 12,
}

export function LiveTab({ deviceId }: Props) {
  const { t, language } = useI18n()
  const reading = useLiveReading(deviceId)
  const [summary, setSummary] = useState<DashboardSummary | null>(null)
  const [recentReadings, setRecentReadings] = useState<ReadingOut[]>([])
  const [notifications, setNotifications] = useState<NotificationOut[]>([])
  const [notClaimed, setNotClaimed] = useState(false)
  const [error, setError] = useState('')

  const locale = language === 'pt' ? 'pt-BR' : 'en-US'

  async function loadAll() {
    setError('')
    try {
      const [summaryResult, readingsResult, notifResult] = await Promise.all([
        getDashboard(deviceId, startOfToday(), new Date(), 'hour'),
        getReadings(deviceId, new Date(Date.now() - 24 * 60 * 60 * 1000), new Date()),
        getNotifications(deviceId),
      ])
      setSummary(summaryResult)
      setRecentReadings(readingsResult)
      setNotifications(notifResult)
      setNotClaimed(false)
    } catch (err) {
      if (err instanceof ApiError && err.status === 404) {
        setNotClaimed(true)
      } else {
        setError(err instanceof Error ? err.message : t.live.loadError)
      }
    }
  }

  useEffect(() => {
    loadAll()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [deviceId])

  if (notClaimed) {
    return <ClaimDeviceCard deviceId={deviceId} onClaimed={loadAll} />
  }

  const chartData = recentReadings.map((r) => ({
    time: new Date(r.timestamp).toLocaleTimeString(locale, { hour: '2-digit', minute: '2-digit' }),
    power: r.power,
  }))

  return (
    <>
      <div className="status-pill live-status" style={{ marginBottom: '1.15rem' }}>
        <span className={`status-dot ${reading ? 'status-dot--good' : 'status-dot--muted'}`} />
        {reading ? `${deviceId} ${t.live.statusOnline}` : `${t.live.statusWaiting} ${deviceId}`}
        {reading && (
          <>
            <ClockIcon width={13} height={13} style={{ marginLeft: '0.4rem' }} />
            {new Date(reading.timestamp).toLocaleTimeString(locale)}
          </>
        )}
      </div>

      <div className="live-hero">
        <div className="gauge-card">
          <PowerGauge watts={reading ? reading.power : null} label={t.live.powerNow} waitingLabel="—" />
        </div>

        <div className="stat-row">
          <div className="stat-card">
            <div className="stat-card-top">
              <span className="label">{t.live.energyToday}</span>
              <span className="stat-card-icon">
                <ReceiptIcon width={15} height={15} />
              </span>
            </div>
            <p className="stat-card-value">
              {summary ? `${(summary.total_energy_wh / 1000).toFixed(2)} kWh` : '—'}
            </p>
          </div>

          <div className="stat-card">
            <div className="stat-card-top">
              <span className="label">{t.live.costToday}</span>
              <span className="stat-card-icon">
                <TargetIcon width={15} height={15} />
              </span>
            </div>
            <p className="stat-card-value">{summary ? `R$ ${summary.total_cost_brl.toFixed(2)}` : '—'}</p>
          </div>

          <div className="stat-card">
            <div className="stat-card-top">
              <span className="label">{t.live.voltage}</span>
              <span className="stat-card-icon">
                <GaugeIcon width={15} height={15} />
              </span>
            </div>
            <p className="stat-card-value">
              {reading?.voltage != null ? `${reading.voltage.toFixed(0)} V` : '—'}
            </p>
          </div>

          <div className="stat-card">
            <div className="stat-card-top">
              <span className="label">{t.live.current}</span>
              <span className="stat-card-icon">
                <CurrentIcon width={15} height={15} />
              </span>
            </div>
            <p className="stat-card-value">
              {reading?.current != null ? `${reading.current.toFixed(2)} A` : '—'}
            </p>
          </div>
        </div>
      </div>

      {error && <p className="error-text">{error}</p>}

      <div className="dashboard-columns">
        <div className="card">
          <p className="card-title">
            <TrendUpIcon width={15} height={15} />
            {t.live.powerTrend}
          </p>
          {chartData.length > 0 ? (
            <ResponsiveContainer width="100%" height={230}>
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--chart-grid)" />
                <XAxis dataKey="time" tick={{ fontSize: 10, fill: 'var(--chart-axis)' }} />
                <YAxis tick={{ fontSize: 10, fill: 'var(--chart-axis)' }} unit="W" />
                <Tooltip contentStyle={tooltipStyle} />
                <Line
                  type="monotone"
                  dataKey="power"
                  stroke="var(--chart-series-1)"
                  strokeWidth={2}
                  dot={false}
                />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <p className="waiting">{t.live.noReadings24h}</p>
          )}
        </div>

        <div className="card">
          <p className="card-title">
            <BellIcon width={15} height={15} />
            {t.live.recentActivity}
          </p>
          {notifications.length === 0 ? (
            <p className="waiting">{t.live.noRecentNotifications}</p>
          ) : (
            notifications.slice(0, 4).map((n) => {
              const Icon = NOTIF_ICON[n.type] ?? BellIcon
              return (
                <div key={n.id} className="mini-notif">
                  <span className="mini-notif-icon">
                    <Icon width={13} height={13} />
                  </span>
                  <div>
                    <p className="mini-notif-text">{n.message}</p>
                    <p className="mini-notif-time">{new Date(n.created_at).toLocaleString(locale)}</p>
                  </div>
                </div>
              )
            })
          )}
        </div>
      </div>
    </>
  )
}
