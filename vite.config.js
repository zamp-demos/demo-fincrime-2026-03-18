import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  assetsInclude: ['**/*.md'],
  plugins: [react()],
  build: {
    outDir: 'public',
    emptyOutDir: false,
  },
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://localhost:3001',
        changeOrigin: true,
      },
      '/reset': { target: 'http://localhost:3001', changeOrigin: true },
      '/signal': { target: 'http://localhost:3001', changeOrigin: true },
      '/signal-status': { target: 'http://localhost:3001', changeOrigin: true },
    },
  },
})
