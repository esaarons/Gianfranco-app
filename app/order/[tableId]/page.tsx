'use client'

import { useState } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { ProductSearch } from '@/components/orders/ProductSearch'
import { ModifierSheet } from '@/components/orders/ModifierSheet'
import { OrderSummary } from '@/components/orders/OrderSummary'
import { useOrderStore } from '@/store/orderStore'
import { toast } from 'sonner'
import type { Product } from '@/types'

export default function OrderPage() {
  const { tableId } = useParams<{ tableId: string }>()
  const router = useRouter()
  const { tableCode, items, addItem, clearCart } = useOrderStore()
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null)
  const [submitting, setSubmitting] = useState(false)

  const totalQty = items.reduce((s, i) => s + i.quantity, 0)
  const [badgeKey, setBadgeKey] = useState(0)

  async function handleSubmit() {
    if (!items.length) return
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
      router.push('/tables')
    } catch {
      toast.error('Error de conexión')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="flex flex-col h-dvh bg-[#0A1928]">

      {/* Header */}
      <div className="px-4 pt-4 pb-4 shrink-0" style={{ background: 'linear-gradient(to bottom, #0E2F33, #0A1928)' }}>
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
      </div>

      {/* Product selector */}
      <div className="flex-1 overflow-hidden flex flex-col">
        <ProductSearch onSelect={(p) => setSelectedProduct(p)} />
      </div>

      {/* Sticky order summary */}
      <div className="shrink-0">
        <OrderSummary onSubmit={handleSubmit} submitting={submitting} />
      </div>

      {/* Modifier overlay */}
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
