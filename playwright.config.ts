import { defineConfig } from '@playwright/test'
export default defineConfig({
  testDir: './test', testMatch: '*.e2e.ts', workers: 1,
  use: { baseURL: 'http://127.0.0.1:8866', headless: true },
  webServer: { command: 'npm run dev', url: 'http://127.0.0.1:8866', reuseExistingServer: true },
})
