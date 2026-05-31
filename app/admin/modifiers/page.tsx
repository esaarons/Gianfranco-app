'use client'

import { useState, useRef } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { formatPrice, cn } from '@/lib/utils'
import { toast } from 'sonner'
import type { Modifier } from '@/types'

// Shared group config — mirrors ModifierSheet.tsx
const GROUP_META: Record<string, { label: string; icon: string; area: 'bar' | 'kitchen' | 'any' }> = {
  temperature:   { label: 'Temperatura',      icon: '🌡',  area: 'bar'     },
  milk_cow:      { label: 'Leche',             icon: '🥛',  area: 'bar'     },
  milk_plant:    { label: 'Leche vegetal',     icon: '🌱',  area: 'bar'     },
  cafe_extra:    { label: 'Extras café',       icon: '☕',  area: 'bar'     },
  kitchen_extra: { label: 'Adiciones cocina',  icon: '🍳',  area: 'kitchen' },
  bowl_extra:    { label: 'Toppings bowl',     icon: '🫐',  area: 'kitchen' },
}

function groupLabel(slug: string) {
  return GROUP_META[slug]?.label ?? slug
}
function groupIcon(slug: string) {
  return GROUP_META[slug]?.icon ?? '•'
}

function useAllModifiers() {
  return useQuery<Modifier[]>({
    queryKey: ['modifiers-admin'],
    queryFn: async () => {
      const res = await fetch('/api/modifiers?all=true')
      return res.json()
    },
    staleTime: 30000,
  })
}

