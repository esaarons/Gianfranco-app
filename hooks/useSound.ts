'use client'

import { useRef, useCallback, useEffect, useState } from 'react'

export function useSound() {
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const [enabled, setEnabled] = useState(false)

  useEffect(() => {
    // Try to load from localStorage preference
    const saved = localStorage.getItem('gf_sound_enabled')
    if (saved === 'true') setEnabled(true)
  }, [])

  function enableSound() {
    setEnabled(true)
    localStorage.setItem('gf_sound_enabled', 'true')
    // Play a silent sound to unlock audio on iOS/browsers
    const audio = new Audio('/sounds/notification.mp3')
    audio.volume = 0.01
    audio.play().catch(() => {})
    audioRef.current = audio
  }

  const playOrderAlert = useCallback(
    (tableCode: string | null, type = 'table') => {
      if (!enabled) return

      const text = type === 'table'
        ? `Pedido Mesa ${tableCode}`
        : 'Nueva tarea Delivery'

      // Try audio file first, fall back to Web Speech API
      const audio = new Audio('/sounds/notification.mp3')
      audio.play()
        .then(() => {
          // After the chime, speak the text
          setTimeout(() => {
            if ('speechSynthesis' in window) {
              const utterance = new SpeechSynthesisUtterance(text)
              utterance.lang = 'es-PA'
              utterance.rate = 0.9
              utterance.pitch = 1
              utterance.volume = 1
              window.speechSynthesis.speak(utterance)
            }
          }, 600)
        })
        .catch(() => {
          // No audio file — use speech only
          if ('speechSynthesis' in window) {
            const utterance = new SpeechSynthesisUtterance(text)
            utterance.lang = 'es-PA'
            utterance.rate = 0.9
            window.speechSynthesis.speak(utterance)
          }
        })
    },
    [enabled]
  )

  return { enabled, enableSound, playOrderAlert }
}
