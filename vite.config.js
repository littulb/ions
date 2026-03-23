import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  build: {
    chunkSizeWarningLimit: 1600
  },
  assetsInclude: ['**/*.JPG'],
  define: {
    'global': 'window',
  },
  resolve: {
    alias: {
      stream: "stream-browserify",
      events: 'events',
    },
  },
  optimizeDeps: {
    include: ['particle-api-js'],
  },
})
