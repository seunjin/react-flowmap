import { defineConfig } from 'vite';
import viteReact from '@vitejs/plugin-react';
import { tanstackStart } from '@tanstack/react-start/plugin/vite';
import tailwindcss from '@tailwindcss/vite';
import { flowmapInspect } from 'react-flowmap/vite';

export default defineConfig({
  plugins: [
    tanstackStart({ srcDirectory: 'src' }),
    viteReact(),
    tailwindcss(),
    flowmapInspect({
      enabled: process.env.NODE_ENV === 'development',
    }),
  ],
  server: { port: 3004 },
});
