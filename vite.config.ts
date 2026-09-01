import { createHash } from 'node:crypto';
import { readdirSync, readFileSync } from 'node:fs';
import { join, relative, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

import react from '@vitejs/plugin-react';
import { defineConfig, type Plugin } from 'vite';

const projectRoot = fileURLToPath(new URL('.', import.meta.url)).replace(
  /\/$/,
  '',
);
const publicRoot = join(projectRoot, 'public');

function listPublicFiles(directory = publicRoot): string[] {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const absolutePath = join(directory, entry.name);
    if (entry.isDirectory()) return listPublicFiles(absolutePath);
    return [relative(publicRoot, absolutePath).split(sep).join('/')];
  });
}

/**
 * Erzeugt den Service Worker aus den fertigen Build-Dateien. Damit kennt er
 * auch Vites gehashte JS-, CSS- und Fontnamen und wechselt seinen Cache bei
 * jeder inhaltlichen Änderung automatisch.
 */
function pwaServiceWorker(): Plugin {
  return {
    name: 'rasenreich-pwa-service-worker',
    apply: 'build',
    generateBundle(_options, bundle) {
      const publicFiles = listPublicFiles().sort();
      const outputs = Object.values(bundle).sort((left, right) =>
        left.fileName.localeCompare(right.fileName),
      );
      const precacheFiles = [
        '',
        ...outputs.map((output) => output.fileName),
        ...publicFiles,
      ].filter((fileName, index, files) => files.indexOf(fileName) === index);

      const fingerprint = createHash('sha256');
      for (const output of outputs) {
        fingerprint.update(output.fileName);
        fingerprint.update(
          output.type === 'chunk' ? output.code : output.source,
        );
      }
      for (const fileName of publicFiles) {
        fingerprint.update(fileName);
        fingerprint.update(readFileSync(join(publicRoot, fileName)));
      }
      fingerprint.update(readFileSync(join(projectRoot, 'index.html')));
      const cacheVersion = fingerprint.digest('hex').slice(0, 12);

      const source = `const CACHE_PREFIX = 'rasenreich-';
const LEGACY_CACHE_PREFIX = 'garden-grinder-';
const CACHE_NAME = CACHE_PREFIX + '${cacheVersion}';
const PRECACHE_PATHS = ${JSON.stringify(precacheFiles, null, 2)};
const scopeUrl = (path) => new URL(path, self.registration.scope).toString();
const APP_SHELL_URL = scopeUrl('');

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(CACHE_NAME)
      .then((cache) => cache.addAll(PRECACHE_PATHS.map(scopeUrl)))
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((names) =>
        Promise.all(
          names
            .filter(
              (name) =>
                (name.startsWith(CACHE_PREFIX) || name.startsWith(LEGACY_CACHE_PREFIX)) &&
                name !== CACHE_NAME,
            )
            .map((name) => caches.delete(name)),
        ),
      )
      .then(() => self.clients.claim()),
  );
});

async function handleNavigation(request) {
  try {
    const response = await fetch(request);
    if (response.ok) {
      const cache = await caches.open(CACHE_NAME);
      await cache.put(APP_SHELL_URL, response.clone());
    }
    return response;
  } catch {
    return (await caches.match(APP_SHELL_URL)) ?? Response.error();
  }
}

async function handleAsset(request) {
  const cached = await caches.match(request);
  if (cached) return cached;

  try {
    const response = await fetch(request);
    if (response.ok) {
      const cache = await caches.open(CACHE_NAME);
      await cache.put(request, response.clone());
    }
    return response;
  } catch {
    return Response.error();
  }
}

self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);
  const scope = new URL(self.registration.scope);

  if (
    request.method !== 'GET' ||
    url.origin !== scope.origin ||
    !url.pathname.startsWith(scope.pathname)
  ) {
    return;
  }

  event.respondWith(
    request.mode === 'navigate' ? handleNavigation(request) : handleAsset(request),
  );
});
`;

      this.emitFile({ type: 'asset', fileName: 'sw.js', source });
    },
  };
}

// GitHub Pages liegt unter /rasenreich/, ein Capacitor-Bundle unter ./
// Beides wird beim Build über BASE_PATH gesetzt, lokal bleibt es /.
const base = process.env.BASE_PATH ?? '/';

export default defineConfig({
  base,
  plugins: [react(), pwaServiceWorker()],
  resolve: {
    alias: { '@': projectRoot },
  },
  build: {
    outDir: 'dist',
  },
});
