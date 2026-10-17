import { useEffect, useState } from 'react'
import { claimDevice, getDeviceStatus } from '../../lib/api'
import { useI18n } from '../../lib/i18n'
import { CheckCircleIcon, ChipIcon } from '../icons'

interface Props {
  deviceId: string
}

const API_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:8000'

const PAYLOAD_EXAMPLE = `{
  "device_id": "${'${DEVICE_ID}'}",
  "timestamp": "2026-06-25T14:32:00Z",
  "voltage": 220.3,
  "current": 1.35,
  "power": 297.4,
  "energy": 1820.5,
  "frequency": 60.0,
  "power_factor": 0.98
}`

function curlExample(deviceId: string, key: string): string {
  return `curl -X POST ${API_URL}/api/v1/ingest \\
  -H "Content-Type: application/json" \\
  -H "X-Device-Key: ${key}" \\
  -d '{"device_id":"${deviceId}","timestamp":"2026-06-25T14:32:00Z","power":297.4}'`
}

function arduinoExample(deviceId: string, key: string): string {
  return `#include <WiFi.h>
#include <HTTPClient.h>

const char* WIFI_SSID = "your-network";
const char* WIFI_PASSWORD = "your-password";
const char* API_URL = "${API_URL}/api/v1/ingest";
const char* DEVICE_ID = "${deviceId}";
const char* DEVICE_KEY = "${key}";

void sendReading(float power, float voltage, float current) {
  HTTPClient http;
  http.begin(API_URL);
  http.addHeader("Content-Type", "application/json");
  http.addHeader("X-Device-Key", DEVICE_KEY);

  String payload = String("{\\"device_id\\":\\"") + DEVICE_ID +
    "\\",\\"timestamp\\":\\"" + getIsoTimestamp() +
    "\\",\\"power\\":" + power +
    ",\\"voltage\\":" + voltage +
    ",\\"current\\":" + current + "}";

  int status = http.POST(payload);
  http.end();
}`
}

export function DeviceSetupTab({ deviceId }: Props) {
  const { t } = useI18n()
  const [claimed, setClaimed] = useState<boolean | null>(null)
  const [key, setKey] = useState<string | null>(null)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function loadStatus() {
    setError('')
    try {
      const status = await getDeviceStatus(deviceId)
      setClaimed(status.claimed)
    } catch (err) {
      setError(err instanceof Error ? err.message : t.devices.statusError)
    }
  }

  useEffect(() => {
    loadStatus()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [deviceId])

  async function handleGenerate() {
    setError('')
    setLoading(true)
    try {
      const result = await claimDevice(deviceId)
      setKey(result.device_key)
      setClaimed(true)
    } catch (err) {
      setError(err instanceof Error ? err.message : t.devices.generateError)
    } finally {
      setLoading(false)
    }
  }

  const displayKey = key ?? 'YOUR_KEY_HERE'

  return (
    <>
      <div className="card" style={{ maxWidth: 'none' }}>
        <p className="card-title">
          <ChipIcon width={15} height={15} />
          {t.devices.statusTitle}
        </p>
        <p className="card-subtitle">
          {t.devices.deviceIdLabel}: <code>{deviceId}</code>
        </p>

        {error && <p className="error-text">{error}</p>}

        {claimed && !key && (
          <div className="status-pill" style={{ marginBottom: '1rem' }}>
            <CheckCircleIcon width={16} height={16} style={{ color: 'var(--color-good)' }} />
            {t.devices.alreadyConfigured}
          </div>
        )}

        {key && (
          <>
            <p className="label">{t.devices.keyGeneratedNow}</p>
            <div className="claim-key">{key}</div>
          </>
        )}

        <button className="btn btn-primary" style={{ marginTop: '1rem' }} onClick={handleGenerate} disabled={loading}>
          {loading ? t.devices.generating : claimed ? t.devices.regenerateKey : t.devices.claimAndGenerate}
        </button>
      </div>

      <div className="card" style={{ maxWidth: 'none' }}>
        <p className="card-title">{t.devices.firmwareTitle}</p>
        <p className="card-subtitle">{t.devices.firmwareIntro}</p>

        <ol className="setup-steps">
          <li>{t.devices.step1}</li>
          <li>{t.devices.step2}</li>
          <li>
            {t.devices.step3a} <code>POST</code> {t.devices.step3b}{' '}
            <code>{API_URL}/api/v1/ingest</code>
            {t.devices.step3c} <code>X-Device-Key</code>.
          </li>
          <li>
            {t.devices.step4a} <code>power</code> {t.devices.step4b} <code>energy</code>,{' '}
            <code>frequency</code> {t.devices.step4and} <code>power_factor</code> {t.devices.step4c}
          </li>
        </ol>

        <p className="field-label" style={{ marginTop: '1.25rem' }}>
          {t.devices.payloadTitle}
        </p>
        <pre className="code-block">{PAYLOAD_EXAMPLE}</pre>

        <p className="field-label" style={{ marginTop: '1.25rem' }}>
          {t.devices.curlTitle}
        </p>
        <pre className="code-block">{curlExample(deviceId, displayKey)}</pre>

        <p className="field-label" style={{ marginTop: '1.25rem' }}>
          {t.devices.arduinoTitle}
        </p>
        <pre className="code-block">{arduinoExample(deviceId, displayKey)}</pre>
      </div>
    </>
  )
}
