import { fileURLToPath } from 'node:url';

import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';
import { flowmapInspect } from './src/vite-plugin/index.js';

const libraryEntry = fileURLToPath(new URL('./src/index.ts', import.meta.url));

export default defineConfig(({ mode }) => ({
  plugins: [tailwindcss(), flowmapInspect(), react()],
  ...(mode === 'demo'
    ? {}
    : {
        build: {
          lib: {
            entry: libraryEntry,
            name: 'ReactFlowmap',
            fileName: (format) => `react-flowmap.${format}.js`,
          },
          rollupOptions: {
            external: ['react', 'react-dom'],
          },
          sourcemap: true,
        },
      }),
  test: {
    environment: 'jsdom',
    globals: true,
    include: ['tests/**/*.test.ts', 'tests/**/*.test.tsx'],
  },
}));
