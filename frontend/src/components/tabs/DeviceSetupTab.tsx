import { useEffect, useState, type ReactNode } from 'react'
import { claimDevice, getDeviceStatus } from '../../lib/api'
import {
  ARDUINO_SNIPPET,
  CURL_SNIPPET,
  PAYLOAD_SNIPPET,
  POWERSHELL_SNIPPET,
  RESPONSE_SNIPPET,
  SERIAL_SNIPPET,
  fillSnippet,
} from '../../lib/deviceSnippets'
import { useI18n } from '../../lib/i18n'
import { AlertTriangleIcon, BulbIcon, CheckCircleIcon, ChipIcon, CopyIcon } from '../icons'

interface Props {
  deviceId: string
}

const API_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:8000'
const KEY_PLACEHOLDER = 'COLE_A_CHAVE_AQUI'

// Os textos do guia marcam código com crases (`assim`); aqui viram <code>.
function Inline({ text }: { text: string }) {
  const parts = text.split(/`([^`]+)`/)
  return <>{parts.map((part, i) => (i % 2 === 1 ? <code key={i}>{part}</code> : part))}</>
}

function CodeBlock({ title, code }: { title: string; code: string }) {
  const { t } = useI18n()
  const [copied, setCopied] = useState(false)

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(code)
      setCopied(true)
      setTimeout(() => setCopied(false), 1800)
    } catch {
      // Sem permissão de clipboard: o usuário ainda pode selecionar o texto.
    }
  }

  return (
    <div className="guide-code">
      <div className="guide-code-header">
        <span>{title}</span>
        <button type="button" className="guide-copy-btn" onClick={handleCopy}>
          {copied ? <CheckCircleIcon width={13} height={13} /> : <CopyIcon width={13} height={13} />}
          {copied ? t.devices.copied : t.devices.copy}
        </button>
      </div>
      <pre className="code-block guide-code-body">{code}</pre>
    </div>
  )
}

function GuideTable({ headers, rows, codeFirstColumn = false }: { headers: string[]; rows: string[][]; codeFirstColumn?: boolean }) {
  return (
    <div className="guide-table-wrap">
      <table className="guide-table">
        <thead>
          <tr>
            {headers.map((h) => (
              <th key={h}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row[0]}>
              {row.map((cell, i) => (
                <td key={i}>{i === 0 && codeFirstColumn ? <code>{cell}</code> : <Inline text={cell} />}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function GuideSection({ id, badge, title, children }: { id: string; badge: string; title: string; children: ReactNode }) {
  return (
    <section id={id} className="card guide-section" style={{ maxWidth: 'none' }}>
      <p className="guide-badge">{badge}</p>
      <h3 className="guide-section-title">{title}</h3>
      {children}
    </section>
  )
}

function Callout({ tone, children }: { tone: 'danger' | 'tip'; children: ReactNode }) {
  const Icon = tone === 'danger' ? AlertTriangleIcon : BulbIcon
  return (
    <div className={`guide-callout guide-callout--${tone}`}>
      <Icon width={16} height={16} />
      <p>{children}</p>
    </div>
  )
}

export function DeviceSetupTab({ deviceId }: Props) {
  const { t } = useI18n()
  const d = t.devices
  const [claimed, setClaimed] = useState<boolean | null>(null)
  const [key, setKey] = useState<string | null>(null)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [keyCopied, setKeyCopied] = useState(false)

  async function loadStatus() {
    setError('')
    try {
      const status = await getDeviceStatus(deviceId)
      setClaimed(status.claimed)
    } catch (err) {
      setError(err instanceof Error ? err.message : d.statusError)
    }
  }

  useEffect(() => {
    setKey(null)
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
      setError(err instanceof Error ? err.message : d.generateError)
    } finally {
      setLoading(false)
    }
  }

  async function handleCopyKey() {
    if (!key) return
    try {
      await navigator.clipboard.writeText(key)
      setKeyCopied(true)
      setTimeout(() => setKeyCopied(false), 1800)
    } catch {
      // idem CodeBlock
    }
  }

  const values = { apiUrl: API_URL, deviceId, deviceKey: key ?? KEY_PLACEHOLDER }
  const fill = (template: string) => fillSnippet(template, values)

  const steps = [
    { id: 'guide-materials', title: d.materials.title },
    { id: 'guide-claim', title: d.claim.title },
    { id: 'guide-wiring', title: d.wiring.title },
    { id: 'guide-ide', title: d.ide.title },
    { id: 'guide-firmware', title: d.firmware.title },
    { id: 'guide-test', title: d.test.title },
    { id: 'guide-verify', title: d.verify.title },
  ]
  const references = [
    { id: 'guide-contract', title: d.contract.title },
    { id: 'guide-responses', title: d.responses.title },
    { id: 'guide-troubleshooting', title: d.troubleshooting.title },
    { id: 'guide-security', title: d.security.title },
  ]
  const stepBadge = (n: number) => `${d.stepLabel} ${n}`

  function scrollTo(id: string) {
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  return (
    <>
      <div className="card" style={{ maxWidth: 'none' }}>
        <p className="card-title">
          <ChipIcon width={15} height={15} />
          {d.guideTitle}
        </p>
        <p className="card-subtitle">{d.guideIntro}</p>

        <p className="field-label" style={{ marginTop: '1.25rem' }}>
          {d.flowTitle}
        </p>
        <ol className="guide-flow">
          {d.flow.map((node) => (
            <li key={node.title}>
              <strong>{node.title}</strong>
              <span>
                <Inline text={node.desc} />
              </span>
            </li>
          ))}
        </ol>

        <p className="field-label" style={{ marginTop: '1.25rem' }}>
          {d.tocTitle}
        </p>
        <div className="guide-toc">
          <ol>
            {steps.map((s) => (
              <li key={s.id}>
                <button type="button" onClick={() => scrollTo(s.id)}>
                  {s.title}
                </button>
              </li>
            ))}
          </ol>
          <ul>
            {references.map((s) => (
              <li key={s.id}>
                <button type="button" onClick={() => scrollTo(s.id)}>
                  {s.title}
                </button>
              </li>
            ))}
          </ul>
        </div>
      </div>

      <GuideSection id="guide-materials" badge={stepBadge(1)} title={d.materials.title}>
        <p className="guide-text">{d.materials.intro}</p>
        <GuideTable headers={d.materials.headers} rows={d.materials.rows} />
        <p className="field-label" style={{ marginTop: '1.25rem' }}>
          {d.materials.requirementsTitle}
        </p>
        <ul className="setup-steps guide-bullets">
          {d.materials.requirements.map((r) => (
            <li key={r}>
              <Inline text={r} />
            </li>
          ))}
        </ul>
      </GuideSection>

      <GuideSection id="guide-claim" badge={stepBadge(2)} title={d.claim.title}>
        <p className="guide-text">
          <Inline text={d.claim.intro} />
        </p>
        <ul className="setup-steps guide-bullets">
          {d.claim.points.map((p) => (
            <li key={p}>{p}</li>
          ))}
        </ul>

        <div className="guide-claim-box">
          <p className="label">{d.statusTitle}</p>
          <p className="card-subtitle">
            {d.deviceIdLabel}: <code>{deviceId}</code>
          </p>

          {error && <p className="error-text">{error}</p>}

          {claimed && !key && (
            <div className="status-pill">
              <CheckCircleIcon width={16} height={16} style={{ color: 'var(--color-good)' }} />
              {d.alreadyConfigured}
            </div>
          )}

          {key && (
            <>
              <p className="label">{d.keyGeneratedNow}</p>
              <div className="claim-key">{key}</div>
              <button type="button" className="guide-copy-btn" onClick={handleCopyKey}>
                {keyCopied ? <CheckCircleIcon width={13} height={13} /> : <CopyIcon width={13} height={13} />}
                {keyCopied ? d.copied : d.copy}
              </button>
            </>
          )}

          <button className="btn btn-primary guide-claim-btn" onClick={handleGenerate} disabled={loading}>
            {loading ? d.generating : claimed ? d.regenerateKey : d.claimAndGenerate}
          </button>
        </div>
      </GuideSection>

      <GuideSection id="guide-wiring" badge={stepBadge(3)} title={d.wiring.title}>
        <Callout tone="danger">{d.wiring.danger}</Callout>
        <ol className="setup-steps">
          {d.wiring.steps.map((st) => (
            <li key={st}>{st}</li>
          ))}
        </ol>
      </GuideSection>

      <GuideSection id="guide-ide" badge={stepBadge(4)} title={d.ide.title}>
        <ol className="setup-steps">
          {d.ide.steps.map((s) => (
            <li key={s}>
              <Inline text={s} />
            </li>
          ))}
        </ol>
      </GuideSection>

      <GuideSection id="guide-firmware" badge={stepBadge(5)} title={d.firmware.title}>
        <p className="guide-text">{d.firmware.intro}</p>
        {!key && (
          <Callout tone="tip">
            <Inline text={d.firmware.keyMissing} />
          </Callout>
        )}
        <p className="field-label" style={{ marginTop: '1.25rem' }}>
          {d.firmware.constantsTitle}
        </p>
        <GuideTable headers={d.firmware.constantsHeaders} rows={d.firmware.constants} codeFirstColumn />
        <CodeBlock title={d.firmware.codeTitle} code={fill(ARDUINO_SNIPPET)} />
        <p className="guide-text" style={{ marginTop: '1rem' }}>
          {d.firmware.upload}
        </p>
      </GuideSection>

      <GuideSection id="guide-test" badge={stepBadge(6)} title={d.test.title}>
        <p className="guide-text">{d.test.intro}</p>
        <CodeBlock title={d.test.curlTitle} code={fill(CURL_SNIPPET)} />
        <CodeBlock title={d.test.psTitle} code={fill(POWERSHELL_SNIPPET)} />
        <CodeBlock title={d.test.responseTitle} code={fill(RESPONSE_SNIPPET)} />

      </GuideSection>

      <GuideSection id="guide-verify" badge={stepBadge(7)} title={d.verify.title}>
        <ol className="setup-steps">
          {d.verify.steps.map((s) => (
            <li key={s}>
              <Inline text={s} />
            </li>
          ))}
        </ol>
        <CodeBlock title={d.verify.serialTitle} code={SERIAL_SNIPPET} />
      </GuideSection>

      <GuideSection id="guide-contract" badge={d.referenceLabel} title={d.contract.title}>
        <p className="guide-text">
          <Inline text={d.contract.intro} />
        </p>
        <GuideTable headers={d.contract.headers} rows={d.contract.rows} codeFirstColumn />
        <CodeBlock title={d.contract.exampleTitle} code={fill(PAYLOAD_SNIPPET)} />
      </GuideSection>

      <GuideSection id="guide-responses" badge={d.referenceLabel} title={d.responses.title}>
        <GuideTable headers={d.responses.headers} rows={d.responses.rows} />
      </GuideSection>

      <GuideSection id="guide-troubleshooting" badge={d.referenceLabel} title={d.troubleshooting.title}>
        <dl className="guide-faq">
          {d.troubleshooting.items.map((item) => (
            <div key={item.problem}>
              <dt>{item.problem}</dt>
              <dd>
                <Inline text={item.fix} />
              </dd>
            </div>
          ))}
        </dl>
      </GuideSection>

      <GuideSection id="guide-security" badge={d.referenceLabel} title={d.security.title}>
        <ul className="setup-steps guide-bullets">
          {d.security.items.map((s) => (
            <li key={s}>
              <Inline text={s} />
            </li>
          ))}
        </ul>
      </GuideSection>
    </>
  )
}
