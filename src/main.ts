// Register icons FIRST - before any UI components are imported
import '@/icons'

import '@/assets/css/main.css'

import { createApp } from 'vue'
import { createPinia } from 'pinia'
import { createHead } from '@unhead/vue/client'
import { App as CapacitorApp } from '@capacitor/app'
import { Capacitor } from '@capacitor/core'
import { setupI18n } from './i18n.ts'

import App from './App.vue'
import router from './router'

import ui from '@nuxt/ui/vue-plugin'

export const i18n = setupI18n()

const app = createApp(App)
const head = createHead()

app.use(i18n)
app.use(ui)
app.use(createPinia())
app.use(router)
app.use(head)

if (Capacitor.isNativePlatform()) {
  CapacitorApp.addListener('appUrlOpen', ({ url }) => {
    if (!url) {
      return
    }
    try {
      const parsed = new URL(url)
      const path = `${parsed.pathname}${parsed.search}${parsed.hash}`
      if (path) {
        router.push(path)
      }
    } catch (error) {
      console.warn('Failed to handle incoming universal link', error)
    }
  })
}

app.mount('#app')
