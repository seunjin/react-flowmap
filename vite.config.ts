import { fileURLToPath } from 'node:url';

import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

const libraryEntry = fileURLToPath(new URL('./src/index.ts', import.meta.url));

export default defineConfig(({ mode }) => ({
  plugins: react(),
  ...(mode === 'demo'
    ? {}
    : {
        build: {
          lib: {
            entry: libraryEntry,
            name: 'Gori',
            fileName: (format) => `gori.${format}.js`,
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
