'use client'

import { useState, useRef, useCallback } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { formatPrice, cn } from '@/lib/utils'
import { useSetting, useUpdateSetting } from '@/hooks/useSetting'
import { toast } from 'sonner'
import type { Product, Category, Area } from '@/types'

// ── Category icon map ─────────────────────────────────────────────────────────
const CAT_ICON: Record<string, string> = {
  'Espresso Bar': '☕', 'Brew Bar': '♨', 'Cold Drinks': '🧊',
  'Matcha Bar': '🍵', 'Specialty Lattes': '🥛', 'Jugos': '🍊',
  'Jugos / Refresh': '🍋', 'Refresh': '🍋', 'Tostones': '🥑',
  'Sandwiches': '🥪', 'Quiche': '🥧', 'Ensaladas': '🥗',
  'Pastas': '🍝', 'Pastas / Ensaladas': '🍝', 'Pizzas': '🍕',
  'Postres': '🍰', 'Smoothie Bowls': '🫐', 'Vitrina': '🥐',
  'Desayunos': '🍳', 'Infusiones': '🫖', 'Helados': '🍦',
}

// ── Hooks ─────────────────────────────────────────────────────────────────────
function useAllProducts() {
  return useQuery<Product[]>({
    queryKey: ['products-admin'],
    queryFn: async () => {
      const res = await fetch('/api/products?all=true')
      if (!res.ok) throw new Error('Error')
      return res.json()
    },
    staleTime: 30000,
  })
}

function useCategories() {
  return useQuery<Category[]>({
    queryKey: ['categories'],
    queryFn: async () => {
      const res = await fetch('/api/categories')
      return res.json()
    },
    staleTime: 300000,
  })
}

function useAreas() {
  return useQuery<Area[]>({
    queryKey: ['areas'],
    queryFn: async () => {
      const res = await fetch('/api/areas')
      return res.json()
    },
    staleTime: 300000,
  })
}

// ── Product sheet ─────────────────────────────────────────────────────────────
interface SheetProduct {
  id?: string
  name: string
  category_id: string
  primary_area_id: string
  price: number | ''
  description: string
  active: boolean
  is_favorite: boolean
}

