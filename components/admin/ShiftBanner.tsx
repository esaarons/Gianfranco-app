'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useActiveShift } from '@/hooks/useActiveShift'

function elapsed(startedAt: string): string {
  const diffMs = Date.now() - new Date(startedAt).getTime()
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
      className="flex items-center justify-between px-4 py-2 transition-opacity hover:opacity-80"
      style={{ background: '#172E38', borderBottom: '1px solid rgba(255,255,255,0.06)' }}
    >
      <div className="flex items-center gap-2.5">
        <span className="w-1.5 h-1.5 rounded-full bg-[#6D8A5C] dot-pulse shrink-0" />
        <span className="text-white/75 text-xs font-semibold tracking-tight">Turno activo</span>
        {shift.started_by_user && (
          <span className="text-white/30 text-xs hidden sm:inline">· {shift.started_by_user.name}</span>
        )}
      </div>
      <div className="flex items-center gap-2">
        <span className="text-white/40 text-xs font-medium tabular-nums">{elapsed(shift.started_at)}</span>
        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="text-white/25">
          <path d="M9 18l6-6-6-6"/>
        </svg>
      </div>
    </Link>
  )
}
