import { FeatureFlags } from '@carbon/react'
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App'
import '@fontsource/ibm-plex-mono/400.css'
import '@fontsource/ibm-plex-sans/400.css'
import '@fontsource/ibm-plex-sans/400-italic.css'
import '@fontsource/ibm-plex-sans/600.css'
import './styles/app.scss'
import { ThemeProvider } from './theme/ThemeProvider'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    {/* opt in to two v12 behaviors: popovers position themselves, focus traps need no sentinels */}
    <FeatureFlags enableV12DynamicFloatingStyles enableFocusWrapWithoutSentinels>
      <ThemeProvider>
        <App />
      </ThemeProvider>
    </FeatureFlags>
  </StrictMode>,
)

// Older builds registered a service worker that cached every response, note text included.
// Remove it and its caches (public/sw.js does the same for browsers that update it first).
navigator.serviceWorker?.getRegistrations().then((registrations) => {
  for (const registration of registrations) registration.unregister()
})
caches?.keys().then((keys) => keys.forEach((key) => caches.delete(key)))