function ProductSheet({
  initial,
  categories,
  areas,
  onClose,
  onSave,
}: {
  initial?: Product
  categories: Category[]
  areas: Area[]
  onClose: () => void
  onSave: (p: SheetProduct) => Promise<void>
}) {
  const [form, setForm] = useState<SheetProduct>({
    id:              initial?.id,
    name:            initial?.name ?? '',
    category_id:     initial?.category_id ?? categories[0]?.id ?? '',
    primary_area_id: initial?.primary_area_id ?? areas[0]?.id ?? '',
    price:           initial?.price ?? '',
    description:     initial?.description ?? '',
    active:          initial?.active ?? true,
    is_favorite:     initial?.is_favorite ?? false,
  })
  const [saving, setSaving] = useState(false)

  const set = useCallback(<K extends keyof SheetProduct>(k: K, v: SheetProduct[K]) =>
    setForm(prev => ({ ...prev, [k]: v })), [])

  async function handleSave() {
    if (!form.name.trim()) { toast.error('El nombre es requerido'); return }
    if (!form.price || Number(form.price) <= 0) { toast.error('El precio es requerido'); return }
    if (!form.category_id)     { toast.error('Selecciona una categoría'); return }
    if (!form.primary_area_id) { toast.error('Selecciona una estación'); return }
    setSaving(true)
    try {
      await onSave(form)
      onClose()
    } finally {
      setSaving(false)
    }
  }

  return (
    <>
      <div className="absolute inset-0 bg-black/60 backdrop-blur-[6px]" onClick={onClose} />
      <div
        className="absolute bottom-0 left-0 right-0 rounded-t-[2rem] flex flex-col max-h-[92dvh] spring-up"
        style={{ background: '#0A1A1D', borderTop: '1px solid rgba(255,255,255,0.12)' }}
      >
        <div className="w-10 h-1 bg-white/20 rounded-full mx-auto mt-3 shrink-0" />

        {/* Header */}
        <div className="flex items-center justify-between px-5 pt-4 pb-3 shrink-0">
          <h2 className="text-white text-lg font-bold tracking-tight">
            {initial ? 'Editar producto' : 'Nuevo producto'}
          </h2>
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-full glass text-white/50 press-scale"
          >✕</button>
        </div>

        <div className="h-px bg-white/8 mx-5 shrink-0" />

        {/* Form body */}
        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4 scrollbar-hide">

          {/* Name */}
          <div>
            <label className="text-white/40 text-xs font-semibold uppercase tracking-widest block mb-1.5">Nombre</label>
            <input
              type="text"
              value={form.name}
              onChange={(e) => set('name', e.target.value)}
              placeholder="Ej: Latte de Avena"
              className="w-full bg-white/8 border border-white/10 focus:border-white/25 rounded-2xl px-4 py-3 text-sm text-white placeholder:text-white/30 outline-none transition-all"
            />
          </div>

          {/* Category */}
          <div>
            <label className="text-white/40 text-xs font-semibold uppercase tracking-widest block mb-2">Categoría</label>
            <div className="flex flex-wrap gap-2">
              {categories.map((cat) => (
                <button
                  key={cat.id}
                  onClick={() => set('category_id', cat.id)}
                  className={cn(
                    'flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all press-scale',
                    form.category_id === cat.id
                      ? 'bg-[#F5F1E8] text-[#0E2F33]'
                      : 'bg-white/8 text-white/45 hover:bg-white/12'
                  )}
                >
                  <span>{CAT_ICON[cat.name] ?? '•'}</span>
                  {cat.name}
                </button>
              ))}
            </div>
          </div>

          {/* Area */}
          <div>
            <label className="text-white/40 text-xs font-semibold uppercase tracking-widest block mb-2">Estación</label>
            <div className="flex gap-2">
              {areas.map((area) => (
                <button
                  key={area.id}
                  onClick={() => set('primary_area_id', area.id)}
                  className={cn(
                    'flex-1 flex items-center justify-center gap-2 py-3 rounded-2xl text-sm font-bold transition-all press-scale',
                    form.primary_area_id === area.id
                      ? area.type === 'bar'
                        ? 'bg-[#A7B897]/25 text-[#A7B897] border border-[#A7B897]/40'
                        : 'bg-[#C46F4E]/20 text-[#C46F4E] border border-[#C46F4E]/40'
                      : 'bg-white/8 text-white/40 border border-white/8'
                  )}
                >
                  <span>{area.type === 'bar' ? '☕' : '🍳'}</span>
                  {area.name}
                </button>
              ))}
            </div>
          </div>

          {/* Price */}
          <div>
            <label className="text-white/40 text-xs font-semibold uppercase tracking-widest block mb-1.5">Precio (S/.)</label>
            <input
              type="number"
              value={form.price}
              onChange={(e) => set('price', e.target.value === '' ? '' : Number(e.target.value))}
              placeholder="0.00"
              min="0"
              step="0.50"
              className="w-full bg-white/8 border border-white/10 focus:border-white/25 rounded-2xl px-4 py-3 text-sm text-white placeholder:text-white/30 outline-none transition-all"
            />
          </div>

          {/* Description */}
          <div>
            <label className="text-white/40 text-xs font-semibold uppercase tracking-widest block mb-1.5">
              Descripción <span className="text-white/20 normal-case">(opcional)</span>
            </label>
            <textarea
              value={form.description}
              onChange={(e) => set('description', e.target.value)}
              placeholder="Descripción corta del producto..."
              rows={2}
              className="w-full bg-white/8 border border-white/10 focus:border-white/25 rounded-2xl px-4 py-3 text-sm text-white placeholder:text-white/30 outline-none transition-all resize-none"
            />
          </div>

          {/* Toggles */}
          <div className="flex gap-3">
            {([
              { key: 'active'      as const, label: 'Activo',    on: '#A7B897' },
              { key: 'is_favorite' as const, label: 'Favorito',  on: '#EAD9B1' },
            ] as const).map(({ key, label, on }) => (
              <button
                key={key}
                onClick={() => set(key, !form[key])}
                className={cn(
                  'flex-1 flex items-center justify-between px-4 py-3 rounded-2xl border transition-all press-scale',
                  form[key]
                    ? 'border-white/15 bg-white/8'
                    : 'border-white/6 bg-white/4 opacity-60'
                )}
              >
                <span className="text-white/70 text-sm font-medium">{label}</span>
                <div
                  className="rounded-full relative shrink-0"
                  style={{
                    width: '40px', height: '24px',
                    background: form[key] ? on + '50' : 'rgba(255,255,255,0.15)',
                    border: form[key] ? `1px solid ${on}70` : '1px solid rgba(255,255,255,0.1)',
                    transition: 'background 0.2s, border-color 0.2s',
                  }}
                >
                  <span
                    className="rounded-full bg-white shadow-sm"
                    style={{
                      position: 'absolute',
                      width: '18px', height: '18px',
                      top: '2px',
                      left: form[key] ? '18px' : '2px',
                      background: form[key] ? on : '#fff',
                      transition: 'left 0.18s ease, background 0.2s',
                    }}
                  />
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Footer */}
        <div className="shrink-0 px-5 pb-8 pt-3" style={{ borderTop: '1px solid rgba(255,255,255,0.08)' }}>
          <button
            onClick={handleSave}
            disabled={saving}
            className="w-full bg-[#F5F1E8] text-[#0E2F33] font-bold py-4 rounded-2xl text-sm btn-primary disabled:opacity-50"
          >
            {saving ? 'Guardando…' : initial ? 'Guardar cambios' : 'Crear producto'}
          </button>
        </div>
      </div>
    </>
  )
}

// ── Page ──────────────────────────────────────────────────────────────────────
export default function AdminProductsPage() {
  const { data: products = [], isLoading } = useAllProducts()
  const { data: categories = [] } = useCategories()
  const { data: areas = [] }      = useAreas()
  const qc = useQueryClient()

  const [activeCategory, setActiveCategory] = useState<string | null>(null)
  const [showSheet, setShowSheet]           = useState(false)
  const [editProduct, setEditProduct]       = useState<Product | undefined>()
  const [uploading, setUploading]           = useState<string | null>(null)
  const tabsRef = useRef<HTMLDivElement>(null)

  // Build ordered category list from products
  const catList = (() => {
    const map = new Map<string, number>()
    products.forEach((p) => {
      if (p.category && !map.has(p.category.name))
        map.set(p.category.name, p.category.sort_order ?? 99)
    })
    return [...map.entries()].sort((a, b) => a[1] - b[1]).map(([name]) => name)
  })()

  const effectiveCategory = activeCategory ?? catList[0] ?? null
  const visible = products.filter((p) => p.category?.name === effectiveCategory)
  const activeCount = visible.filter((p) => p.active).length

  async function patchProduct(id: string, body: Partial<Product>) {
    const res = await fetch(`/api/products/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })
    if (!res.ok) throw new Error('Error')
  }

  async function toggleField(p: Product, field: 'active' | 'is_favorite') {
    const patch = { [field]: !p[field] }
    qc.setQueryData<Product[]>(['products-admin'], (prev = []) =>
      prev.map((x) => (x.id === p.id ? { ...x, ...patch } : x))
    )
    try {
      await patchProduct(p.id, patch)
    } catch {
      qc.invalidateQueries({ queryKey: ['products-admin'] })
    }
  }

  async function handleSave(form: SheetProduct) {
    if (form.id) {
      // Edit
      const { id, ...body } = form
      await fetch(`/api/products/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...body, price: Number(body.price) }),
      })
      toast.success('Producto actualizado')
    } else {
      // Create
      const res = await fetch('/api/products', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...form, price: Number(form.price), sort_order: products.length }),
      })
      if (!res.ok) throw new Error()
      toast.success('Producto creado')
    }
    qc.invalidateQueries({ queryKey: ['products-admin'] })
    qc.invalidateQueries({ queryKey: ['products'] })
  }

  async function handleImageChange(product: Product, e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setUploading(product.id)
    try {
      const fd = new FormData()
      fd.append('image', file)
      const res = await fetch(`/api/products/${product.id}/image`, { method: 'POST', body: fd })
      if (!res.ok) throw new Error()
      const { url } = await res.json()
      qc.setQueryData<Product[]>(['products-admin'], (prev = []) =>
        prev.map((x) => (x.id === product.id ? { ...x, image_url: url } : x))
      )
      qc.setQueryData<Product[]>(['products'], (prev = []) =>
        prev.map((x) => (x.id === product.id ? { ...x, image_url: url } : x))
      )
      toast.success('Imagen actualizada')
    } catch {
      toast.error('Error al subir imagen')
    } finally {
      setUploading(null)
      e.target.value = ''
    }
  }

  function openCreate() { setEditProduct(undefined); setShowSheet(true) }
  function openEdit(p: Product) { setEditProduct(p); setShowSheet(true) }

  return (
    <div className="min-h-screen bg-[#F7F5F0]">

      {/* Header */}
      <div className="px-5 pt-8 pb-4">
        <div className="flex items-start justify-between mb-1">
          <div>
            <p className="text-[#7A756D] text-[10px] uppercase tracking-[0.2em] font-medium mb-1">Administración</p>
            <h1 className="text-[#1F1F1F] text-2xl font-bold tracking-tight">Productos</h1>
          </div>
          <button
            onClick={openCreate}
            className="flex items-center gap-2 bg-[#1E3541] text-white font-bold px-4 py-2.5 rounded-2xl text-sm btn-primary mt-1"
          >
            + Nuevo
          </button>
        </div>
      </div>

      {/* Category tabs */}
      <div ref={tabsRef} className="flex gap-2 px-5 pb-3 overflow-x-auto scrollbar-hide">
        {catList.map((cat) => {
          const active = effectiveCategory === cat
          const count  = products.filter((p) => p.category?.name === cat).length
          return (
            <button
              key={cat}
              onClick={() => setActiveCategory(cat)}
              className={cn(
                'flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-all shrink-0 press-scale border',
                active
                  ? 'bg-[#1E3541] text-white border-transparent'
                  : 'bg-white text-[#7A756D] border-[#E7E1D8] hover:border-[#C8C4BC]'
              )}
            >
              <span>{CAT_ICON[cat] ?? '•'}</span>
              <span>{cat}</span>
              <span className={cn('text-[10px]', active ? 'text-white/60' : 'text-[#A9A39C]')}>{count}</span>
            </button>
          )
        })}
      </div>

      <div className="h-px bg-[#E7E1D8] mx-5 mb-3" />

      {/* Summary */}
      {effectiveCategory && (
        <div className="flex items-center justify-between px-5 mb-3">
          <p className="text-[#7A756D] text-xs font-semibold uppercase tracking-widest">{effectiveCategory}</p>
          <p className="text-[#A9A39C] text-xs">{activeCount} activos · {visible.length} total</p>
        </div>
      )}

      {/* Breakfast settings (shown when Desayunos is selected) */}
      {effectiveCategory === 'Desayunos' && <BreakfastSettings />}

      {/* Product list */}
      <div className="px-4 pb-10 space-y-2">
        {isLoading ? (
          <div className="flex justify-center py-16">
            <div className="w-8 h-8 border-2 border-[#E7E1D8] border-t-[#8A8278] rounded-full animate-spin" />
          </div>
        ) : visible.length === 0 ? (
          <div className="flex flex-col items-center py-16 text-[#A9A39C]">
            <p className="text-4xl mb-2">📦</p>
            <p className="text-sm font-medium">Sin productos en esta categoría</p>
          </div>
        ) : (
          visible.map((p) => (
            <ProductRow
              key={p.id}
              product={p}
              uploading={uploading === p.id}
              onToggle={toggleField}
              onEdit={openEdit}
              onImageChange={handleImageChange}
            />
          ))
        )}
      </div>

      {/* Product sheet */}
      {showSheet && categories.length > 0 && areas.length > 0 && (
        <div className="fixed inset-0 z-50">
          <ProductSheet
            initial={editProduct}
            categories={categories}
            areas={areas}
            onClose={() => setShowSheet(false)}
            onSave={handleSave}
          />
        </div>
      )}
    </div>
  )
}

