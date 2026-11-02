/* Copyright (c) 2026 Erdem Topcu. All rights reserved. */
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { QueryClientProvider } from '@tanstack/react-query'
import App from './app/App'
import { AuthProvider } from './features/auth/context/AuthProvider'
import { PlatformProvider } from './features/platform/context/PlatformProvider'
import { TenantProvider } from './features/tenants/context/TenantProvider'
import { ThemeProvider } from './features/theme/context/ThemeProvider'
import { ToastProvider } from './components/ui/ToastProvider'
import { queryClient } from './lib/query-client'
import { applyTheme, getInitialTheme } from './lib/theme'
import './index.css'

applyTheme(getInitialTheme())

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ThemeProvider>
      <QueryClientProvider client={queryClient}>
        <ToastProvider>
          <AuthProvider>
            <PlatformProvider>
              <TenantProvider>
                <BrowserRouter><App /></BrowserRouter>
              </TenantProvider>
            </PlatformProvider>
          </AuthProvider>
        </ToastProvider>
      </QueryClientProvider>
    </ThemeProvider>
  </StrictMode>,
)
