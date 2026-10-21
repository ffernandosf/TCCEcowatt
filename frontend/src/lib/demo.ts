import jsPDF from 'jspdf'
import type {
  CarbonOut,
  ComparisonOut,
  DashboardSummary,
  DeviceClaimResponse,
  DeviceOut,
  DeviceStatusOut,
  GoalOut,
  HeatmapCell,
  NotificationOut,
  ReadingOut,
  RollupOut,
  StandbyOut,
  TariffOut,
} from './api'

// Conta usada só pra demonstração: sempre vê dados fictícios, mesmo com
// backend/Firebase reais no ar. Qualquer outra conta usa dados reais.
const DEMO_ACCOUNT_EMAILS = ['ferreirasteam@gmail.com', 'teste@gmail.com']

export let DEMO_MODE = false

export function syncDemoMode(email: string | null | undefined): void {
  DEMO_MODE = !!email && DEMO_ACCOUNT_EMAILS.includes(email.toLowerCase())
}

const TARIFF_RATE = 0.75
const FLAG_SURCHARGE = 0.01885
const EFFECTIVE_RATE = TARIFF_RATE + FLAG_SURCHARGE

export const MOCK_DEVICES: DeviceOut[] = [
  { device_id: 'casa-principal', name: 'Casa Principal' },
  { device_id: 'casa-praia', name: 'Casa da Praia' },
]

function noise(spread: number): number {
  return (Math.random() - 0.5) * 2 * spread
}

// Curva típica de consumo residencial ao longo do dia (W), usada tanto pra
// gerar leituras "reais" quanto o mapa de calor — picos de banho/café da manhã
// e de banho/jantar/TV à noite.
function baseWattsForHour(hour: number): number {
  const curve = [140, 130, 120, 120, 130, 180, 480, 1350, 700, 420, 380, 400, 430, 400, 380, 420, 560, 780, 1150, 2050, 1900, 1200, 650, 300]
  return curve[hour % 24]
}

export interface MockLiveReading {
  power: number
  voltage: number
  current: number
  energy: number
  frequency: number
  power_factor: number
  timestamp: string
}

export function mockLiveReading(tick = 0): MockLiveReading {
  const now = new Date()
  const power = Math.max(20, baseWattsForHour(now.getHours()) + noise(60) + Math.sin(tick / 3) * 40)
  const voltage = 220 + noise(2.5)
  return {
    timestamp: now.toISOString(),
    voltage,
    current: power / voltage,
    power,
    energy: power / 60,
    frequency: 60 + noise(0.06),
    power_factor: 0.94 + noise(0.03),
  }
}

export function mockReadings(from: Date, to: Date): ReadingOut[] {
  const readings: ReadingOut[] = []
  const stepMs = 30 * 60 * 1000
  let id = 1
  for (let t = from.getTime(); t <= to.getTime(); t += stepMs) {
    const d = new Date(t)
    const power = Math.max(15, baseWattsForHour(d.getHours()) + noise(70))
    const voltage = 220 + noise(3)
    readings.push({
      id: id++,
      timestamp: d.toISOString(),
      voltage,
      current: power / voltage,
      power,
      energy: (power * stepMs) / 3600000, // Wh = W * h; stepMs/3.6e6 converte ms em h
      frequency: 60 + noise(0.08),
      power_factor: 0.93 + noise(0.04),
    })
  }
  return readings
}

// Soma da curva diária típica (baseWattsForHour ao longo de 24h) — usada como
// linha de base pros rollups diários do histórico.
function dailyBaseEnergyWh(date: Date): number {
  let total = 0
  for (let h = 0; h < 24; h++) total += baseWattsForHour(h)
  const isWeekend = date.getDay() === 0 || date.getDay() === 6
  const dayVariation = 0.85 + Math.random() * 0.3
  return total * (isWeekend ? 1.15 : 1) * dayVariation
}

export function mockRollups(from: Date, to: Date): RollupOut[] {
  const rollups: RollupOut[] = []
  const dayMs = 24 * 60 * 60 * 1000
  let cursor = new Date(from.getFullYear(), from.getMonth(), from.getDate())
  while (cursor.getTime() <= to.getTime()) {
    const energyWh = dailyBaseEnergyWh(cursor)
    const avgPower = energyWh / 24
    rollups.push({
      period_start: cursor.toISOString(),
      period_end: new Date(cursor.getTime() + dayMs).toISOString(),
      energy_wh: energyWh,
      cost_brl: (energyWh / 1000) * EFFECTIVE_RATE,
      avg_power: avgPower,
      min_power: Math.max(10, avgPower * 0.2),
      max_power: avgPower * 3.2,
      sample_count: 48,
    })
    cursor = new Date(cursor.getTime() + dayMs)
  }
  return rollups
}

