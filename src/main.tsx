import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import { initAuth } from './lib/auth';
import './styles.css';

// Restores the Supabase session (if any) in the background; the map does not wait for it.
void initAuth();

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
