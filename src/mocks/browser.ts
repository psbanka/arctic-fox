import { setupWorker } from 'msw/browser';
import { handlers } from './handlers';

// Create and export the MSW worker
export const worker = setupWorker(...handlers);

// Initialize MSW in development mode
if (import.meta.env.DEV) {
  console.log('MSW initialized in development mode');
}
