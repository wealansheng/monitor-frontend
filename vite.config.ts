import { defineConfig, loadEnv } from 'vite'
import vue from '@vitejs/plugin-vue'

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')

  return {
    plugins: [vue()],
    server: {
      port: 8866,
      strictPort: true,
      proxy: {
        '/api': {
          target: env.MONITOR_BACKEND_URL || 'http://localhost:8888',
          changeOrigin: true,
        },
      },
    },
    preview: {
      port: 8866,
      strictPort: true,
    },
  }
})
