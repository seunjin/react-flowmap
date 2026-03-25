import { fileURLToPath } from 'node:url';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';
import { flowmapInspect } from '../../src/vite-plugin/index.js';

const r = (p: string) => fileURLToPath(new URL(p, import.meta.url));

export default defineConfig({
  plugins: [flowmapInspect(), react()],
  server: { port: 3001 },
  resolve: {
    alias: {
      'react-flowmap': r('../../src/index.ts'),
      'react-flowmap/vite': r('../../src/vite-plugin/index.ts'),
    },
  },
});
