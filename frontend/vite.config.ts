import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  // Default to 127.0.0.1:5000 to avoid Node 18+ dual-stack (IPv6 ::1) localhost proxy connection issues
  const backendUrl = env.VITE_API_URL || env.BACKEND_URL || 'http://127.0.0.1:5000';

  return {
    plugins: [react()],
    server: {
      port: 3000,
      proxy: {
        '/api': {
          target: backendUrl,
          changeOrigin: true,
          secure: false,
          configure: (proxy) => {
            proxy.on('error', (err, req) => {
              console.warn(`[vite proxy error] ${req.method} ${req.url} -> ${backendUrl}: ${err.message}`);
            });
          },
        },
      },
    },
  };
});
