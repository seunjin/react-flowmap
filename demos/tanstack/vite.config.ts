import { fileURLToPath } from 'node:url';
import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';
import { flowmapInspect } from '../../src/vite-plugin/index.js';

const r = (p: string) => fileURLToPath(new URL(p, import.meta.url));

export default defineConfig({
  plugins: [tailwindcss(), flowmapInspect(), react()],
  server: { port: 3002 },
  resolve: {
    alias: {
      '@': r('./src'),
      'react-flowmap': r('../../src/index.ts'),
    },
  },
});
