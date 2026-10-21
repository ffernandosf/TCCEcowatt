import { useEffect, useState, type FormEvent } from 'react'
import { getTariff, setTariff as saveTariff, type TariffOut } from '../../lib/api'
import { useI18n } from '../../lib/i18n'
import { AlertTriangleIcon, BulbIcon, CoinIcon, FlagIcon, ReceiptIcon } from '../icons'

const FLAG_COLOR: Record<TariffOut['tariff_flag'], string> = {
  green: 'var(--color-good)',
  yellow: 'var(--color-warning)',
  red1: 'var(--color-critical)',
  red2: 'var(--color-critical)',
}

const MIN_RATE = 0.01
const MAX_RATE = 5

// Aceita "0,80" (como vem na conta) além de "0.80".
function parseDecimal(value: string): number {
  const trimmed = value.trim()
  if (!trimmed) return NaN
  return Number(trimmed.includes(',') ? trimmed.replace(/\./g, '').replace(',', '.') : trimmed)
}

export function TariffTab() {
  const { t, language } = useI18n()
  const [tariff, setTariff] = useState<TariffOut | null>(null)
  const [error, setError] = useState('')
  const [rateInput, setRateInput] = useState('')
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [calcAmount, setCalcAmount] = useState('')
  const [calcKwh, setCalcKwh] = useState('')

  const FLAG_LABEL: Record<TariffOut['tariff_flag'], string> = {
    green: t.tariff.flagGreen,
    yellow: t.tariff.flagYellow,
    red1: t.tariff.flagRed1,
    red2: t.tariff.flagRed2,
  }

  useEffect(() => {
    getTariff()
      .then((res) => {
        setTariff(res)
        if (res.rate_configured) setRateInput(res.tariff_rate_brl_per_kwh.toFixed(4))
      })
      .catch((err) => setError(err instanceof Error ? err.message : t.tariff.loadError))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  async function handleSave(e: FormEvent) {
    e.preventDefault()
    setSaved(false)
    const rate = parseDecimal(rateInput)
    if (!Number.isFinite(rate) || rate < MIN_RATE || rate > MAX_RATE) {
      setError(t.tariff.invalidRate)
      return
    }
    setError('')
    setSaving(true)
    try {
      const res = await saveTariff(rate)
      setTariff(res)
      setRateInput(res.tariff_rate_brl_per_kwh.toFixed(4))
      setSaved(true)
    } catch (err) {
      setError(err instanceof Error ? err.message : t.tariff.saveError)
    } finally {
      setSaving(false)
    }
  }

  const amount = parseDecimal(calcAmount)
  const kwh = parseDecimal(calcKwh)
  const calcRate = amount > 0 && kwh > 0 ? amount / kwh : null

  const flagMonth = tariff?.flag_reference_month
    ? new Date(`${tariff.flag_reference_month}T12:00:00`).toLocaleDateString(
        language === 'pt' ? 'pt-BR' : 'en-US',
        { month: 'long', year: 'numeric' },
      )
    : ''

  return (
    <>
      <div className="card">
        <p className="card-title">
          <CoinIcon width={15} height={15} />
          {t.tariff.title}
        </p>
        {tariff ? (
          <>
            <p className="label">{t.tariff.effectiveRate}</p>
            <p className="hero-value">R$ {tariff.effective_rate_brl_per_kwh.toFixed(4)}/kWh</p>

            <div className="status-pill" style={{ marginTop: '0.75rem' }}>
              <FlagIcon width={15} height={15} style={{ color: FLAG_COLOR[tariff.tariff_flag] }} />
              {t.tariff.flag} {FLAG_LABEL[tariff.tariff_flag]}
            </div>
            <p className="card-subtitle" style={{ marginTop: '0.5rem' }}>
              {tariff.flag_source === 'aneel'
                ? t.tariff.flagFromAneel.replace('{month}', flagMonth)
                : t.tariff.flagFallback}
            </p>

            <div className="metric-grid">
              <div className="metric-tile">
                <p className="label">{t.tariff.baseRate}</p>
                <p className="metric-tile-value">R$ {tariff.tariff_rate_brl_per_kwh.toFixed(4)}/kWh</p>
              </div>
              <div className="metric-tile">
                <p className="label">{t.tariff.flagSurcharge}</p>
                <p className="metric-tile-value">
                  R$ {tariff.flag_surcharge_brl_per_kwh.toFixed(5)}/kWh
                </p>
              </div>
            </div>

            {!tariff.rate_configured && (
              <div className="guide-callout guide-callout--danger" style={{ marginTop: '1rem' }}>
                <AlertTriangleIcon width={16} height={16} />
                <p>{t.tariff.notConfigured}</p>
              </div>
            )}
          </>
        ) : (
          !error && <p className="waiting">{t.common.loading}</p>
        )}
      </div>

      <div className="card">
        <p className="card-title">
          <ReceiptIcon width={15} height={15} />
          {t.tariff.formTitle}
        </p>
        <p className="card-subtitle">{t.tariff.formSubtitle}</p>
        {error && <p className="error-text">{error}</p>}

        <form onSubmit={handleSave}>
          <label className="field-label">{t.tariff.rateLabel}</label>
          <input
            className="input"
            type="text"
            inputMode="decimal"
            placeholder="0,8000"
            value={rateInput}
            onChange={(e) => {
              setRateInput(e.target.value)
              setSaved(false)
            }}
            required
          />
          <button className="btn btn-primary" type="submit" disabled={saving}>
            {saving ? t.tariff.saving : t.tariff.save}
          </button>
        </form>
        {saved && (
          <p className="label" style={{ marginTop: '0.75rem', color: 'var(--color-good)' }}>
            {t.tariff.saved}
          </p>
        )}

        <p className="field-label" style={{ marginTop: '1.5rem' }}>
          {t.tariff.calcTitle}
        </p>
        <div className="metric-grid" style={{ marginTop: 0 }}>
          <div>
            <label className="field-label">{t.tariff.calcAmount}</label>
            <input
              className="input"
              type="text"
              inputMode="decimal"
              placeholder="160,00"
              value={calcAmount}
              onChange={(e) => setCalcAmount(e.target.value)}
            />
          </div>
          <div>
            <label className="field-label">{t.tariff.calcKwh}</label>
            <input
              className="input"
              type="text"
              inputMode="decimal"
              placeholder="200"
              value={calcKwh}
              onChange={(e) => setCalcKwh(e.target.value)}
            />
          </div>
        </div>
        {calcRate != null && (
          <div className="metric-tile">
            <p className="label">{t.tariff.calcResult}</p>
            <p className="metric-tile-value">R$ {calcRate.toFixed(4)}/kWh</p>
            <button
              className="btn btn-ghost"
              type="button"
              style={{ marginTop: '0.5rem' }}
              onClick={() => {
                setRateInput(calcRate.toFixed(4))
                setSaved(false)
              }}
            >
              {t.tariff.calcUse}
            </button>
          </div>
        )}
      </div>

      <div className="card">
        <p className="card-title">
          <ReceiptIcon width={15} height={15} />
          {t.tariff.guideTitle}
        </p>
        <p className="card-subtitle">{t.tariff.guideIntro}</p>

        <ol className="guide-flow">
          {t.tariff.guideSteps.map((step) => (
            <li key={step.title}>
              <strong>{step.title}</strong>
              <span>{step.desc}</span>
            </li>
          ))}
        </ol>

        <div className="guide-callout guide-callout--danger" style={{ marginTop: '1rem' }}>
          <AlertTriangleIcon width={16} height={16} />
          <p>{t.tariff.guideTipFlag}</p>
        </div>
        <div className="guide-callout guide-callout--tip">
          <BulbIcon width={16} height={16} />
          <p>{t.tariff.guideTipOther}</p>
        </div>
        <div className="guide-callout guide-callout--tip">
          <BulbIcon width={16} height={16} />
          <p>{t.tariff.guideTipUpdate}</p>
        </div>
      </div>

      <div className="card">
        <p className="card-title">
          <BulbIcon width={15} height={15} />
          {t.tariff.tipsTitle}
        </p>
        <ul className="tip-list">
          {t.tips.map((tip) => (
            <li key={tip}>{tip}</li>
          ))}
        </ul>
      </div>
    </>
  )
}
