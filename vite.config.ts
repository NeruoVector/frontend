import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      // 개발 중 CORS 회피용: /api -> 백엔드
      '/api': {
        target: 'http://localhost:8081',
        changeOrigin: true,
      },
      '/food-db': {
        target: 'https://world.openfoodfacts.org',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/food-db/, ''),
        proxyTimeout: 20_000,
        bypass(request) {
          const path = request.url?.split('?')[0] ?? ''
          const allowed = /^\/food-db\/api\/v3\.6\/product\/\d{8,14}\.json$/.test(path)
          if (!allowed || (request.method !== 'GET' && request.method !== 'HEAD')) return false
        },
        configure(proxy) {
          proxy.on('proxyReq', (request) => {
            for (const header of ['cookie', 'authorization', 'origin', 'referer']) request.removeHeader(header)
            request.setHeader('User-Agent', 'NeuroVector/0.1 (https://github.com/NeruoVector/platform)')
          })
        },
      },
    },
  },
})
