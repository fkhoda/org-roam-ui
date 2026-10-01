import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App'
import './global.css'
import { ThemeProvider } from './theme/ThemeProvider'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ThemeProvider>
      <App />
    </ThemeProvider>
  </StrictMode>,
)

// Older builds registered a service worker that cached every response, note text included.
// Remove it and its caches (public/sw.js does the same for browsers that update it first).
navigator.serviceWorker?.getRegistrations().then((registrations) => {
  for (const registration of registrations) registration.unregister()
})
caches?.keys().then((keys) => keys.forEach((key) => caches.delete(key)))
