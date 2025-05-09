import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'
import { resolve } from 'path'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    react({
      babel: {
        plugins: [],
      },
    }),
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
      stream: 'stream-browserify',
      util: 'util',
      buffer: 'buffer',
      events: 'events',
      'randombytes': resolve(__dirname, 'src/services/insecureRandomBytes.js')
    }
  },
  define: {
    'process.env': {},
    global: 'window'
  },
  optimizeDeps: {
    include: ['buffer', 'process'],
    esbuildOptions: {
      define: {
        global: 'globalThis'
      }
    }
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ['react', 'react-dom', 'react-router-dom'],
          webrtc: ['simple-peer', 'socket.io-client'],
        },
      },
    },
    sourcemap: true,
    commonjsOptions: {
      transformMixedEsModules: true,
    },
  },
  server: {
    host: true,
    port: 5173,
  },
})
