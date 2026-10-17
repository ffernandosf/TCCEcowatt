import { useI18n } from '../lib/i18n'
import logoMark from '../assets/images/ecowatt-logo-mark.png'

interface Props {
  size?: number
}

export function LogoMark({ size = 34 }: Props) {
  return (
    <div className="brand-mark" style={{ width: size, height: size }}>
      <img src={logoMark} alt="Ecowatt" style={{ width: '68%', height: '68%', objectFit: 'contain' }} />
    </div>
  )
}

export function Brand() {
  const { t } = useI18n()
  return (
    <div className="brand">
      <LogoMark />
      <div className="brand-text">
        <span className="brand-word">
          Eco<span>watt</span>
        </span>
        <span className="brand-slogan">{t.brand.slogan}</span>
      </div>
    </div>
  )
}
