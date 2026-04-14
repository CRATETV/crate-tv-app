import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  appType: 'spa',
  plugins: [react()],
  server: {
    port: 5373,
  },
  build: {
    chunkSizeWarningLimit: 1000,
    rollupOptions: {
      output: {
        manualChunks: {
          'vendor-react': ['react', 'react-dom'],
          'vendor-firebase': ['firebase/compat/app', 'firebase/compat/auth', 'firebase/compat/firestore'],
          'vendor-charts': ['recharts'],
        }
      }
    }
  },
  css: {
    postcss: './postcss.config.js',
  }
})
