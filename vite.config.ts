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
            tsconfigPath: './tsconfig.json',
            entryRoot: 'src',
            rollupTypes: true,
          }),
        ],
        build: {
          lib: {
            entry: {
              index: r('./src/index.ts'),
              'vite-plugin': r('./src/vite-plugin/index.ts'),
              'rfm-context': r('./src/runtime/rfm-context.ts'),
              'graph-window': r('./src/ui/graph-window/GraphWindow.tsx'),
              'babel-plugin': r('./packages/babel-plugin/src/index.ts'),
              'next-plugin': r('./src/next-plugin/index.ts'),
            },
            formats: ['es'],
          },
          rollupOptions: {
            external: [
              'react',
              'react-dom',
              'react/jsx-runtime',
              'vite',
              'next',
              /^node:/,
              'path',
              'fs',
              'url',
              'module',
              'child_process',
              'ts-morph',
              /^@babel\//,
              /^webpack/,
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
