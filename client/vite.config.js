import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, '../', '');
  return {
    envDir: '../',
    plugins: [react()],
    server: {
      port: parseInt(process.env.FRONTEND_PORT || env.FRONTEND_PORT || '5173'),
      strictPort: true,
      proxy: {
        '/api': {
          target: `http://localhost:${process.env.PORT || env.PORT || '6000'}`,
          changeOrigin: true
        },
        '/stream': {
          target: `http://localhost:${process.env.PORT || env.PORT || '6000'}`,
          changeOrigin: true
        }
      }
    }
  }
})
