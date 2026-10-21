import { auth } from './firebase'
import {
  DEMO_MODE,
  MOCK_DEVICES,
  mockCarbon,
  mockClaim,
  mockComparison,
  mockDashboard,
  mockDeviceStatus,
  mockGetGoal,
  mockGetNotifications,
  mockHeatmap,
  mockMarkRead,
  mockReadings,
  mockReportPdf,
  mockSetGoal,
  mockStandby,
  mockSetTariff,
  mockTariff,
} from './demo'

const API_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:8000'

export interface ReadingOut {
  id: number
  timestamp: string
  voltage: number | null
  current: number | null
  power: number
  energy: number | null
  frequency: number | null
  power_factor: number | null
}

export interface RollupOut {
  period_start: string
  period_end: string
  energy_wh: number
  cost_brl: number
  avg_power: number
  min_power: number
  max_power: number
  sample_count: number
}

export interface DashboardSummary {
  device_id: string
  granularity: 'hour' | 'day'
  tariff_rate_brl_per_kwh: number
  total_energy_wh: number
  total_cost_brl: number
  rollups: RollupOut[]
}

export interface TariffOut {
  tariff_rate_brl_per_kwh: number
  rate_configured: boolean
  tariff_flag: 'green' | 'yellow' | 'red1' | 'red2'
  tariff_flag_label: string
  flag_source: 'aneel' | 'default'
  flag_reference_month: string | null
  flag_surcharge_brl_per_kwh: number
  effective_rate_brl_per_kwh: number
}

export interface HeatmapCell {
  weekday: number
  hour: number
  avg_power: number
  sample_count: number
}

export interface StandbyOut {
  standby_hours: number
  standby_energy_wh: number
  standby_cost_brl: number
  episodes: number
}

export interface CarbonOut {
  energy_wh: number
  carbon_kg: number
  trees_equivalent: number
}

export interface DeviceClaimResponse {
  device_id: string
  device_key: string
}

export interface DeviceStatusOut {
  device_id: string
  claimed: boolean
}

export interface DeviceOut {
  device_id: string
  name: string
}

export interface GoalOut {
  device_id: string
  monthly_budget_brl: number
  current_cost_brl: number
  projected_cost_brl: number
  percent_used: number
}

export interface NotificationOut {
  id: number
  type: 'offline' | 'limit' | 'spike'
  message: string
  read: boolean
  created_at: string
}

export interface PeriodTotals {
  energy_wh: number
  cost_brl: number
}

export interface ComparisonOut {
  granularity: 'week' | 'month'
  current: PeriodTotals
  previous: PeriodTotals
}

export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message)
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

// Um ID token recém-emitido (login/cadastro na hora) pode falhar a verificação no
// backend por um instante, por atraso de propagação do lado do Firebase. Sem isso,
// esse 401 passageiro fazia telas como "Residências" parecerem vazias logo após logar.
const RETRY_DELAYS_MS = [700, 1500]

async function authedFetch(path: string, init?: RequestInit): Promise<Response> {
  const user = auth.currentUser
  if (!user) throw new ApiError(401, 'Usuário não autenticado')

  let lastError = new ApiError(401, 'Usuário não autenticado')

  for (let attempt = 0; attempt <= RETRY_DELAYS_MS.length; attempt++) {
    const token = await user.getIdToken(attempt > 0)

    const res = await fetch(`${API_URL}${path}`, {
      ...init,
      headers: {
        ...init?.headers,
        Authorization: `Bearer ${token}`,
      },
    })

    if (res.ok) return res

    const body = await res.json().catch(() => null)
    lastError = new ApiError(res.status, body?.detail ?? res.statusText)

    if (res.status !== 401 || attempt === RETRY_DELAYS_MS.length) break
    await sleep(RETRY_DELAYS_MS[attempt])
  }

  throw lastError
}

export async function getReadings(
  deviceId: string,
  from: Date,
  to: Date,
): Promise<ReadingOut[]> {
  if (DEMO_MODE) return mockReadings(from, to)
  const params = new URLSearchParams({
    device_id: deviceId,
    from: from.toISOString(),
    to: to.toISOString(),
  })
  const res = await authedFetch(`/api/v1/readings?${params}`)
  return res.json()
}

export async function getDashboard(
  deviceId: string,
  from: Date,
  to: Date,
  granularity: 'hour' | 'day' = 'hour',
): Promise<DashboardSummary> {
  if (DEMO_MODE) return mockDashboard(deviceId, from, to)
  const params = new URLSearchParams({
    device_id: deviceId,
    from: from.toISOString(),
    to: to.toISOString(),
    granularity,
  })
  const res = await authedFetch(`/api/v1/dashboard?${params}`)
  return res.json()
}

