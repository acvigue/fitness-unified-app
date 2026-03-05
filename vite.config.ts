import { fileURLToPath, URL } from 'node:url'

import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import ui from '@nuxt/ui/vite'
import { visualizer } from 'rollup-plugin-visualizer'

// https://vitejs.dev/config/
export default defineConfig({
  appType: 'spa',
  plugins: [
    ui({
      ui: {
        colors: {
          neutral: 'zinc',
        },
        input: {
          slots: {
            root: 'w-full',
          },
        },
        formField: {
          slots: {
            root: 'w-full',
          },
        },
      },
    }),
    vue({
      script: {
        defineModel: true,
        propsDestructure: true,
      },
    }),
  ],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  server: {
    host: true,
    port: 5173,
  },
  preview: {
    port: 4173,
  },
  css: {
    devSourcemap: true,
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          // Vue core ecosystem
          if (id.includes('node_modules/vue/') || id.includes('node_modules/@vue/')) {
            return 'vue-vendor'
          }
          if (id.includes('node_modules/vue-router/')) {
            return 'vue-router'
          }
          if (id.includes('node_modules/pinia/')) {
            return 'pinia'
          }
          // Capacitor
          if (id.includes('@capacitor/')) {
            return 'capacitor'
          }
          // Radix Vue (UI primitives)
          if (id.includes('reka-ui') || id.includes('radix-vue')) {
            return 'ui-primitives'
          }
          // TipTap editor (if used)
          if (id.includes('@tiptap/') || id.includes('prosemirror')) {
            return 'editor'
          }
        },
      },
      plugins: [
        visualizer({
          filename: 'dist/stats.html',
          open: false,
          gzipSize: true,
        }),
      ],
    },
  },
  define: {
    'process.env.ES_BUILD': process.env.ES_BUILD,
  },
})
