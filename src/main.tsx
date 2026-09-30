import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { registerSW } from 'virtual:pwa-register'
import App from './App'
import './index.css'

/* ---------------------------------------------------------------- pwa ---- */
/**
 * Makes the game installable and playable offline. `autoUpdate` means a new
 * deploy is picked up on the next launch without a manual refresh prompt —
 * important for casual players on a phone.
 */
registerSW({ immediate: true })

/* --------------------------------------------------------------- root ---- */

const container = document.getElementById('root')
if (!container) throw new Error('Root element #root is missing from index.html')

createRoot(container).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
