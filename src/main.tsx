import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'

// Development only: lets a browser script set up a descent to look at. Not part of the production build.
if (import.meta.env.DEV) {
  void Promise.all([import('@/state/run-store'), import('@/state/store')]).then(([run, game]) => {
    (window as unknown as Record<string, unknown>).__emberdeep = { useRun: run.useRun, useGame: game.useGame }
  })
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
