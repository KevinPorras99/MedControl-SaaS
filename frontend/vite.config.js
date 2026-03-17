import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],

  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://localhost:8000',
        changeOrigin: true,
      },
    },
  },

  build: {
    // Chunks más pequeños → carga paralela más rápida
    rollupOptions: {
      output: {
        manualChunks: {
          // Core React — siempre necesario, se cachea por mucho tiempo
          'vendor-react':   ['react', 'react-dom', 'react-router-dom'],
          // Auth + Query — usados en toda la app
          'vendor-app':     ['@clerk/clerk-react', '@tanstack/react-query'],
          // Recharts es grande (~300KB) — chunk separado, solo se carga en reportes
          'vendor-charts':  ['recharts'],
          // Lucide — íconos, chunk propio
          'vendor-icons':   ['lucide-react'],
          // HTTP + dates
          'vendor-utils':   ['axios', 'date-fns'],
        },
      },
    },
    // Advertir si un chunk supera 600KB
    chunkSizeWarningLimit: 600,
  },
})
