'use client'

import { useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useUpdateCardStatus } from '@/hooks/useCards'
import { useAuthStore } from '@/store/authStore'
import { AreaCardComponent } from '@/components/cards/AreaCard'
import { SoundEnabler } from '@/components/notifications/SoundEnabler'
import { toast } from 'sonner'
import type { AreaCard } from '@/types'

const BAR_AREA_ID = 'aaaaaaaa-0000-0000-0000-000000000001'

export default function DeliveryPage() {
  const user = useAuthStore((s) => s.user)
  const isAdmin = user?.role === 'admin'
  const queryClient = useQueryClient()

  const [showCreate, setShowCreate] = useState(false)
  const [title, setTitle] = useState('')
  const [notes, setNotes] = useState('')
  const [creating, setCreating] = useState(false)

  const { data: cards = [], isLoading } = useQuery<AreaCard[]>({
    queryKey: ['delivery-cards'],
    queryFn: async () => {
      const res = await fetch(`/api/cards?areaId=${BAR_AREA_ID}`)
      return res.json()
    },
    refetchInterval: 20000,
  })

  // Show only delivery/task cards (no order_id)
  const deliveryCards = cards.filter((c) => !c.order_id)

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault()
    if (!title.trim()) return
    setCreating(true)
    try {
      const res = await fetch('/api/cards', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ areaId: BAR_AREA_ID, title, notes }),
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
    <div className="bg-stone-100 min-h-screen">
      <SoundEnabler />

      <div className="px-4 pt-4 pb-2 flex items-center justify-between">
        <h1 className="text-xl font-bold text-stone-800">Delivery / Tareas</h1>
        {isAdmin && (
          <button
            onClick={() => setShowCreate(!showCreate)}
            className="bg-amber-500 text-stone-900 font-bold px-4 py-2 rounded-xl text-sm"
          >
            + Nueva tarea
          </button>
        )}
      </div>

      {/* Create task form */}
      {showCreate && isAdmin && (
        <form onSubmit={handleCreate} className="mx-4 mb-4 bg-white rounded-2xl p-4 shadow-sm space-y-3">
          <h2 className="font-semibold text-stone-800">Nueva tarjeta Delivery / Tarea</h2>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Ej: Delivery T&C — Llevar POS"
            className="w-full bg-stone-50 rounded-xl px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-amber-400"
            required
          />
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Notas adicionales..."
            rows={2}
            className="w-full bg-stone-50 rounded-xl px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-amber-400 resize-none"
          />
          <div className="flex gap-2">
            <button
              type="submit"
              disabled={creating}
              className="flex-1 bg-amber-500 text-stone-900 font-bold py-3 rounded-xl text-sm"
            >
              {creating ? 'Creando...' : 'Crear tarea'}
            </button>
            <button
              type="button"
              onClick={() => setShowCreate(false)}
              className="px-4 py-3 rounded-xl text-sm text-stone-500 border border-stone-200"
            >
              Cancelar
            </button>
          </div>
        </form>
      )}

      {isLoading ? (
        <div className="flex items-center justify-center h-48 text-stone-400">Cargando...</div>
      ) : deliveryCards.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-48 text-stone-400">
          <span className="text-4xl mb-2">📦</span>
          <p className="text-sm">Sin tareas activas</p>
        </div>
      ) : (
        <div className="px-4 pb-8 space-y-3">
          {deliveryCards.map((card) => (
            <AreaCardComponent key={card.id} card={card} myAreaType="bar" />
          ))}
        </div>
      )}
    </div>
  )
}
