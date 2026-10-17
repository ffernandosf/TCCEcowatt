import { useEffect, useState } from 'react'
import { getGoal, getTariff } from '../../lib/api'
import { useI18n } from '../../lib/i18n'
import { CalculatorIcon, SlidersIcon } from '../icons'

interface Props {
  deviceId: string
}

export function SimulatorTab({ deviceId }: Props) {
  const { t } = useI18n()
  const [tariff, setTariff] = useState<number | null>(null)
  const [error, setError] = useState('')
  const [powerW, setPowerW] = useState(100)
  const [hoursPerDay, setHoursPerDay] = useState(4)
  const [daysPerMonth, setDaysPerMonth] = useState(30)

  const [monthToDateCost, setMonthToDateCost] = useState<number | null>(null)
  const [reductionPercent, setReductionPercent] = useState(15)

  useEffect(() => {
    getTariff()
      .then((res) => setTariff(res.tariff_rate_brl_per_kwh))
      .catch((err) => setError(err instanceof Error ? err.message : t.simulator.tariffError))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    getGoal(deviceId)
      .then((g) => setMonthToDateCost(g.current_cost_brl))
      .catch(() => setMonthToDateCost(null))
  }, [deviceId])

  const energyKwhPerMonth = (powerW * hoursPerDay * daysPerMonth) / 1000
  const costPerMonth = tariff != null ? energyKwhPerMonth * tariff : null

  const projectedCost =
    monthToDateCost != null ? monthToDateCost * (1 - reductionPercent / 100) : null
  const savings = monthToDateCost != null && projectedCost != null ? monthToDateCost - projectedCost : null

  return (
    <>
      <div className="card">
        <p className="card-title">
          <CalculatorIcon width={15} height={15} />
          {t.simulator.title}
        </p>
        <p className="card-subtitle">{t.simulator.subtitle}</p>

        {error && <p className="error-text">{error}</p>}

        <label className="field-label">{t.simulator.appliancePower}</label>
        <input
          className="input"
          type="number"
          min={0}
          value={powerW}
          onChange={(e) => setPowerW(Number(e.target.value))}
        />

        <label className="field-label">{t.simulator.hoursPerDay}</label>
        <input
          className="input"
          type="number"
          min={0}
          max={24}
          value={hoursPerDay}
          onChange={(e) => setHoursPerDay(Number(e.target.value))}
        />

        <label className="field-label">{t.simulator.daysPerMonth}</label>
        <input
          className="input"
          type="number"
          min={0}
          max={31}
          value={daysPerMonth}
          onChange={(e) => setDaysPerMonth(Number(e.target.value))}
        />

        <div className="metric-grid">
          <div className="metric-tile">
            <p className="label">{t.simulator.estimatedConsumption}</p>
            <p className="metric-tile-value">{energyKwhPerMonth.toFixed(2)} kWh</p>
          </div>
          <div className="metric-tile">
            <p className="label">{t.simulator.estimatedCost}</p>
            <p className="metric-tile-value">
              {costPerMonth != null ? `R$ ${costPerMonth.toFixed(2)}` : '—'}
            </p>
          </div>
        </div>
        {tariff != null && (
          <p className="label" style={{ marginTop: '1rem' }}>
            {t.simulator.tariffConsidered}: R$ {tariff.toFixed(2)}/kWh
          </p>
        )}
      </div>

      <div className="card">
        <p className="card-title">
          <SlidersIcon width={15} height={15} />
          {t.simulator.whatIfTitle}
        </p>
        <p className="card-subtitle">{t.simulator.whatIfSubtitle}</p>

        <label className="field-label">
          {t.simulator.reductionLabel}: {reductionPercent}%
        </label>
        <input
          type="range"
          min={0}
          max={50}
          step={5}
          value={reductionPercent}
          onChange={(e) => setReductionPercent(Number(e.target.value))}
          style={{ width: '100%', marginBottom: '1.1rem' }}
        />

        {monthToDateCost != null ? (
          <div className="metric-grid">
            <div className="metric-tile">
              <p className="label">{t.simulator.currentSpend}</p>
              <p className="metric-tile-value">R$ {monthToDateCost.toFixed(2)}</p>
            </div>
            <div className="metric-tile">
              <p className="label">{t.simulator.withReduction}</p>
              <p className="metric-tile-value">R$ {(projectedCost ?? 0).toFixed(2)}</p>
            </div>
            <div className="metric-tile">
              <p className="label">{t.simulator.monthSavings}</p>
              <p className="metric-tile-value">R$ {(savings ?? 0).toFixed(2)}</p>
            </div>
            <div className="metric-tile">
              <p className="label">{t.simulator.yearSavings}</p>
              <p className="metric-tile-value">R$ {((savings ?? 0) * 12).toFixed(2)}</p>
            </div>
          </div>
        ) : (
          <p className="waiting">{t.simulator.noMonthData}</p>
        )}
      </div>
    </>
  )
}
