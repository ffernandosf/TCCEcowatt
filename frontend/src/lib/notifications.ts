import type { NotificationOut } from './api'
import { localeFor } from './i18n'
import type { Language, Translations } from './translations'

function fill(template: string, values: Record<string, string>): string {
  return Object.entries(values).reduce((text, [key, value]) => text.split(`{${key}}`).join(value), template)
}

// Monta o texto no idioma atual a partir de type + params. Avisos sem params
// (formato antigo) caem no texto original gravado pelo servidor.
export function notificationMessage(n: NotificationOut, t: Translations, language: Language): string {
  const p = n.params
  if (!p) return n.message
  const locale = localeFor(language)
  const number = (value: number) => value.toLocaleString(locale, { maximumFractionDigits: 0 })
  const brl = (value: number) => value.toLocaleString(locale, { style: 'currency', currency: 'BRL' })

  if (n.type === 'offline' && p.minutes != null) {
    return fill(t.notifications.msgOffline, { minutes: number(p.minutes) })
  }
  if (n.type === 'limit' && p.current_brl != null && p.budget_brl != null) {
    return fill(t.notifications.msgLimit, { current: brl(p.current_brl), budget: brl(p.budget_brl) })
  }
  if (n.type === 'spike' && p.power_w != null && p.baseline_w != null) {
    return fill(t.notifications.msgSpike, { power: number(p.power_w), baseline: number(p.baseline_w) })
  }
  return n.message
}
