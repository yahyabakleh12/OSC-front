import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react-swc'
export default defineConfig({
  plugins: [react()],
  base: "/",
  build: {
    chunkSizeWarningLimit: 3000,
  },
  server: {
    proxy: {
      '/api': {
        target: 'http://52.50.19.130:9000', // your backend API server
        changeOrigin: true, 
        secure: false, 
        rewrite: (path) => path.replace(/^\/api/, '/api'), 
      },
    },
  },
})
