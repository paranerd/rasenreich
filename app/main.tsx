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
import { PwaUpdateProvider } from '@/components/pwa-update';
import '@/styles/main.scss';

const container = document.getElementById('root');
if (!container) throw new Error('Wurzelelement #root fehlt');

createRoot(container).render(
  <StrictMode>
    <PwaUpdateProvider>
      <Page />
    </PwaUpdateProvider>
  </StrictMode>,
);
