import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// base './' … どのサブパスに配置しても動くようにする（NAS・静的ホスティング対応）
export default defineConfig({
  base: './',
  plugins: [react()],
  build: {
    target: 'es2019',
    sourcemap: true
  },
  server: {
    host: true
  }
})
