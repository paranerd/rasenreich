import { fileURLToPath } from 'node:url';

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
  plugins: [react()],
  resolve: {
    alias: { '@': projectRoot },
  },
  build: {
    outDir: 'dist',
  },
});
