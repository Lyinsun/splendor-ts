import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

const backendPort = process.env.SPLENDOR_HTTP_PORT ?? '19988';
const backendTarget = `http://localhost:${backendPort}`;

export default defineConfig({
  root: 'frontend/dashboard',
  base: '/dashboard-assets/',
  plugins: [react()],
  build: {
    outDir: '../../dist/dashboard',
    emptyOutDir: true,
  },
  server: {
    port: 5174,
    proxy: {
      '/v1': backendTarget,
      '/healthz': backendTarget,
      '/assets': backendTarget,
      '/ws': {
        target: backendTarget,
        ws: true,
      },
    },
  },
});
