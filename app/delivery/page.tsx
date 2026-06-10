'use client'

import { useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useAuthStore } from '@/store/authStore'
import { AreaCardComponent } from '@/components/cards/AreaCard'
import { SoundEnabler } from '@/components/notifications/SoundEnabler'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import { AREA_IDS } from '@/lib/constants'
import type { AreaCard } from '@/types'

const ACCENT = '#4A87C7'

export default function DeliveryPage() {
  const user        = useAuthStore(s => s.user)
  const isAdmin     = user?.role === 'admin'
  const queryClient = useQueryClient()

  const [showCreate, setShowCreate] = useState(false)
  const [title, setTitle]           = useState('')
  const [notes, setNotes]           = useState('')
  const [creating, setCreating]     = useState(false)

  const { data: cards = [], isLoading } = useQuery<AreaCard[]>({
    queryKey: ['delivery-cards'],
    queryFn: async () => {
      const res = await fetch(`/api/cards?areaId=${AREA_IDS.DELIVERY}`)
      if (!res.ok) return []
      return res.json()
    },
    refetchInterval: 20000,
  })

  const deliveryCards = cards.filter(c => !c.order_id)
  const pending   = deliveryCards.filter(c => c.status === 'pending')
  const received  = deliveryCards.filter(c => c.status === 'received')
  const delivered = deliveryCards.filter(c => c.status === 'delivered')

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault()
    if (!title.trim()) return
    setCreating(true)
    try {
      const res = await fetch('/api/cards', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ areaId: AREA_IDS.DELIVERY, title, notes }),
      })
      if (!res.ok) throw new Error()
      toast.success('Tarea creada')
      queryClient.invalidateQueries({ queryKey: ['delivery-cards'] })
      setTitle('')
      setNotes('')
      setShowCreate(false)
    } catch {
      toast.error('Error al crear tarea')
    } finally {
      setCreating(false)
    }
  }

  return (
    <div
      className="min-h-screen"
      style={{ background: '#1B3428', paddingTop: 'env(safe-area-inset-top)' }}
    >
      <SoundEnabler />

      {/* ── Header ── */}
      <div className="px-5 pt-6 pb-4">
        <div className="flex items-start justify-between">
          <div>
            <div className="flex items-center gap-2 mb-1.5">
              <div
                className="w-1.5 h-1.5 rounded-full"
                style={{ background: ACCENT, boxShadow: `0 0 5px ${ACCENT}` }}
              />
              <p className="text-white/35 text-[10px] font-bold uppercase tracking-[0.22em]">
                Estación · Delivery
              </p>
            </div>
            <h1 className="text-white text-2xl font-bold tracking-tight leading-none">
              Tareas
            </h1>
          </div>

          <div className="flex items-center gap-2 mt-1">
            {pending.length > 0 && (
              <div
                className="flex flex-col items-center justify-center w-14 h-14 rounded-2xl"
                style={{ background: `${ACCENT}18`, border: `1px solid ${ACCENT}35` }}
              >
                <span className="text-white text-xl font-bold leading-none">{pending.length}</span>
                <span className="text-white/45 text-[9px] uppercase tracking-wide mt-0.5">pend.</span>
              </div>
            )}
            {isAdmin && (
              <button
                onClick={() => setShowCreate(v => !v)}
                className={cn(
                  'w-10 h-10 flex items-center justify-center rounded-xl text-lg font-bold press-scale border transition-all',
                  showCreate
                    ? 'text-white border-[#4A87C7]'
                    : 'border-white/12 text-white/50',
                )}
                style={{ background: showCreate ? ACCENT : 'rgba(255,255,255,0.06)' }}
              >
                {showCreate ? '✕' : '+'}
              </button>
            )}
          </div>
        </div>
      </div>

      {/* ── Create task form ── */}
      {showCreate && isAdmin && (
        <div className="px-5 mb-4 fade-in">
          <form
            onSubmit={handleCreate}
            className="rounded-2xl p-4 space-y-3 border"
            style={{ background: 'rgba(255,255,255,0.06)', borderColor: 'rgba(255,255,255,0.1)' }}
          >
            <p className="text-white/40 text-[10px] font-bold uppercase tracking-[0.18em]">Nueva tarea</p>
            <input
              type="text"
              value={title}
              onChange={e => setTitle(e.target.value)}
              placeholder="Título — Ej: Llevar POS a TC"
              className="w-full bg-white/8 border border-white/12 rounded-xl px-3.5 py-3 text-sm text-white placeholder:text-white/30 outline-none focus:border-[#4A87C7]/50 transition-all"
              required
              autoFocus
            />
            <textarea
              value={notes}
              onChange={e => setNotes(e.target.value)}
              placeholder="Notas adicionales…"
              rows={2}
              className="w-full bg-white/8 border border-white/12 rounded-xl px-3.5 py-3 text-sm text-white placeholder:text-white/30 outline-none focus:border-[#4A87C7]/50 transition-all resize-none"
            />
            <div className="flex gap-2 pt-1">
              <button
                type="button"
                onClick={() => setShowCreate(false)}
                className="px-4 py-3 rounded-xl text-sm font-semibold text-white/40 bg-white/6 border border-white/10 press-scale"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={creating}
                className="flex-1 font-bold py-3 rounded-xl text-sm press-scale disabled:opacity-50 text-white"
                style={{ background: ACCENT }}
              >
                {creating ? 'Creando…' : 'Crear tarea'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* ── Content ── */}
      {isLoading ? (
        <div className="flex items-center justify-center h-48">
          <div
            className="w-8 h-8 border-2 border-white/10 rounded-full animate-spin"
            style={{ borderTopColor: ACCENT }}
          />
        </div>
      ) : deliveryCards.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-48 gap-3">
          <div
            className="w-16 h-16 rounded-3xl flex items-center justify-center text-2xl"
            style={{ background: `${ACCENT}12`, border: `1px solid ${ACCENT}20` }}
          >
            📦
          </div>
          <p className="text-white/35 text-sm font-medium">Sin tareas activas</p>
          <p className="text-white/25 text-xs">Las nuevas tareas aparecerán aquí</p>
        </div>
      ) : (
        <div className="px-4 pb-nav space-y-3">
          {pending.map(card   => <AreaCardComponent key={card.id} card={card} myAreaType="delivery" />)}
          {received.map(card  => <AreaCardComponent key={card.id} card={card} myAreaType="delivery" />)}

          {delivered.length > 0 && (
            <div className="pt-4">
              <div className="flex items-center gap-2 mb-3 px-1">
                <span className="text-white/25 text-[10px] font-bold uppercase tracking-widest">Completadas</span>
                <div className="flex-1 h-px bg-white/8" />
                <span
                  className="text-[10px] px-2 py-0.5 rounded-full font-bold text-white/30"
                  style={{ background: 'rgba(255,255,255,0.06)' }}
                >
                  {delivered.length}
                </span>
              </div>
              {delivered.slice(0, 5).map(card => <AreaCardComponent key={card.id} card={card} myAreaType="delivery" />)}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
