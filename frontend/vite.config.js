import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import mkcert from 'vite-plugin-mkcert'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [
    mkcert(), // HTTPS uchun SSL sertifikat yaratadi
    react(),
    tailwindcss(),
  ],
  server: {
    port: 5173,
    host: true,
    https: true, // HTTPS ni yoqish
    // Proxy backend API ga
    proxy: {
      '/api': {
        target: 'http://localhost:5000',
        changeOrigin: true,
        secure: false,
        rewrite: (path) => path.replace(/^\/api/, '/api')
      }
    },
    cors: true // CORS ni yoqish
  },
  preview: {
    port: 5173,
    host: true,
    https: true
  },
  build: {
    outDir: 'dist',
    sourcemap: true
  }
})