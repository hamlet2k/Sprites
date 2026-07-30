import { useState } from 'react'
import {
  requestPasswordReset,
  signInWithEmail,
  signInWithOAuth,
  signUpWithEmail,
  type AuthUser,
} from '../lib/auth'

type Mode = 'login' | 'signup' | 'forgot'

type Props = {
  t: (key: string, vars?: Record<string, string | number>) => string
  onClose: () => void
  onAuthed: (user: AuthUser | null) => void
}

export function AuthModal({ t, onClose, onAuthed }: Props) {
  const [mode, setMode] = useState<Mode>('login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [displayName, setDisplayName] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [info, setInfo] = useState<string | null>(null)

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    setBusy(true)
    setError(null)
    setInfo(null)
    try {
      if (mode === 'forgot') {
        const res = await requestPasswordReset(email)
        if (!res.ok) {
          setError(res.error)
          return
        }
        setInfo(t('auth.resetSent'))
        return
      }
      if (mode === 'signup') {
        const res = await signUpWithEmail(email, password, displayName)
        if (!res.ok) {
          setError(res.error)
          return
        }
        if (res.data) {
          onAuthed(res.data)
          onClose()
        } else {
          setInfo(t('auth.checkEmail'))
        }
        return
      }
      const res = await signInWithEmail(email, password)
      if (!res.ok) {
        setError(res.error)
        return
      }
      onAuthed(res.data)
      onClose()
    } finally {
      setBusy(false)
    }
  }

  async function oauth(provider: 'google' | 'discord') {
    setBusy(true)
    setError(null)
    const res = await signInWithOAuth(provider)
    if (!res.ok) {
      setError(res.error)
      setBusy(false)
    }
    // Redirect in progress when ok
  }

  return (
    <div className="modal-backdrop" role="presentation" onClick={onClose}>
      <div
        className="modal-panel auth-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="auth-modal-title"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="modal-header">
          <h2 id="auth-modal-title">
            {mode === 'login'
              ? t('auth.loginTitle')
              : mode === 'signup'
                ? t('auth.signupTitle')
                : t('auth.forgotTitle')}
          </h2>
          <button type="button" className="btn btn-sm btn-ghost" onClick={onClose}>
            {t('close')}
          </button>
        </div>
        <p className="auth-lead">{t('auth.optionalNote')}</p>

        <div className="auth-oauth">
          <button
            type="button"
            className="btn auth-oauth-btn"
            disabled={busy}
            onClick={() => void oauth('google')}
          >
            {t('auth.google')}
          </button>
          <button
            type="button"
            className="btn auth-oauth-btn"
            disabled={busy}
            onClick={() => void oauth('discord')}
          >
            {t('auth.discord')}
          </button>
        </div>

        <div className="auth-divider">
          <span>{t('auth.orEmail')}</span>
        </div>

        <form className="auth-form" onSubmit={(e) => void onSubmit(e)}>
          {mode === 'signup' && (
            <label className="auth-field">
              <span>{t('auth.displayName')}</span>
              <input
                type="text"
                autoComplete="nickname"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder={t('auth.displayNamePlaceholder')}
              />
            </label>
          )}
          <label className="auth-field">
            <span>{t('auth.email')}</span>
            <input
              type="email"
              required
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </label>
          {mode !== 'forgot' && (
            <label className="auth-field">
              <span>{t('auth.password')}</span>
              <input
                type="password"
                required
                minLength={6}
                autoComplete={mode === 'signup' ? 'new-password' : 'current-password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </label>
          )}
          {error && <p className="auth-error">{error}</p>}
          {info && <p className="auth-info">{info}</p>}
          <button type="submit" className="btn btn-primary auth-submit" disabled={busy}>
            {busy
              ? t('auth.working')
              : mode === 'login'
                ? t('auth.login')
                : mode === 'signup'
                  ? t('auth.signup')
                  : t('auth.sendReset')}
          </button>
        </form>

        <div className="auth-switch">
          {mode === 'login' && (
            <>
              <button type="button" className="linkish" onClick={() => setMode('forgot')}>
                {t('auth.forgotLink')}
              </button>
              <button type="button" className="linkish" onClick={() => setMode('signup')}>
                {t('auth.needAccount')}
              </button>
            </>
          )}
          {mode === 'signup' && (
            <button type="button" className="linkish" onClick={() => setMode('login')}>
              {t('auth.haveAccount')}
            </button>
          )}
          {mode === 'forgot' && (
            <button type="button" className="linkish" onClick={() => setMode('login')}>
              {t('auth.backToLogin')}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
