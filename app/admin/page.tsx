'use client'

import { useQuery } from '@tanstack/react-query'
import { useTables } from '@/hooks/useTables'
import { useAreaCards } from '@/hooks/useCards'
import { TABLE_STATUS_CONFIG, ZONE_LABELS } from '@/lib/constants'
import { formatPrice } from '@/lib/utils'
import Link from 'next/link'
import type { Table, Order } from '@/types'

const BAR_AREA_ID = 'aaaaaaaa-0000-0000-0000-000000000001'
const KITCHEN_AREA_ID = 'aaaaaaaa-0000-0000-0000-000000000002'

function StatCard({ label, value, color }: { label: string; value: number | string; color: string }) {
  return (
    <div className={`rounded-2xl p-4 ${color}`}>
      <p className="text-3xl font-bold">{value}</p>
      <p className="text-sm font-medium opacity-80 mt-1">{label}</p>
    </div>
  )
}

export default function AdminPage() {
  const { data: tables = [] } = useTables()
  const { data: barCards = [] } = useAreaCards(BAR_AREA_ID)
  const { data: kitchenCards = [] } = useAreaCards(KITCHEN_AREA_ID)

  const { data: openOrders = [] } = useQuery<Order[]>({
    queryKey: ['orders', 'open'],
    queryFn: async () => {
      const res = await fetch('/api/orders?status=open')
      return res.json()
    },
    refetchInterval: 15000,
  })

  const freeTables = tables.filter((t) => t.status === 'free')
  const occupiedTables = tables.filter((t) => t.status === 'occupied')
  const cleaningTables = tables.filter((t) => t.status === 'cleaning')

  const barPending = barCards.filter((c) => c.status === 'pending').length
  const kitchenPending = kitchenCards.filter((c) => c.status === 'pending').length

  const tablesByZone: Record<string, Table[]> = {}
  tables.forEach((t) => {
    if (!tablesByZone[t.zone]) tablesByZone[t.zone] = []
    tablesByZone[t.zone].push(t)
  })

  return (
    <div className="p-4 space-y-6 max-w-2xl mx-auto">
      <div>
        <h1 className="text-2xl font-bold text-stone-800">Dashboard</h1>
        <p className="text-stone-400 text-sm">Vista general en tiempo real</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-3">
        <StatCard label="Mesas ocupadas" value={occupiedTables.length} color="bg-emerald-100 text-emerald-800" />
        <StatCard label="En limpieza" value={cleaningTables.length} color="bg-gray-200 text-gray-700" />
        <StatCard label="Barra pendiente" value={barPending} color="bg-orange-100 text-orange-700" />
        <StatCard label="Cocina pendiente" value={kitchenPending} color="bg-orange-100 text-orange-700" />
      </div>

      {/* Quick nav */}
      <div className="grid grid-cols-2 gap-3">
        {[
          { href: '/tables', label: 'Mapa de Mesas', emoji: '🗺️', color: 'bg-stone-800 text-white' },
          { href: '/bar', label: 'Barra / Servicio', emoji: '☕', color: 'bg-blue-600 text-white' },
          { href: '/kitchen', label: 'Cocina', emoji: '🍕', color: 'bg-orange-500 text-white' },
          { href: '/delivery', label: 'Delivery / Tareas', emoji: '📦', color: 'bg-amber-500 text-stone-900' },
        ].map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className={`${item.color} rounded-2xl p-4 flex items-center gap-3 font-semibold`}
          >
            <span className="text-2xl">{item.emoji}</span>
            <span className="text-sm">{item.label}</span>
          </Link>
        ))}
      </div>

      {/* Table status by zone */}
      <div>
        <h2 className="text-sm font-semibold text-stone-500 uppercase tracking-wide mb-3">Estado de mesas</h2>
        {Object.entries(tablesByZone).map(([zone, zoneTables]) => (
          <div key={zone} className="mb-4">
            <p className="text-xs text-stone-400 font-medium mb-2">{ZONE_LABELS[zone]}</p>
            <div className="flex flex-wrap gap-2">
              {zoneTables.map((table) => {
                const config = TABLE_STATUS_CONFIG[table.status]
                return (
                  <div
                    key={table.id}
                    className={`px-3 py-2 rounded-xl text-sm font-bold border-2 ${config.bg} ${config.border} ${config.color}`}
                  >
                    {table.code}
                  </div>
                )
              })}
            </div>
          </div>
        ))}
      </div>

      {/* Open orders */}
      {openOrders.length > 0 && (
        <div>
          <h2 className="text-sm font-semibold text-stone-500 uppercase tracking-wide mb-3">
            Pedidos abiertos ({openOrders.length})
          </h2>
          <div className="space-y-2">
            {openOrders.map((order) => (
              <div key={order.id} className="bg-white rounded-xl p-3 border border-stone-100 flex items-center justify-between">
                <div>
                  <span className="font-semibold text-stone-800">
                    {order.table ? `Mesa ${order.table.code}` : order.type}
                  </span>
                  <span className="text-stone-400 text-xs ml-2">
                    {order.items?.length ?? 0} items
                  </span>
                </div>
                <span className="font-bold text-amber-600">{formatPrice(order.total)}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
