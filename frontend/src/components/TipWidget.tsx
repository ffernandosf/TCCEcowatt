import { useEffect, useState } from 'react'
import { useI18n } from '../lib/i18n'
import { BulbIcon, CloseIcon } from './icons'

const ROTATE_MS = 30_000

export function TipWidget() {
  const { t } = useI18n()
  const tips = t.tips
  const [index, setIndex] = useState(() => Math.floor(Math.random() * tips.length))
  const [dismissed, setDismissed] = useState(false)

  useEffect(() => {
    const interval = setInterval(() => {
      setIndex((i) => (i + 1) % tips.length)
    }, ROTATE_MS)
    return () => clearInterval(interval)
  }, [tips.length])

  if (dismissed) return null

  return (
    <div className="tip-widget">
      <button className="tip-widget-close" onClick={() => setDismissed(true)} aria-label={t.tip.close}>
        <CloseIcon width={13} height={13} />
      </button>
      <p className="tip-widget-head">
        <BulbIcon width={14} height={14} />
        {t.tip.title}
      </p>
      <p className="tip-widget-text">{tips[index % tips.length]}</p>
    </div>
  )
}
