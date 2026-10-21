import { useI18n } from '../lib/i18n'
import { useTheme } from '../lib/theme'
import { MoonIcon, SunIcon } from './icons'

export function ThemeToggle() {
  const { theme, toggleTheme } = useTheme()
  const { t } = useI18n()
  return (
    <button
      className="pref-toggle-btn"
      onClick={toggleTheme}
      aria-label={t.prefs.toggleTheme}
      title={t.prefs.toggleTheme}
      type="button"
    >
      {theme === 'light' ? <MoonIcon width={14} height={14} /> : <SunIcon width={14} height={14} />}
    </button>
  )
}

export function LanguageToggle() {
  const { language, setLanguage, t } = useI18n()
  return (
    <button
      className="pref-toggle-btn"
      onClick={() => setLanguage(language === 'pt' ? 'en' : 'pt')}
      aria-label={t.prefs.toggleLanguage}
      title={t.prefs.toggleLanguage}
      type="button"
    >
      {language === 'pt' ? 'EN' : 'PT'}
    </button>
  )
}

export function PreferenceRow() {
  return (
    <div className="sidebar-prefs">
      <ThemeToggle />
      <LanguageToggle />
    </div>
  )
}
