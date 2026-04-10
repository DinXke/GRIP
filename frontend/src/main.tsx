import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import App from './App'
import './styles/global.css'
import { initAccessibility } from './stores/accessibilityStore'

// Toegankelijkheidsvoorkeuren direct toepassen vóór render
initAccessibility()

// Service Worker registreren voor PWA + push
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js', { scope: '/', updateViaCache: 'none' })
      .then(reg => {
        // Check voor updates elke 5 minuten
        setInterval(() => reg.update().catch(() => {}), 5 * 60 * 1000)
      })
      .catch(() => {})
  })
}

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 30, // 30 seconden — data is snel verouderd
      retry: 1,
      refetchOnWindowFocus: true, // Ververs bij terugkeer naar tab
      refetchOnMount: true, // Ververs bij mount van component
    },
  },
})

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <App />
      </BrowserRouter>
    </QueryClientProvider>
  </React.StrictMode>,
)
