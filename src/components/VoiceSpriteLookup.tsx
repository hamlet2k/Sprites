import { useCallback, useEffect, useRef, useState } from 'react'
import type { SpriteEntry } from '../data/sprites'
import {
  getSpeechRecognitionCtor,
  matchSpriteFromSpeech,
  speechLangForLocale,
} from '../lib/voiceSpriteLookup'
import { getPlayerSprite } from '../lib/storage'
import type { Player } from '../types'

type TFn = (key: string, vars?: Record<string, string | number>) => string

type OverlayState =
  | { kind: 'idle' }
  | { kind: 'listening' }
  | { kind: 'processing'; heard: string }
  | {
      kind: 'result'
      sprite: SpriteEntry
      heard: string
      status: 'none' | 'available' | 'lost'
      mastered: boolean
      playerName: string
    }
  | { kind: 'error'; message: string; heard?: string }

interface Props {
  t: TFn
  locale: string
  /** Collection used for status (your seat preferred). */
  player: Player | null
}

export function VoiceSpriteLookup({ t, locale, player }: Props) {
  const [overlay, setOverlay] = useState<OverlayState>({ kind: 'idle' })
  const [supported, setSupported] = useState(true)
  const recognitionRef = useRef<SpeechRecognition | null>(null)
  const holdingRef = useRef(false)
  const transcriptRef = useRef('')

  useEffect(() => {
    setSupported(Boolean(getSpeechRecognitionCtor()))
  }, [])

  const dismiss = useCallback(() => {
    holdingRef.current = false
    try {
      recognitionRef.current?.abort()
    } catch {
      /* ignore */
    }
    recognitionRef.current = null
    setOverlay({ kind: 'idle' })
  }, [])

  useEffect(() => {
    if (overlay.kind === 'idle') return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') dismiss()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [overlay.kind, dismiss])

  const resolveAndShow = useCallback(
    (heard: string) => {
      const match = matchSpriteFromSpeech(heard)
      if (!match.ok) {
        setOverlay({
          kind: 'error',
          message:
            match.reason === 'empty'
              ? t('voice.noSpeech')
              : t('voice.noMatch'),
          heard: match.heard || undefined,
        })
        return
      }
      if (!player) {
        setOverlay({
          kind: 'error',
          message: t('voice.noPlayer'),
          heard: match.heard,
        })
        return
      }
      const st = getPlayerSprite(player, match.sprite.id)
      setOverlay({
        kind: 'result',
        sprite: match.sprite,
        heard: match.heard,
        status: st.status,
        mastered: st.mastered,
        playerName: player.name,
      })
    },
    [player, t],
  )

  const startListening = useCallback(() => {
    const Ctor = getSpeechRecognitionCtor()
    if (!Ctor) {
      setSupported(false)
      setOverlay({ kind: 'error', message: t('voice.unsupported') })
      return
    }

    try {
      recognitionRef.current?.abort()
    } catch {
      /* ignore */
    }

    transcriptRef.current = ''
    const rec = new Ctor()
    recognitionRef.current = rec
    rec.lang = speechLangForLocale(locale)
    rec.interimResults = true
    rec.continuous = true
    rec.maxAlternatives = 3

    rec.onresult = (event: SpeechRecognitionEvent) => {
      let text = ''
      for (let i = 0; i < event.results.length; i++) {
        text += `${event.results[i][0]?.transcript ?? ''} `
      }
      transcriptRef.current = text.trim()
    }

    rec.onerror = (event: SpeechRecognitionErrorEvent) => {
      if (
        event.error === 'aborted' ||
        event.error === 'no-speech' ||
        event.error === 'network'
      ) {
        return
      }
      holdingRef.current = false
      if (event.error === 'not-allowed') {
        setOverlay({ kind: 'error', message: t('voice.permissionDenied') })
        return
      }
      setOverlay({
        kind: 'error',
        message: t('voice.error', { msg: event.error }),
      })
    }

    rec.onend = () => {
      recognitionRef.current = null
      // If still holding, engine timed out — restart
      if (holdingRef.current) {
        try {
          startListening()
        } catch {
          holdingRef.current = false
          setOverlay({ kind: 'error', message: t('voice.noSpeech') })
        }
        return
      }
      const heard = transcriptRef.current.trim()
      if (heard) {
        setOverlay({ kind: 'processing', heard })
        // Let the processing frame paint, then resolve
        window.setTimeout(() => resolveAndShow(heard), 40)
      } else {
        setOverlay({ kind: 'error', message: t('voice.noSpeech') })
      }
    }

    try {
      rec.start()
      setOverlay({ kind: 'listening' })
    } catch {
      setOverlay({ kind: 'error', message: t('voice.error', { msg: 'start' }) })
    }
  }, [locale, resolveAndShow, t])

  const stopListening = useCallback(() => {
    if (!holdingRef.current && !recognitionRef.current) return
    holdingRef.current = false
    try {
      recognitionRef.current?.stop()
    } catch {
      /* ignore */
    }
  }, [])

  const onPointerDown = (e: React.PointerEvent) => {
    e.preventDefault()
    try {
      ;(e.currentTarget as HTMLElement).setPointerCapture(e.pointerId)
    } catch {
      /* ignore */
    }
    holdingRef.current = true
    startListening()
  }

  const onPointerUp = (e: React.PointerEvent) => {
    e.preventDefault()
    stopListening()
  }

  const statusLabel = (status: 'none' | 'available' | 'lost') => {
    if (status === 'none') return t('status.missing')
    if (status === 'available') return t('status.available')
    return t('status.lost')
  }

  const statusTone = (status: 'none' | 'available' | 'lost') => {
    if (status === 'none') return 'missing'
    if (status === 'available') return 'ready'
    return 'lost'
  }

  const open = overlay.kind !== 'idle'

  return (
    <>
      <button
        type="button"
        className={`voice-mic-btn${
          overlay.kind === 'listening' ? ' is-listening' : ''
        }${!supported ? ' is-unsupported' : ''}`}
        title={t('voice.micTitle')}
        aria-label={t('voice.micTitle')}
        aria-pressed={overlay.kind === 'listening'}
        onPointerDown={onPointerDown}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
        onLostPointerCapture={onPointerUp}
        onContextMenu={(e) => e.preventDefault()}
      >
        <svg
          viewBox="0 0 24 24"
          width="26"
          height="26"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden
        >
          <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" />
          <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
          <line x1="12" y1="19" x2="12" y2="23" />
          <line x1="8" y1="23" x2="16" y2="23" />
        </svg>
        {overlay.kind === 'listening' && (
          <span className="voice-mic-pulse" aria-hidden />
        )}
      </button>

      {open && (
        <div
          className="voice-overlay-backdrop"
          role="presentation"
          onClick={dismiss}
        >
          <div
            className="voice-overlay-card"
            role="dialog"
            aria-modal="true"
            aria-label={t('voice.overlayTitle')}
            onClick={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              className="voice-overlay-close"
              onClick={dismiss}
              aria-label={t('voice.dismiss')}
              title={t('voice.dismiss')}
            >
              ×
            </button>

            {overlay.kind === 'listening' && (
              <div className="voice-overlay-body voice-listening">
                <div className="voice-listening-waves" aria-hidden>
                  <span />
                  <span />
                  <span />
                </div>
                <p className="voice-overlay-title">{t('voice.listening')}</p>
                <p className="voice-overlay-hint muted">
                  {t('voice.listeningHint')}
                </p>
              </div>
            )}

            {overlay.kind === 'processing' && (
              <div className="voice-overlay-body">
                <p className="voice-overlay-title">{t('voice.processing')}</p>
                <p className="muted voice-heard">“{overlay.heard}”</p>
              </div>
            )}

            {overlay.kind === 'error' && (
              <div className="voice-overlay-body">
                <p className="voice-overlay-title voice-error-title">
                  {overlay.message}
                </p>
                {overlay.heard ? (
                  <p className="muted voice-heard">“{overlay.heard}”</p>
                ) : null}
                <p className="voice-overlay-hint muted">{t('voice.tryAgain')}</p>
                <button
                  type="button"
                  className="btn btn-primary voice-dismiss-btn"
                  onClick={dismiss}
                >
                  {t('voice.dismiss')}
                </button>
              </div>
            )}

            {overlay.kind === 'result' && (
              <div className="voice-overlay-body voice-result">
                <div className="voice-result-art">
                  <img
                    src={overlay.sprite.imageUrl}
                    alt=""
                    className="voice-result-img"
                    draggable={false}
                  />
                </div>
                <h2 className="voice-result-name">{overlay.sprite.name}</h2>
                {overlay.heard && (
                  <p className="muted voice-heard">
                    {t('voice.youSaid', { heard: overlay.heard })}
                  </p>
                )}
                <p className="voice-result-for muted">
                  {t('voice.forPlayer', { name: overlay.playerName })}
                </p>
                <div className="voice-status-pills">
                  <span
                    className={`voice-status-pill tone-${statusTone(
                      overlay.status,
                    )}`}
                  >
                    {statusLabel(overlay.status)}
                  </span>
                  <span
                    className={`voice-status-pill ${
                      overlay.mastered ? 'tone-mastered' : 'tone-unmastered'
                    }`}
                  >
                    {overlay.mastered
                      ? t('voice.masteredYes')
                      : t('voice.masteredNo')}
                  </span>
                </div>
                {overlay.status === 'none' && (
                  <p className="voice-summary">{t('voice.summaryMissing')}</p>
                )}
                {overlay.status === 'available' && !overlay.mastered && (
                  <p className="voice-summary">
                    {t('voice.summaryReadyUnmastered')}
                  </p>
                )}
                {overlay.status === 'available' && overlay.mastered && (
                  <p className="voice-summary">
                    {t('voice.summaryReadyMastered')}
                  </p>
                )}
                {overlay.status === 'lost' && (
                  <p className="voice-summary">
                    {overlay.mastered
                      ? t('voice.summaryLostMastered')
                      : t('voice.summaryLostUnmastered')}
                  </p>
                )}
                <button
                  type="button"
                  className="btn btn-primary voice-dismiss-btn"
                  onClick={dismiss}
                >
                  {t('voice.dismiss')}
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  )
}