export function mockDashboard(deviceId: string, from: Date, to: Date): DashboardSummary {
  const spanMs = to.getTime() - from.getTime()
  const isMultiDay = spanMs > 1.5 * 24 * 60 * 60 * 1000

  if (isMultiDay) {
    const rollups = mockRollups(from, to)
    const totalEnergyWh = rollups.reduce((sum, r) => sum + r.energy_wh, 0)
    return {
      device_id: deviceId,
      granularity: 'day',
      tariff_rate_brl_per_kwh: TARIFF_RATE,
      total_energy_wh: totalEnergyWh,
      total_cost_brl: (totalEnergyWh / 1000) * EFFECTIVE_RATE,
      rollups,
    }
  }

  const readings = mockReadings(from, to)
  const totalEnergyWh = readings.reduce((sum, r) => sum + (r.energy ?? 0), 0)
  return {
    device_id: deviceId,
    granularity: 'hour',
    tariff_rate_brl_per_kwh: TARIFF_RATE,
    total_energy_wh: totalEnergyWh,
    total_cost_brl: (totalEnergyWh / 1000) * EFFECTIVE_RATE,
    rollups: [],
  }
}

let mockTariffRate = TARIFF_RATE

export function mockTariff(): TariffOut {
  return {
    tariff_rate_brl_per_kwh: mockTariffRate,
    rate_configured: true,
    tariff_flag: 'yellow',
    tariff_flag_label: 'Amarela',
    flag_source: 'aneel',
    flag_reference_month: new Date().toISOString().slice(0, 8) + '01',
    flag_surcharge_brl_per_kwh: FLAG_SURCHARGE,
    effective_rate_brl_per_kwh: mockTariffRate + FLAG_SURCHARGE,
  }
}

export function mockSetTariff(rateBrlPerKwh: number): TariffOut {
  mockTariffRate = rateBrlPerKwh
  return mockTariff()
}

export function mockDeviceStatus(deviceId: string): DeviceStatusOut {
  return { device_id: deviceId, claimed: true }
}

export function mockClaim(deviceId: string): DeviceClaimResponse {
  return { device_id: deviceId, device_key: `demo-${Math.random().toString(16).slice(2, 10)}` }
}

let mockGoalBudget = 250
export function mockGetGoal(deviceId: string): GoalOut {
  const current = 142.37
  return {
    device_id: deviceId,
    monthly_budget_brl: mockGoalBudget,
    current_cost_brl: current,
    projected_cost_brl: current * 1.63,
    percent_used: mockGoalBudget > 0 ? (current / mockGoalBudget) * 100 : 0,
  }
}
export function mockSetGoal(deviceId: string, budget: number): GoalOut {
  mockGoalBudget = budget
  return mockGetGoal(deviceId)
}

