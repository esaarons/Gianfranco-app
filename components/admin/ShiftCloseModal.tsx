'use client'

import { useState } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
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

export function ShiftCloseModal({ shift, onClose, onCancel, loading }: Props) {
  const started = new Date(shift.started_at)
  const now     = new Date()
  const diffMs  = now.getTime() - started.getTime()
  const totalMin = Math.floor(diffMs / 60000)
  const h = Math.floor(totalMin / 60)
  const m = totalMin % 60

  return (
    <Dialog open onOpenChange={open => !open && onCancel()}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Cerrar turno</DialogTitle>
        </DialogHeader>

        <div className="space-y-3 py-2">
          <p className="text-sm text-muted-foreground">
            El turno comenzó a las {started.toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit' })} y lleva{' '}
            <span className="font-medium text-foreground">{h > 0 ? `${h}h ${m}min` : `${m}min`}</span>.
          </p>

          <div className="rounded-lg border bg-muted/40 p-3 space-y-1 text-sm">
            <p className="text-xs font-semibold uppercase text-muted-foreground mb-2">Resumen del turno</p>
            <Row label="Comandas atendidas" value={shift.summary ? String(shift.summary.cards_total) : '—'} />
            <Row label="Pedidos cerrados"   value={shift.summary ? String(shift.summary.orders_closed) : '—'} />
            <Row label="T. reacción prom."  value={fmt(shift.summary?.avg_reaction_time_min)} />
            <Row label="T. preparación prom." value={fmt(shift.summary?.avg_prep_time_min)} />
            <Row label="Ciclo de mesa prom." value={fmt(shift.summary?.avg_table_cycle_min)} />
          </div>

          <p className="text-xs text-muted-foreground">
            Al cerrar, se calculará el resumen final y el turno quedará registrado.
          </p>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onCancel} disabled={loading}>Cancelar</Button>
          <Button variant="destructive" onClick={() => onClose(shift.id)} disabled={loading}>
            {loading ? 'Cerrando...' : 'Cerrar turno'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-medium">{value}</span>
    </div>
  )
}
