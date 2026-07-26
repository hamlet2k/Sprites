import en from './en'
import es from './es'
import { translate, type Locale, type MessageTree } from './locales'

const CATALOG: Record<Locale, MessageTree> = { en, es }

export function tLocale(
  locale: Locale,
  key: string,
  vars?: Record<string, string | number>,
): string {
  return translate(CATALOG[locale], key, vars)
}

export function catalogFor(locale: Locale): MessageTree {
  return CATALOG[locale]
}