// ── Modifier sheet ────────────────────────────────────────────────────────────
function ModifierFormSheet({
  initial,
  groups,
  defaultGroup,
  onClose,
  onSave,
}: {
  initial?: Modifier
  groups: string[]
  defaultGroup: string
  onClose: () => void
  onSave: (data: Partial<Modifier>) => Promise<void>
}) {
  const [name,    setName]    = useState(initial?.name ?? '')
  const [price,   setPrice]   = useState<number | ''>(initial?.price ?? 0)
  const [group,   setGroup]   = useState(initial?.modifier_group ?? defaultGroup)
  const [newGroup, setNewGroup] = useState('')
  const [adding,  setAdding]  = useState(false)
  const [saving,  setSaving]  = useState(false)

  const effectiveGroup = newGroup.trim() || group

  async function handleSave() {
    if (!name.trim()) { toast.error('El nombre es requerido'); return }
    setSaving(true)
    try {
      await onSave({
        name: name.trim(),
        price: Number(price) || 0,
        modifier_group: effectiveGroup,
        active: initial?.active ?? true,
      })
      onClose()
    } finally {
      setSaving(false)
    }
  }

  return (
    <>
      <div className="absolute inset-0 bg-black/60 backdrop-blur-[6px]" onClick={onClose} />
      <div
        className="absolute bottom-0 left-0 right-0 rounded-t-[2rem] flex flex-col max-h-[88dvh] spring-up"
        style={{ background: '#0A1A1D', borderTop: '1px solid rgba(255,255,255,0.12)' }}
      >
        <div className="w-10 h-1 bg-white/20 rounded-full mx-auto mt-3 shrink-0" />

        <div className="flex items-center justify-between px-5 pt-4 pb-3 shrink-0">
          <h2 className="text-white text-lg font-bold tracking-tight">
            {initial ? 'Editar modificador' : 'Nuevo modificador'}
          </h2>
          <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-full glass text-white/50 press-scale">✕</button>
        </div>

        <div className="h-px bg-white/8 mx-5 shrink-0" />

        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4 scrollbar-hide">

          {/* Name */}
          <div>
            <label className="text-white/40 text-xs font-semibold uppercase tracking-widest block mb-1.5">Nombre</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ej: Leche de macadamia"
              className="w-full bg-white/8 border border-white/10 focus:border-white/25 rounded-2xl px-4 py-3 text-sm text-white placeholder:text-white/30 outline-none transition-all"
            />
          </div>

          {/* Price */}
          <div>
            <label className="text-white/40 text-xs font-semibold uppercase tracking-widest block mb-1.5">
              Precio adicional (S/.) <span className="text-white/25 normal-case">— 0 si es gratis</span>
            </label>
            <input
              type="number"
              value={price}
              onChange={(e) => setPrice(e.target.value === '' ? '' : Number(e.target.value))}
              min="0"
              step="0.50"
              className="w-full bg-white/8 border border-white/10 focus:border-white/25 rounded-2xl px-4 py-3 text-sm text-white outline-none transition-all"
            />
          </div>

          {/* Group */}
          <div>
            <label className="text-white/40 text-xs font-semibold uppercase tracking-widest block mb-2">Grupo</label>
            <div className="flex flex-wrap gap-2 mb-3">
              {groups.map((g) => (
                <button
                  key={g}
                  onClick={() => { setGroup(g); setNewGroup('') }}
                  className={cn(
                    'flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all press-scale',
                    group === g && !newGroup.trim()
                      ? 'bg-[#F5F1E8] text-[#0E2F33]'
                      : 'bg-white/8 text-white/45 hover:bg-white/12'
                  )}
                >
                  <span>{groupIcon(g)}</span>
                  {groupLabel(g)}
                </button>
              ))}
              <button
                onClick={() => setAdding((a) => !a)}
                className={cn(
                  'px-3 py-1.5 rounded-xl text-xs font-semibold transition-all press-scale',
                  adding ? 'bg-[#C46F4E]/20 text-[#C46F4E]' : 'bg-white/8 text-white/35'
                )}
              >
                + Nuevo grupo
              </button>
            </div>
            {adding && (
              <input
                type="text"
                value={newGroup}
                onChange={(e) => setNewGroup(e.target.value.toLowerCase().replace(/\s+/g, '_'))}
                placeholder="slug_del_grupo (ej: dessert_extra)"
                className="w-full bg-white/8 border border-white/10 focus:border-white/25 rounded-2xl px-4 py-3 text-sm text-white placeholder:text-white/25 outline-none transition-all"
              />
            )}
          </div>
        </div>

        <div className="shrink-0 px-5 pb-8 pt-3" style={{ borderTop: '1px solid rgba(255,255,255,0.08)' }}>
          <button
            onClick={handleSave}
            disabled={saving}
            className="w-full bg-[#F5F1E8] text-[#0E2F33] font-bold py-4 rounded-2xl text-sm btn-primary disabled:opacity-50"
          >
            {saving ? 'Guardando…' : initial ? 'Guardar cambios' : 'Crear modificador'}
          </button>
        </div>
      </div>
    </>
  )
}

