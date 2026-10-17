import { useState } from 'react'
import { updatePassword } from 'firebase/auth'
import { auth } from '../../lib/firebase'
import { useI18n } from '../../lib/i18n'
import { useTheme } from '../../lib/theme'
import { LanguageToggle, ThemeToggle } from '../PreferenceToggles'
import { UserIcon } from '../icons'

export function ProfileTab() {
  const { t, language } = useI18n()
  const { theme } = useTheme()
  const user = auth.currentUser
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)

  const locale = language === 'pt' ? 'pt-BR' : 'en-US'

  async function handleChangePassword(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setMessage('')

    if (newPassword !== confirmPassword) {
      setError(t.profile.passwordMismatch)
      return
    }
    if (!user) return

    setSaving(true)
    try {
      await updatePassword(user, newPassword)
      setMessage(t.profile.passwordUpdated)
      setNewPassword('')
      setConfirmPassword('')
    } catch (err) {
      const code = (err as { code?: string })?.code
      if (code === 'auth/requires-recent-login') {
        setError(t.profile.requiresRecentLogin)
      } else {
        setError(err instanceof Error ? err.message : t.profile.updateError)
      }
    } finally {
      setSaving(false)
    }
  }

  return (
    <>
      <div className="card">
        <p className="card-title">
          <UserIcon width={15} height={15} />
          {t.profile.title}
        </p>
        <div className="metric-grid">
          <div className="metric-tile">
            <p className="label">{t.profile.email}</p>
            <p className="metric-tile-value" style={{ fontSize: '0.95rem' }}>
              {user?.email}
            </p>
          </div>
          <div className="metric-tile">
            <p className="label">{t.profile.createdAt}</p>
            <p className="metric-tile-value" style={{ fontSize: '0.95rem' }}>
              {user?.metadata.creationTime
                ? new Date(user.metadata.creationTime).toLocaleDateString(locale)
                : '—'}
            </p>
          </div>
        </div>
      </div>

      <div className="card">
        <p className="card-title">{t.profile.preferencesTitle}</p>
        <div className="preferences-row">
          <div>
            <p className="label">{t.profile.theme}</p>
            <p className="metric-tile-value" style={{ fontSize: '0.85rem' }}>
              {theme === 'light' ? t.profile.themeLight : t.profile.themeDark}
            </p>
          </div>
          <ThemeToggle />
        </div>
        <div className="preferences-row">
          <div>
            <p className="label">{t.profile.language}</p>
            <p className="metric-tile-value" style={{ fontSize: '0.85rem' }}>
              {language === 'pt' ? 'Português' : 'English'}
            </p>
          </div>
          <LanguageToggle />
        </div>
      </div>

      <div className="card">
        <p className="card-title">{t.profile.changePasswordTitle}</p>
        {error && <p className="error-text">{error}</p>}
        {message && (
          <p className="label" style={{ color: 'var(--color-good)', marginBottom: '0.75rem' }}>
            {message}
          </p>
        )}
        <form onSubmit={handleChangePassword}>
          <label className="field-label">{t.profile.newPassword}</label>
          <input
            className="input"
            type="password"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            minLength={6}
            required
          />
          <label className="field-label">{t.profile.confirmNewPassword}</label>
          <input
            className="input"
            type="password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            minLength={6}
            required
          />
          <button className="btn btn-primary" type="submit" disabled={saving}>
            {saving ? t.profile.saving : t.profile.savePassword}
          </button>
        </form>
      </div>
    </>
  )
}
