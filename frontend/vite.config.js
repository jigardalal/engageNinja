import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
  plugins: [react()],
  server: {
    port: process.env.FRONTEND_PORT || 3173,
    host: 'localhost',
    strictPort: false,
    allowedHosts: ['nonoptimistical-cheerlessly-billy.ngrok-free.dev'],
    proxy: {
      '/api': {
        // Try to use BACKEND_PORT from env, but default to 5173 which is the project standard
        target: `http://localhost:${process.env.BACKEND_PORT || process.env.npm_package_config_backendPort || 5173}`,
        changeOrigin: true,
        secure: false
      }
    }
  },
  build: {
    outDir: 'dist',
    sourcemap: true,
    minify: 'terser'
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src')
    }
  }
})
