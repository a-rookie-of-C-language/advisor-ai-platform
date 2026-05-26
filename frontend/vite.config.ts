import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  build: {
    chunkSizeWarningLimit: 500,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (!id.includes('node_modules')) {
            return undefined
          }
          if (id.includes('react') || id.includes('scheduler')) {
            return 'vendor-react'
          }
          if (id.includes('@ant-design/cssinjs')) {
            return 'vendor-antd-cssinjs'
          }
          if (id.includes('react-markdown') || id.includes('remark') || id.includes('micromark')) {
            return 'vendor-markdown'
          }
          if (id.includes('axios') || id.includes('dayjs') || id.includes('zustand')) {
            return 'vendor-utils'
          }
          return undefined
        },
      },
    },
  },
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://localhost:8080',
        changeOrigin: true,
      },
    },
  },
})
