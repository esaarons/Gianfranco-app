'use client'

import { useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import { AREA_IDS, ROLE_CONFIG } from '@/lib/constants'
import { RoleGuard } from '@/components/layout/RoleGuard'
import type { User, UserRole } from '@/types'

const ACTIVE_ROLES: { value: UserRole; label: string }[] = [
  { value: 'admin',     label: 'Admin'     },
  { value: 'encargado', label: 'Encargado' },
  { value: 'barista',   label: 'Barista'   },
  { value: 'servicio',  label: 'Servicio'  },
  { value: 'caja',      label: 'Caja'      },
  { value: 'delivery',  label: 'Delivery'  },
]

const AREA_OPTIONS: { id: string; label: string }[] = [
  { id: AREA_IDS.SALON,    label: 'Salón'    },
  { id: AREA_IDS.BAR,      label: 'Barra'    },
  { id: AREA_IDS.KITCHEN,  label: 'Cocina'   },
  { id: AREA_IDS.DELIVERY, label: 'Delivery' },
]

function roleCfg(role: UserRole) {
  return ROLE_CONFIG[role] ?? ROLE_CONFIG['servicio']
}

function roleColor(role: UserRole): string {
  const cls = roleCfg(role).color
  return cls.match(/#[0-9A-Fa-f]{6}/)?.[0] ?? '#8A8278'
}

// ── User form ─────────────────────────────────────────────────────────────────

interface UserFormData {
  name:     string
  email:    string
  role:     UserRole
  pin:      string
  area_ids: string[]
}

function UserSheet({
  initial,
  onSave,
  onClose,
}: {
  initial?: User
  onSave: (data: UserFormData) => Promise<void>
  onClose: () => void
}) {
  const [form, setForm] = useState<UserFormData>({
    name:     initial?.name  ?? '',
    email:    initial?.email ?? '',
    role:     initial?.role  ?? 'barista',
    pin:      '',
    area_ids: initial?.areas?.map((a) => a.id) ?? [],
  })
  const [saving, setSaving] = useState(false)

  function set<K extends keyof UserFormData>(key: K, val: UserFormData[K]) {
    setForm((prev) => ({ ...prev, [key]: val }))
  }

  function toggleArea(id: string) {
    setForm((prev) => ({
      ...prev,
      area_ids: prev.area_ids.includes(id)
        ? prev.area_ids.filter((a) => a !== id)
        : [...prev.area_ids, id],
    }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.name || !form.email) {
      toast.error('Completa todos los campos')
      return
    }
    if (!initial && !form.pin) {
      toast.error('El PIN es requerido')
      return
    }
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

  const cfg = roleCfg(form.role)

  return (
    <div className="fixed inset-0 z-50 flex items-end">
      <div className="absolute inset-0 bg-black/65 backdrop-blur-[8px]" onClick={onClose} />
      <div
        className="relative w-full max-w-lg mx-auto rounded-t-[2rem] spring-up overflow-hidden"
        style={{ background: '#0D2226', borderTop: '1px solid rgba(255,255,255,0.12)' }}
      >
        <div className="w-10 h-1 bg-white/20 rounded-full mx-auto mt-3" />

        <div className="flex items-center justify-between px-5 pt-4 pb-3">
          <h2 className="text-white text-base font-bold tracking-tight">
            {initial ? 'Editar colaborador' : 'Nuevo colaborador'}
          </h2>
          <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-full glass text-white/40 press-scale">✕</button>
        </div>

        <div className="h-px bg-white/8 mx-5" />

        <form onSubmit={handleSubmit} className="px-5 py-4 space-y-4 pb-8 overflow-y-auto max-h-[80vh]">
          {/* Name */}
          <div className="space-y-1.5">
            <label className="text-white/40 text-[10px] font-bold uppercase tracking-widest">Nombre</label>
            <input
              type="text"
              value={form.name}
              onChange={(e) => set('name', e.target.value)}
              placeholder="Ej: María García"
              className="w-full bg-white/6 border border-white/10 focus:border-white/25 rounded-xl px-4 py-3 text-sm text-white outline-none placeholder:text-white/25 transition-all"
              required
            />
          </div>

          {/* Email */}
          <div className="space-y-1.5">
            <label className="text-white/40 text-[10px] font-bold uppercase tracking-widest">Email</label>
            <input
              type="email"
              value={form.email}
              onChange={(e) => set('email', e.target.value)}
              placeholder="usuario@gianfranco.pe"
              className="w-full bg-white/6 border border-white/10 focus:border-white/25 rounded-xl px-4 py-3 text-sm text-white outline-none placeholder:text-white/25 transition-all"
              required
            />
          </div>

          {/* Role */}
          <div className="space-y-1.5">
            <label className="text-white/40 text-[10px] font-bold uppercase tracking-widest">Rol</label>
            <div className="grid grid-cols-3 gap-2">
              {ACTIVE_ROLES.map((r) => {
                const rc = roleCfg(r.value)
                const selected = form.role === r.value
                return (
                  <button
                    key={r.value}
                    type="button"
                    onClick={() => set('role', r.value)}
                    className={cn(
                      'py-2.5 rounded-xl text-sm font-bold border transition-all press-scale',
                      selected ? `${rc.bg} ${rc.color}` : 'bg-white/5 border-white/8 text-white/40'
                    )}
                  >
                    {r.label}
                  </button>
                )
              })}
            </div>
          </div>

          {/* Areas */}
          <div className="space-y-1.5">
            <label className="text-white/40 text-[10px] font-bold uppercase tracking-widest">Áreas asignadas</label>
            <div className="flex flex-wrap gap-2">
              {AREA_OPTIONS.map((area) => {
                const active = form.area_ids.includes(area.id)
                return (
                  <button
                    key={area.id}
                    type="button"
                    onClick={() => toggleArea(area.id)}
                    className={cn(
                      'px-4 py-2 rounded-xl text-sm font-semibold border transition-all press-scale',
                      active
                        ? 'bg-[#A7D4B5]/20 border-[#A7D4B5]/50 text-[#A7D4B5]'
                        : 'bg-white/5 border-white/8 text-white/35'
                    )}
                  >
                    {area.label}
                  </button>
                )
              })}
            </div>
          </div>

          {/* PIN */}
          <div className="space-y-1.5">
            <label className="text-white/40 text-[10px] font-bold uppercase tracking-widest">PIN de acceso</label>
            <input
              type="password"
              inputMode="numeric"
              value={form.pin}
              onChange={(e) => set('pin', e.target.value)}
              placeholder={initial ? '••••  (dejar vacío para no cambiar)' : 'Ej: 1234'}
              className="w-full bg-white/6 border border-white/10 focus:border-white/25 rounded-xl px-4 py-3 text-sm text-white outline-none placeholder:text-white/25 transition-all tracking-widest"
            />
          </div>

          <button
            type="submit"
            disabled={saving}
            className="w-full bg-[#F5F1E8] text-[#0E2F33] font-bold py-4 rounded-2xl text-sm btn-primary disabled:opacity-50 mt-2"
          >
            {saving ? 'Guardando…' : initial ? 'Guardar cambios' : 'Crear colaborador'}
          </button>
        </form>
      </div>
    </div>
  )
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function StaffPage() {
  const router      = useRouter()
  const queryClient = useQueryClient()
  const [showCreate, setShowCreate] = useState(false)
  const [editing, setEditing]       = useState<User | null>(null)

  const { data: users = [], isLoading } = useQuery<User[]>({
    queryKey: ['users'],
    queryFn:  async () => {
      const res = await fetch('/api/users')
      return res.json()
    },
  })

  async function toggleActive(user: User) {
    await fetch(`/api/users/${user.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ active: !user.active }),
    })
    queryClient.invalidateQueries({ queryKey: ['users'] })
    toast.success(`${user.name} ${user.active ? 'desactivado' : 'activado'}`)
  }

  async function handleCreate(data: UserFormData) {
    const res = await fetch('/api/users', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    })
    if (!res.ok) {
      const { error } = await res.json()
      throw new Error(error ?? 'Error al crear')
    }
    queryClient.invalidateQueries({ queryKey: ['users'] })
    toast.success(`${data.name} agregado`)
  }

  async function handleEdit(data: UserFormData) {
    if (!editing) return
    const payload: Partial<UserFormData> = {
      name:     data.name,
      email:    data.email,
      role:     data.role,
      area_ids: data.area_ids,
    }
    if (data.pin) payload.pin = data.pin
    const res = await fetch(`/api/users/${editing.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })
    if (!res.ok) {
      const { error } = await res.json()
      throw new Error(error ?? 'Error al guardar')
    }
    queryClient.invalidateQueries({ queryKey: ['users'] })
    toast.success(`${data.name} actualizado`)
  }

  const activeCount   = users.filter((u) => u.active).length
  const inactiveCount = users.filter((u) => !u.active).length

  return (
    <RoleGuard allowed={['admin', 'encargado']}>
    <div className="min-h-screen bg-[#F6F2EA]">

      {/* Header */}
      <div className="px-5 pt-8 pb-5">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={() => router.back()}
              className="w-8 h-8 flex items-center justify-center rounded-xl bg-white border border-[#E8E4DC] text-[#3A3630] press-scale shrink-0"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M19 12H5M12 5l-7 7 7 7"/>
              </svg>
            </button>
            <div>
              <p className="text-[#8A8278] text-[10px] uppercase tracking-[0.2em] font-medium">Administración</p>
              <h1 className="text-[#252525] text-2xl font-bold tracking-tight leading-tight">Personal</h1>
            </div>
          </div>
          <button
            onClick={() => setShowCreate(true)}
            className="flex items-center gap-2 bg-[#0F3A43] text-white font-bold px-4 py-2.5 rounded-xl text-sm btn-primary mt-1"
          >
            <span className="text-base leading-none">+</span> Nuevo
          </button>
        </div>

        {!isLoading && (
          <div className="flex gap-2 mt-4">
            <div className="flex items-center gap-1.5 bg-[#F2F7F3] border border-[#9DAA7D]/25 rounded-full px-3 py-1.5">
              <div className="w-2 h-2 rounded-full bg-[#9DAA7D]" />
              <span className="text-[#4A6B3A] text-xs font-medium">{activeCount} activos</span>
            </div>
            {inactiveCount > 0 && (
              <div className="flex items-center gap-1.5 bg-white border border-[#E8E4DC] rounded-full px-3 py-1.5">
                <div className="w-2 h-2 rounded-full bg-[#B0AB9F]" />
                <span className="text-[#8A8278] text-xs font-medium">{inactiveCount} inactivos</span>
              </div>
            )}
          </div>
        )}
      </div>

      {/* List */}
      <div className="px-5 pb-10 space-y-2.5">
        {isLoading ? (
          Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-20 bg-white border border-[#E8E4DC] rounded-2xl animate-pulse" />
          ))
        ) : users.length === 0 ? (
          <div className="flex flex-col items-center py-16">
            <p className="text-5xl mb-4 opacity-30">👥</p>
            <p className="text-[#8A8278] text-sm font-medium">Sin colaboradores</p>
          </div>
        ) : (
          users.map((user) => {
            const rc  = roleCfg(user.role)
            const hex = roleColor(user.role)
            return (
              <div
                key={user.id}
                className={cn(
                  'bg-white border border-[#E8E4DC] rounded-2xl px-4 py-3.5 flex items-center gap-3 transition-all card-shadow',
                  !user.active && 'opacity-45'
                )}
              >
                {/* Avatar */}
                <div
                  className="w-10 h-10 rounded-xl flex items-center justify-center font-bold text-base shrink-0"
                  style={{ background: hex + '25', border: `1px solid ${hex}45` }}
                >
                  <span className={rc.color}>{user.name[0].toUpperCase()}</span>
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="text-[#252525] text-sm font-semibold truncate">{user.name}</p>
                    <span className={cn('text-[10px] font-bold px-2 py-0.5 rounded-full border shrink-0', rc.bg, rc.color)}>
                      {rc.label}
                    </span>
                  </div>
                  {(user.areas?.length ?? 0) > 0 && (
                    <div className="flex gap-1 mt-1 flex-wrap">
                      {user.areas!.map((area) => (
                        <span key={area.id} className="text-[9px] font-semibold px-1.5 py-0.5 rounded-md bg-[#F6F2EA] border border-[#E0DDD7] text-[#6A6460]">
                          {area.name}
                        </span>
                      ))}
                    </div>
                  )}
                  <p className="text-[#8A8278] text-xs mt-0.5 truncate">{user.email}</p>
                </div>

                {/* Edit */}
                <button
                  onClick={() => setEditing(user)}
                  className="w-8 h-8 flex items-center justify-center rounded-xl bg-[#F6F2EA] border border-[#E8E4DC] text-[#8A8278] hover:text-[#0F3A43] press-scale transition-colors shrink-0"
                >
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                    <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
                  </svg>
                </button>

                {/* Active toggle */}
                <button
                  onClick={() => toggleActive(user)}
                  className="relative rounded-full shrink-0 transition-colors"
                  style={{
                    width: '44px', height: '24px',
                    background: user.active ? '#A7B897' : '#E0DDD7',
                  }}
                >
                  <span
                    className="rounded-full bg-white shadow-sm"
                    style={{
                      position: 'absolute',
                      width: '18px', height: '18px',
                      top: '3px',
                      left: user.active ? '23px' : '3px',
                      transition: 'left 0.18s ease',
                    }}
                  />
                </button>
              </div>
            )
          })
        )}
      </div>

      {showCreate && (
        <UserSheet onSave={handleCreate} onClose={() => setShowCreate(false)} />
      )}
      {editing && (
        <UserSheet initial={editing} onSave={handleEdit} onClose={() => setEditing(null)} />
      )}
    </div>
    </RoleGuard>
  )
}
