import { useCallback, useState } from 'react'
import type { DeviceOut } from '../lib/api'
import { useClickOutside } from '../hooks/useClickOutside'
import { useI18n } from '../lib/i18n'
import { ChevronDownIcon, HomeIcon, PlusIcon } from './icons'

interface Props {
  devices: DeviceOut[]
  selectedId: string | null
  onSelect: (id: string) => void
  onManage: () => void
}

export function ResidenceSwitcher({ devices, selectedId, onSelect, onManage }: Props) {
  const { t } = useI18n()
  const [open, setOpen] = useState(false)
  const panelRef = useClickOutside<HTMLDivElement>(open, useCallback(() => setOpen(false), []))
  const current = devices.find((d) => d.device_id === selectedId)

  if (devices.length === 0) {
    return (
      <button className="residence-switcher-btn" onClick={onManage}>
        <HomeIcon width={15} height={15} />
        <span className="residence-switcher-label">{t.switcher.addResidence}</span>
      </button>
    )
  }

  return (
    <div className="residence-switcher" ref={panelRef}>
      <button className="residence-switcher-btn" onClick={() => setOpen((o) => !o)}>
        <HomeIcon width={15} height={15} />
        <span className="residence-switcher-label">{current?.name ?? t.switcher.selectResidence}</span>
        <ChevronDownIcon width={13} height={13} />
      </button>

      {open && (
        <div className="residence-panel">
          {devices.map((d) => (
            <button
              key={d.device_id}
              className={`residence-panel-item ${d.device_id === selectedId ? 'is-active' : ''}`}
              onClick={() => {
                onSelect(d.device_id)
                setOpen(false)
              }}
            >
              <HomeIcon width={14} height={14} />
              {d.name}
            </button>
          ))}
          <button
            className="residence-panel-manage"
            onClick={() => {
              onManage()
              setOpen(false)
            }}
          >
            <PlusIcon width={13} height={13} />
            {t.switcher.manageResidences}
          </button>
        </div>
      )}
    </div>
  )
}
