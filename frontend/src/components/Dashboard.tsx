import { useEffect, useState } from 'react'
import { signOut } from 'firebase/auth'
import { auth } from '../lib/firebase'
import { listDevices, type DeviceOut } from '../lib/api'
import { useI18n } from '../lib/i18n'
import { Brand } from './Logo'
import { NotificationBell } from './NotificationBell'
import { PreferenceRow } from './PreferenceToggles'
import { ResidenceSwitcher } from './ResidenceSwitcher'
import { TipWidget } from './TipWidget'
import {
  BoltIcon,
  BulbIcon,
  CalculatorIcon,
  ChartBarIcon,
  ChipIcon,
  HomeIcon,
  LeafIcon,
  LogoutIcon,
  TargetIcon,
  TrendUpIcon,
  UserIcon,
} from './icons'
import { LiveTab } from './tabs/LiveTab'
import { ExpertTab } from './tabs/ExpertTab'
import { SimulatorTab } from './tabs/SimulatorTab'
import { TariffTab } from './tabs/TariffTab'
import { GoalTab } from './tabs/GoalTab'
import { ComparisonTab } from './tabs/ComparisonTab'
import { SustainabilityTab } from './tabs/SustainabilityTab'
import { DeviceSetupTab } from './tabs/DeviceSetupTab'
import { ResidencesTab } from './tabs/ResidencesTab'
import { ProfileTab } from './tabs/ProfileTab'

type TabId =
  | 'live'
  | 'expert'
  | 'simulator'
  | 'goal'
  | 'comparison'
  | 'sustainability'
  | 'tariff'
  | 'devices'
  | 'residences'
  | 'profile'

const FALLBACK_DEVICE_ID = import.meta.env.VITE_DEVICE_ID as string | undefined

