'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { ProductSearch } from '@/components/orders/ProductSearch'
import { ModifierSheet } from '@/components/orders/ModifierSheet'
import { OrderSummary } from '@/components/orders/OrderSummary'
import { useOrderStore } from '@/store/orderStore'
import { toast } from 'sonner'
import type { Product } from '@/types'

export default function TakeawayOrderPage() {
  const router = useRouter()
  const { items, addItem, clearCart, total } = useOrderStore()
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [ticketNumber, setTicketNumber] = useState<string | null>(null)

  const totalQty = items.reduce((s, i) => s + i.quantity, 0)
  const [badgeKey, setBadgeKey] = useState(0)

  async function handleSubmit() {
    if (!items.length) return
    setSubmitting(true)
    try {
      const res = await fetch('/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tableId: null, items, type: 'takeaway' }),
      })
      if (!res.ok) {
        const { error } = await res.json()
        toast.error(error ?? 'Error al enviar pedido')
        return
      }
      const { orderId } = await res.json()
      // Show last 4 chars of orderId as pickup number
      setTicketNumber(orderId.slice(-4).toUpperCase())
      clearCart()
    } catch {
      toast.error('Error de conexión')
    } finally {
      setSubmitting(false)
    }
  }

  // ── Ticket confirmation screen ──
  if (ticketNumber) {
    return (
      <div className="flex flex-col h-dvh bg-[#0B1E21] items-center justify-center px-6 text-center">
        <div className="success-pop">
          <div className="w-24 h-24 rounded-3xl bg-[#A7B897]/20 border border-[#A7B897]/40 flex items-center justify-center mx-auto mb-6">
            <span className="text-5xl">🥡</span>
          </div>
        </div>
        <p className="text-white/40 text-xs uppercase tracking-widest font-medium mb-2">Pedido para llevar</p>
        <p className="text-white text-6xl font-bold tracking-tight mb-1">#{ticketNumber}</p>
        <p className="text-white/30 text-sm mb-10">Número de retiro del cliente</p>
        <button
          onClick={() => { setTicketNumber(null); router.push('/salon') }}
          className="bg-[#F5F1E8] text-[#0F2018] font-bold py-4 px-8 rounded-2xl text-sm btn-primary"
        >
          Listo
        </button>
        <button
          onClick={() => setTicketNumber(null)}
          className="mt-3 glass text-white/40 font-medium py-3 px-6 rounded-2xl text-sm press-scale"
        >
          Nuevo pedido para llevar
        </button>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-dvh bg-[#0F2018]">

      {/* Header */}
      <div className="px-4 pt-4 pb-4 shrink-0" style={{ background: 'linear-gradient(to bottom, #0F2018, #0F2018)' }}>
        <div className="flex items-center justify-between">
          <button
            onClick={() => router.back()}
            className="w-9 h-9 flex items-center justify-center rounded-xl glass text-white/70 press-scale"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M19 12H5M12 5l-7 7 7 7"/>
            </svg>
          </button>

          <div className="text-center">
            <p className="text-[#F5F1E8]/50 text-[10px] uppercase tracking-widest font-medium">Pedido</p>
            <p className="text-[#F5F1E8] font-bold text-base tracking-tight leading-tight">Para Llevar 🥡</p>
          </div>

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
      </div>

      <div className="flex-1 overflow-hidden flex flex-col">
        <ProductSearch onSelect={(p) => setSelectedProduct(p)} />
      </div>

      <div className="shrink-0">
        <OrderSummary onSubmit={handleSubmit} submitting={submitting} label="Enviar para llevar" />
      </div>

      {selectedProduct && (
        <ModifierSheet
          product={selectedProduct}
          onAdd={(qty, mods, notes) => {
            addItem({
              productId: selectedProduct.id,
              productName: selectedProduct.name,
              quantity: qty,
              unitPrice: selectedProduct.price,
              areaId: selectedProduct.primary_area_id,
              areaType: selectedProduct.primary_area?.type ?? 'bar',
              notes: notes || undefined,
              modifiers: mods,
            })
            setBadgeKey(k => k + 1)
            toast.success(`${selectedProduct.name} agregado`)
          }}
          onClose={() => setSelectedProduct(null)}
        />
      )}
    </div>
  )
}