// ── Product row ───────────────────────────────────────────────────────────────
function ProductRow({
  product,
  uploading,
  onToggle,
  onEdit,
  onImageChange,
}: {
  product: Product
  uploading: boolean
  onToggle: (p: Product, field: 'active' | 'is_favorite') => void
  onEdit: (p: Product) => void
  onImageChange: (p: Product, e: React.ChangeEvent<HTMLInputElement>) => void
}) {
  const fileRef = useRef<HTMLInputElement>(null)

  return (
    <div className={cn(
      'flex items-center gap-3 bg-white rounded-2xl px-3.5 py-3 border transition-all card-shadow',
      product.active ? 'border-[#E7E1D8]' : 'border-[#EDE9E2] opacity-50'
    )}>

      {/* Image thumbnail */}
      <button
        onClick={() => fileRef.current?.click()}
        disabled={uploading}
        className="shrink-0 w-10 h-10 rounded-xl overflow-hidden bg-[#F7F5F0] border border-[#E7E1D8] flex items-center justify-center relative group"
        title="Cambiar imagen"
      >
        {uploading ? (
          <div className="w-4 h-4 border-2 border-[#D4CFC5] border-t-[#8A8278] rounded-full animate-spin" />
        ) : product.image_url ? (
          <>
            <img src={product.image_url} alt="" className="w-full h-full object-cover" />
            <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
              <span className="text-white text-[10px]">✎</span>
            </div>
          </>
        ) : (
          <span className="text-[#C8C4BC] text-sm group-hover:text-[#7A756D] transition-colors">📷</span>
        )}
      </button>
      <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={(e) => onImageChange(product, e)} />

      {/* Favorite */}
      <button
        onClick={() => onToggle(product, 'is_favorite')}
        className={cn('shrink-0 text-base transition-colors', product.is_favorite ? 'text-[#D4A847]' : 'text-[#D4CFC5] hover:text-[#A9A39C]')}
        title={product.is_favorite ? 'Quitar de favoritos' : 'Marcar favorito'}
      >
        {product.is_favorite ? '★' : '☆'}
      </button>

      {/* Name — tap to edit */}
      <button onClick={() => onEdit(product)} className="flex-1 text-left min-w-0 group">
        <p className={cn('text-sm font-semibold leading-snug truncate group-hover:text-[#1E3541] transition-colors',
          product.active ? 'text-[#1F1F1F]' : 'text-[#A9A39C]')}>
          {product.name}
        </p>
        <p className="text-[#A9A39C] text-[10px] mt-0.5">{product.category?.name} · {product.primary_area?.name}</p>
      </button>

      {/* Price */}
      <span className="shrink-0 text-sm font-bold text-[#1E3541]">{formatPrice(product.price)}</span>

      {/* Active toggle */}
      <button
        onClick={() => onToggle(product, 'active')}
        className="shrink-0 rounded-full relative"
        style={{
          width: '40px', height: '22px',
          background: product.active ? '#A7B897' : '#E0DDD7',
          transition: 'background 0.2s',
        }}
        title={product.active ? 'Desactivar' : 'Activar'}
      >
        <span
          className="rounded-full bg-white shadow-sm"
          style={{
            position: 'absolute',
            width: '18px', height: '18px',
            top: '2px',
            left: product.active ? '20px' : '2px',
            transition: 'left 0.18s ease',
          }}
        />
      </button>
    </div>
  )
}

