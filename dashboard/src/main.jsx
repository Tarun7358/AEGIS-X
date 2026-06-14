import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'

// Global fetch override to support VITE_API_URL environment variable for production deployment
const originalFetch = window.fetch;
window.fetch = function (input, init) {
  const apiBase = import.meta.env.VITE_API_URL;
  if (apiBase && typeof input === 'string' && input.startsWith('http://localhost:5000')) {
    // If VITE_API_URL has a trailing slash, strip it, or ensure formatting fits
    const sanitizedBase = apiBase.endsWith('/') ? apiBase.slice(0, -1) : apiBase;
    input = input.replace('http://localhost:5000', sanitizedBase);
  }
  return originalFetch(input, init);
};

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
