'use client'

import { useEffect } from 'react'
import { Button } from '@/components/ui/button'

export default function AdminError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error('[admin error]', error)
  }, [error])

  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] px-6 text-center gap-4">
      <p className="text-4xl">⚠️</p>
      <h2 className="text-lg font-semibold text-[#252525]">Algo salió mal</h2>
      <p className="text-sm text-muted-foreground max-w-xs">
        {error.message ?? 'Error inesperado. Por favor recarga la página.'}
      </p>
      <Button onClick={reset} size="sm">Intentar de nuevo</Button>
    </div>
  )
}
