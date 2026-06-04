'use client'

import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { useState, useEffect } from 'react'
import { Toaster } from '@/components/ui/sonner'

function ServiceWorkerRegistrar() {
  useEffect(() => {
    if (typeof window === 'undefined') return
    if (!('serviceWorker' in navigator)) return
    // Register SW at app startup — idempotent, safe to call multiple times
    navigator.serviceWorker
      .register('/sw.js', { scope: '/' })
      .catch((err) => console.warn('[SW] registration failed:', err))
  }, [])

  return null
}

export function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(() => new QueryClient({
    defaultOptions: { queries: { staleTime: 1000 * 30, refetchOnWindowFocus: true } },
  }))

  return (
    <QueryClientProvider client={queryClient}>
      <ServiceWorkerRegistrar />
      {children}
      <Toaster richColors position="top-right" />
    </QueryClientProvider>
  )
}
