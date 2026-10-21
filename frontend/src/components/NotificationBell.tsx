import { useCallback, useEffect, useState } from 'react'
import { getNotifications, markNotificationRead, type NotificationOut } from '../lib/api'
import { useClickOutside } from '../hooks/useClickOutside'
import { useI18n } from '../lib/i18n'
import { notificationMessage } from '../lib/notifications'
import { AlertTriangleIcon, BellIcon, PlugIcon, TargetIcon } from './icons'

interface Props {
  deviceId: string
}

const TYPE_ICON: Record<NotificationOut['type'], typeof PlugIcon> = {
  offline: PlugIcon,
  limit: TargetIcon,
  spike: AlertTriangleIcon,
}

export function NotificationBell({ deviceId }: Props) {
  const { t, language } = useI18n()
  const [notifications, setNotifications] = useState<NotificationOut[]>([])
  const [open, setOpen] = useState(false)
  const panelRef = useClickOutside<HTMLDivElement>(open, useCallback(() => setOpen(false), []))

  const locale = language === 'pt' ? 'pt-BR' : 'en-US'

  const TYPE_LABEL: Record<NotificationOut['type'], string> = {
    offline: t.notifications.typeOffline,
    limit: t.notifications.typeLimit,
    spike: t.notifications.typeSpike,
  }

  async function load() {
    try {
      const result = await getNotifications(deviceId)
      setNotifications(result)
    } catch {
      // silent: bell shouldn't break the rest of the screen
    }
  }

  useEffect(() => {
    load()
    const interval = setInterval(load, 60_000)
    return () => clearInterval(interval)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [deviceId])

  const unreadCount = notifications.filter((n) => !n.read).length

  async function handleClickNotification(n: NotificationOut) {
    if (n.read) return
    try {
      await markNotificationRead(n.id)
      setNotifications((prev) => prev.map((x) => (x.id === n.id ? { ...x, read: true } : x)))
    } catch {
      // ignore failure marking as read
    }
  }

  return (
    <div className="bell-wrap" ref={panelRef}>
      <button className="bell-btn" onClick={() => setOpen((o) => !o)} aria-label={t.notifications.ariaLabel}>
        <BellIcon width={17} height={17} />
        {unreadCount > 0 && <span className="bell-badge">{unreadCount}</span>}
      </button>

      {open && (
        <div className="bell-panel">
          {notifications.length === 0 && (
            <p className="label" style={{ padding: '0.6rem' }}>
              {t.notifications.empty}
            </p>
          )}
          {notifications.map((n) => {
            const Icon = TYPE_ICON[n.type] ?? BellIcon
            return (
              <div
                key={n.id}
                className={`notif-item ${n.read ? 'notif-item--read' : 'notif-item--unread'}`}
                onClick={() => handleClickNotification(n)}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault()
                    handleClickNotification(n)
                  }
                }}
              >
                <span className="notif-icon">
                  <Icon width={15} height={15} />
                </span>
                <div>
                  <p className="notif-title">{TYPE_LABEL[n.type] ?? n.type}</p>
                  <p className="notif-message">{notificationMessage(n, t, language)}</p>
                  <p className="notif-time">{new Date(n.created_at).toLocaleString(locale)}</p>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
