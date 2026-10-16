import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

export default defineConfig({
  plugins: [vue()],
  server: {
    port: 8866,
    strictPort: true,
    proxy: {
      '/api': {
        target: process.env.MONITOR_BACKEND_URL || 'http://localhost:8888',
        changeOrigin: true,
      },
    },
  },
  preview: {
    port: 8866,
    strictPort: true,
  },
})
