'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useTables, useUpdateTableStatus, useJoinTables, useSplitTable } from '@/hooks/useTables'
import { TableCard } from './TableCard'
import { ZONE_LABELS } from '@/lib/constants'
import { useAuthStore } from '@/store/authStore'
import { useOrderStore } from '@/store/orderStore'
import { toast } from 'sonner'
import type { Table, TableZone } from '@/types'

const ZONES: TableZone[] = ['salon1', 'salon2', 'terrace']

export function TableMap() {
  const { data: tables = [], isLoading } = useTables()
  const updateStatus = useUpdateTableStatus()
  const joinTables = useJoinTables()
  const splitTable = useSplitTable()
  const user = useAuthStore((s) => s.user)
  const setTable = useOrderStore((s) => s.setTable)
  const router = useRouter()

  const [selected, setSelected] = useState<Table | null>(null)
  const [joinMode, setJoinMode] = useState(false)

  function getTablesByZone(zone: TableZone) {
    return tables.filter((t) => t.zone === zone)
  }

  function handleTableClick(table: Table) {
    if (joinMode && selected && selected.id !== table.id) {
      // Second click in join mode — join them
      joinTables.mutate(
        { childId: table.id, parentId: selected.id },
        {
          onSuccess: () => { toast.success(`Mesas ${selected.code} y ${table.code} unidas`); setJoinMode(false); setSelected(null) },
          onError: () => toast.error('Error al unir mesas'),
        }
      )
      return
    }
    setSelected((prev) => (prev?.id === table.id ? null : table))
  }

  function handleOccupy() {
    if (!selected) return
    if (selected.status !== 'free') { toast.error('La mesa no está libre'); return }
    updateStatus.mutate(
      { id: selected.id, status: 'occupied' },
      {
        onSuccess: () => {
          setTable(selected.id, selected.code)
          router.push(`/order/${selected.id}`)
        },
        onError: () => toast.error('Error al ocupar mesa'),
      }
    )
  }

  function handleOccupyAndOrder() {
    if (!selected) return
    if (selected.status === 'free') {
      updateStatus.mutate(
        { id: selected.id, status: 'occupied' },
        {
          onSuccess: () => {
            setTable(selected.id, selected.code)
            router.push(`/order/${selected.id}`)
          },
        }
      )
    } else if (selected.status === 'occupied') {
      setTable(selected.id, selected.code)
      router.push(`/order/${selected.id}`)
    }
  }

  function handleCleaning() {
    if (!selected) return
    updateStatus.mutate(
      { id: selected.id, status: 'cleaning' },
      {
        onSuccess: () => { toast.success(`Mesa ${selected.code} marcada para limpieza`); setSelected(null) },
        onError: () => toast.error('Error'),
      }
    )
  }

  function handleFree() {
    if (!selected) return
    updateStatus.mutate(
      { id: selected.id, status: 'free' },
      {
        onSuccess: () => { toast.success(`Mesa ${selected.code} liberada`); setSelected(null) },
        onError: () => toast.error('Error'),
      }
    )
  }

  function handleSplit() {
    if (!selected) return
    splitTable.mutate(selected.id, {
      onSuccess: () => { toast.success(`Mesa ${selected.code} separada`); setSelected(null) },
    })
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-48 text-stone-400">
        Cargando mesas...
      </div>
    )
  }

  return (
    <div className="p-4 space-y-6">
      {/* Zone sections */}
      {ZONES.map((zone) => {
        const zoneTables = getTablesByZone(zone)
        if (!zoneTables.length) return null
        return (
          <section key={zone}>
            <h2 className="text-xs font-semibold text-stone-500 uppercase tracking-wider mb-3">
              {ZONE_LABELS[zone]}
            </h2>
            <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-3">
              {zoneTables.map((table) => (
                <TableCard
                  key={table.id}
                  table={table}
                  onClick={handleTableClick}
                  selected={selected?.id === table.id}
                />
              ))}
            </div>
          </section>
        )
      })}

      {/* Action bar — fixed bottom */}
      {selected && (
        <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-stone-200 p-4 shadow-xl z-40">
          <div className="flex items-center justify-between mb-3">
            <div>
              <span className="font-bold text-lg">Mesa {selected.code}</span>
              <span className="text-stone-400 text-sm ml-2">· {selected.capacity} pers.</span>
            </div>
            <button
              onClick={() => setSelected(null)}
              className="text-stone-400 hover:text-stone-600 text-xl px-2"
            >
              ✕
            </button>
          </div>

          <div className="flex gap-2 flex-wrap">
            {selected.status === 'free' && (
              <button
                onClick={handleOccupy}
                className="flex-1 bg-emerald-500 text-white font-semibold py-3 rounded-xl text-sm min-h-[44px]"
              >
                Ocupar + Pedido
              </button>
            )}

            {selected.status === 'occupied' && (
              <>
                <button
                  onClick={handleOccupyAndOrder}
                  className="flex-1 bg-amber-500 text-stone-900 font-semibold py-3 rounded-xl text-sm min-h-[44px]"
                >
                  ＋ Agregar pedido
                </button>
                <button
                  onClick={handleCleaning}
                  className="flex-1 bg-gray-600 text-white font-semibold py-3 rounded-xl text-sm min-h-[44px]"
                >
                  Liberar mesa
                </button>
              </>
            )}

            {selected.status === 'cleaning' && (
              <button
                onClick={handleFree}
                className="flex-1 bg-gray-100 text-gray-700 font-semibold py-3 rounded-xl text-sm border border-gray-300 min-h-[44px]"
              >
                ✓ Lista
              </button>
            )}

            {selected.status !== 'cleaning' && (
              <button
                onClick={() => { setJoinMode(!joinMode) }}
                className={`px-4 py-3 rounded-xl text-sm font-medium min-h-[44px] border ${joinMode ? 'bg-amber-100 border-amber-400 text-amber-700' : 'border-stone-300 text-stone-600'}`}
              >
                {joinMode ? 'Selecciona otra...' : 'Unir'}
              </button>
            )}

            {selected.parent_table_id && (
              <button
                onClick={handleSplit}
                className="px-4 py-3 rounded-xl text-sm font-medium min-h-[44px] border border-stone-300 text-stone-600"
              >
                Separar
              </button>
            )}
          </div>
        </div>
      )}

      {/* Bottom spacing when action bar is open */}
      {selected && <div className="h-32" />}
    </div>
  )
}
