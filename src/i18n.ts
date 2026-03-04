import { createI18n, type I18n } from 'vue-i18n'
import en from './locales/en.json'
import es from './locales/es.json'

export const SUPPORT_LOCALES = ['en', 'es']

export function setupI18n(options: { locale?: string; legacy?: boolean } = {}) {
  const locale = options.locale ?? 'en'
  const i18n = createI18n({
    locale,
    fallbackLocale: 'en',
    legacy: false,
    messages: { en, es },
  })
  document.querySelector('html')?.setAttribute('lang', locale)
  return i18n
}

export function setI18nLanguage(i18n: I18n, locale: string) {
  if (i18n.mode === 'legacy') {
    i18n.global.locale = locale as unknown as typeof i18n.global.locale
  } else {
    ;(i18n.global.locale as unknown as { value: string }).value = locale
  }
  document.querySelector('html')?.setAttribute('lang', locale)
}
