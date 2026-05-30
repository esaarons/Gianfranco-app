'use client'

import { useRef, useCallback, useEffect, useState } from 'react'

// Recommended volume: 0.75 — clean on mobile/laptop speakers without distortion.
// The WAV is normalized to 85% headroom, so 0.75 gives a comfortable café-level alert.
const CHIME_VOLUME  = 0.75
const SPEECH_DELAY  = 650  // ms — waits for the 720 ms chime to nearly finish

function speak(text: string) {
  if (!('speechSynthesis' in window)) return
  const u  = new SpeechSynthesisUtterance(text)
  u.lang   = 'es-PE'   // Spanish (Peru)
  u.rate   = 0.92
  u.pitch  = 1
  u.volume = 1
  window.speechSynthesis.cancel()   // stop any in-progress speech
  window.speechSynthesis.speak(u)
}

function playChime(onEnd?: () => void) {
  const audio    = new Audio('/sounds/notification.wav')
  audio.volume   = CHIME_VOLUME
  audio.play()
    .then(() => { if (onEnd) setTimeout(onEnd, SPEECH_DELAY) })
    .catch(() => { if (onEnd) onEnd() })  // fallback: run speech even if chime fails
}

export function useSound() {
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const [enabled, setEnabled] = useState(false)

  useEffect(() => {
    if (localStorage.getItem('gf_sound_enabled') === 'true') setEnabled(true)
  }, [])

  function enableSound() {
    setEnabled(true)
    localStorage.setItem('gf_sound_enabled', 'true')
    // Inaudible play to unlock the audio context on iOS/Safari
    const audio  = new Audio('/sounds/notification.wav')
    audio.volume = 0.001
    audio.play().catch(() => {})
    audioRef.current = audio
  }

  const playOrderAlert = useCallback(
    (tableCode: string | null, type = 'table') => {
      if (!enabled) return
      const text = type === 'table'
        ? `Pedido Mesa ${tableCode}`
        : 'Nueva tarea Delivery'
      playChime(() => speak(text))
    },
    [enabled]
  )

  const playPickupAlert = useCallback(
    (areaName: string) => {
      if (!enabled) return
      playChime(() => speak(`Pedido listo en ${areaName}`))
    },
    [enabled]
  )

  return { enabled, enableSound, playOrderAlert, playPickupAlert }
}
