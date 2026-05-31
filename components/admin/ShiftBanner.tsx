'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useActiveShift } from '@/hooks/useActiveShift'

function elapsed(startedAt: string): string {
  const diffMs  = Date.now() - new Date(startedAt).getTime()
  const totalMin = Math.floor(diffMs / 60000)
  const h = Math.floor(totalMin / 60)
  const m = totalMin % 60
  return h > 0 ? `${h}h ${m}min` : `${m}min`
}

export function ShiftBanner() {
  const { shift, isActive } = useActiveShift()
  const [, tick] = useState(0)

  useEffect(() => {
    if (!isActive) return
    const id = setInterval(() => tick(n => n + 1), 60_000)
    return () => clearInterval(id)
  }, [isActive])

  if (!isActive || !shift) return null

  return (
    <Link
      href="/admin/operations"
      className="flex items-center justify-between bg-emerald-600 text-white text-sm px-4 py-1.5 hover:bg-emerald-700 transition-colors"
    >
      <span className="font-medium">Turno activo</span>
      <span className="opacity-80">{elapsed(shift.started_at)}</span>
    </Link>
  )
}
