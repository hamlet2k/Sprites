import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import { catalogFor, tLocale } from './catalog'
import {
  detectLocale,
  LOCALE_STORAGE_KEY,
  LOCALES,
  type Locale,
} from './locales'

export type TFunction = (
  key: string,
  vars?: Record<string, string | number>,
) => string

type I18nContextValue = {
  locale: Locale
  setLocale: (locale: Locale) => void
  t: TFunction
  locales: typeof LOCALES
}

const I18nContext = createContext<I18nContextValue | null>(null)

export function I18nProvider({ children }: { children: ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>(() => detectLocale())

  const setLocale = useCallback((next: Locale) => {
    setLocaleState(next)
    try {
      localStorage.setItem(LOCALE_STORAGE_KEY, next)
    } catch {
      /* ignore */
    }
  }, [])

  useEffect(() => {
    document.documentElement.lang = locale
  }, [locale])

  const t = useCallback<TFunction>(
    (key, vars) => tLocale(locale, key, vars),
    [locale],
  )

  const value = useMemo(
    () => ({ locale, setLocale, t, locales: LOCALES }),
    [locale, setLocale, t],
  )

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>
}

export function useI18n(): I18nContextValue {
  const ctx = useContext(I18nContext)
  if (!ctx) throw new Error('useI18n must be used within I18nProvider')
  return ctx
}

export type { Locale }
export { LOCALES, tLocale, catalogFor }
