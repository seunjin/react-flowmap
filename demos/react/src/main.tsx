import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { AppRouter } from './router';

const rootElement = document.getElementById('root');

if (!rootElement) {
  throw new Error('Expected #root element to exist.');
}

createRoot(rootElement).render(
  <StrictMode>
    <BrowserRouter>
      <AppRouter />
    </BrowserRouter>
  </StrictMode>
);
