'use client'

import { useEffect } from 'react'

export default function DeliveryError({ error, reset }: { error: Error; reset: () => void }) {
  useEffect(() => { console.error('[delivery error]', error) }, [error])
  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-[#F7F5F0] px-6 text-center gap-4">
      <p className="text-4xl">⚠️</p>
      <h2 className="text-[#1F1F1F] text-lg font-semibold">Error en Delivery</h2>
      <p className="text-[#7A756D] text-sm max-w-xs">{error.message || 'Error inesperado. Recarga la página.'}</p>
      <button onClick={reset} className="bg-[#1E3541] text-white font-bold px-5 py-2.5 rounded-xl text-sm">
        Intentar de nuevo
      </button>
    </div>
  )
}
