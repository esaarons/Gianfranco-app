'use client'

import { useState } from 'react'
import { useProducts, useUpdateProductStock } from '@/hooks/useProducts'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'
import type { Product, StockStatus } from '@/types'

interface StockPanelProps {
  areaType: 'bar' | 'kitchen'
  onClose: () => void
}

const STATUS_LABELS: Record<StockStatus, string> = {
  available: 'OK',
  low:       '85',
  out:       '86',
}

const STATUS_ACTIVE: Record<StockStatus, string> = {
  available: 'bg-[#9DAA7D] text-white',
  low:       'bg-amber-400 text-white',
  out:       'bg-[#B8574E] text-white',
}

const STATUS_IDLE = 'bg-[#F0EDE8] text-[#7A756D]'

function StockRow({ product }: { product: Product }) {
  const updateStock = useUpdateProductStock()
  const current = product.stock_status ?? 'available'

  function handle(status: StockStatus) {
    if (status === current) return
    updateStock.mutate(
      { id: product.id, stock_status: status },
      {
        onSuccess: () => {
          const label = status === 'available' ? 'Disponible' : status === 'low' ? 'Poco stock (85)' : 'Sin stock (86)'
          toast.success(`${product.name} — ${label}`)
        },
        onError: () => toast.error('Error actualizando stock'),
      }
    )
  }

  return (
    <div className={cn(
      'flex items-center gap-3 bg-white rounded-xl px-4 py-3 border transition-all',
      current === 'out' ? 'border-red-200 opacity-70' : current === 'low' ? 'border-amber-200' : 'border-[#E7E1D8]'
    )}>
      <div className="flex-1 min-w-0">
        <p className={cn('font-semibold text-sm truncate', current === 'out' ? 'text-[#7A756D] line-through' : 'text-[#1F1F1F]')}>
          {product.name}
        </p>
        <p className="text-xs text-[#7A756D] mt-0.5 truncate">{product.category?.name}</p>
      </div>
      <div className="flex gap-1 shrink-0">
        {(['available', 'low', 'out'] as StockStatus[]).map((s) => (
          <button
            key={s}
            disabled={updateStock.isPending}
            onClick={() => handle(s)}
            className={cn(
              'px-2.5 py-1.5 rounded-lg text-[11px] font-bold transition-all press-scale',
              current === s ? STATUS_ACTIVE[s] : STATUS_IDLE
            )}
          >
            {STATUS_LABELS[s]}
          </button>
        ))}
      </div>
    </div>
  )
}

export function StockPanel({ areaType, onClose }: StockPanelProps) {
  const { data: products = [], isLoading } = useProducts()
  const [filter, setFilter] = useState('')

  const myProducts = products.filter(
    (p) => p.active && p.primary_area?.type === areaType
  )

  const filtered = filter.trim()
    ? myProducts.filter((p) => p.name.toLowerCase().includes(filter.toLowerCase()))
    : myProducts

  const outCount = myProducts.filter((p) => p.stock_status === 'out').length
  const lowCount = myProducts.filter((p) => p.stock_status === 'low').length

  return (
    <div className="fixed inset-0 z-50 flex flex-col" onClick={onClose}>
      <div className="flex-1" />
      <div
        className="bg-[#F7F5F0] rounded-t-3xl overflow-hidden flex flex-col"
        style={{ maxHeight: '85dvh' }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-start justify-between px-5 pt-5 pb-3 border-b border-[#E7E1D8] shrink-0">
          <div>
            <h2 className="font-bold text-[#1F1F1F] text-lg leading-tight">Stock operativo</h2>
            <p className="text-xs text-[#7A756D] mt-0.5">
              {areaType === 'bar' ? 'Barra' : 'Cocina'} · 85 = poco stock · 86 = sin stock
            </p>
            {(outCount > 0 || lowCount > 0) && (
              <div className="flex gap-2 mt-2">
                {outCount > 0 && (
                  <span className="text-[10px] font-bold bg-red-100 text-red-600 px-2.5 py-1 rounded-full">
                    {outCount} sin stock
                  </span>
                )}
                {lowCount > 0 && (
                  <span className="text-[10px] font-bold bg-amber-100 text-amber-700 px-2.5 py-1 rounded-full">
                    {lowCount} poco stock
                  </span>
                )}
              </div>
            )}
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-white border border-[#E7E1D8] flex items-center justify-center text-[#7A756D] text-lg font-bold shrink-0 mt-0.5"
          >×</button>
        </div>

        {/* Search */}
        <div className="px-4 py-3 border-b border-[#E7E1D8] shrink-0">
          <input
            type="search"
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            placeholder="Buscar producto..."
            className="w-full bg-white border border-[#E7E1D8] rounded-xl px-4 py-2.5 text-sm text-[#1F1F1F] outline-none focus:border-[#1E3541] placeholder:text-[#7A756D]"
          />
        </div>

        {/* List */}
        <div className="overflow-y-auto flex-1 px-4 py-3 space-y-2">
          {isLoading ? (
            <div className="flex justify-center py-10">
              <div className="w-6 h-6 border-2 border-[#E7E1D8] border-t-[#1E3541] rounded-full animate-spin" />
            </div>
          ) : filtered.length === 0 ? (
            <p className="text-center text-[#7A756D] text-sm py-8">
              {myProducts.length === 0 ? 'No hay productos para esta área' : `Sin resultados para "${filter}"`}
            </p>
          ) : (
            filtered.map((p) => <StockRow key={p.id} product={p} />)
          )}
        </div>
      </div>
    </div>
  )
}
