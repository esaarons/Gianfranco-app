'use client'

import { useState, useRef, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { ProductSearch } from '@/components/orders/ProductSearch'
import { ModifierSheet } from '@/components/orders/ModifierSheet'
import { BreakfastSheet } from '@/components/orders/BreakfastSheet'
import { IceCreamSheet } from '@/components/orders/IceCreamSheet'
import { OrderSummary } from '@/components/orders/OrderSummary'
import { FreeItemSheet, buildFreeCartItem } from '@/components/orders/FreeItemSheet'
import { BrunchSheet, type BrunchType } from '@/components/orders/BrunchSheet'
import { useOrderStore } from '@/store/orderStore'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'
import type { Product } from '@/types'

export default function OrderPage() {
  const { tableId } = useParams<{ tableId: string }>()
  const router = useRouter()
  const tableCode      = useOrderStore((s) => s.tableCode)
  const storeTableId   = useOrderStore((s) => s.tableId)
  const items          = useOrderStore((s) => s.items)
  const addItem        = useOrderStore((s) => s.addItem)
  const clearCart      = useOrderStore((s) => s.clearCart)
  const guests         = useOrderStore((s) => s.guests)
  const activeGuest    = useOrderStore((s) => s.activeGuest)
  const addGuest       = useOrderStore((s) => s.addGuest)
  const setActiveGuest = useOrderStore((s) => s.setActiveGuest)
  const renameGuest    = useOrderStore((s) => s.renameGuest)

  const [selectedProduct,   setSelectedProduct]   = useState<Product | null>(null)
  const [selectedBreakfast, setSelectedBreakfast] = useState<Product | null>(null)
  const [selectedIceCream,  setSelectedIceCream]  = useState<Product | null>(null)
  const [showFreeItem,      setShowFreeItem]       = useState(false)
  const [showGuestInput,  setShowGuestInput]  = useState(false)
  const [guestDraft,      setGuestDraft]      = useState('')
  const [renamingGuest,   setRenamingGuest]   = useState<string | null>(null)
  const [selectedBrunch,  setSelectedBrunch]  = useState<BrunchType | null>(null)
  const [submitting,      setSubmitting]      = useState(false)
  const submittingRef = useRef(false)

  // Safety: wipe stale cart if arriving at a different table than what's in the store
  useEffect(() => {
    if (tableId && storeTableId && tableId !== storeTableId) clearCart()
  }, [tableId, storeTableId, clearCart])

  const totalQty = items.reduce((s, i) => s + i.quantity, 0)
  const [badgeKey, setBadgeKey] = useState(0)

  async function handleSubmit() {
    if (!items.length || submittingRef.current) return
    submittingRef.current = true
    setSubmitting(true)
    try {
      const res = await fetch('/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tableId, items }),
      })
      if (!res.ok) {
        const { error } = await res.json()
        toast.error(error ?? 'Error al enviar pedido')
        return
      }
      toast.success(`Pedido Mesa ${tableCode ?? ''} enviado`)
      clearCart()
      router.push('/salon')
    } catch {
      toast.error('Error de conexión')
    } finally {
      setSubmitting(false)
      submittingRef.current = false
    }
  }

  function commitGuest() {
    const name = guestDraft.trim()
    if (!name) return
    addGuest(name)
    setGuestDraft('')
    setShowGuestInput(false)
  }

  return (
    <div className="flex flex-col h-dvh bg-[#0F2018]">

      {/* Header */}
      <div className="px-4 pt-4 pb-3 shrink-0" style={{ background: 'linear-gradient(to bottom, #0F2018, #0F2018)' }}>
        <div className="flex items-center justify-between">
          {/* Back */}
          <button
            onClick={() => router.back()}
            className="w-9 h-9 flex items-center justify-center rounded-xl glass text-white/70 press-scale"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M19 12H5M12 5l-7 7 7 7"/>
            </svg>
          </button>

          {/* Title */}
          <div className="text-center">
            <p className="text-white/35 text-[10px] uppercase tracking-widest font-medium">Tomando pedido</p>
            <p className="text-white font-bold text-base tracking-tight leading-tight">
              {tableCode ? `Mesa ${tableCode}` : 'Nuevo pedido'}
            </p>
          </div>

          {/* Cart badge */}
          <div className="w-9 h-9 relative flex items-center justify-center rounded-xl glass">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-white/60">
              <circle cx="9" cy="21" r="1"/><circle cx="20" cy="21" r="1"/>
              <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"/>
            </svg>
            {totalQty > 0 && (
              <span
                key={badgeKey}
                className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-[#C46F4E] text-white text-[10px] font-bold rounded-full flex items-center justify-center cart-bounce"
              >
                {totalQty}
              </span>
            )}
          </div>
        </div>

        {/* ── Guest chips ─────────────────────────────────────────────────── */}
        <div className="mt-3 flex items-center gap-2 overflow-x-auto scrollbar-hide">

          {/* "Sin persona" chip — resets to no guest */}
          {guests.length > 0 && (
            <button
              onClick={() => setActiveGuest(null)}
              className={cn(
                'flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap shrink-0 transition-all press-scale border',
                activeGuest === null
                  ? 'bg-[#F5F1E8] text-[#0F2018] border-transparent'
                  : 'bg-white/6 text-white/40 border-white/8 hover:bg-white/10'
              )}
            >
              Todos
            </button>
          )}

          {/* Existing guest chips */}
          {guests.map((g) => {
            const isActive   = activeGuest === g
            const isRenaming = renamingGuest === g

            if (isRenaming) {
              return (
                <input
                  key={`rename-${g}`}
                  type="text"
                  defaultValue={g}
                  autoFocus
                  onBlur={(e) => {
                    const v = e.target.value.trim()
                    if (v && v !== g) renameGuest(g, v)
                    setRenamingGuest(null)
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      const v = (e.target as HTMLInputElement).value.trim()
                      if (v && v !== g) renameGuest(g, v)
                      setRenamingGuest(null)
                    }
                    if (e.key === 'Escape') setRenamingGuest(null)
                  }}
                  className="w-24 bg-[#F5F1E8]/15 border border-[#F5F1E8]/25 rounded-xl px-2.5 py-1.5 text-xs text-white outline-none shrink-0"
                />
              )
            }

            return (
              <button
                key={g}
                onClick={() => setActiveGuest(isActive ? null : g)}
                className={cn(
                  'flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap shrink-0 transition-all press-scale border',
                  isActive
                    ? 'bg-[#F5F1E8] text-[#0F2018] border-transparent'
                    : 'bg-white/6 text-white/45 border-white/8 hover:bg-white/10'
                )}
              >
                <span>{g}</span>
                {isActive && (
                  <span
                    role="button"
                    onClick={(e) => { e.stopPropagation(); setRenamingGuest(g) }}
                    className="w-4 h-4 flex items-center justify-center text-[#0F2018]/40 leading-none cursor-pointer text-[11px]"
                  >
                    ✎
                  </span>
                )}
              </button>
            )
          })}

          {/* Add guest — inline input or button */}
          {showGuestInput ? (
            <div className="flex items-center gap-1 shrink-0">
              <input
                type="text"
                value={guestDraft}
                onChange={(e) => setGuestDraft(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') commitGuest(); if (e.key === 'Escape') setShowGuestInput(false) }}
                placeholder="Nombre…"
                autoFocus
                className="w-24 bg-white/8 border border-white/15 rounded-xl px-2.5 py-1.5 text-xs text-white outline-none placeholder:text-white/25"
              />
              <button onClick={commitGuest}
                className="w-7 h-7 rounded-lg bg-[#F5F1E8]/15 text-white/60 text-sm font-bold flex items-center justify-center press-scale">
                ✓
              </button>
              <button onClick={() => setShowGuestInput(false)}
                className="w-7 h-7 rounded-lg glass text-white/40 text-xs font-bold flex items-center justify-center press-scale">
                ✕
              </button>
            </div>
          ) : (
            <button
              onClick={() => setShowGuestInput(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap shrink-0 bg-white/6 text-white/30 border border-white/8 press-scale hover:bg-white/10"
            >
              + Persona
            </button>
          )}
        </div>

        {/* Brunch shortcuts — shown when a guest is active */}
        {activeGuest && (
          <div className="flex items-center gap-2 mt-2 px-1">
            <span className="text-white/20 text-[9px] font-bold uppercase tracking-widest shrink-0">Brunch</span>
            {(['brunch_49', 'brunch_39'] as const).map((bt) => (
              <button
                key={bt}
                onClick={() => setSelectedBrunch(bt)}
                className="px-3 py-1 rounded-lg text-[11px] font-bold press-scale transition-all"
                style={{
                  background: 'rgba(200,145,58,0.12)',
                  border: '1px solid rgba(200,145,58,0.22)',
                  color: 'rgba(200,145,58,0.85)',
                }}
              >
                {bt === 'brunch_49' ? 'S/49' : 'S/39'}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Product selector */}
      <div className="flex-1 overflow-hidden flex flex-col">
        <ProductSearch onSelect={(p) => {
          if (p.product_type === 'breakfast')  setSelectedBreakfast(p)
          else if (p.product_type === 'ice_cream') setSelectedIceCream(p)
          else setSelectedProduct(p)
        }} />
      </div>

      {/* Pedido Libre button — sits above the order summary */}
      <div className="shrink-0 px-4 pb-2">
        <button
          onClick={() => setShowFreeItem(true)}
          className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl border border-white/10 bg-white/4 text-white/40 text-xs font-semibold press-scale hover:bg-white/8 hover:text-white/60 transition-all"
        >
          <span>✦</span>
          <span>Pedido libre · agua, extras, observaciones…</span>
        </button>
      </div>

      {/* Sticky order summary */}
      <div className="shrink-0">
        <OrderSummary onSubmit={handleSubmit} submitting={submitting} />
      </div>

      {/* Modifier overlay */}
      {selectedProduct && (
        <div className="absolute inset-0 z-20">
          <ModifierSheet
            product={selectedProduct}
            onAdd={(qty, mods, notes) => {
              addItem({
                productId:   selectedProduct.id,
                productName: selectedProduct.name,
                quantity:    qty,
                unitPrice:   selectedProduct.price,
                areaId:      selectedProduct.primary_area_id,
                areaType:    selectedProduct.primary_area?.type ?? 'bar',
                notes:       notes || undefined,
                modifiers:   mods,
              })
              setBadgeKey(k => k + 1)
              toast.success(`${selectedProduct.name} agregado${activeGuest ? ` — ${activeGuest}` : ''}`)
            }}
            onClose={() => setSelectedProduct(null)}
          />
        </div>
      )}

      {/* Breakfast combo overlay */}
      {selectedBreakfast && (
        <div className="absolute inset-0 z-20">
          <BreakfastSheet
            product={selectedBreakfast}
            onClose={() => {
              setBadgeKey(k => k + 1)
              toast.success(`${selectedBreakfast.name} agregado${activeGuest ? ` — ${activeGuest}` : ''}`)
              setSelectedBreakfast(null)
            }}
          />
        </div>
      )}

      {/* Ice cream overlay */}
      {selectedIceCream && (
        <div className="absolute inset-0 z-20">
          <IceCreamSheet
            product={selectedIceCream}
            onAdd={(qty, mods, notes) => {
              addItem({
                productId:   selectedIceCream.id,
                productName: selectedIceCream.name,
                quantity:    qty,
                unitPrice:   selectedIceCream.price,
                areaId:      selectedIceCream.primary_area_id,
                areaType:    selectedIceCream.primary_area?.type ?? 'bar',
                notes:       notes || undefined,
                modifiers:   mods,
              })
              setBadgeKey(k => k + 1)
              toast.success(`${selectedIceCream.name} agregado${activeGuest ? ` — ${activeGuest}` : ''}`)
            }}
            onClose={() => setSelectedIceCream(null)}
          />
        </div>
      )}

      {/* Free item overlay */}
      {showFreeItem && (
        <div className="absolute inset-0 z-20">
          <FreeItemSheet
            onAdd={(name, price) => {
              addItem(buildFreeCartItem(name, price))
              setBadgeKey(k => k + 1)
              toast.success(`"${name}" agregado`)
            }}
            onClose={() => setShowFreeItem(false)}
          />
        </div>
      )}

      {/* Brunch overlay */}
      {selectedBrunch && (
        <BrunchSheet
          brunchType={selectedBrunch}
          onClose={() => {
            setBadgeKey(k => k + 1)
            const label = selectedBrunch === 'brunch_49' ? 'Brunch S/49' : 'Brunch S/39'
            toast.success(`${label} agregado${activeGuest ? ` — ${activeGuest}` : ''}`)
            setSelectedBrunch(null)
          }}
        />
      )}
    </div>
  )
}
