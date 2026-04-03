import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 3000,
    proxy: {
      '/api': 'http://localhost:5000'
    }
  },
  build: {
    // Enable code splitting for lazy-loaded routes
    rollupOptions: {
      output: {
        manualChunks: {
          'vendor-react': ['react', 'react-dom', 'react-router-dom'],
          'vendor-ui': ['framer-motion', 'recharts', 'lucide-react'],
          'vendor-utils': ['axios', 'react-hot-toast'],
        },
      },
    },
    // Generate source maps for production debugging
    sourcemap: true,
    // Chunk size warning threshold
    chunkSizeWarningLimit: 500,
  },
});
