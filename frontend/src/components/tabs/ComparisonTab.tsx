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

// Datas dos campos no formato do <input type="date"> (YYYY-MM-DD, hora local).
function toDateInput(date: Date): string {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

function parseDateInput(value: string): Date {
  const [y, m, d] = value.split('-').map(Number)
  return new Date(y, m - 1, d)
}

function presetStart(days: number): string {
  const start = new Date()
  start.setDate(start.getDate() - (days - 1))
  return toDateInput(start)
}

// Do início do dia "de" até o fim do dia "até" (ou agora, se for hoje).
function periodRange(fromInput: string, toInput: string): [Date, Date] {
  const from = parseDateInput(fromInput)
  const end = parseDateInput(toInput)
  end.setDate(end.getDate() + 1)
  const now = new Date()
  return [from, end > now ? now : end]
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
  const today = toDateInput(new Date())
  const [fromInput, setFromInput] = useState(() => presetStart(30))
  const [toInput, setToInput] = useState(today)
  const [summary, setSummary] = useState<DashboardSummary | null>(null)
  const [error, setError] = useState('')
  const [downloading, setDownloading] = useState(false)

  const locale = language === 'pt' ? 'pt-BR' : 'en-US'

  const rangeValid = fromInput !== '' && toInput !== '' && fromInput <= toInput && toInput <= today

  useEffect(() => {
    if (!rangeValid) return
    setError('')
    const [from, to] = periodRange(fromInput, toInput)
    getDashboard(deviceId, from, to, 'day')
      .then(setSummary)
      .catch((err) => setError(err instanceof Error ? err.message : t.comparison.loadError))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [deviceId, fromInput, toInput, rangeValid])

  function selectPreset(days: number) {
    setFromInput(presetStart(days))
    setToInput(today)
  }

  async function handleDownload() {
    setDownloading(true)
    setError('')
    try {
      const [from, to] = periodRange(fromInput, toInput)
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
          <button
            key={p}
            className={`pill ${fromInput === presetStart(p) && toInput === today ? 'is-active' : ''}`}
            onClick={() => selectPreset(p)}
          >
            {t.comparison.periods[p]}
          </button>
        ))}
      </div>

      <div className="date-range">
        <div>
          <label className="field-label" htmlFor="history-from">
            {t.comparison.fromLabel}
          </label>
          <input
            id="history-from"
            className="input"
            type="date"
            value={fromInput}
            max={toInput || today}
            onChange={(e) => setFromInput(e.target.value)}
          />
        </div>
        <div>
          <label className="field-label" htmlFor="history-to">
            {t.comparison.toLabel}
          </label>
          <input
            id="history-to"
            className="input"
            type="date"
            value={toInput}
            min={fromInput}
            max={today}
            onChange={(e) => setToInput(e.target.value)}
          />
        </div>
      </div>

      {!rangeValid && <p className="error-text">{t.comparison.invalidRange}</p>}
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
        disabled={downloading || !rangeValid}
      >
        <DownloadIcon width={16} height={16} />
        {downloading ? t.comparison.generatingPdf : t.comparison.downloadReport}
      </button>
    </div>
  )
}
