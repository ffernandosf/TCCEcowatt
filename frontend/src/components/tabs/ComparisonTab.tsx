import { useEffect, useState } from 'react'
import {
  Bar,
  CartesianGrid,
  ComposedChart,
  Legend,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { downloadReport, getDashboard, type DashboardSummary } from '../../lib/api'
import { useI18n } from '../../lib/i18n'
import { DownloadIcon, TrendUpIcon } from '../icons'

interface Props {
  deviceId: string
}

const PERIODS = [7, 30, 90] as const
type PeriodDays = (typeof PERIODS)[number]

function periodRange(days: number): [Date, Date] {
  const to = new Date()
  const from = new Date(to.getTime() - days * 24 * 60 * 60 * 1000)
  return [from, to]
}

const tooltipStyle = {
  background: 'var(--color-surface)',
  border: '1px solid var(--color-border)',
  borderRadius: 8,
  color: 'var(--color-text)',
  fontSize: 12,
}

export function ComparisonTab({ deviceId }: Props) {
  const { t, language } = useI18n()
  const [days, setDays] = useState<PeriodDays>(30)
  const [summary, setSummary] = useState<DashboardSummary | null>(null)
  const [error, setError] = useState('')
  const [downloading, setDownloading] = useState(false)

  const locale = language === 'pt' ? 'pt-BR' : 'en-US'

  useEffect(() => {
    setError('')
    const [from, to] = periodRange(days)
    getDashboard(deviceId, from, to, 'day')
      .then(setSummary)
      .catch((err) => setError(err instanceof Error ? err.message : t.comparison.loadError))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [deviceId, days])

  async function handleDownload() {
    setDownloading(true)
    setError('')
    try {
      const [from, to] = periodRange(days)
      await downloadReport(deviceId, from, to)
    } catch (err) {
      setError(err instanceof Error ? err.message : t.comparison.reportError)
    } finally {
      setDownloading(false)
    }
  }

  const rollups = summary?.rollups ?? []
  const chartData = rollups.map((r) => ({
    date: new Date(r.period_start).toLocaleDateString(locale, { day: '2-digit', month: '2-digit' }),
    energy: r.energy_wh / 1000,
    cost: r.cost_brl,
  }))
  const dailyAvgEnergy = rollups.length > 0 ? (summary!.total_energy_wh / 1000) / rollups.length : 0
  const dailyAvgCost = rollups.length > 0 ? summary!.total_cost_brl / rollups.length : 0

  return (
    <div className="card" style={{ maxWidth: 'none' }}>
      <p className="card-title">
        <TrendUpIcon width={15} height={15} />
        {t.comparison.title}
      </p>
      <p className="card-subtitle">{t.comparison.subtitle}</p>

      <div className="pill-toggle">
        {PERIODS.map((p) => (
          <button key={p} className={`pill ${days === p ? 'is-active' : ''}`} onClick={() => setDays(p)}>
            {t.comparison.periods[p]}
          </button>
        ))}
      </div>

      {error && <p className="error-text">{error}</p>}

      {summary && (
        <div className="stat-row">
          <div className="stat-card">
            <div className="stat-card-top">
              <span className="label">{t.comparison.totalEnergy}</span>
            </div>
            <p className="stat-card-value">{(summary.total_energy_wh / 1000).toFixed(2)} kWh</p>
          </div>
          <div className="stat-card">
            <div className="stat-card-top">
              <span className="label">{t.comparison.totalCost}</span>
            </div>
            <p className="stat-card-value">R$ {summary.total_cost_brl.toFixed(2)}</p>
          </div>
          <div className="stat-card">
            <div className="stat-card-top">
              <span className="label">{t.comparison.dailyAverage}</span>
            </div>
            <p className="stat-card-value">{dailyAvgEnergy.toFixed(2)} kWh</p>
            <p className="label">R$ {dailyAvgCost.toFixed(2)}</p>
          </div>
        </div>
      )}

      {chartData.length > 0 ? (
        <ResponsiveContainer width="100%" height={300}>
          <ComposedChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--chart-grid)" />
            <XAxis dataKey="date" tick={{ fontSize: 11, fill: 'var(--chart-axis)' }} />
            <YAxis
              yAxisId="energy"
              tick={{ fontSize: 11, fill: 'var(--chart-axis)' }}
              unit="kWh"
              width={64}
            />
            <YAxis
              yAxisId="cost"
              orientation="right"
              tick={{ fontSize: 11, fill: 'var(--chart-axis)' }}
              unit="R$"
              width={56}
            />
            <Tooltip contentStyle={tooltipStyle} formatter={(v: number) => v.toFixed(2)} />
            <Legend />
            <Bar
              yAxisId="energy"
              dataKey="energy"
              name={t.comparison.energyLabel}
              fill="var(--chart-series-1)"
              radius={[3, 3, 0, 0]}
            />
            <Line
              yAxisId="cost"
              type="monotone"
              dataKey="cost"
              name={t.comparison.costLabel}
              stroke="var(--chart-series-3)"
              strokeWidth={2}
              dot={false}
            />
          </ComposedChart>
        </ResponsiveContainer>
      ) : (
        !error && <p className="waiting">{t.comparison.noData}</p>
      )}

      <button
        className="btn btn-primary"
        style={{ marginTop: '1.5rem' }}
        onClick={handleDownload}
        disabled={downloading}
      >
        <DownloadIcon width={16} height={16} />
        {downloading ? t.comparison.generatingPdf : t.comparison.downloadReport}
      </button>
    </div>
  )
}
