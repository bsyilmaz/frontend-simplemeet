import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'
import { resolve } from 'path'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.ico'],
      manifest: {
        name: 'SimpleMeet',
        short_name: 'SimpleMeet',
        description: 'Simple video conferencing application',
        theme_color: '#ffffff',
        icons: [
          {
            src: '/vite.svg',
            sizes: '192x192',
            type: 'image/svg+xml',
          },
          {
            src: '/vite.svg',
            sizes: '512x512',
            type: 'image/svg+xml',
          },
          {
            src: '/vite.svg',
            sizes: '512x512',
            type: 'image/svg+xml',
            purpose: 'any maskable',
          }
        ]
      }
    })
  ],
  css: {
    postcss: './postcss.config.cjs',
  },
  resolve: {
    alias: {
      'buffer': 'buffer/',
      'events': 'events/',
      'stream': 'stream-browserify',
      'util': 'util/'
    }
  },
  define: {
    'process.env': {},
    global: {}
  },
  optimizeDeps: {
    esbuildOptions: {
      define: {
        global: 'globalThis'
      }
    }
  }
})
