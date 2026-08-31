import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';

import Page from '@/app/page';
import './globals.css';

const container = document.getElementById('root');
if (!container) throw new Error('Wurzelelement #root fehlt');

createRoot(container).render(
  <StrictMode>
    <Page />
  </StrictMode>,
);
