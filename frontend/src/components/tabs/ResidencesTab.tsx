import { useState } from 'react'
import { claimDevice, renameDevice, type DeviceOut } from '../../lib/api'
import { useI18n } from '../../lib/i18n'
import { EditIcon, HomeIcon, PlusIcon } from '../icons'

interface Props {
  devices: DeviceOut[]
  selectedId: string | null
  onSelect: (id: string) => void
  onDevicesChange: () => void
}

export function ResidencesTab({ devices, selectedId, onSelect, onDevicesChange }: Props) {
  const { t } = useI18n()
  const [newDeviceId, setNewDeviceId] = useState('')
  const [newName, setNewName] = useState('')
  const [adding, setAdding] = useState(false)
  const [newKey, setNewKey] = useState<string | null>(null)
  const [error, setError] = useState('')

  const [editingId, setEditingId] = useState<string | null>(null)
  const [editName, setEditName] = useState('')

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setAdding(true)
    try {
      const deviceId = newDeviceId.trim()
      const result = await claimDevice(deviceId, newName.trim() || undefined)
      setNewKey(result.device_key)
      setNewDeviceId('')
      setNewName('')
      onDevicesChange()
    } catch (err) {
      setError(err instanceof Error ? err.message : t.residences.addError)
    } finally {
      setAdding(false)
    }
  }

  function startEdit(d: DeviceOut) {
    setEditingId(d.device_id)
    setEditName(d.name)
    setError('')
  }

  async function handleRename(deviceId: string) {
    if (!editName.trim()) return
    try {
      await renameDevice(deviceId, editName.trim())
      setEditingId(null)
      onDevicesChange()
    } catch (err) {
      setError(err instanceof Error ? err.message : t.residences.renameError)
    }
  }

  return (
    <>
      <div className="card" style={{ maxWidth: 'none' }}>
        <p className="card-title">
          <HomeIcon width={15} height={15} />
          {t.residences.title}
        </p>
        <p className="card-subtitle">{t.residences.subtitle}</p>

        {error && <p className="error-text">{error}</p>}

        {devices.length === 0 ? (
          <p className="waiting">{t.residences.empty}</p>
        ) : (
          <div className="residence-list">
            {devices.map((d) => (
              <div
                key={d.device_id}
                className={`residence-row ${d.device_id === selectedId ? 'is-active' : ''}`}
              >
                <div className="residence-row-icon">
                  <HomeIcon width={16} height={16} />
                </div>

                <div className="residence-row-info">
                  {editingId === d.device_id ? (
                    <input
                      className="input"
                      style={{ marginBottom: 0 }}
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                      autoFocus
                    />
                  ) : (
                    <>
                      <p className="residence-row-name">{d.name}</p>
                      <p className="residence-row-id">{d.device_id}</p>
                    </>
                  )}
                </div>

                <div className="residence-row-actions">
                  {editingId === d.device_id ? (
                    <>
                      <button className="btn btn-primary" onClick={() => handleRename(d.device_id)}>
                        {t.common.save}
                      </button>
                      <button className="btn btn-ghost" onClick={() => setEditingId(null)}>
                        {t.common.cancel}
                      </button>
                    </>
                  ) : (
                    <>
                      {d.device_id === selectedId ? (
                        <span className="pill is-active" style={{ cursor: 'default' }}>
                          {t.common.active}
                        </span>
                      ) : (
                        <button className="btn btn-ghost" onClick={() => onSelect(d.device_id)}>
                          {t.common.select}
                        </button>
                      )}
                      <button className="btn btn-ghost" onClick={() => startEdit(d)} aria-label={t.common.rename}>
                        <EditIcon width={14} height={14} />
                      </button>
                    </>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="card">
        <p className="card-title">
          <PlusIcon width={15} height={15} />
          {t.residences.addTitle}
        </p>
        <p className="card-subtitle">{t.residences.addSubtitle}</p>

        <form onSubmit={handleAdd}>
          <label className="field-label">{t.residences.deviceIdLabel}</label>
          <input
            className="input"
            value={newDeviceId}
            onChange={(e) => setNewDeviceId(e.target.value)}
            placeholder={t.residences.deviceIdPlaceholder}
            required
          />
          <label className="field-label">{t.residences.nameLabel}</label>
          <input
            className="input"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            placeholder={t.residences.namePlaceholder}
            required
          />
          <button className="btn btn-primary" type="submit" disabled={adding}>
            {adding ? t.residences.adding : t.residences.addTitle}
          </button>
        </form>

        {newKey && (
          <>
            <p className="label" style={{ marginTop: '1rem' }}>
              {t.residences.keyGenerated}
            </p>
            <div className="claim-key">{newKey}</div>
          </>
        )}
      </div>
    </>
  )
}