export async function getTariff(): Promise<TariffOut> {
  if (DEMO_MODE) return mockTariff()
  const res = await authedFetch('/api/v1/tariff')
  return res.json()
}

export async function setTariff(rateBrlPerKwh: number): Promise<TariffOut> {
  if (DEMO_MODE) return mockSetTariff(rateBrlPerKwh)
  const res = await authedFetch('/api/v1/tariff', {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ tariff_rate_brl_per_kwh: rateBrlPerKwh }),
  })
  return res.json()
}

export async function getDeviceStatus(deviceId: string): Promise<DeviceStatusOut> {
  if (DEMO_MODE) return mockDeviceStatus(deviceId)
  const res = await authedFetch(`/api/v1/devices/${deviceId}`)
  return res.json()
}

export async function listDevices(): Promise<DeviceOut[]> {
  if (DEMO_MODE) return MOCK_DEVICES
  const res = await authedFetch('/api/v1/devices')
  return res.json()
}

export async function renameDevice(deviceId: string, name: string): Promise<DeviceOut> {
  if (DEMO_MODE) return { device_id: deviceId, name }
  const res = await authedFetch(`/api/v1/devices/${deviceId}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name }),
  })
  return res.json()
}

export async function claimDevice(deviceId: string, name?: string): Promise<DeviceClaimResponse> {
  if (DEMO_MODE) return mockClaim(deviceId)
  const res = await authedFetch(`/api/v1/devices/${deviceId}/claim`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name: name ?? null }),
  })
  return res.json()
}

export async function getGoal(deviceId: string): Promise<GoalOut> {
  if (DEMO_MODE) return mockGetGoal(deviceId)
  const res = await authedFetch(`/api/v1/goal?device_id=${encodeURIComponent(deviceId)}`)
  return res.json()
}

export async function setGoal(deviceId: string, monthlyBudgetBrl: number): Promise<GoalOut> {
  if (DEMO_MODE) return mockSetGoal(deviceId, monthlyBudgetBrl)
  const res = await authedFetch(`/api/v1/goal?device_id=${encodeURIComponent(deviceId)}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ monthly_budget_brl: monthlyBudgetBrl }),
  })
  return res.json()
}

export async function getNotifications(
  deviceId: string,
  unreadOnly = false,
): Promise<NotificationOut[]> {
  if (DEMO_MODE) return mockGetNotifications(unreadOnly)
  const params = new URLSearchParams({ device_id: deviceId, unread_only: String(unreadOnly) })
  const res = await authedFetch(`/api/v1/notifications?${params}`)
  return res.json()
}

export async function markNotificationRead(id: number): Promise<NotificationOut> {
  if (DEMO_MODE) return mockMarkRead(id)
  const res = await authedFetch(`/api/v1/notifications/${id}/read`, { method: 'POST' })
  return res.json()
}

export async function getComparison(
  deviceId: string,
  granularity: 'week' | 'month',
): Promise<ComparisonOut> {
  if (DEMO_MODE) return mockComparison(granularity)
  const params = new URLSearchParams({ device_id: deviceId, granularity })
  const res = await authedFetch(`/api/v1/comparison?${params}`)
  return res.json()
}

export async function getHeatmap(deviceId: string, from: Date, to: Date): Promise<HeatmapCell[]> {
  if (DEMO_MODE) return mockHeatmap()
  const params = new URLSearchParams({
    device_id: deviceId,
    from: from.toISOString(),
    to: to.toISOString(),
  })
  const res = await authedFetch(`/api/v1/heatmap?${params}`)
  return res.json()
}

export async function getStandby(deviceId: string, from: Date, to: Date): Promise<StandbyOut> {
  if (DEMO_MODE) return mockStandby()
  const params = new URLSearchParams({
    device_id: deviceId,
    from: from.toISOString(),
    to: to.toISOString(),
  })
  const res = await authedFetch(`/api/v1/standby?${params}`)
  return res.json()
}

export async function getCarbon(deviceId: string, from: Date, to: Date): Promise<CarbonOut> {
  if (DEMO_MODE) return mockCarbon()
  const params = new URLSearchParams({
    device_id: deviceId,
    from: from.toISOString(),
    to: to.toISOString(),
  })
  const res = await authedFetch(`/api/v1/carbon?${params}`)
  return res.json()
}

export async function downloadReport(deviceId: string, from: Date, to: Date): Promise<void> {
  let blob: Blob
  if (DEMO_MODE) {
    blob = mockReportPdf(deviceId, from, to)
  } else {
    const params = new URLSearchParams({
      device_id: deviceId,
      from: from.toISOString(),
      to: to.toISOString(),
    })
    const res = await authedFetch(`/api/v1/report?${params}`)
    blob = await res.blob()
  }
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = `relatorio-${deviceId}.pdf`
  link.click()
  URL.revokeObjectURL(url)
}