const mockNotifications: NotificationOut[] = [
  {
    id: 1,
    type: 'spike',
    message: 'Pico de potência detectado: 2350 W às 19:42.',
    read: false,
    created_at: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: 2,
    type: 'limit',
    message: 'Você atingiu 80% da meta mensal de R$ 250,00.',
    read: false,
    created_at: new Date(Date.now() - 26 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: 3,
    type: 'offline',
    message: 'Dispositivo ficou offline por 12 minutos.',
    read: true,
    created_at: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
  },
]

export function mockGetNotifications(unreadOnly: boolean): NotificationOut[] {
  return unreadOnly ? mockNotifications.filter((n) => !n.read) : mockNotifications
}

export function mockMarkRead(id: number): NotificationOut {
  const n = mockNotifications.find((x) => x.id === id)
  if (n) n.read = true
  return n ?? mockNotifications[0]
}

export function mockComparison(granularity: 'week' | 'month'): ComparisonOut {
  if (granularity === 'week') {
    return {
      granularity,
      current: { energy_wh: 42500, cost_brl: 36.9 },
      previous: { energy_wh: 39800, cost_brl: 34.55 },
    }
  }
  return {
    granularity,
    current: { energy_wh: 182300, cost_brl: 158.2 },
    previous: { energy_wh: 196400, cost_brl: 170.35 },
  }
}

const WEEKDAY_LABELS_ORDER = [0, 1, 2, 3, 4, 5, 6] // Seg..Dom

export function mockHeatmap(): HeatmapCell[] {
  const cells: HeatmapCell[] = []
  for (const weekday of WEEKDAY_LABELS_ORDER) {
    const isWeekend = weekday >= 5
    for (let hour = 0; hour < 24; hour++) {
      const base = baseWattsForHour(hour)
      const weekendBoost = isWeekend && hour >= 9 && hour <= 22 ? 1.25 : 1
      cells.push({
        weekday,
        hour,
        avg_power: Math.max(10, base * weekendBoost + noise(40)),
        sample_count: 24,
      })
    }
  }
  return cells
}

export function mockStandby(): StandbyOut {
  return { standby_hours: 5.4, standby_energy_wh: 410, standby_cost_brl: 0.32, episodes: 16 }
}

export function mockCarbon(): CarbonOut {
  return { energy_wh: 182300, carbon_kg: 14.6, trees_equivalent: 0.7 }
}

type RGB = [number, number, number]

function hexToRgb(hex: string): RGB {
  const n = parseInt(hex.replace('#', ''), 16)
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255]
}

// Mesma paleta de index.css (tema claro — o PDF é sempre "papel claro").
const REPORT_COLORS = {
  accent: hexToRgb('#a8551f'),
  accentBg: hexToRgb('#f8ece1'),
  bg: hexToRgb('#eaeff4'),
  surface: hexToRgb('#ffffff'),
  border: hexToRgb('#d6dee7'),
  text: hexToRgb('#121a23'),
  textSecondary: hexToRgb('#4b5866'),
  textMuted: hexToRgb('#7c8997'),
  barEnergy: hexToRgb('#0d7a55'), // --chart-series-1
  lineCost: hexToRgb('#a8551f'), // --chart-series-3
  grid: hexToRgb('#dde4ec'), // --chart-grid
  axis: hexToRgb('#8794a2'), // --chart-axis
}

function drawDailyChart(doc: jsPDF, x: number, topY: number, w: number, h: number, rollups: RollupOut[]): void {
  const c = REPORT_COLORS

  doc.setFont('helvetica', 'bold')
  doc.setFontSize(11)
  doc.setTextColor(...c.text)
  doc.text('Consumo diário', x, topY + 0.5)

  const legendY = topY + 0.45
  doc.setFillColor(...c.barEnergy)
  doc.rect(x + w - 6.4, legendY - 0.28, 0.35, 0.28, 'F')
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(8)
  doc.setTextColor(...c.textSecondary)
  doc.text('Energia (kWh)', x + w - 5.9, legendY - 0.05)

  doc.setDrawColor(...c.lineCost)
  doc.setLineWidth(0.04)
  doc.line(x + w - 2.9, legendY - 0.14, x + w - 2.4, legendY - 0.14)
  doc.setFillColor(...c.lineCost)
  doc.circle(x + w - 2.65, legendY - 0.14, 0.055, 'F')
  doc.text('Custo (R$)', x + w - 2.25, legendY - 0.05)

  const plotX0 = x + 1.4
  const plotX1 = x + w - 1.4
  const plotY1 = topY + 1.3
  const plotY0 = topY + h - 0.9
  const plotW = plotX1 - plotX0
  const plotH = plotY0 - plotY1

  if (rollups.length === 0 || plotH <= 0) {
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(9)
    doc.setTextColor(...c.textMuted)
    doc.text('Sem dados suficientes para o período.', x + w / 2, topY + h / 2, { align: 'center' })
    return
  }

  const energiesKwh = rollups.map((r) => r.energy_wh / 1000)
  const costs = rollups.map((r) => r.cost_brl)
  const maxEnergy = Math.max(...energiesKwh, 0.01) * 1.15
  const maxCost = Math.max(...costs, 0.01) * 1.15

  for (let i = 0; i <= 4; i++) {
    const frac = i / 4
    const yy = plotY0 - frac * plotH
    doc.setDrawColor(...c.grid)
    doc.setLineWidth(0.01)
    doc.line(plotX0, yy, plotX1, yy)
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(7)
    doc.setTextColor(...c.axis)
    doc.text((frac * maxEnergy).toFixed(1), plotX0 - 0.15, yy + 0.08, { align: 'right' })
    doc.text((frac * maxCost).toFixed(0), plotX1 + 0.15, yy + 0.08, { align: 'left' })
  }

  const n = rollups.length
  const slotW = plotW / n
  const barW = slotW * 0.6
  doc.setFillColor(...c.barEnergy)
  rollups.forEach((r, i) => {
    const bx = plotX0 + i * slotW + (slotW - barW) / 2
    const barH = (r.energy_wh / 1000 / maxEnergy) * plotH
    doc.rect(bx, plotY0 - barH, barW, barH, 'F')
  })

  const points: [number, number][] = rollups.map((r, i) => {
    const cx = plotX0 + i * slotW + slotW / 2
    const cy = plotY0 - (r.cost_brl / maxCost) * plotH
    return [cx, cy]
  })
  doc.setDrawColor(...c.lineCost)
  doc.setLineWidth(0.045)
  for (let i = 0; i < points.length - 1; i++) {
    doc.line(points[i][0], points[i][1], points[i + 1][0], points[i + 1][1])
  }
  doc.setFillColor(...c.lineCost)
  points.forEach(([px, py]) => doc.circle(px, py, 0.055, 'F'))

  doc.setDrawColor(...c.border)
  doc.setLineWidth(0.02)
  doc.line(plotX0, plotY0, plotX1, plotY0)

  const labelStep = Math.max(1, Math.ceil(n / 12))
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(6.5)
  doc.setTextColor(...c.axis)
  rollups.forEach((r, i) => {
    if (i % labelStep !== 0) return
    const cx = plotX0 + i * slotW + slotW / 2
    const d = new Date(r.period_start)
    doc.text(d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' }), cx, plotY0 + 0.45, {
      align: 'center',
    })
  })
}

