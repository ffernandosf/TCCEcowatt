import { useI18n } from '../lib/i18n'
import { useTheme } from '../lib/theme'
import { MoonIcon, SunIcon } from './icons'

export function ThemeToggle() {
  const { theme, toggleTheme } = useTheme()
  return (
    <button className="pref-toggle-btn" onClick={toggleTheme} aria-label="Toggle theme" type="button">
      {theme === 'light' ? <MoonIcon width={14} height={14} /> : <SunIcon width={14} height={14} />}
    </button>
  )
}

export function LanguageToggle() {
  const { language, setLanguage } = useI18n()
  return (
    <button
      className="pref-toggle-btn"
      onClick={() => setLanguage(language === 'pt' ? 'en' : 'pt')}
      aria-label="Toggle language"
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
