import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';

// Import MSW browser worker
import { worker } from './mocks/browser';

// Initialize MSW worker
async function startApp() {
  // Start the mock service worker if we're in development mode
  // if (import.meta.env.DEV) {
  if (false) {
    await worker.start({
      onUnhandledRequest: 'bypass',
    });
    console.log('🔶 MSW mock server started');
  }

  ReactDOM.createRoot(document.getElementById('root')!).render(
    <React.StrictMode>
      <App />
    </React.StrictMode>
  );
}

startApp();
