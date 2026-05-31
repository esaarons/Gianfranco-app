'use client'

import { useSound } from '@/hooks/useSound'

export function SoundEnabler() {
  const { enabled, enableSound } = useSound()

  if (enabled) return null

  return (
    <div className="fixed top-16 left-0 right-0 z-50 flex justify-center px-4 pointer-events-none">
      <button
        onClick={enableSound}
        className="pointer-events-auto flex items-center gap-2.5 bg-[#162B2F] border border-[#EAD9B1]/25 text-[#EAD9B1] font-semibold text-sm px-4 py-2.5 rounded-2xl press-scale fade-in"
        style={{ boxShadow: '0 4px 24px rgba(0,0,0,0.4)' }}
      >
        <span className="text-base">🔔</span>
        Activar notificaciones y sonido
      </button>
    </div>
  )
}