function drawTableHeaderRow(
  doc: jsPDF,
  margin: number,
  y: number,
  contentWidth: number,
  col1X: number,
  col2X: number,
  col3X: number,
): number {
  const c = REPORT_COLORS
  doc.setFillColor(...c.accentBg)
  doc.rect(margin, y, contentWidth, 0.7, 'F')
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(9)
  doc.setTextColor(...c.text)
  doc.text('DATA', col1X, y + 0.47)
  doc.text('ENERGIA (kWh)', col2X, y + 0.47, { align: 'right' })
  doc.text('CUSTO (R$)', col3X, y + 0.47, { align: 'right' })
  return y + 0.7
}

// Espelha o layout de backend/app/services/pdf_report.py, mas com rollups
// fictícios — a conta demo não tem dispositivos reais no banco pro backend consultar.
export function mockReportPdf(deviceId: string, from: Date, to: Date): Blob {
  const c = REPORT_COLORS
  const rollups = mockRollups(from, to)
  const totalEnergyWh = rollups.reduce((sum, r) => sum + r.energy_wh, 0)
  const totalCostBrl = rollups.reduce((sum, r) => sum + r.cost_brl, 0)
  const avgEnergyKwh = rollups.length > 0 ? totalEnergyWh / 1000 / rollups.length : 0
  const avgCostBrl = rollups.length > 0 ? totalCostBrl / rollups.length : 0

  const doc = new jsPDF({ unit: 'cm', format: 'a4' })
  const pageWidth = doc.internal.pageSize.getWidth()
  const pageHeight = doc.internal.pageSize.getHeight()
  const margin = 2
  const contentWidth = pageWidth - margin * 2

  // Faixa de cabeçalho
  doc.setFillColor(...c.accent)
  doc.rect(0, 0, pageWidth, 3, 'F')
  doc.setTextColor(255, 255, 255)
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(19)
  doc.text('Relatório de consumo de energia', margin, 1.7)
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(9)
  doc.text('ECOWATT', pageWidth - margin, 1.05, { align: 'right' })
  doc.setFontSize(8)
  doc.text(`Gerado em ${new Date().toLocaleString('pt-BR')}`, pageWidth - margin, 1.55, { align: 'right' })

  let y = 3 + 0.9

  // Caixa de metadados
  const metaH = 1.9
  doc.setFillColor(...c.bg)
  doc.setDrawColor(...c.border)
  doc.setLineWidth(0.02)
  doc.roundedRect(margin, y, contentWidth, metaH, 0.15, 0.15, 'FD')
  const metaColW = contentWidth / 3
  const metaItems: [string, string][] = [
    ['Dispositivo', deviceId],
    ['Período', `${from.toLocaleDateString('pt-BR')} a ${to.toLocaleDateString('pt-BR')}`],
    ['Tarifa considerada', `R$ ${EFFECTIVE_RATE.toFixed(2)}/kWh`],
  ]
  metaItems.forEach(([label, value], i) => {
    const cx = margin + 0.6 + i * metaColW
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(8)
    doc.setTextColor(...c.textMuted)
    doc.text(label.toUpperCase(), cx, y + 0.7)
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(11)
    doc.setTextColor(...c.text)
    doc.text(value, cx, y + 1.35, { maxWidth: metaColW - 0.6 })
  })
  y += metaH + 0.8

  // Cards de resumo
  const cardGap = 0.5
  const cardW = (contentWidth - cardGap * 2) / 3
  const cardH = 2.5
  const stats: [string, string, RGB][] = [
    ['Consumo total', `${(totalEnergyWh / 1000).toFixed(2)} kWh`, c.barEnergy],
    ['Custo total estimado', `R$ ${totalCostBrl.toFixed(2)}`, c.accent],
    ['Média diária', `${avgEnergyKwh.toFixed(2)} kWh · R$ ${avgCostBrl.toFixed(2)}`, c.textSecondary],
  ]
  stats.forEach(([label, value, accentColor], i) => {
    const cx = margin + i * (cardW + cardGap)
    doc.setFillColor(...c.surface)
    doc.setDrawColor(...c.border)
    doc.setLineWidth(0.02)
    doc.roundedRect(cx, y, cardW, cardH, 0.12, 0.12, 'FD')
    doc.setFillColor(...accentColor)
    doc.rect(cx, y, cardW, 0.09, 'F')
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(8)
    doc.setTextColor(...c.textMuted)
    doc.text(label.toUpperCase(), cx + 0.4, y + 0.75, { maxWidth: cardW - 0.8 })
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(12)
    doc.setTextColor(...c.text)
    doc.text(value, cx + 0.4, y + 1.65, { maxWidth: cardW - 0.8 })
  })
  y += cardH + 1

  // Gráfico
  const chartH = 7.5
  drawDailyChart(doc, margin, y, contentWidth, chartH, rollups)
  y += chartH + 1

  // Tabela
  const col1X = margin + 0.4
  const col2X = margin + contentWidth * 0.68
  const col3X = margin + contentWidth - 0.3
  const rowH = 0.6

  y = drawTableHeaderRow(doc, margin, y, contentWidth, col1X, col2X, col3X)
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(9)
  rollups.forEach((rollup, i) => {
    if (y + rowH > pageHeight - 2.4) {
      doc.addPage()
      y = margin
      y = drawTableHeaderRow(doc, margin, y, contentWidth, col1X, col2X, col3X)
      doc.setFont('helvetica', 'normal')
      doc.setFontSize(9)
    }
    if (i % 2 === 1) {
      doc.setFillColor(...c.bg)
      doc.rect(margin, y, contentWidth, rowH, 'F')
    }
    const date = new Date(rollup.period_start)
    doc.setTextColor(...c.textSecondary)
    doc.text(date.toLocaleDateString('pt-BR'), col1X, y + rowH - 0.18)
    doc.setTextColor(...c.text)
    doc.text((rollup.energy_wh / 1000).toFixed(2), col2X, y + rowH - 0.18, { align: 'right' })
    doc.text(rollup.cost_brl.toFixed(2), col3X, y + rowH - 0.18, { align: 'right' })
    y += rowH
  })
  doc.setDrawColor(...c.border)
  doc.setLineWidth(0.02)
  doc.line(margin, y, margin + contentWidth, y)

  // Rodapé em todas as páginas
  const pageCount = doc.getNumberOfPages()
  for (let p = 1; p <= pageCount; p++) {
    doc.setPage(p)
    doc.setDrawColor(...c.border)
    doc.setLineWidth(0.01)
    doc.line(margin, pageHeight - 1.4, pageWidth - margin, pageHeight - 1.4)
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(7.5)
    doc.setTextColor(...c.textMuted)
    doc.text('Ecowatt · Relatório gerado automaticamente', margin, pageHeight - 1.0)
    doc.text(`Página ${p} de ${pageCount}`, pageWidth - margin, pageHeight - 1.0, { align: 'right' })
  }

  return doc.output('blob')
}
