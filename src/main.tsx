import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
// Self-hosted variable fonts (no third-party font requests; font-display: swap).
import '@fontsource-variable/inter/index.css';
import '@fontsource-variable/jetbrains-mono/index.css';
import './index.css';
import App from './App';
import { parseRoute } from './lib/routes';

// Start downloading the current page's chunk in parallel with the main bundle.
const route = parseRoute(window.location.pathname);
const prefetch: Record<string, () => Promise<unknown>> = {
  home: () => import('./components/HomeView'),
  inventory: () => import('./components/InventoryView'),
  details: () => import('./components/VehicleDetailsView'),
};
prefetch[route.page]?.();

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
