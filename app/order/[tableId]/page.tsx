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
  const { tableCode, items, addItem, clearCart, setTable } = useOrderStore()
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null)
  const [submitting, setSubmitting] = useState(false)

  // If no tableCode in store, it was set elsewhere; restore from params
  // This is safe — setTable with same data is idempotent in practice

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
    <div className="flex flex-col h-screen bg-stone-50">
      {/* Header */}
      <div className="bg-stone-900 text-white flex items-center justify-between px-4 py-3 shrink-0">
        <button
          onClick={() => router.back()}
          className="text-stone-400 hover:text-white text-sm px-2 -ml-2"
        >
          ← Volver
        </button>
        <h1 className="font-bold text-amber-400">
          Pedido {tableCode ? `— Mesa ${tableCode}` : ''}
        </h1>
        <div className="w-16" />
      </div>

      {/* Product selector */}
      <div className="flex-1 overflow-hidden flex flex-col">
        <ProductSearch onSelect={(p) => setSelectedProduct(p)} />
      </div>

      {/* Order summary pinned to bottom */}
      <div className="shrink-0">
        <OrderSummary onSubmit={handleSubmit} submitting={submitting} />
      </div>

      {/* Modifier sheet overlay */}
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
            toast.success(`${selectedProduct.name} agregado`)
          }}
          onClose={() => setSelectedProduct(null)}
        />
      )}
    </div>
  )
}
