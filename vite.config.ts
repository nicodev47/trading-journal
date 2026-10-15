import path from 'node:path'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    // Forex Factory's weekly feed has no CORS headers, so it is proxied in dev.
    // In production the same path is served by netlify/functions/ff-calendar.mjs.
    proxy: {
      '/api/ff-calendar': {
        target: 'https://nfs.faireconomy.media',
        changeOrigin: true,
        rewrite: () => '/ff_calendar_thisweek.json',
      },
    },
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
})
