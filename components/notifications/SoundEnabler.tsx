'use client'

import { useSound } from '@/hooks/useSound'

export function SoundEnabler() {
  const { enabled, enableSound } = useSound()

  if (enabled) return null

  return (
    <div className="fixed top-16 left-0 right-0 z-50 flex justify-center px-4">
      <button
        onClick={enableSound}
        className="bg-amber-500 text-stone-900 font-semibold text-sm px-4 py-2.5 rounded-xl shadow-lg flex items-center gap-2"
      >
        <span>🔔</span>
        Activar notificaciones sonoras
      </button>
    </div>
  )
}