// ── Page ──────────────────────────────────────────────────────────────────────
export default function AdminModifiersPage() {
  const { data: modifiers = [], isLoading } = useAllModifiers()
  const qc = useQueryClient()

  const [activeGroup, setActiveGroup] = useState<string | null>(null)
  const [showSheet,   setShowSheet]   = useState(false)
  const [editMod,     setEditMod]     = useState<Modifier | undefined>()
  const [editingPrice, setEditingPrice] = useState<string | null>(null)
  const [priceInput,   setPriceInput]   = useState('')
  const priceRef = useRef<HTMLInputElement>(null)

  // Distinct groups in order
  const groups = [...new Set(modifiers.map((m) => m.modifier_group).filter(Boolean))] as string[]
  const effectiveGroup = activeGroup ?? groups[0] ?? ''
  const visible = modifiers.filter((m) => m.modifier_group === effectiveGroup)

  async function patch(id: string, body: Partial<Modifier>) {
    qc.setQueryData<Modifier[]>(['modifiers-admin'], (prev = []) =>
      prev.map((m) => (m.id === id ? { ...m, ...body } : m))
    )
    try {
      const res = await fetch(`/api/modifiers/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      if (!res.ok) throw new Error()
    } catch {
      qc.invalidateQueries({ queryKey: ['modifiers-admin'] })
      toast.error('Error al guardar')
    } finally {
      qc.invalidateQueries({ queryKey: ['modifiers'] })
    }
  }

  async function handleDelete(m: Modifier) {
    qc.setQueryData<Modifier[]>(['modifiers-admin'], (prev = []) => prev.filter((x) => x.id !== m.id))
    try {
      const res = await fetch(`/api/modifiers/${m.id}`, { method: 'DELETE' })
      if (!res.ok) throw new Error()
      toast.success('Modificador eliminado')
    } catch {
      qc.invalidateQueries({ queryKey: ['modifiers-admin'] })
      toast.error('Error al eliminar')
    } finally {
      qc.invalidateQueries({ queryKey: ['modifiers'] })
    }
  }

  async function handleSave(data: Partial<Modifier>) {
    if (editMod) {
      await fetch(`/api/modifiers/${editMod.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })
      toast.success('Modificador actualizado')
    } else {
      const res = await fetch('/api/modifiers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })
      if (!res.ok) { toast.error('Error al crear'); return }
      toast.success('Modificador creado')
      if (data.modifier_group && data.modifier_group !== activeGroup) {
        setActiveGroup(data.modifier_group)
      }
    }
    qc.invalidateQueries({ queryKey: ['modifiers-admin'] })
    qc.invalidateQueries({ queryKey: ['modifiers'] })
  }

  function startPriceEdit(m: Modifier) {
    setEditingPrice(m.id)
    setPriceInput(String(m.price))
    setTimeout(() => priceRef.current?.select(), 0)
  }

  function commitPrice(m: Modifier) {
    const val = parseFloat(priceInput)
    if (!isNaN(val) && val >= 0 && val !== m.price) patch(m.id, { price: val })
    setEditingPrice(null)
  }

  const activeCount = visible.filter((m) => m.active).length

  return (
    <div className="min-h-screen bg-[#F7F5F0]">

      {/* Header */}
      <div className="px-5 pt-8 pb-4">
        <div className="flex items-start justify-between mb-1">
          <div>
            <p className="text-[#7A756D] text-[10px] uppercase tracking-[0.2em] font-medium mb-1">Administración</p>
            <h1 className="text-[#1F1F1F] text-2xl font-bold tracking-tight">Modificadores</h1>
          </div>
          <button
            onClick={() => { setEditMod(undefined); setShowSheet(true) }}
            className="flex items-center gap-2 bg-[#1E3541] text-white font-bold px-4 py-2.5 rounded-2xl text-sm btn-primary mt-1"
          >
            + Nuevo
          </button>
        </div>
      </div>

      {/* Group tabs */}
      <div className="flex gap-2 px-5 pb-3 overflow-x-auto scrollbar-hide">
        {groups.map((g) => {
          const active = effectiveGroup === g
          const count  = modifiers.filter((m) => m.modifier_group === g).length
          return (
            <button
              key={g}
              onClick={() => setActiveGroup(g)}
              className={cn(
                'flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-all shrink-0 press-scale border',
                active ? 'bg-[#1E3541] text-white border-transparent' : 'bg-white text-[#7A756D] border-[#E7E1D8] hover:border-[#C8C4BC]'
              )}
            >
              <span>{groupIcon(g)}</span>
              {groupLabel(g)}
              <span className={cn('text-[10px]', active ? 'text-white/60' : 'text-[#A9A39C]')}>{count}</span>
            </button>
          )
        })}
      </div>

      <div className="h-px bg-[#E7E1D8] mx-5 mb-3" />

      {/* Summary */}
      <div className="flex items-center justify-between px-5 mb-3">
        <p className="text-[#7A756D] text-xs font-semibold uppercase tracking-widest">{groupLabel(effectiveGroup)}</p>
        <p className="text-[#A9A39C] text-xs">{activeCount} activos · {visible.length} total</p>
      </div>

      {/* List */}
      <div className="px-4 pb-10 space-y-2">
        {isLoading ? (
          <div className="flex justify-center py-16">
            <div className="w-8 h-8 border-2 border-[#E7E1D8] border-t-[#8A8278] rounded-full animate-spin" />
          </div>
        ) : visible.length === 0 ? (
          <div className="flex flex-col items-center py-16 text-[#A9A39C]">
            <p className="text-4xl mb-2">🧩</p>
            <p className="text-sm font-medium">Sin modificadores en este grupo</p>
          </div>
        ) : (
          visible.map((m) => (
            <div
              key={m.id}
              className={cn(
                'flex items-center gap-3 bg-white rounded-2xl px-4 py-3 border transition-all card-shadow',
                m.active ? 'border-[#E7E1D8]' : 'border-[#EDE9E2] opacity-50'
              )}
            >
              {/* Name — tap to edit */}
              <button
                onClick={() => { setEditMod(m); setShowSheet(true) }}
                className="flex-1 text-left min-w-0 group"
              >
                <p className={cn(
                  'text-sm font-semibold truncate group-hover:text-[#1E3541] transition-colors',
                  m.active ? 'text-[#1F1F1F]' : 'text-[#A9A39C]'
                )}>
                  {m.name}
                </p>
              </button>

              {/* Price — tap to edit inline */}
              {editingPrice === m.id ? (
                <div className="flex items-center gap-1 shrink-0">
                  <span className="text-xs text-[#A9A39C]">S/</span>
                  <input
                    ref={priceRef}
                    type="number"
                    min="0"
                    step="0.50"
                    value={priceInput}
                    onChange={(e) => setPriceInput(e.target.value)}
                    onBlur={() => commitPrice(m)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') commitPrice(m)
                      if (e.key === 'Escape') setEditingPrice(null)
                    }}
                    className="w-14 text-right text-sm font-bold text-[#1F1F1F] bg-[#F7F5F0] rounded-lg px-2 py-1 outline-none border border-[#D4CFC5]"
                  />
                </div>
              ) : (
                <button
                  onClick={() => startPriceEdit(m)}
                  className={cn(
                    'shrink-0 text-sm font-bold px-2.5 py-1 rounded-lg transition-colors',
                    m.price > 0
                      ? 'text-[#A7B897] bg-[#A7B897]/10 hover:bg-[#A7B897]/20'
                      : 'text-[#A9A39C] bg-[#F7F5F0] hover:bg-[#EEEAE2]'
                  )}
                  title="Editar precio"
                >
                  {m.price > 0 ? `+${formatPrice(m.price)}` : 'Gratis'}
                </button>
              )}

              {/* Delete */}
              <button
                onClick={() => handleDelete(m)}
                className="shrink-0 w-7 h-7 flex items-center justify-center rounded-lg text-[#C8C4BC] hover:text-[#C46F4E] hover:bg-[#C46F4E]/10 transition-all press-scale"
                title="Eliminar"
              >
                ✕
              </button>

              {/* Active toggle */}
              <button
                onClick={() => patch(m.id, { active: !m.active })}
                className="shrink-0 rounded-full relative"
                style={{
                  width: '40px', height: '22px',
                  background: m.active ? '#A7B897' : '#E0DDD7',
                  transition: 'background 0.2s',
                }}
                title={m.active ? 'Desactivar' : 'Activar'}
              >
                <span
                  className="rounded-full bg-white shadow-sm"
                  style={{
                    position: 'absolute',
                    width: '18px', height: '18px',
                    top: '2px',
                    left: m.active ? '20px' : '2px',
                    transition: 'left 0.18s ease',
                  }}
                />
              </button>
            </div>
          ))
        )}
      </div>

      {/* Sheet */}
      {showSheet && (
        <div className="fixed inset-0 z-50">
          <ModifierFormSheet
            initial={editMod}
            groups={groups}
            defaultGroup={effectiveGroup}
            onClose={() => setShowSheet(false)}
            onSave={handleSave}
          />
        </div>
      )}
    </div>
  )
}