export function Dashboard() {
  const { t } = useI18n()
  const [activeTab, setActiveTab] = useState<TabId>('live')
  const [devices, setDevices] = useState<DeviceOut[]>([])
  const [devicesLoaded, setDevicesLoaded] = useState(false)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState('')

  const TABS: { id: TabId; label: string; subtitle: string; Icon: typeof BoltIcon }[] = [
    { id: 'live', label: t.nav.live, subtitle: t.nav.liveSubtitle, Icon: BoltIcon },
    { id: 'expert', label: t.nav.expert, subtitle: t.nav.expertSubtitle, Icon: ChartBarIcon },
    { id: 'simulator', label: t.nav.simulator, subtitle: t.nav.simulatorSubtitle, Icon: CalculatorIcon },
    { id: 'goal', label: t.nav.goal, subtitle: t.nav.goalSubtitle, Icon: TargetIcon },
    { id: 'comparison', label: t.nav.comparison, subtitle: t.nav.comparisonSubtitle, Icon: TrendUpIcon },
    { id: 'sustainability', label: t.nav.sustainability, subtitle: t.nav.sustainabilitySubtitle, Icon: LeafIcon },
    { id: 'tariff', label: t.nav.tariff, subtitle: t.nav.tariffSubtitle, Icon: BulbIcon },
  ]

  const ACCOUNT_TABS: { id: TabId; label: string; subtitle: string; Icon: typeof BoltIcon }[] = [
    { id: 'devices', label: t.nav.devices, subtitle: t.nav.devicesSubtitle, Icon: ChipIcon },
    { id: 'residences', label: t.nav.residences, subtitle: t.nav.residencesSubtitle, Icon: HomeIcon },
    { id: 'profile', label: t.nav.profile, subtitle: t.nav.profileSubtitle, Icon: UserIcon },
  ]

  async function loadDevices(preferId?: string) {
    setLoadError('')
    try {
      const result = await listDevices()
      setDevices(result)
      setDevicesLoaded(true)
      setSelectedId((current) => {
        if (preferId && result.some((d) => d.device_id === preferId)) return preferId
        if (current && result.some((d) => d.device_id === current)) return current
        if (FALLBACK_DEVICE_ID && result.some((d) => d.device_id === FALLBACK_DEVICE_ID)) {
          return FALLBACK_DEVICE_ID
        }
        return result[0]?.device_id ?? null
      })
    } catch (err) {
      // Never let a network/token failure look like "you have no residences".
      setLoadError(err instanceof Error ? err.message : t.nav.loadErrorTitle)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadDevices()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const active = [...TABS, ...ACCOUNT_TABS].find((tab) => tab.id === activeTab)!
  const needsResidence =
    devicesLoaded && !selectedId && activeTab !== 'residences' && activeTab !== 'profile'

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="sidebar-brand">
          <Brand />
        </div>

        {!loading && (
          <ResidenceSwitcher
            devices={devices}
            selectedId={selectedId}
            onSelect={setSelectedId}
            onManage={() => setActiveTab('residences')}
          />
        )}

        <p className="sidebar-section-label">{t.nav.panelSection}</p>
        <nav className="sidebar-nav">
          {TABS.map(({ id, label, Icon }) => (
            <button
              key={id}
              className={`nav-tab ${activeTab === id ? 'is-active' : ''}`}
              onClick={() => setActiveTab(id)}
            >
              <span className="nav-tab-led" />
              <Icon width={16} height={16} />
              {label}
            </button>
          ))}
        </nav>

        <p className="sidebar-section-label">{t.nav.accountSection}</p>
        <nav className="sidebar-nav">
          {ACCOUNT_TABS.map(({ id, label, Icon }) => (
            <button
              key={id}
              className={`nav-tab ${activeTab === id ? 'is-active' : ''}`}
              onClick={() => setActiveTab(id)}
            >
              <span className="nav-tab-led" />
              <Icon width={16} height={16} />
              {label}
            </button>
          ))}
        </nav>

        <div className="sidebar-footer">
          <PreferenceRow />
          <p className="sidebar-copyright">
            © {new Date().getFullYear()} Ecowatt. {t.footer.rights}
          </p>
          <button className="btn btn-ghost btn-block" onClick={() => signOut(auth)}>
            <LogoutIcon width={16} height={16} />
            {t.nav.logout}
          </button>
        </div>
      </aside>

      <div className="main">
        <div className="main-header">
          <div>
            <h1 className="page-title">{active.label}</h1>
            <p className="page-subtitle">{active.subtitle}</p>
          </div>
          <div className="main-header-actions">{selectedId && <NotificationBell deviceId={selectedId} />}</div>
        </div>

        <div className="content">
          {loading && <p className="waiting">{t.common.loading}</p>}

          {!loading && loadError && activeTab !== 'residences' && activeTab !== 'profile' && (
            <div className="card" style={{ maxWidth: 'none' }}>
              <p className="card-title">
                <HomeIcon width={15} height={15} />
                {t.nav.loadErrorTitle}
              </p>
              <p className="error-text">{loadError}</p>
              <button className="btn btn-primary" onClick={() => loadDevices()}>
                {t.common.tryAgain}
              </button>
            </div>
          )}

          {needsResidence && (
            <div className="card" style={{ maxWidth: 'none' }}>
              <p className="card-title">
                <HomeIcon width={15} height={15} />
                {t.nav.noResidenceTitle}
              </p>
              <p className="card-subtitle">{t.nav.noResidenceText}</p>
              <button className="btn btn-primary" onClick={() => setActiveTab('residences')}>
                {t.nav.addResidence}
              </button>
            </div>
          )}

          {!loading && !needsResidence && (!loadError || activeTab === 'residences' || activeTab === 'profile') && (
            <>
              {activeTab === 'live' && selectedId && <LiveTab deviceId={selectedId} />}
              {activeTab === 'expert' && selectedId && <ExpertTab deviceId={selectedId} />}
              {activeTab === 'simulator' && selectedId && <SimulatorTab deviceId={selectedId} />}
              {activeTab === 'goal' && selectedId && <GoalTab deviceId={selectedId} />}
              {activeTab === 'comparison' && selectedId && <ComparisonTab deviceId={selectedId} />}
              {activeTab === 'sustainability' && selectedId && <SustainabilityTab deviceId={selectedId} />}
              {activeTab === 'tariff' && <TariffTab />}
              {activeTab === 'devices' && selectedId && <DeviceSetupTab deviceId={selectedId} />}
              {activeTab === 'residences' && (
                <ResidencesTab
                  devices={devices}
                  selectedId={selectedId}
                  onSelect={setSelectedId}
                  onDevicesChange={() => loadDevices()}
                />
              )}
              {activeTab === 'profile' && <ProfileTab />}
            </>
          )}
        </div>
      </div>

      <TipWidget />
    </div>
  )
}
