import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig(({ mode }) => {
  const backend = loadEnv(mode, '.', '').VITE_BACKEND_URL || 'http://localhost:4000';
  return {
    plugins: [react(), tailwindcss()],
    server: {
      proxy: {
        '/api': { target: backend, changeOrigin: true, rewrite: (path) => path.replace(/^\/api/, '') },
      },
    },
  };
});
