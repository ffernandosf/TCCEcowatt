import { useEffect, useState } from 'react'
import { getGoal, setGoal, type GoalOut } from '../../lib/api'
import { useI18n } from '../../lib/i18n'
import { TargetIcon } from '../icons'

interface Props {
  deviceId: string
}

export function GoalTab({ deviceId }: Props) {
  const { t } = useI18n()
  const [goal, setGoalState] = useState<GoalOut | null>(null)
  const [budgetInput, setBudgetInput] = useState('')
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)

  async function load() {
    setError('')
    try {
      const result = await getGoal(deviceId)
      setGoalState(result)
      setBudgetInput(result.monthly_budget_brl > 0 ? String(result.monthly_budget_brl) : '')
    } catch (err) {
      setError(err instanceof Error ? err.message : t.goal.loadError)
    }
  }

  useEffect(() => {
    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [deviceId])

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setSaving(true)
    try {
      const result = await setGoal(deviceId, Number(budgetInput))
      setGoalState(result)
    } catch (err) {
      setError(err instanceof Error ? err.message : t.goal.saveError)
    } finally {
      setSaving(false)
    }
  }

  const percent = goal ? Math.min(goal.percent_used, 100) : 0
  const barColor =
    percent >= 100
      ? 'var(--color-critical)'
      : percent >= 80
        ? 'var(--color-warning)'
        : 'var(--color-good)'

  return (
    <div className="card">
      <p className="card-title">
        <TargetIcon width={15} height={15} />
        {t.goal.title}
      </p>
      {error && <p className="error-text">{error}</p>}

      <form onSubmit={handleSave}>
        <label className="field-label">{t.goal.budgetLabel}</label>
        <input
          className="input"
          type="number"
          min={0}
          step="0.01"
          value={budgetInput}
          onChange={(e) => setBudgetInput(e.target.value)}
          required
        />
        <button className="btn btn-primary" type="submit" disabled={saving}>
          {saving ? t.goal.saving : t.goal.save}
        </button>
      </form>

      {goal && goal.monthly_budget_brl > 0 && (
        <>
          <div style={{ marginTop: '1.5rem' }}>
            <p className="label">
              {goal.percent_used.toFixed(0)}% {t.goal.percentUsed}
            </p>
            <div className="progress">
              <div
                className="progress-bar"
                style={{ width: `${percent}%`, background: barColor }}
              />
            </div>
          </div>

          <div className="metric-grid">
            <div className="metric-tile">
              <p className="label">{t.goal.spentSoFar}</p>
              <p className="metric-tile-value">R$ {goal.current_cost_brl.toFixed(2)}</p>
            </div>
            <div className="metric-tile">
              <p className="label">{t.goal.projectionEndMonth}</p>
              <p className="metric-tile-value">R$ {goal.projected_cost_brl.toFixed(2)}</p>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
