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

export default function DeliveryPage() {
  const user    = useAuthStore((s) => s.user)
  const isAdmin = user?.role === 'admin'
  const queryClient = useQueryClient()

  const [showCreate, setShowCreate] = useState(false)
  const [title, setTitle]           = useState('')
  const [notes, setNotes]           = useState('')
  const [creating, setCreating]     = useState(false)

  const { data: cards = [], isLoading } = useQuery<AreaCard[]>({
    queryKey: ['delivery-cards'],
    queryFn: async () => {
      const res = await fetch(`/api/cards?areaId=${AREA_IDS.DELIVERY}`)
      return res.json()
    },
    refetchInterval: 20000,
  })

  const deliveryCards = cards.filter((c) => !c.order_id)
  const pending   = deliveryCards.filter((c) => c.status === 'pending')
  const received  = deliveryCards.filter((c) => c.status === 'received')
  const delivered = deliveryCards.filter((c) => c.status === 'delivered')

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
    <div className="min-h-screen bg-[#F6F2EA]">
      <SoundEnabler />

      {/* Header */}
      <div className="px-5 pt-8 pb-5">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-[#8A8278] text-[10px] uppercase tracking-[0.2em] font-medium mb-1">Estación</p>
            <h1 className="text-[#252525] text-2xl font-bold tracking-tight">Delivery / Tareas</h1>
          </div>
          <div className="flex items-center gap-2 mt-1">
            {pending.length > 0 && (
              <span className="flex items-center gap-1.5 bg-[#E08A50]/12 text-[#A05A28] text-xs font-bold px-3 py-1.5 rounded-full border border-[#E08A50]/20">
                <span className="w-1.5 h-1.5 rounded-full bg-[#E08A50] dot-pulse-amber" />
                {pending.length} pend.
              </span>
            )}
            {received.length > 0 && (
              <span className="bg-[#6D9EEB]/10 text-[#2A5FA0] text-xs font-bold px-3 py-1.5 rounded-full border border-[#6D9EEB]/20">
                {received.length} prep.
              </span>
            )}
            {isAdmin && (
              <button
                onClick={() => setShowCreate(v => !v)}
                className={cn(
                  'w-9 h-9 flex items-center justify-center rounded-xl text-lg font-bold transition-all press-scale',
                  showCreate ? 'bg-[#0F3A43] text-white' : 'bg-white border border-[#E8E4DC] text-[#3A3630]'
                )}
              >
                {showCreate ? '✕' : '+'}
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Create task form */}
      {showCreate && isAdmin && (
        <div className="px-5 mb-5 fade-in">
          <form
            onSubmit={handleCreate}
            className="bg-white border border-[#E8E4DC] rounded-2xl p-4 space-y-3 card-shadow"
          >
            <p className="text-[#8A8278] text-xs font-bold uppercase tracking-widest">Nueva tarea</p>

            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Título — Ej: Llevar POS a TC"
              className="w-full bg-[#F6F2EA] border border-[#E8E4DC] rounded-xl px-3.5 py-3 text-sm text-[#252525] placeholder:text-[#B0AB9F] outline-none focus:ring-1 focus:ring-[#0F3A43]/20 transition-shadow"
              required
              autoFocus
            />
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Notas adicionales…"
              rows={2}
              className="w-full bg-[#F6F2EA] border border-[#E8E4DC] rounded-xl px-3.5 py-3 text-sm text-[#252525] placeholder:text-[#B0AB9F] outline-none focus:ring-1 focus:ring-[#0F3A43]/20 transition-shadow resize-none"
            />
            <div className="flex gap-2 pt-1">
              <button
                type="button"
                onClick={() => setShowCreate(false)}
                className="px-4 py-3 rounded-xl text-sm font-semibold text-[#8A8278] bg-[#F6F2EA] border border-[#E8E4DC] press-scale"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={creating}
                className="flex-1 bg-[#F5F1E8] text-[#0E2F33] font-bold py-3 rounded-xl text-sm btn-primary disabled:opacity-50"
              >
                {creating ? 'Creando…' : 'Crear tarea'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Content */}
      {isLoading ? (
        <div className="flex items-center justify-center h-48">
          <div className="flex flex-col items-center gap-3">
            <div className="w-8 h-8 border-2 border-[#E8E4DC] border-t-[#0F3A43] rounded-full animate-spin" />
            <p className="text-[#8A8278] text-sm">Cargando tareas…</p>
          </div>
        </div>
      ) : deliveryCards.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-48">
          <p className="text-4xl mb-3 opacity-40">📦</p>
          <p className="text-[#8A8278] text-sm font-medium">Sin tareas activas</p>
          <p className="text-[#B0AB9F] text-xs mt-1">Las nuevas tareas aparecerán aquí</p>
        </div>
      ) : (
        <div className="px-4 pb-8 space-y-2.5">
          {pending.map((card)  => <AreaCardComponent key={card.id} card={card} myAreaType="bar" />)}
          {received.map((card) => <AreaCardComponent key={card.id} card={card} myAreaType="bar" />)}

          {delivered.length > 0 && (
            <div className="pt-4">
              <div className="flex items-center gap-2 mb-3">
                <span className="text-[#B0AB9F] text-[10px] font-bold uppercase tracking-widest">Completadas</span>
                <div className="flex-1 h-px bg-[#E8E4DC]" />
                <span className="bg-white border border-[#E8E4DC] text-[#B0AB9F] text-[10px] px-2 py-0.5 rounded-full">{delivered.length}</span>
              </div>
              {delivered.slice(0, 5).map((card) => <AreaCardComponent key={card.id} card={card} myAreaType="bar" />)}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
