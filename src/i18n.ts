import { nextTick } from 'vue'
import { createI18n, type I18n } from 'vue-i18n'

export const SUPPORT_LOCALES = ['en', 'es']

export function setupI18n(options = { locale: 'en', legacy: false }) {
  const i18n = createI18n(options)
  setI18nLanguage(i18n, options.locale)
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

export async function loadLocaleMessages(i18n: I18n, locale: string) {
  // load locale messages with dynamic import
  const messages = await import(
    /* webpackChunkName: "locale-[request]" */ `./locales/${locale}.json`
  )

  // set locale and locale message
  i18n.global.setLocaleMessage(locale, messages.default)

  return nextTick()
}
