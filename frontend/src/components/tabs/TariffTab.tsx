import { useEffect, useState } from 'react'
import { getTariff, type TariffOut } from '../../lib/api'
import { useI18n } from '../../lib/i18n'
import { BulbIcon, CoinIcon, FlagIcon } from '../icons'

const FLAG_COLOR: Record<TariffOut['tariff_flag'], string> = {
  green: 'var(--color-good)',
  yellow: 'var(--color-warning)',
  red1: 'var(--color-critical)',
  red2: 'var(--color-critical)',
}

export function TariffTab() {
  const { t } = useI18n()
  const [tariff, setTariff] = useState<TariffOut | null>(null)
  const [error, setError] = useState('')

  const FLAG_LABEL: Record<TariffOut['tariff_flag'], string> = {
    green: t.tariff.flagGreen,
    yellow: t.tariff.flagYellow,
    red1: t.tariff.flagRed1,
    red2: t.tariff.flagRed2,
  }

  useEffect(() => {
    getTariff()
      .then(setTariff)
      .catch((err) => setError(err instanceof Error ? err.message : t.tariff.loadError))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <>
      <div className="card">
        <p className="card-title">
          <CoinIcon width={15} height={15} />
          {t.tariff.title}
        </p>
        {error && <p className="error-text">{error}</p>}
        {tariff ? (
          <>
            <p className="hero-value">R$ {tariff.effective_rate_brl_per_kwh.toFixed(4)}/kWh</p>

            <div className="status-pill" style={{ marginTop: '0.75rem' }}>
              <FlagIcon width={15} height={15} style={{ color: FLAG_COLOR[tariff.tariff_flag] }} />
              {t.tariff.flag} {FLAG_LABEL[tariff.tariff_flag]}
            </div>

            <div className="metric-grid">
              <div className="metric-tile">
                <p className="label">{t.tariff.baseRate}</p>
                <p className="metric-tile-value">R$ {tariff.tariff_rate_brl_per_kwh.toFixed(2)}/kWh</p>
              </div>
              <div className="metric-tile">
                <p className="label">{t.tariff.flagSurcharge}</p>
                <p className="metric-tile-value">
                  R$ {tariff.flag_surcharge_brl_per_kwh.toFixed(5)}/kWh
                </p>
              </div>
            </div>
          </>
        ) : (
          !error && <p className="waiting">{t.common.loading}</p>
        )}
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
