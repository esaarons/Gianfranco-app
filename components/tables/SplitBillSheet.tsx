'use client'

import { useState } from 'react'
import { formatPrice } from '@/lib/utils'
import { cn } from '@/lib/utils'
import type { Order, OrderItem } from '@/types'

interface SplitBillSheetProps {
  order: Order
  onClose: () => void
  onCloseTable?: () => void
}

interface Person {
  id: string
  label: string
  paid: boolean
}

// assignments[itemId][personId] = qty assigned to that person
type Assignments = Record<string, Record<string, number>>

export function SplitBillSheet({ order, onClose, onCloseTable }: SplitBillSheetProps) {
  const items = order.items ?? []

  const [persons, setPersons]         = useState<Person[]>([
    { id: '1', label: 'Persona 1', paid: false },
    { id: '2', label: 'Persona 2', paid: false },
  ])
  const [activePerson, setActivePerson] = useState('1')
  const [assignments, setAssignments]   = useState<Assignments>({})

  // ── Helpers ──────────────────────────────────────────────────────────────────
  function totalAssigned(itemId: string) {
    return Object.values(assignments[itemId] ?? {}).reduce((s, q) => s + q, 0)
  }
  function unassigned(item: OrderItem) {
    return item.quantity - totalAssigned(item.id)
  }
  function personQty(itemId: string, personId: string) {
    return assignments[itemId]?.[personId] ?? 0
  }
  function assign(item: OrderItem, delta: number) {
    const current   = personQty(item.id, activePerson)
    const available = unassigned(item) + (delta < 0 ? 0 : 0)  // can reduce own, can add from pool
    const maxAdd    = delta > 0 ? unassigned(item) : current
    if (maxAdd === 0) return
    const newVal = Math.max(0, Math.min(current + delta, current + Math.max(0, delta > 0 ? unassigned(item) : 0) + (delta < 0 ? current : 0)))
    const clamped = delta > 0
      ? Math.min(current + 1, current + unassigned(item))
      : Math.max(0, current - 1)
    setAssignments(prev => ({
      ...prev,
      [item.id]: { ...(prev[item.id] ?? {}), [activePerson]: clamped },
    }))
  }

  function itemLinePrice(item: OrderItem, qty: number) {
    const modPrice = item.modifiers?.reduce((s, m) => s + m.price, 0) ?? 0
    return (item.unit_price + modPrice) * qty
  }

  function personTotal(personId: string) {
    return items.reduce((sum, item) => {
      const qty = personQty(item.id, personId)
      return sum + itemLinePrice(item, qty)
    }, 0)
  }

  function unassignedTotal() {
    return items.reduce((sum, item) => sum + itemLinePrice(item, unassigned(item)), 0)
  }

  function addPerson() {
    if (persons.length >= 8) return
    const id = String(Date.now())
    const label = `Persona ${persons.length + 1}`
    setPersons(prev => [...prev, { id, label, paid: false }])
    setActivePerson(id)
  }

  function markPaid(personId: string) {
    setPersons(prev => prev.map(p => p.id === personId ? { ...p, paid: true } : p))
  }

  const allPaid = persons.every(p => p.paid) && unassignedTotal() === 0
  const orderTotal = order.items?.reduce((s, item) => {
    const m = item.modifiers?.reduce((ms, mod) => ms + mod.price, 0) ?? 0
    return s + (item.unit_price + m) * item.quantity
  }, 0) ?? 0

  return (
    <>
      <div className="absolute inset-0 bg-black/60 backdrop-blur-[8px]" onClick={onClose} />

      <div className="absolute bottom-0 left-0 right-0 rounded-t-[2rem] flex flex-col max-h-[95dvh] spring-up"
           style={{ background: '#0A1A1D', borderTop: '1px solid rgba(255,255,255,0.12)' }}>

        {/* Handle */}
        <div className="w-10 h-1 bg-white/20 rounded-full mx-auto mt-3 shrink-0" />

        {/* Header */}
        <div className="flex items-center justify-between px-5 pt-4 pb-3 shrink-0">
          <div>
            <h2 className="text-white text-lg font-bold tracking-tight">Dividir cuenta</h2>
            <p className="text-white/30 text-xs mt-0.5">Mesa {order.table?.code} · Total {formatPrice(orderTotal)}</p>
          </div>
          <button onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-full glass text-white/50 press-scale">
            ✕
          </button>
        </div>

        {/* Person tabs */}
        <div className="flex gap-2 px-5 pb-3 overflow-x-auto scrollbar-hide shrink-0">
          {persons.map(p => (
            <button
              key={p.id}
              onClick={() => !p.paid && setActivePerson(p.id)}
              className={cn(
                'flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold whitespace-nowrap shrink-0 transition-all press-scale',
                p.paid
                  ? 'bg-[#A7B897]/20 text-[#A7B897] opacity-60'
                  : activePerson === p.id
                    ? 'bg-[#F5F1E8] text-[#0E2F33]'
                    : 'bg-white/8 text-white/50 hover:bg-white/12'
              )}
            >
              {p.paid ? '✓' : ''} {p.label}
              {!p.paid && (
                <span className={cn(
                  'text-[10px] font-bold',
                  activePerson === p.id ? 'text-[#0E2F33]/50' : 'text-white/30'
                )}>
                  {formatPrice(personTotal(p.id))}
                </span>
              )}
            </button>
          ))}
          {persons.length < 8 && (
            <button
              onClick={addPerson}
              className="w-8 h-8 rounded-xl glass text-white/40 flex items-center justify-center text-lg shrink-0 press-scale"
            >+</button>
          )}
        </div>

        <div className="h-px bg-white/8 mx-5 shrink-0" />

        {/* Items — assign to active person */}
        <div className="flex-1 overflow-y-auto px-5 py-3 space-y-2 scrollbar-hide">

          {/* Unassigned pool indicator */}
          {unassignedTotal() > 0 && (
            <div className="flex items-center justify-between bg-[#C46F4E]/10 border border-[#C46F4E]/20 rounded-xl px-3 py-2 mb-3">
              <span className="text-[#C46F4E]/80 text-xs font-medium">Sin asignar</span>
              <span className="text-[#C46F4E] text-xs font-bold">{formatPrice(unassignedTotal())}</span>
            </div>
          )}

          {items.map(item => {
            const modPrice = item.modifiers?.reduce((s, m) => s + m.price, 0) ?? 0
            const unitTotal = item.unit_price + modPrice
            const myQty  = personQty(item.id, activePerson)
            const pool   = unassigned(item)
            const activePaid = persons.find(p => p.id === activePerson)?.paid

            return (
              <div key={item.id}
                className="bg-[#162B2F] border border-white/8 rounded-2xl overflow-hidden">

                {/* Item info row */}
                <div className="flex items-start gap-3 px-4 pt-3 pb-2">
                  <div className="flex-1 min-w-0">
                    <p className="text-white/90 text-sm font-semibold">{item.product?.name}</p>
                    {item.modifiers && item.modifiers.length > 0 && (
                      <p className="text-white/35 text-xs mt-0.5">
                        {item.modifiers.map(m => m.modifier?.name).join(' · ')}
                      </p>
                    )}
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-white/50 text-xs">{item.quantity} × {formatPrice(unitTotal)}</p>
                  </div>
                </div>

                {/* Assignment row */}
                <div className="flex items-center justify-between px-4 pb-3 gap-3">
                  {/* Pool remaining */}
                  <div className="flex items-center gap-1.5">
                    <div className="w-1.5 h-1.5 rounded-full bg-[#C46F4E]/60" />
                    <span className="text-white/30 text-xs">{pool} sin asignar</span>
                  </div>

                  {/* Person qty controls */}
                  {!activePaid && (
                    <div className="flex items-center gap-2.5">
                      <span className="text-white/40 text-xs font-medium">
                        {persons.find(p => p.id === activePerson)?.label}:
                      </span>
                      <div className="flex items-center gap-2 bg-white/8 rounded-xl px-2 py-1">
                        <button
                          onClick={() => assign(item, -1)}
                          disabled={myQty === 0}
                          className="w-6 h-6 rounded-lg bg-white/10 text-white/60 text-sm font-bold flex items-center justify-center disabled:opacity-30 press-scale"
                        >−</button>
                        <span className="w-5 text-center text-sm font-bold text-white">{myQty}</span>
                        <button
                          onClick={() => assign(item, 1)}
                          disabled={pool === 0}
                          className="w-6 h-6 rounded-lg bg-white/15 text-white/80 text-sm font-bold flex items-center justify-center disabled:opacity-30 press-scale"
                        >+</button>
                      </div>
                      {myQty > 0 && (
                        <span className="text-white/50 text-xs font-bold">{formatPrice(unitTotal * myQty)}</span>
                      )}
                    </div>
                  )}
                </div>

                {/* Mini assignment summary bar */}
                {item.quantity > 1 && (
                  <div className="flex h-1 mx-4 mb-3 rounded-full overflow-hidden gap-px">
                    {persons.map(p => {
                      const qty = personQty(item.id, p.id)
                      if (qty === 0) return null
                      return (
                        <div
                          key={p.id}
                          className={cn('h-full transition-all', p.paid ? 'bg-[#A7B897]' : 'bg-[#F5F1E8]')}
                          style={{ flex: qty }}
                          title={`${p.label}: ${qty}`}
                        />
                      )
                    })}
                    {unassigned(item) > 0 && (
                      <div className="h-full bg-[#C46F4E]/40" style={{ flex: unassigned(item) }} />
                    )}
                  </div>
                )}
              </div>
            )
          })}
        </div>

        {/* Footer — cobrar persona activa */}
        <div className="shrink-0 px-5 pb-8 pt-3 space-y-2.5" style={{ borderTop: '1px solid rgba(255,255,255,0.08)' }}>

          {allPaid ? (
            <div className="space-y-2">
              <div className="w-full bg-[#A7B897]/15 text-[#A7B897] font-bold py-3 rounded-2xl text-sm text-center success-pop border border-[#A7B897]/20">
                Todas las cuentas cobradas ✓
              </div>
              {onCloseTable && (
                <button
                  onClick={onCloseTable}
                  className="w-full bg-[#F5F1E8] text-[#0E2F33] font-bold py-4 rounded-2xl text-sm btn-primary"
                >
                  Cerrar mesa →
                </button>
              )}
            </div>
          ) : (
            <>
              {/* Active person summary */}
              {(() => {
                const person = persons.find(p => p.id === activePerson)
                if (!person || person.paid) return null
                const pTotal = personTotal(activePerson)
                return (
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-white/40 text-xs">{person.label}</p>
                      <p className="text-white text-xl font-bold tracking-tight">{formatPrice(pTotal)}</p>
                    </div>
                    <button
                      onClick={() => markPaid(activePerson)}
                      disabled={pTotal === 0}
                      className="bg-[#F5F1E8] text-[#0E2F33] font-bold py-3 px-6 rounded-2xl text-sm btn-primary disabled:opacity-40"
                    >
                      Cobrar {person.label}
                    </button>
                  </div>
                )
              })()}

              {unassignedTotal() > 0 && (
                <p className="text-[#C46F4E]/70 text-xs text-center">
                  Quedan {formatPrice(unassignedTotal())} sin asignar
                </p>
              )}
            </>
          )}
        </div>
      </div>
    </>
  )
}
