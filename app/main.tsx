import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';

// Schriften liegen im Bundle, nicht bei Google. Sonst fehlen sie in einer
// nativen Hülle ohne Netz — und jeder Seitenaufruf meldet sich bei einem
// Dritten. Archivo ist variabel und deckt 400–700 in einer Datei ab.
import '@fontsource-variable/archivo/wght.css';
import '@fontsource/ibm-plex-mono/latin-400.css';
import '@fontsource/ibm-plex-mono/latin-500.css';
import '@fontsource/ibm-plex-mono/latin-600.css';

import Page from '@/app/page';
import '@/styles/main.scss';

const container = document.getElementById('root');
if (!container) throw new Error('Wurzelelement #root fehlt');

if (import.meta.env.PROD && 'serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    void navigator.serviceWorker
      .register(`${import.meta.env.BASE_URL}sw.js`, {
        scope: import.meta.env.BASE_URL,
      })
      .catch(() => {
        // Die normale Web-App bleibt nutzbar, falls der Browser keine
        // Service Worker zulässt oder die Installation blockiert.
      });
  });
}

createRoot(container).render(
  <StrictMode>
    <Page />
  </StrictMode>,
);
