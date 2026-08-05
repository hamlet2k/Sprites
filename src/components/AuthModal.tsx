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
            className="btn auth-oauth-btn auth-oauth-google"
            disabled={busy}
            onClick={() => void oauth('google')}
          >
            <GoogleLogo />
            {t('auth.google')}
          </button>
          <button
            type="button"
            className="btn auth-oauth-btn auth-oauth-discord"
            disabled={busy}
            onClick={() => void oauth('discord')}
          >
            <DiscordLogo />
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

function GoogleLogo() {
  return (
    <svg
      className="auth-oauth-icon"
      viewBox="0 0 24 24"
      width="18"
      height="18"
      aria-hidden
    >
      <path
        fill="#4285F4"
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
      />
      <path
        fill="#34A853"
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
      />
      <path
        fill="#FBBC05"
        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
      />
      <path
        fill="#EA4335"
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
      />
    </svg>
  )
}

function DiscordLogo() {
  return (
    <svg
      className="auth-oauth-icon"
      viewBox="0 0 24 24"
      width="18"
      height="18"
      aria-hidden
    >
      <path
        fill="#5865F2"
        d="M20.317 4.37a19.8 19.8 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.74 19.74 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.08.08 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028 14.09 14.09 0 0 0 1.226-1.994.076.076 0 0 0-.041-.106 13.1 13.1 0 0 1-1.872-.892.077.077 0 0 1-.008-.128c.126-.094.252-.192.372-.292a.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.3 12.3 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.363 1.225 1.993a.076.076 0 0 0 .084.028 19.84 19.84 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z"
      />
    </svg>
  )
}
