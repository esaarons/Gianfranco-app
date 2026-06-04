'use client'

import { useEffect, useState } from 'react'

/**
 * Returns a live timestamp that updates on the given interval.
 * All components using this hook share their re-render cycle —
 * they all tick together, so N cards don't create N timers.
 */
export function useNow(intervalMs = 30_000): number {
  const [now, setNow] = useState(() => Date.now())
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), intervalMs)
    return () => clearInterval(id)
  }, [intervalMs])
  return now
}