// ── Breakfast settings panel ──────────────────────────────────────────────────
function BreakfastSettings() {
  const { data: cutoff } = useSetting('breakfast_cutoff')
  const update = useUpdateSetting()
  const [draft, setDraft] = useState<string | null>(null)

  const value  = draft ?? (cutoff ?? '11:30')
  const saving = update.isPending

  async function save() {
    if (!draft || draft === cutoff) { setDraft(null); return }
    try {
      await update.mutateAsync({ key: 'breakfast_cutoff', value: draft })
      toast.success(`Hora límite actualizada: ${draft}`)
      setDraft(null)
    } catch {
      toast.error('Error al guardar')
    }
  }

  return (
    <div className="mx-4 mb-4 bg-white border border-[#E7E1D8] rounded-2xl px-4 py-3.5">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-[#1F1F1F] text-sm font-bold">Hora límite de desayunos</p>
          <p className="text-[#7A756D] text-xs mt-0.5">Desayunos no disponibles después de esta hora</p>
        </div>
        <div className="flex items-center gap-2">
          <input
            type="time"
            value={value}
            onChange={(e) => setDraft(e.target.value)}
            className="border border-[#E7E1D8] rounded-xl px-3 py-2 text-sm font-bold text-[#1F1F1F] focus:border-[#1E3541] outline-none bg-[#F7F5F0]"
          />
          {draft && draft !== cutoff && (
            <button
              onClick={save}
              disabled={saving}
              className="bg-[#1E3541] text-white font-bold px-4 py-2 rounded-xl text-xs btn-primary disabled:opacity-50"
            >
              {saving ? '…' : 'Guardar'}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
