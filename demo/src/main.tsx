import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';

import { App } from './app';

const rootElement = document.getElementById('root');

if (!rootElement) {
  throw new Error('Expected #root element to exist.');
}

createRoot(rootElement).render(
  <StrictMode>
    <App />
  </StrictMode>
);
