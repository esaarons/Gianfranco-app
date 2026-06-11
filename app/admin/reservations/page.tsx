'use client'

import { useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import type { Reservation, ReservationStatus, TableZone } from '@/types'

// ── Config ────────────────────────────────────────────────────────────────────

const STATUS_CFG: Record<ReservationStatus, { label: string; color: string; bg: string; border: string }> = {
  pending:     { label: 'Pendiente',    color: 'text-[#7C5640]', bg: 'bg-[#FEF3E8]', border: 'border-[#C98933]/30' },
  confirmed:   { label: 'Confirmada',   color: 'text-[#2A5FA0]', bg: 'bg-[#EFF6FF]', border: 'border-[#6D9EEB]/30' },
  in_progress: { label: 'En mesa',      color: 'text-[#166534]', bg: 'bg-[#F0FDF4]', border: 'border-[#86EFAC]/30' },
  finished:    { label: 'Finalizada',   color: 'text-[#6A6460]', bg: 'bg-[#F7F5F0]', border: 'border-[#D4CFC5]/30' },
  cancelled:   { label: 'Cancelada',    color: 'text-[#7A2B2B]', bg: 'bg-[#FEF2F2]', border: 'border-[#C76868]/30' },
  no_show:     { label: 'No se presentó', color: 'text-[#7C5640]', bg: 'bg-[#FFF7ED]', border: 'border-[#C98933]/20' },
}

const ZONE_LABELS: Record<string, string> = {
  salon1: 'Salón 1', salon2: 'Salón 2', terrace: 'Terraza',
}

const MENU_LABELS: Record<string, string> = {
  brunch: 'Brunch', simple: 'Simple',
}

function toDateStr(d: Date): string {
  return d.toISOString().split('T')[0]
}

function formatTime(t: string): string {
  return t.slice(0, 5) // "HH:MM:SS" → "HH:MM"
}

function formatDateLabel(dateStr: string): string {
  const d     = new Date(dateStr + 'T12:00:00')
  const today = new Date(); today.setHours(12, 0, 0, 0)
  const diff  = Math.round((d.getTime() - today.getTime()) / 86400000)
  if (diff === 0) return 'Hoy'
  if (diff === 1) return 'Mañana'
  if (diff === -1) return 'Ayer'
  return d.toLocaleDateString('es-PE', { weekday: 'short', day: 'numeric', month: 'short' })
}

// ── Form ──────────────────────────────────────────────────────────────────────

interface FormData {
  customer_name:  string
  customer_phone: string
  date:           string
  start_time:     string
  end_time:       string
  party_size:     string
  zone:           TableZone
  menu_type:      'brunch' | 'simple' | ''
  notes:          string
}

const EMPTY_FORM = (date: string): FormData => ({
  customer_name:  '',
  customer_phone: '',
  date,
  start_time:     '12:00',
  end_time:       '13:30',
  party_size:     '2',
  zone:           'salon2',
  menu_type:      '',
  notes:          '',
})

function ReservationSheet({
  initial,
  defaultDate,
  onSave,
  onClose,
}: {
  initial?:    Reservation
  defaultDate: string
  onSave:      (data: FormData) => Promise<void>
  onClose:     () => void
}) {
  const [form, setForm] = useState<FormData>(
    initial
      ? {
          customer_name:  initial.customer_name,
          customer_phone: initial.customer_phone ?? '',
          date:           initial.date,
          start_time:     formatTime(initial.start_time),
          end_time:       formatTime(initial.end_time),
          party_size:     String(initial.party_size),
          zone:           (initial.zone ?? 'salon2') as TableZone,
          menu_type:      (initial.menu_type ?? '') as FormData['menu_type'],
          notes:          initial.notes ?? '',
        }
      : EMPTY_FORM(defaultDate)
  )
  const [saving, setSaving] = useState(false)

  function set<K extends keyof FormData>(k: K, v: FormData[K]) {
    setForm(p => ({ ...p, [k]: v }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.customer_name.trim()) { toast.error('Ingresa el nombre del cliente'); return }
    const ps = Number(form.party_size)
    if (isNaN(ps) || ps < 2 || ps > 16) { toast.error('El grupo debe ser entre 2 y 16 personas'); return }
    if (form.start_time >= form.end_time) { toast.error('La hora de salida debe ser posterior a la entrada'); return }
    setSaving(true)
    try {
      await onSave(form)
      onClose()
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Error al guardar')
    } finally {
      setSaving(false)
    }
  }

  const inputCls = 'w-full bg-white/6 border border-white/10 focus:border-white/25 rounded-xl px-4 py-3 text-sm text-white outline-none placeholder:text-white/25 transition-all'
  const labelCls = 'text-white/40 text-[10px] font-bold uppercase tracking-widest'

  return (
    <div className="fixed inset-0 z-50 flex items-end">
      <div className="absolute inset-0 bg-black/65 backdrop-blur-[8px]" onClick={onClose} />
      <div className="relative w-full max-w-lg mx-auto rounded-t-[2rem] spring-up overflow-hidden"
           style={{ background: '#0D2226', borderTop: '1px solid rgba(255,255,255,0.12)' }}>
        <div className="w-10 h-1 bg-white/20 rounded-full mx-auto mt-3" />

        <div className="flex items-center justify-between px-5 pt-4 pb-3">
          <h2 className="text-white text-base font-bold tracking-tight">
            {initial ? 'Editar reserva' : 'Nueva reserva'}
          </h2>
          <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-full glass text-white/40 press-scale">✕</button>
        </div>
        <div className="h-px bg-white/8 mx-5" />

        <form onSubmit={handleSubmit} className="px-5 py-4 space-y-4 pb-8 overflow-y-auto max-h-[82vh]">

          {/* Name + Phone */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5 col-span-2">
              <label className={labelCls}>Nombre del cliente</label>
              <input type="text" value={form.customer_name} onChange={e => set('customer_name', e.target.value)}
                placeholder="Ej: Carlos Ramírez" className={inputCls} required />
            </div>
            <div className="space-y-1.5">
              <label className={labelCls}>Teléfono</label>
              <input type="tel" value={form.customer_phone} onChange={e => set('customer_phone', e.target.value)}
                placeholder="Opcional" className={inputCls} />
            </div>
            <div className="space-y-1.5">
              <label className={labelCls}>Personas</label>
              <input type="number" value={form.party_size} onChange={e => set('party_size', e.target.value)}
                min={2} max={16} className={inputCls} />
            </div>
          </div>

          {/* Date + Times */}
          <div className="grid grid-cols-3 gap-3">
            <div className="space-y-1.5 col-span-3">
              <label className={labelCls}>Fecha</label>
              <input type="date" value={form.date} onChange={e => set('date', e.target.value)} className={inputCls} />
            </div>
            <div className="space-y-1.5">
              <label className={labelCls}>Entrada</label>
              <input type="time" value={form.start_time} onChange={e => set('start_time', e.target.value)} className={inputCls} />
            </div>
            <div className="space-y-1.5">
              <label className={labelCls}>Salida</label>
              <input type="time" value={form.end_time} onChange={e => set('end_time', e.target.value)} className={inputCls} />
            </div>
            <div className="space-y-1.5">
              <label className={labelCls}>Zona</label>
              <select value={form.zone} onChange={e => set('zone', e.target.value as TableZone)}
                className={inputCls + ' appearance-none'}>
                <option value="salon1">Salón 1</option>
                <option value="salon2">Salón 2</option>
                <option value="terrace">Terraza</option>
              </select>
            </div>
          </div>

          {/* Menu */}
          <div className="space-y-1.5">
            <label className={labelCls}>Menú</label>
            <div className="flex gap-2">
              {(['', 'brunch', 'simple'] as const).map((m) => (
                <button key={m} type="button" onClick={() => set('menu_type', m)}
                  className={cn(
                    'flex-1 py-2.5 rounded-xl text-sm font-bold border transition-all press-scale',
                    form.menu_type === m
                      ? 'bg-white/15 border-white/25 text-white'
                      : 'bg-white/5 border-white/8 text-white/35'
                  )}>
                  {m === '' ? 'Sin menú' : m === 'brunch' ? 'Brunch' : 'Simple'}
                </button>
              ))}
            </div>
          </div>

          {/* Notes */}
          <div className="space-y-1.5">
            <label className={labelCls}>Notas</label>
            <textarea value={form.notes} onChange={e => set('notes', e.target.value)}
              rows={2} placeholder="Alergias, preferencias, ocasión especial…"
              className={inputCls + ' resize-none'} />
          </div>

          <button type="submit" disabled={saving}
            className="w-full bg-[#F5F1E8] text-[#0F2018] font-bold py-4 rounded-2xl text-sm btn-primary disabled:opacity-50 mt-2">
            {saving ? 'Guardando…' : initial ? 'Guardar cambios' : 'Crear reserva'}
          </button>
        </form>
      </div>
    </div>
  )
}

// ── Card ──────────────────────────────────────────────────────────────────────

function ReservationCard({
  res,
  onEdit,
  onStatusChange,
}: {
  res:            Reservation
  onEdit:         () => void
  onStatusChange: (status: ReservationStatus) => void
}) {
  const st = STATUS_CFG[res.status]

  const actions: { label: string; status: ReservationStatus; style: string }[] = []
  if (res.status === 'pending')
    actions.push({ label: 'Confirmar',     status: 'confirmed',   style: 'bg-[#EFF6FF] text-[#2A5FA0] border-[#6D9EEB]/30' })
  if (res.status === 'confirmed') {
    actions.push({ label: 'Sentar',        status: 'in_progress', style: 'bg-[#F0FDF4] text-[#166534] border-[#86EFAC]/30' })
    actions.push({ label: 'No se presentó', status: 'no_show',   style: 'bg-[#FFF7ED] text-[#7C5640] border-[#C98933]/30' })
  }
  if (res.status === 'in_progress')
    actions.push({ label: 'Finalizar',     status: 'finished',    style: 'bg-[#F7F5F0] text-[#1F1F1F] border-[#D4CFC5]/30' })
  if (['pending','confirmed','in_progress'].includes(res.status))
    actions.push({ label: 'Cancelar',      status: 'cancelled',   style: 'bg-[#FEF2F2] text-[#7A2B2B] border-[#C76868]/30' })

  const isDone = ['finished','cancelled','no_show'].includes(res.status)

  return (
    <div className={cn('bg-white border rounded-2xl overflow-hidden card-shadow transition-all', st.border, isDone && 'opacity-55')}>

      {/* Header */}
      <div className="px-4 pt-3.5 pb-2.5 flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <p className="text-[#1F1F1F] font-bold text-[15px] leading-tight">{res.customer_name}</p>
            <span className={cn('text-[10px] font-bold px-2 py-0.5 rounded-full border', st.bg, st.color, st.border)}>
              {st.label}
            </span>
          </div>
          <div className="flex items-center gap-3 mt-1 flex-wrap">
            <span className="text-[#7A756D] text-xs font-medium">
              🕐 {formatTime(res.start_time)} – {formatTime(res.end_time)}
            </span>
            <span className="text-[#7A756D] text-xs font-medium">
              👥 {res.party_size} personas
            </span>
            <span className="text-[#7A756D] text-xs font-medium">
              📍 {ZONE_LABELS[res.zone ?? 'salon2']}
            </span>
            {res.menu_type && (
              <span className="text-[#7A756D] text-xs font-medium">
                🍽 {MENU_LABELS[res.menu_type]}
              </span>
            )}
          </div>
          {res.customer_phone && (
            <p className="text-[#7A756D] text-xs mt-0.5">📞 {res.customer_phone}</p>
          )}
          {res.notes && (
            <p className="text-[#6A6460] text-xs italic mt-0.5">"{res.notes}"</p>
          )}
        </div>
        {!isDone && (
          <button onClick={onEdit}
            className="w-8 h-8 flex items-center justify-center rounded-xl bg-[#F7F5F0] border border-[#E7E1D8] text-[#7A756D] press-scale shrink-0">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
              <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
            </svg>
          </button>
        )}
      </div>

      {/* Actions */}
      {actions.length > 0 && (
        <div className="px-4 pb-3.5 flex gap-2 flex-wrap">
          {actions.map((a) => (
            <button key={a.status} onClick={() => onStatusChange(a.status)}
              className={cn('px-3 py-1.5 rounded-xl text-xs font-bold border press-scale transition-all', a.style)}>
              {a.label}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function ReservationsPage() {
  const router       = useRouter()
  const queryClient  = useQueryClient()
  const [date, setDate] = useState(toDateStr(new Date()))
  const [showCreate, setShowCreate] = useState(false)
  const [editing, setEditing]       = useState<Reservation | null>(null)

  const { data: reservations = [], isLoading } = useQuery<Reservation[]>({
    queryKey: ['reservations', date],
    queryFn: async () => {
      const res = await fetch(`/api/reservations?date=${date}`)
      if (!res.ok) throw new Error()
      return res.json()
    },
    staleTime: 30000,
  })

  function shiftDate(days: number) {
    const d = new Date(date + 'T12:00:00')
    d.setDate(d.getDate() + days)
    setDate(toDateStr(d))
  }

  async function handleCreate(form: FormData) {
    const res = await fetch('/api/reservations', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...form, party_size: Number(form.party_size) }),
    })
    if (!res.ok) { const { error } = await res.json(); throw new Error(error) }
    queryClient.invalidateQueries({ queryKey: ['reservations', form.date] })
    toast.success('Reserva creada')
  }

  async function handleEdit(form: FormData) {
    if (!editing) return
    const res = await fetch(`/api/reservations/${editing.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...form, party_size: Number(form.party_size) }),
    })
    if (!res.ok) { const { error } = await res.json(); throw new Error(error) }
    queryClient.invalidateQueries({ queryKey: ['reservations', date] })
    toast.success('Reserva actualizada')
  }

  async function handleStatusChange(id: string, status: ReservationStatus) {
    await fetch(`/api/reservations/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status }),
    })
    queryClient.invalidateQueries({ queryKey: ['reservations', date] })
    const labels: Record<string, string> = {
      confirmed: 'Confirmada ✓', in_progress: 'En mesa', finished: 'Finalizada',
      cancelled: 'Cancelada', no_show: 'No show registrado',
    }
    toast.success(labels[status] ?? 'Actualizado')
  }

  const active   = reservations.filter(r => !['finished','cancelled','no_show'].includes(r.status))
  const archived = reservations.filter(r =>  ['finished','cancelled','no_show'].includes(r.status))

  return (
    <div className="min-h-screen bg-[#F7F5F0] pb-24">

      {/* Header */}
      <div className="px-5 pt-8 pb-4">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <button onClick={() => router.back()}
              className="w-8 h-8 flex items-center justify-center rounded-xl bg-white border border-[#E7E1D8] text-[#1F1F1F] press-scale shrink-0">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M19 12H5M12 5l-7 7 7 7"/>
              </svg>
            </button>
            <div>
              <p className="section-label mb-0.5">Administración</p>
              <h1 className="text-[#1F1F1F] text-2xl font-bold tracking-tight leading-tight">Reservas</h1>
            </div>
          </div>
          <button onClick={() => setShowCreate(true)}
            className="flex items-center gap-2 bg-[#1B3428] text-white font-bold px-4 py-2.5 rounded-xl text-sm btn-primary mt-1 shrink-0">
            <span className="text-base leading-none">+</span> Nueva
          </button>
        </div>

        {/* Date navigator */}
        <div className="flex items-center gap-2 mt-4 bg-white border border-[#E7E1D8] rounded-2xl p-1">
          <button onClick={() => shiftDate(-1)}
            className="w-9 h-9 flex items-center justify-center rounded-xl text-[#7A756D] hover:bg-[#F7F5F0] press-scale transition-colors">
            ‹
          </button>
          <button onClick={() => setDate(toDateStr(new Date()))}
            className="flex-1 text-center py-2">
            <p className="text-[#1F1F1F] text-sm font-bold">{formatDateLabel(date)}</p>
            <p className="text-[#7A756D] text-[10px]">{new Date(date + 'T12:00:00').toLocaleDateString('es-PE', { day: 'numeric', month: 'long', year: 'numeric' })}</p>
          </button>
          <button onClick={() => shiftDate(1)}
            className="w-9 h-9 flex items-center justify-center rounded-xl text-[#7A756D] hover:bg-[#F7F5F0] press-scale transition-colors">
            ›
          </button>
        </div>

        {/* Summary chips */}
        {!isLoading && reservations.length > 0 && (
          <div className="flex gap-2 mt-3 flex-wrap">
            <div className="flex items-center gap-1.5 bg-white border border-[#E7E1D8] rounded-full px-3 py-1.5">
              <span className="text-[#1F1F1F] text-xs font-medium">{reservations.length} reserva{reservations.length !== 1 ? 's' : ''}</span>
            </div>
            <div className="flex items-center gap-1.5 bg-white border border-[#E7E1D8] rounded-full px-3 py-1.5">
              <span className="text-[#1F1F1F] text-xs font-medium">
                👥 {reservations.reduce((s, r) => s + r.party_size, 0)} personas
              </span>
            </div>
            {active.length > 0 && (
              <div className="flex items-center gap-1.5 bg-[#EFF6FF] border border-[#6D9EEB]/30 rounded-full px-3 py-1.5">
                <div className="w-1.5 h-1.5 rounded-full bg-[#6D9EEB]" />
                <span className="text-[#2A5FA0] text-xs font-medium">{active.length} activas</span>
              </div>
            )}
          </div>
        )}
      </div>

      {/* List */}
      <div className="px-5 space-y-2.5">
        {isLoading ? (
          Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-24 bg-white border border-[#E7E1D8] rounded-2xl animate-pulse" />
          ))
        ) : reservations.length === 0 ? (
          <div className="flex flex-col items-center py-20">
            <p className="text-5xl mb-4 opacity-30">📅</p>
            <p className="text-[#7A756D] text-sm font-medium">Sin reservas para este día</p>
            <button onClick={() => setShowCreate(true)}
              className="mt-4 text-[#1B3428] text-sm font-semibold underline underline-offset-2">
              Crear una reserva
            </button>
          </div>
        ) : (
          <>
            {active.map((res) => (
              <ReservationCard
                key={res.id}
                res={res}
                onEdit={() => setEditing(res)}
                onStatusChange={(status) => handleStatusChange(res.id, status)}
              />
            ))}
            {archived.length > 0 && (
              <>
                <p className="text-[#A9A39C] text-[10px] uppercase tracking-widest font-bold pt-2 px-1">
                  Finalizadas / Canceladas
                </p>
                {archived.map((res) => (
                  <ReservationCard
                    key={res.id}
                    res={res}
                    onEdit={() => setEditing(res)}
                    onStatusChange={(status) => handleStatusChange(res.id, status)}
                  />
                ))}
              </>
            )}
          </>
        )}
      </div>

      {showCreate && (
        <ReservationSheet defaultDate={date} onSave={handleCreate} onClose={() => setShowCreate(false)} />
      )}
      {editing && (
        <ReservationSheet initial={editing} defaultDate={date} onSave={handleEdit} onClose={() => setEditing(null)} />
      )}
    </div>
  )
}
