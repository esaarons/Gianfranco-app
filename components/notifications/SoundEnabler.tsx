'use client'

import { useState } from 'react'
import { useSound } from '@/hooks/useSound'
import { useServiceWorker } from '@/hooks/useServiceWorker'
import { cn } from '@/lib/utils'

type Step = 'idle' | 'activating' | 'siri_guide' | 'done'

export function SoundEnabler() {
  const { enabled, onShift, enableSound, setOnShift } = useSound()
  const { subscribePush } = useServiceWorker()

  const [step,      setStep]      = useState<Step>('idle')
  const [pushState, setPushState] = useState<'none' | 'granted' | 'denied' | 'unsupported'>('none')
  const [showSiri,  setShowSiri]  = useState(false)

  async function handleActivate() {
    setStep('activating')
    // 1. Unlock in-app audio (must happen inside user gesture)
    await enableSound()
    // 2. Try to subscribe to push
    const supported = 'Notification' in window && 'serviceWorker' in navigator && 'PushManager' in window
    if (!supported) {
      setPushState('unsupported')
      setStep('done')
      return
    }
    const ok = await subscribePush()
    if (ok) {
      setPushState('granted')
      setStep('siri_guide')
    } else {
      // denied or error — in-app sound still works
      setPushState(Notification.permission === 'denied' ? 'denied' : 'unsupported')
      setStep('done')
    }
  }

  // ── Not yet activated ────────────────────────────────────────────────────────
  if (!enabled && step === 'idle') {
    return (
      <div className="mx-4 mb-3 fade-in">
        <button
          onClick={handleActivate}
          className="w-full flex items-center gap-3 bg-[#1B3428] border border-[#EAD9B1]/20 text-[#EAD9B1] font-semibold text-sm px-4 py-3.5 rounded-2xl press-scale"
          style={{ boxShadow: '0 4px 20px rgba(0,0,0,0.3)' }}
        >
          <span className="text-xl">🔔</span>
          <div className="flex-1 text-left">
            <p className="font-bold text-[#EAD9B1]">Activar sonido y voz de comandas</p>
            <p className="text-[10px] text-[#EAD9B1]/50 mt-0.5 font-normal">
              Sonido + vibración + notificaciones para iPhone/Android
            </p>
          </div>
          <span className="text-xs bg-[#C98933]/25 text-[#EAD9B1] px-2 py-1 rounded-lg font-bold">Activar</span>
        </button>
      </div>
    )
  }

  // ── Activating spinner ───────────────────────────────────────────────────────
  if (step === 'activating') {
    return (
      <div className="mx-4 mb-3 flex items-center gap-3 bg-[#1B3428]/10 border border-[#1B3428]/15 rounded-2xl px-4 py-3">
        <div className="w-4 h-4 border-2 border-[#1B3428]/20 border-t-[#1B3428] rounded-full animate-spin" />
        <p className="text-sm text-[#1F1F1F]/60">Configurando notificaciones…</p>
      </div>
    )
  }

  // ── Siri guide — show after successful push subscription ────────────────────
  if (step === 'siri_guide' && !showSiri) {
    return (
      <div className="mx-4 mb-3 fade-in">
        <div className="bg-[#EEF3EA] border border-[#5A9E60]/25 rounded-2xl px-4 py-3 space-y-2.5">
          <div className="flex items-center gap-2.5">
            <span className="text-xl">✅</span>
            <div>
              <p className="text-sm font-bold text-[#1E4D22]">Notificaciones activadas</p>
              <p className="text-[11px] text-[#3D6B42]">Las comandas llegarán aunque la app esté cerrada</p>
            </div>
          </div>
          <div className="h-px bg-[#5A9E60]/15" />
          <div className="flex items-start gap-2.5">
            <span className="text-lg mt-0.5">🎙️</span>
            <div className="flex-1">
              <p className="text-xs font-bold text-[#1E4D22]">¿Quieres que Siri lea las comandas en voz alta?</p>
              <p className="text-[11px] text-[#3D6B42] mt-0.5">
                Para iPhone con AirPods — Siri puede anunciar cada comanda automáticamente.
              </p>
            </div>
          </div>
          <div className="flex gap-2 pt-1">
            <button
              onClick={() => setStep('done')}
              className="px-3 py-2 rounded-xl text-xs font-semibold text-[#7A756D] bg-white border border-[#E7E1D8] press-scale"
            >
              Omitir
            </button>
            <button
              onClick={() => setShowSiri(true)}
              className="flex-1 bg-[#1E4D22] text-white font-bold py-2 rounded-xl text-xs btn-primary"
            >
              Ver instrucciones Siri
            </button>
          </div>
        </div>
      </div>
    )
  }

  // ── Siri step-by-step instructions ──────────────────────────────────────────
  if (showSiri) {
    return (
      <div className="mx-4 mb-3 fade-in">
        <div className="bg-[#F5F0FA] border border-[#9B7EC8]/20 rounded-2xl px-4 py-4 space-y-3">
          <div className="flex items-center gap-2">
            <span className="text-2xl">🎙️</span>
            <div>
              <p className="text-sm font-bold text-[#3D1B6E]">Configurar Siri en iPhone</p>
              <p className="text-[11px] text-[#6B4A9E]">Anunciar notificaciones por voz</p>
            </div>
          </div>
          <div className="space-y-2">
            {[
              { step: '1', text: 'Ajustes  →  Siri y Búsqueda' },
              { step: '2', text: 'Anunciar notificaciones  →  Activar' },
              { step: '3', text: 'Seleccionar Gianfranco en la lista' },
              { step: '4', text: 'Activar "Anunciar notificaciones"' },
              { step: '5', text: 'Conectar AirPods — Siri leerá las comandas' },
            ].map(({ step: s, text }) => (
              <div key={s} className="flex items-start gap-3">
                <span className="w-5 h-5 rounded-full bg-[#9B7EC8] text-white text-[10px] font-bold flex items-center justify-center shrink-0 mt-0.5">{s}</span>
                <p className="text-xs text-[#3D1B6E] font-medium">{text}</p>
              </div>
            ))}
          </div>
          <p className="text-[10px] text-[#9B7EC8]/70 border-t border-[#9B7EC8]/15 pt-2">
            Sin AirPods: Siri anunciará cuando la pantalla esté bloqueada en modo "Siempre".
          </p>
          <button
            onClick={() => { setShowSiri(false); setStep('done') }}
            className="w-full bg-[#3D1B6E] text-white font-bold py-2.5 rounded-xl text-xs btn-primary"
          >
            Listo — cerrar instrucciones
          </button>
        </div>
      </div>
    )
  }

  // ── Active compact status bar ────────────────────────────────────────────────
  if (!enabled) return null   // safety — shouldn't reach here

  return (
    <div className="mx-4 mb-3 flex items-center justify-between bg-white border border-[#E7E1D8] rounded-2xl px-4 py-2.5 card-shadow fade-in">
      <div className="flex items-center gap-2.5">
        <div className={cn(
          'w-2 h-2 rounded-full',
          onShift ? 'bg-[#5A9E60] dot-pulse' : 'bg-[#C8B8AA]'
        )} />
        <div>
          <p className={cn('text-xs font-bold', onShift ? 'text-[#1E4D22]' : 'text-[#7A756D]')}>
            {onShift ? 'En turno · Alertas activas' : 'Fuera de turno · Sin alertas'}
          </p>
          <p className="text-[10px] text-[#A9A39C]">
            {pushState === 'granted'
              ? '🔔 Push + sonido activos'
              : pushState === 'denied'
                ? '🔇 Push bloqueado — solo sonido in-app'
                : '🔔 Sonido in-app activo'}
          </p>
        </div>
      </div>
      <div className="flex items-center gap-2">
        {pushState === 'granted' && !showSiri && onShift && (
          <button
            onClick={() => setShowSiri(true)}
            className="text-[10px] font-semibold text-[#9B7EC8] press-scale"
            title="Ver instrucciones Siri"
          >
            🎙️
          </button>
        )}
        <button
          onClick={() => setOnShift(!onShift)}
          className={cn(
            'text-[11px] font-bold px-3 py-1.5 rounded-xl border transition-all press-scale',
            onShift
              ? 'bg-[#F7F5F0] text-[#7A756D] border-[#E7E1D8]'
              : 'bg-[#5A9E60]/10 text-[#1E4D22] border-[#5A9E60]/30'
          )}
        >
          {onShift ? 'Ir offline' : 'Volver al turno'}
        </button>
      </div>
    </div>
  )
}
