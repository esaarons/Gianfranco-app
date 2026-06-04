'use client'

import { useState, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { useTables, useUpdateTableStatus, useJoinTables, useSplitTable } from '@/hooks/useTables'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { TableCard, GroupTableCard } from './TableCard'
import { TableOrderSheet } from './TableOrderSheet'
import { PickupBanner } from '@/components/notifications/PickupBanner'
import { ReservationBanner } from '@/components/notifications/ReservationBanner'
import { ZONE_LABELS } from '@/lib/constants'
import { useOrderStore } from '@/store/orderStore'
import { formatPrice, cn } from '@/lib/utils'
import { toast } from 'sonner'
import type { Table, TableZone, Order } from '@/types'

const ZONES: TableZone[] = ['salon1', 'salon2', 'terrace']
const ZONE_ICONS: Record<string, string> = { salon1: '🪑', salon2: '🪟', terrace: '🌿' }

// ── Render group helpers ──────────────────────────────────────────────────────
type RenderGroup =
  | { type: 'single'; table: Table }
  | { type: 'group'; parent: Table; children: Table[] }

function getRenderGroups(zoneTables: Table[]): RenderGroup[] {
  // Pass 1: build parent→children map and collect all child IDs
  const childrenOf = new Map<string, Table[]>()
  const childIds   = new Set<string>()

  for (const t of zoneTables) {
    if (t.parent_table_id) {
      childIds.add(t.id)
      const list = childrenOf.get(t.parent_table_id) ?? []
      list.push(t)
      childrenOf.set(t.parent_table_id, list)
    }
  }

  // Pass 2: render only root tables (not someone's child); attach their children
  return zoneTables
    .filter(t => !childIds.has(t.id))
    .map(t => {
      const children = childrenOf.get(t.id) ?? []
      return children.length > 0
        ? { type: 'group' as const, parent: t, children }
        : { type: 'single' as const, table: t }
    })
}

// ── Component ─────────────────────────────────────────────────────────────────
export function TableMap() {
  const { data: tables = [], isLoading } = useTables()
  const updateStatus = useUpdateTableStatus()
  const joinTables   = useJoinTables()
  const splitTable   = useSplitTable()
  const setTable     = useOrderStore((s) => s.setTable)
  const router       = useRouter()
  const qc           = useQueryClient()

  const [selected, setSelected]       = useState<Table | null>(null)
  const [viewOrder, setViewOrder]     = useState(false)
  const [joinSource, setJoinSource]   = useState<Table | null>(null)
  // joinPulseId: target card shows amber ripple while mutation is in-flight
  const [joinPulseId, setJoinPulseId] = useState<string | null>(null)
  // recentMergeId: new GroupTableCard plays merge-pop if its parent.id matches
  const [recentMergeId, setRecentMergeId] = useState<string | null>(null)

  const { data: openOrders = [] } = useQuery<Order[]>({
    queryKey: ['orders', 'open'],
    queryFn: async () => {
      const res = await fetch('/api/orders?status=open')
      if (!res.ok) return []
      return res.json()
    },
    refetchInterval: 15000,
    staleTime: 8000,
  })

  const orderByTable = useMemo(() => {
    const map = new Map<string, number>()
    openOrders.forEach((o) => {
      if (!o.table_id) return
      const total = o.items?.reduce((s, item) => {
        const m = item.modifiers?.reduce((ms, mod) => ms + mod.price, 0) ?? 0
        return s + (item.unit_price + m) * item.quantity
      }, 0) ?? 0
      map.set(o.table_id, total)
    })
    return map
  }, [openOrders])

  // 'ready'    — all area_cards for the order are delivered (food/drinks at the pass)
  // 'preparing'— at least one card is pending or received
  // undefined  — no cards yet (order just placed with no items dispatched)
  const orderStatusByTable = useMemo(() => {
    const map = new Map<string, 'ready' | 'preparing'>()
    openOrders.forEach((o) => {
      if (!o.table_id || !o.area_cards?.length) return
      const allDelivered = o.area_cards.every((c) => c.status === 'delivered')
      map.set(o.table_id, allDelivered ? 'ready' : 'preparing')
    })
    return map
  }, [openOrders])

  const freeCount     = tables.filter(t => t.status === 'free').length
  const occupiedCount = tables.filter(t => t.status === 'occupied').length
  const cleaningCount = tables.filter(t => t.status === 'cleaning').length

  // All children of the currently selected table (flat, direct children only)
  const selectedChildren: Table[] = selected
    ? tables.filter(t => t.parent_table_id === selected.id)
    : []
  const hasChildren = selectedChildren.length > 0

  function getByZone(zone: TableZone) {
    return tables.filter(t => t.zone === zone)
  }

  function handleTableClick(table: Table) {
    // ── Join mode ──
    if (joinSource) {
      if (joinSource.id === table.id) { setJoinSource(null); return }
      const src = joinSource
      setJoinSource(null)
      // Pulse the target immediately for tactile feedback
      setJoinPulseId(table.id)
      setTimeout(() => setJoinPulseId(null), 600)
      // Fire mutation right away — no artificial delay
      joinTables.mutate(
        { childId: src.id, parentId: table.id },
        {
          onSuccess: () => {
            // Mark the parent so GroupTableCard plays merge-pop when it mounts
            setRecentMergeId(table.id)
            setTimeout(() => setRecentMergeId(null), 2000)
            toast.success(`Mesa ${src.code} unida a ${table.code}`)
          },
          onError: () => toast.error('Error al unir mesas'),
        }
      )
      return
    }
    // If clicking a child table, select its parent instead
    if (table.parent_table_id) {
      const parent = tables.find(t => t.id === table.parent_table_id)
      if (parent) { setSelected(prev => prev?.id === parent.id ? null : parent); return }
    }
    setSelected(prev => prev?.id === table.id ? null : table)
  }

  function startJoin() {
    if (!selected) return
    setJoinSource(selected)
    setSelected(null)
  }

  function handleOccupyAndOrder() {
    if (!selected) return
    if (selected.status === 'free') {
      updateStatus.mutate(
        { id: selected.id, status: 'occupied' },
        { onSuccess: () => { setTable(selected.id, selected.code); router.push(`/order/${selected.id}`) } }
      )
    } else {
      setTable(selected.id, selected.code)
      router.push(`/order/${selected.id}`)
    }
  }

  async function releaseTable(tableId: string) {
    const res = await fetch(`/api/tables/${tableId}/release`, { method: 'POST' })
    if (!res.ok) throw new Error(await res.text())
  }

  function invalidateAfterRelease() {
    qc.invalidateQueries({ queryKey: ['tables'] })
    qc.invalidateQueries({ queryKey: ['orders', 'open'] })
    qc.invalidateQueries({ queryKey: ['cards-all-active'] })
    qc.invalidateQueries({ queryKey: ['cards-type'] })
  }

  async function handleCleaning() {
    if (!selected) return
    try {
      await releaseTable(selected.id)
      invalidateAfterRelease()
      toast.success(`Mesa ${selected.code} en limpieza`)
    } catch {
      toast.error('Error al cerrar mesa')
    }
    setSelected(null)
  }

  async function handleSplitAndClean() {
    if (!selected) return
    if (!hasChildren) { await handleCleaning(); return }
    try {
      await Promise.all(selectedChildren.map(c => splitTable.mutateAsync(c.id)))
      const allTableIds = [selected.id, ...selectedChildren.map(c => c.id)]
      await Promise.all(allTableIds.map(id => releaseTable(id)))
      invalidateAfterRelease()
      const codes = [selected, ...selectedChildren].map(t => t.code).join(', ')
      toast.success(`Mesas ${codes} separadas — en limpieza`)
      setSelected(null)
    } catch {
      toast.error('Error al separar mesas')
    }
  }

  async function handleSplitOnly() {
    if (!selected || !hasChildren) return
    try {
      await Promise.all(selectedChildren.map(c => splitTable.mutateAsync(c.id)))
      const codes = [selected, ...selectedChildren].map(t => t.code).join(', ')
      toast.success(`Mesas ${codes} separadas`)
      setSelected(null)
    } catch {
      toast.error('Error al separar')
    }
  }

  function handleFree() {
    if (!selected) return
    updateStatus.mutate(
      { id: selected.id, status: 'free' },
      { onSuccess: () => { toast.success(`Mesa ${selected.code} lista`); setSelected(null) } }
    )
  }

  const selectedHasOrder = selected ? openOrders.some(o => o.table_id === selected.id) : false

  const groupLabel = hasChildren
    ? `Mesa ${[selected!, ...selectedChildren].map(t => t.code).join(' + ')}`
    : selected ? `Mesa ${selected.code}` : ''

  return (
    <div className="flex flex-col min-h-screen bg-[#F6F2EA] pt-safe">

      {/* ── Header ── */}
      <div className="px-5 pt-8 pb-5 shrink-0">
        <div className="flex items-start justify-between mb-1">
          <div>
            <p className="text-[#8A8278] text-[10px] uppercase tracking-[0.2em] font-medium mb-1">Salón</p>
            <h1 className="text-[#252525] text-2xl font-bold tracking-tight">Mesas</h1>
          </div>
          <button
            onClick={() => { setTable('takeaway', 'Para Llevar'); router.push('/order/takeaway') }}
            className="flex items-center gap-2 bg-white border border-[#E8E4DC] rounded-2xl px-3.5 py-2.5 press-scale mt-1 card-shadow"
          >
            <span className="text-base">🥡</span>
            <span className="text-[#3A3630] text-xs font-semibold">Para Llevar</span>
          </button>
        </div>
        <div className="flex gap-2 mt-3">
          <div className="flex items-center gap-1.5 bg-white border border-[#E8E4DC] rounded-full px-3 py-1.5">
            <div className="w-2 h-2 rounded-full bg-[#C9D4C2]" />
            <span className="text-[#8A8278] text-xs font-medium">{freeCount} libres</span>
          </div>
          {occupiedCount > 0 && (
            <div className="flex items-center gap-1.5 bg-[#F2F7F3] border border-[#7A9E7E]/25 rounded-full px-3 py-1.5">
              <div className="w-2 h-2 rounded-full bg-[#7A9E7E] dot-pulse" />
              <span className="text-[#3D6B42] text-xs font-medium">{occupiedCount} ocupadas</span>
            </div>
          )}
          {cleaningCount > 0 && (
            <div className="flex items-center gap-1.5 bg-[#FAF7F4] border border-[#C8B8AA]/30 rounded-full px-3 py-1.5">
              <div className="w-2 h-2 rounded-full bg-[#C8B8AA]" />
              <span className="text-[#7C5640]/80 text-xs font-medium">{cleaningCount} limpieza</span>
            </div>
          )}
        </div>
      </div>

      {/* ── Upcoming reservations banner ── */}
      <ReservationBanner />

      {/* ── Pickup ready banner ── */}
      <PickupBanner />

      {/* ── Join mode banner ── */}
      {joinSource && (
        <div className="mx-4 mb-2 shrink-0 fade-in">
          <div className="rounded-2xl border border-[#D79A57]/30 bg-[#FEF3E8] px-4 py-3 flex items-center gap-3">
            <div className="w-2 h-2 rounded-full bg-[#D79A57] shrink-0 dot-pulse-amber" />
            <div className="flex-1 min-w-0">
              <p className="text-[#7C5010] text-sm font-semibold">Mesa {joinSource.code} seleccionada</p>
              <p className="text-[#7C5010]/60 text-xs mt-0.5">Toca la mesa con la que deseas unirla</p>
            </div>
            <button onClick={() => setJoinSource(null)}
              className="shrink-0 text-[#7C5010]/60 hover:text-[#7C5010] text-sm font-medium press-scale transition-colors">
              Cancelar
            </button>
          </div>
        </div>
      )}

      {/* ── Grid ── */}
      {isLoading ? (
        <div className="flex-1 flex items-center justify-center">
          <div className="flex flex-col items-center gap-3">
            <div className="w-8 h-8 border-2 border-[#E8E4DC] border-t-[#0F3A43] rounded-full animate-spin" />
            <p className="text-[#8A8278] text-sm">Cargando mesas…</p>
          </div>
        </div>
      ) : (
        <div className="flex-1 px-4 pb-nav space-y-6 overflow-y-auto">
          {ZONES.map((zone) => {
            const zoneTables = getByZone(zone)
            if (!zoneTables.length) return null
            const groups = getRenderGroups(zoneTables)
            return (
              <section key={zone} className="fade-in">
                <div className="flex items-center gap-2 mb-3">
                  <span className="text-base">{ZONE_ICONS[zone]}</span>
                  <h2 className="text-[#8A8278] text-[10px] font-semibold uppercase tracking-[0.18em]">
                    {ZONE_LABELS[zone]}
                  </h2>
                  <div className="flex-1 h-px bg-[#E8E4DC]" />
                </div>
                <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-2.5">
                  {groups.map((group) =>
                    group.type === 'group' ? (
                      <GroupTableCard
                        key={`${group.parent.id}-${group.children.map(c => c.id).join('-')}`}
                        parent={group.parent}
                        children={group.children}
                        onClick={handleTableClick}
                        selected={selected?.id === group.parent.id}
                        orderTotal={orderByTable.get(group.parent.id)}
                        orderStatus={orderStatusByTable.get(group.parent.id)}
                        isMergeNew={recentMergeId === group.parent.id}
                      />
                    ) : (
                      <TableCard
                        key={group.table.id}
                        table={group.table}
                        onClick={handleTableClick}
                        selected={selected?.id === group.table.id}
                        joinSource={joinSource?.id === group.table.id}
                        joinTarget={!!joinSource && joinSource.id !== group.table.id}
                        joinPulse={joinPulseId === group.table.id}
                        orderTotal={orderByTable.get(group.table.id)}
                        orderStatus={orderStatusByTable.get(group.table.id)}
                      />
                    )
                  )}
                </div>
              </section>
            )
          })}
        </div>
      )}

      {/* ── Action sheet ── */}
      {selected && !joinSource && (
        <>
          {viewOrder && (
            <div className="fixed inset-0 z-50">
              <TableOrderSheet
                table={selected}
                onClose={() => { setViewOrder(false); setSelected(null) }}
                onAddMore={() => { setViewOrder(false); handleOccupyAndOrder() }}
              />
            </div>
          )}

          <div className="fixed inset-0 bg-black/50 z-30 backdrop-blur-[6px]"
               onClick={() => { setSelected(null); setViewOrder(false) }} />

          <div className="fixed bottom-0 left-0 right-0 z-40 glass-sheet rounded-t-[2rem] px-5 pt-2 pb-safe-10 spring-up"
               style={{ borderTop: '1px solid rgba(255,255,255,0.1)' }}>

            <div className="w-10 h-1 bg-white/20 rounded-full mx-auto mb-6" />

            {/* Mesa title */}
            <div className="flex items-start justify-between mb-6">
              <div>
                <div className="flex items-baseline gap-2.5">
                  <h3 className="text-white text-2xl font-bold tracking-tight">{groupLabel}</h3>
                  <span className="text-white/40 text-sm">
                    {hasChildren
                      ? `${[selected, ...selectedChildren].reduce((s, t) => s + t.capacity, 0)} pers.`
                      : `${selected.capacity} pers.`}
                  </span>
                </div>
                <p className="text-white/30 text-sm mt-0.5 flex items-center gap-1.5">
                  {ZONE_LABELS[selected.zone]}
                  {hasChildren && (
                    <span className="text-[10px] bg-white/8 text-white/30 px-2 py-0.5 rounded-full font-semibold uppercase tracking-wider">
                      {[selected, ...selectedChildren].length} unidas
                    </span>
                  )}
                </p>
                {selected.status === 'occupied' && (orderByTable.get(selected.id) ?? 0) > 0 && (
                  <p className="text-[#A7B897] text-sm font-bold mt-1">
                    {formatPrice(orderByTable.get(selected.id)!)} en consumo
                  </p>
                )}
              </div>
              <div className={cn(
                'px-3 py-1.5 rounded-full text-xs font-semibold',
                selected.status === 'free'     && 'bg-white/10 text-white/50',
                selected.status === 'occupied' && 'bg-[#A7B897]/20 text-[#A7B897]',
                selected.status === 'cleaning' && 'bg-[#EAD9B1]/15 text-[#EAD9B1]/80',
              )}>
                {{ free: 'Libre', occupied: 'Ocupada', cleaning: 'Limpieza' }[selected.status]}
              </div>
            </div>

            {/* Actions */}
            <div className="flex flex-col gap-2.5">

              {selected.status === 'free' && (
                <button onClick={handleOccupyAndOrder}
                  className="w-full bg-[#F5F1E8] text-[#0E2F33] font-bold py-4 rounded-2xl text-sm btn-primary">
                  Ocupar y tomar pedido
                </button>
              )}

              {selected.status === 'occupied' && (
                <>
                  <button onClick={() => setViewOrder(true)}
                    className="w-full bg-[#F5F1E8] text-[#0E2F33] font-bold py-4 rounded-2xl text-sm btn-primary flex items-center justify-center gap-2">
                    <span>🧾</span><span>Ver pedido y cobrar</span>
                  </button>
                  <button onClick={handleOccupyAndOrder}
                    className="w-full glass border-0 text-white/70 font-semibold py-3.5 rounded-2xl text-sm press-scale">
                    + Agregar al pedido
                  </button>
                  <button
                    onClick={handleSplitAndClean}
                    className="w-full glass border-0 text-white/40 font-medium py-3 rounded-2xl text-sm press-scale">
                    {hasChildren
                      ? `Clientes se van — Separar y limpiar`
                      : selectedHasOrder
                        ? `Clientes se van — Cerrar mesa`
                        : `Clientes se van — Limpieza`}
                  </button>
                </>
              )}

              {selected.status === 'cleaning' && (
                <button onClick={handleFree}
                  className="w-full bg-[#A7B897] text-white font-bold py-4 rounded-2xl text-sm btn-primary">
                  ✓ Lista para usar
                </button>
              )}

              {/* Separar sin cambiar estado */}
              {hasChildren && selected.status !== 'cleaning' && (
                <button onClick={handleSplitOnly}
                  className="w-full glass border-0 text-white/30 font-medium py-3 rounded-2xl text-sm press-scale">
                  Separar mesas (mantener estado)
                </button>
              )}

              {/* Unir con otra mesa — always available when not cleaning */}
              {selected.status !== 'cleaning' && (
                <button onClick={startJoin}
                  className="w-full glass border-0 text-white/45 font-medium py-3.5 rounded-2xl text-sm press-scale">
                  {hasChildren ? 'Añadir otra mesa al grupo' : 'Unir con otra mesa'}
                </button>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  )
}
