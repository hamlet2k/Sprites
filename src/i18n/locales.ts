export type Locale = 'en' | 'es'

export const LOCALES: { id: Locale; label: string; native: string }[] = [
  { id: 'en', label: 'English', native: 'English' },
  { id: 'es', label: 'Spanish', native: 'Español' },
]

export const LOCALE_STORAGE_KEY = 'fortnite-sprite-squad-locale'

export function detectLocale(): Locale {
  try {
    const saved = localStorage.getItem(LOCALE_STORAGE_KEY)
    if (saved === 'en' || saved === 'es') return saved
  } catch {
    /* ignore */
  }
  const nav = (navigator.language || 'en').toLowerCase()
  if (nav.startsWith('es')) return 'es'
  return 'en'
}

export type MessageTree = { [key: string]: string | MessageTree }

/** Dot-path lookup with `{var}` interpolation. */
export function translate(
  messages: MessageTree,
  key: string,
  vars?: Record<string, string | number>,
): string {
  const parts = key.split('.')
  let cur: string | MessageTree | undefined = messages
  for (const p of parts) {
    if (!cur || typeof cur === 'string') {
      cur = undefined
      break
    }
    cur = cur[p]
  }
  let text = typeof cur === 'string' ? cur : key
  if (vars) {
    for (const [k, v] of Object.entries(vars)) {
      text = text.replaceAll(`{${k}}`, String(v))
    }
  }
  return text
}
