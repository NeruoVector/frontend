import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  const proxy = {
    '/api': { target: env.NV_BACKEND || 'https://neurovector-backend.forge-lang.org', changeOrigin: true },
  }
  return { plugins: [react()], server: { proxy }, preview: { proxy } }
})
