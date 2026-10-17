import { useState } from 'react'
import { claimDevice } from '../lib/api'
import { useI18n } from '../lib/i18n'
import { LinkIcon } from './icons'

interface Props {
  deviceId: string
  onClaimed: () => void
}

export function ClaimDeviceCard({ deviceId, onClaimed }: Props) {
  const { t } = useI18n()
  const [key, setKey] = useState<string | null>(null)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleClaim() {
    setError('')
    setLoading(true)
    try {
      const result = await claimDevice(deviceId)
      setKey(result.device_key)
    } catch (err) {
      setError(err instanceof Error ? err.message : t.claim.error)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="claim-card">
      <p className="claim-card-title">
        <LinkIcon width={16} height={16} />
        {t.claim.notClaimedTitle} "{deviceId}" {t.claim.notClaimedTitleEnd}
      </p>
      <p className="label" style={{ marginBottom: '1rem' }}>
        {t.claim.notClaimedText}
      </p>
      {error && <p className="error-text">{error}</p>}
      {key ? (
        <>
          <p className="label">{t.claim.keyGenerated}</p>
          <div className="claim-key">{key}</div>
          <button className="btn btn-primary" style={{ marginTop: '1rem' }} onClick={onClaimed}>
            {t.claim.done}
          </button>
        </>
      ) : (
        <button className="btn btn-primary" onClick={handleClaim} disabled={loading}>
          {loading ? t.claim.claiming : t.claim.claim}
        </button>
      )}
    </div>
  )
}
