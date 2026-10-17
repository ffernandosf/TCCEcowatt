import { useState } from 'react'
import { createUserWithEmailAndPassword, signInWithEmailAndPassword } from 'firebase/auth'
import { auth } from '../lib/firebase'
import { friendlyAuthError } from '../lib/authErrors'
import { useI18n } from '../lib/i18n'
import { AuthBackground } from './AuthBackground'
import { LogoMark } from './Logo'

type Mode = 'login' | 'signup'

export function LoginPage() {
  const { t } = useI18n()
  const [revealed, setRevealed] = useState(false)
  const [mode, setMode] = useState<Mode>('signup')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  function switchMode(next: Mode) {
    setMode(next)
    setError('')
    setPassword('')
    setConfirmPassword('')
  }

  function openForm(startMode: Mode) {
    switchMode(startMode)
    setRevealed(true)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')

    if (mode === 'signup' && password !== confirmPassword) {
      setError(t.auth.passwordMismatch)
      return
    }

    setLoading(true)
    try {
      if (mode === 'signup') {
        await createUserWithEmailAndPassword(auth, email, password)
      } else {
        await signInWithEmailAndPassword(auth, email, password)
      }
    } catch (err: unknown) {
      setError(friendlyAuthError(err))
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className={`auth-split ${revealed ? 'is-revealed' : ''}`}>
      <div className="auth-split-form">
        <div className="auth-form-box">
          <div className="auth-mode-toggle">
            <button
              type="button"
              className={`auth-mode-btn ${mode === 'login' ? 'is-active' : ''}`}
              onClick={() => switchMode('login')}
            >
              {t.auth.login}
            </button>
            <button
              type="button"
              className={`auth-mode-btn ${mode === 'signup' ? 'is-active' : ''}`}
              onClick={() => switchMode('signup')}
            >
              {t.auth.signup}
            </button>
          </div>

          <form onSubmit={handleSubmit}>
            {error && (
              <p className="error-text" role="alert">
                {error}
              </p>
            )}
            <label className="field-label" htmlFor="auth-email">
              {t.auth.email}
            </label>
            <input
              id="auth-email"
              className="input"
              type="email"
              placeholder={t.auth.emailPlaceholder}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
            <label className="field-label" htmlFor="auth-password">
              {t.auth.password}
            </label>
            <input
              id="auth-password"
              className="input"
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              minLength={6}
              required
            />
            {mode === 'signup' && (
              <>
                <label className="field-label" htmlFor="auth-confirm-password">
                  {t.auth.confirmPassword}
                </label>
                <input
                  id="auth-confirm-password"
                  className="input"
                  type="password"
                  placeholder="••••••••"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  minLength={6}
                  required
                />
              </>
            )}
            <button className="btn btn-primary btn-block" type="submit" disabled={loading}>
              {loading
                ? mode === 'signup'
                  ? t.auth.creatingAccount
                  : t.auth.signingIn
                : mode === 'signup'
                  ? t.auth.signup
                  : t.auth.login}
            </button>
          </form>
        </div>
      </div>

      <div className="auth-split-logo">
        <AuthBackground onBrand />
        <div className="auth-split-logo-content">
          <LogoMark size={88} />
          <h1 className="auth-split-word">
            Eco<span>watt</span>
          </h1>
          <p className="auth-split-slogan">{t.brand.slogan}</p>
        </div>
      </div>

      <div className="auth-split-overlay">
        {revealed && <AuthBackground onBrand />}
        {!revealed ? (
          <div className="auth-overlay-inner">
            <p className="auth-overlay-eyebrow">{t.auth.overlayEyebrowIntro}</p>
            <h2 className="auth-overlay-title">{t.auth.overlayTitleIntro}</h2>
            <p className="auth-overlay-text">{t.auth.overlayTextIntro}</p>
            <ul className="auth-overlay-list">
              <li>{t.auth.overlayListItem1}</li>
              <li>{t.auth.overlayListItem2}</li>
              <li>{t.auth.overlayListItem3}</li>
            </ul>
            <button className="btn btn-primary" onClick={() => openForm('signup')}>
              {t.auth.ctaSignup}
            </button>
            <button className="auth-switch-link auth-overlay-login-link" onClick={() => openForm('login')}>
              {t.auth.ctaHaveAccount}
            </button>
          </div>
        ) : (
          <div className="auth-overlay-inner auth-overlay-inner--on-brand">
            <p className="auth-overlay-eyebrow">{t.auth.overlayEyebrowReady}</p>
            <h2 className="auth-overlay-title">{t.auth.overlayTitleReady}</h2>
            <p className="auth-overlay-text">{t.auth.overlayTextReady}</p>
            <button className="btn btn-ghost-on-brand" onClick={() => setRevealed(false)}>
              {t.common.back}
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
