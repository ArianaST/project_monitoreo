import vue from '@vitejs/plugin-vue'
import path from 'path'
import { defineConfig } from 'vite'

export default defineConfig({
  plugins: [vue()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    port: 5174,
    strictPort: false,
    open: true,
    host: '0.0.0.0',
    middlewareMode: false,
    allowedHosts: [
      'localhost',
      '127.0.0.1',
      '.ngrok-free.app',
      '.ngrok-free.dev',
      '.ngrok.io',
      '192.168.100.8',
      '172.25.128.1',
    ],
    cors: {
      origin: '*',
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
      allowedHeaders: '*',
    },
  },
  build: {
    target: 'esnext',
    outDir: 'dist',
    sourcemap: false,
  },
})
