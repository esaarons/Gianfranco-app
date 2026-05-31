'use client'

import type { Shift } from '@/types'

interface Props {
  shift:    Shift
  onClose:  (id: string) => void
  onCancel: () => void
  loading:  boolean
}

function fmt(n: number | null | undefined) {
  if (n == null) return '—'
  return `${n.toFixed(1)} min`
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between py-2 border-b border-white/6 last:border-0">
      <span className="text-white/45 text-xs">{label}</span>
      <span className="text-white/90 text-xs font-bold">{value}</span>
    </div>
  )
}

export function ShiftCloseModal({ shift, onClose, onCancel, loading }: Props) {
  const started  = new Date(shift.started_at)
  const now      = new Date()
  const totalMin = Math.floor((now.getTime() - started.getTime()) / 60000)
  const h = Math.floor(totalMin / 60)
  const m = totalMin % 60
  const durationStr = h > 0 ? `${h}h ${m}min` : `${m}min`

  return (
    <div className="fixed inset-0 z-50 flex items-end">
      <div className="absolute inset-0 bg-black/65 backdrop-blur-[8px]" onClick={onCancel} />
      <div
        className="relative w-full max-w-lg mx-auto rounded-t-[2rem] spring-up overflow-hidden"
        style={{ background: '#0D2226', borderTop: '1px solid rgba(255,255,255,0.10)' }}
      >
        <div className="w-10 h-1 bg-white/15 rounded-full mx-auto mt-3" />

        {/* Header */}
        <div className="flex items-center justify-between px-5 pt-5 pb-3">
          <div>
            <h2 className="text-white text-base font-bold tracking-tight">Cerrar turno</h2>
            <p className="text-white/40 text-xs mt-0.5">
              Abierto a las {started.toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit' })} · {durationStr}
            </p>
          </div>
          <button
            onClick={onCancel}
            className="w-8 h-8 flex items-center justify-center rounded-full bg-white/8 text-white/35 press-scale"
          >
            ✕
          </button>
        </div>

        <div className="h-px bg-white/6 mx-5" />

        <div className="px-5 py-4 pb-8 space-y-4">
          {/* Summary */}
          {shift.summary && (
            <div className="bg-white/5 rounded-2xl px-4 py-1">
              <p className="section-label text-white/35 py-3 border-b border-white/6">Resumen del turno</p>
              <Row label="Comandas atendidas"    value={String(shift.summary.cards_total)} />
              <Row label="Pedidos cerrados"       value={String(shift.summary.orders_closed)} />
              <Row label="T. reacción promedio"   value={fmt(shift.summary.avg_reaction_time_min)} />
              <Row label="T. preparación promedio" value={fmt(shift.summary.avg_prep_time_min)} />
              <Row label="Ciclo de mesa promedio"  value={fmt(shift.summary.avg_table_cycle_min)} />
            </div>
          )}

          <p className="text-white/30 text-xs text-center px-4">
            Al cerrar se calculará el resumen final y el turno quedará registrado.
          </p>

          {/* Actions */}
          <div className="flex gap-3">
            <button
              onClick={onCancel}
              disabled={loading}
              className="flex-1 bg-white/8 text-white/60 font-semibold py-3.5 rounded-2xl text-sm press-scale disabled:opacity-40"
            >
              Cancelar
            </button>
            <button
              onClick={() => onClose(shift.id)}
              disabled={loading}
              className="flex-1 bg-[#B8574E] text-white font-bold py-3.5 rounded-2xl text-sm btn-primary disabled:opacity-50"
            >
              {loading ? 'Cerrando…' : 'Cerrar turno'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
