import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { Toaster } from 'react-hot-toast'
import './index.css'
import App from './App'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <App />
      <Toaster
        position="top-right"
        toastOptions={{
          duration: 4000,
          style: {
            background: 'oklch(0.20 0.015 250)',
            color: 'oklch(0.98 0.005 250)',
            border: '1px solid oklch(1 0 0 / 0.08)',
          },
          success: {
            iconTheme: { 
              primary: 'oklch(0.72 0.19 155)',
              secondary: 'oklch(0.98 0.005 250)',
            },
          },
          error: {
            iconTheme: { 
              primary: 'oklch(0.65 0.22 25)',
              secondary: 'oklch(0.98 0.005 250)',
            },
          },
        }}
      />
    </BrowserRouter>
  </StrictMode>,
)
