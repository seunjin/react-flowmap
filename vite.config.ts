import { fileURLToPath } from 'node:url';

import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';
import dts from 'vite-plugin-dts';
import { flowmapInspect } from './src/vite-plugin/index.js';

const r = (path: string) => fileURLToPath(new URL(path, import.meta.url));

export default defineConfig(({ mode }) => ({
  plugins: [tailwindcss(), flowmapInspect(), react()],
  resolve: {
    alias: mode === 'demo' ? {
      'react-flowmap': r('./src/index.ts'),
      'react-flowmap/vite': r('./src/vite-plugin/index.ts'),
    } : {},
  },
  ...(mode === 'demo'
    ? {}
    : {
        plugins: [
          tailwindcss(),
          react(),
          dts({
            include: ['src'],
            exclude: ['src/vite-env.d.ts'],
            tsconfigPath: './tsconfig.json',
          }),
        ],
        build: {
          lib: {
            entry: {
              index: r('./src/index.ts'),
              'vite-plugin': r('./src/vite-plugin/index.ts'),
              'rfm-context': r('./src/runtime/rfm-context.ts'),
              'graph-window': r('./src/ui/graph-window/GraphWindow.tsx'),
            },
            formats: ['es'],
          },
          rollupOptions: {
            external: [
              'react',
              'react-dom',
              'react/jsx-runtime',
              'vite',
              /^node:/,
              'path',
              'fs',
              'url',
              'module',
              'child_process',
              'ts-morph',
              /^@babel\//,
            ],
            output: {
              entryFileNames: '[name].js',
              chunkFileNames: 'chunks/[name]-[hash].js',
            },
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
