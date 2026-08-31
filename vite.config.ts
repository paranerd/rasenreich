import { fileURLToPath } from 'node:url';

import tailwindcss from '@tailwindcss/postcss';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

const projectRoot = fileURLToPath(new URL('.', import.meta.url)).replace(
  /\/$/,
  '',
);

// GitHub Pages liegt unter /garden-grinder/, ein Capacitor-Bundle unter ./
// Beides wird beim Build über BASE_PATH gesetzt, lokal bleibt es /.
const base = process.env.BASE_PATH ?? '/';

export default defineConfig({
  base,
  css: { postcss: { plugins: [tailwindcss()] } },
  plugins: [react()],
  resolve: {
    alias: { '@': projectRoot },
  },
  build: {
    outDir: 'dist',
    rollupOptions: {
      // Die shadcn-Komponenten tragen weiterhin 'use client'. In einer SPA ist
      // die Direktive bedeutungslos, Rollup warnt aber für jede Datei einzeln.
      onwarn(warning, warn) {
        if (warning.code === 'MODULE_LEVEL_DIRECTIVE') return;
        warn(warning);
      },
    },
  },
});
