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
  { value: 'kitchen',   label: 'Cocina'    },
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
  return cls.match(/#[0-9A-Fa-f]{6}/)?.[0] ?? '#7A756D'
}

// ── User form sheet ───────────────────────────────────────────────────────────

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
    if (!form.name || !form.email) { toast.error('Completa todos los campos'); return }
    if (!initial && !form.pin) { toast.error('El PIN es requerido'); return }
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
          <div className="space-y-1.5">
            <label className="text-white/40 text-[10px] font-bold uppercase tracking-widest">Nombre</label>
            <input type="text" value={form.name} onChange={(e) => set('name', e.target.value)}
              placeholder="Ej: María García"
              className="w-full bg-white/6 border border-white/10 focus:border-white/25 rounded-xl px-4 py-3 text-sm text-white outline-none placeholder:text-white/25 transition-all" required />
          </div>
          <div className="space-y-1.5">
            <label className="text-white/40 text-[10px] font-bold uppercase tracking-widest">Email</label>
            <input type="email" value={form.email} onChange={(e) => set('email', e.target.value)}
              placeholder="usuario@gianfranco.pe"
              className="w-full bg-white/6 border border-white/10 focus:border-white/25 rounded-xl px-4 py-3 text-sm text-white outline-none placeholder:text-white/25 transition-all" required />
          </div>
          <div className="space-y-1.5">
            <label className="text-white/40 text-[10px] font-bold uppercase tracking-widest">Rol</label>
            <div className="grid grid-cols-3 gap-2">
              {ACTIVE_ROLES.map((r) => {
                const rc = roleCfg(r.value)
                const selected = form.role === r.value
                return (
                  <button key={r.value} type="button" onClick={() => set('role', r.value)}
                    className={cn('py-2.5 rounded-xl text-sm font-bold border transition-all press-scale',
                      selected ? `${rc.bg} ${rc.color}` : 'bg-white/5 border-white/8 text-white/40')}>
                    {r.label}
                  </button>
                )
              })}
            </div>
          </div>
          <div className="space-y-1.5">
            <label className="text-white/40 text-[10px] font-bold uppercase tracking-widest">Áreas asignadas</label>
            <div className="flex flex-wrap gap-2">
              {AREA_OPTIONS.map((area) => {
                const active = form.area_ids.includes(area.id)
                return (
                  <button key={area.id} type="button" onClick={() => toggleArea(area.id)}
                    className={cn('px-4 py-2 rounded-xl text-sm font-semibold border transition-all press-scale',
                      active ? 'bg-[#A7D4B5]/20 border-[#A7D4B5]/50 text-[#A7D4B5]' : 'bg-white/5 border-white/8 text-white/35')}>
                    {area.label}
                  </button>
                )
              })}
            </div>
          </div>
          <div className="space-y-1.5">
            <label className="text-white/40 text-[10px] font-bold uppercase tracking-widest">PIN de acceso</label>
            <input type="password" inputMode="numeric" value={form.pin} onChange={(e) => set('pin', e.target.value)}
              placeholder={initial ? '••••  (dejar vacío para no cambiar)' : 'Ej: 1234'}
              className="w-full bg-white/6 border border-white/10 focus:border-white/25 rounded-xl px-4 py-3 text-sm text-white outline-none placeholder:text-white/25 transition-all tracking-widest" />
          </div>
          <button type="submit" disabled={saving}
            className="w-full bg-[#F5F1E8] text-[#0F2018] font-bold py-4 rounded-2xl text-sm btn-primary disabled:opacity-50 mt-2">
            {saving ? 'Guardando…' : initial ? 'Guardar cambios' : 'Crear colaborador'}
          </button>
        </form>
      </div>
    </div>
  )
}

// ── Role badge ────────────────────────────────────────────────────────────────

function RoleBadge({ role }: { role: UserRole }) {
  const rc = roleCfg(role)
  return (
    <span className={cn('text-[10px] font-bold px-2 py-0.5 rounded-full border shrink-0', rc.bg, rc.color)}>
      {rc.label}
    </span>
  )
}

// ── User card ─────────────────────────────────────────────────────────────────

function UserCard({
  user,
  onEdit,
  onToggle,
}: {
  user: User
  onEdit: () => void
  onToggle: () => void
}) {
  const hex = roleColor(user.role)
  const rc  = roleCfg(user.role)

  return (
    <div className={cn(
      'bg-white border border-[#E7E1D8] rounded-2xl p-4 card-shadow transition-all',
      !user.active && 'opacity-50'
    )}>
      {/* Top row */}
      <div className="flex items-start gap-3">
        {/* Avatar */}
        <div
          className="w-10 h-10 rounded-xl flex items-center justify-center font-bold text-base shrink-0"
          style={{ background: hex + '20', border: `1.5px solid ${hex}35` }}
        >
          <span className={rc.color}>{user.name[0].toUpperCase()}</span>
        </div>

        {/* Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <p className="text-[#1F1F1F] text-sm font-bold truncate">{user.name}</p>
            <RoleBadge role={user.role} />
          </div>
          <p className="text-[#7A756D] text-xs mt-0.5 truncate">{user.email}</p>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={onEdit}
            className="w-8 h-8 flex items-center justify-center rounded-xl bg-[#F7F5F0] border border-[#E7E1D8] text-[#7A756D] hover:text-[#1B3428] hover:border-[#D4CFC5] press-scale transition-colors"
          >
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
              <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
            </svg>
          </button>

          {/* Toggle */}
          <button
            onClick={onToggle}
            className="relative rounded-full shrink-0 transition-all"
            style={{
              width: '42px', height: '24px',
              background: user.active ? '#6D8A5C' : '#E7E1D8',
            }}
          >
            <span
              className="rounded-full bg-white shadow-sm"
              style={{
                position: 'absolute',
                width: '18px', height: '18px',
                top: '3px',
                left: user.active ? '21px' : '3px',
                transition: 'left 0.18s ease',
              }}
            />
          </button>
        </div>
      </div>

      {/* Areas */}
      {(user.areas?.length ?? 0) > 0 && (
        <div className="flex gap-1.5 mt-3 flex-wrap">
          {user.areas!.map((area) => (
            <span key={area.id}
              className="text-[10px] font-semibold px-2 py-0.5 rounded-lg bg-[#F0EEE9] border border-[#E7E1D8] text-[#7A756D]">
              {area.name}
            </span>
          ))}
        </div>
      )}

      {/* Inactive label */}
      {!user.active && (
        <div className="mt-2.5 flex items-center gap-1.5">
          <div className="w-1.5 h-1.5 rounded-full bg-[#A9A39C]" />
          <p className="text-[#A9A39C] text-[10px] font-medium uppercase tracking-wide">Inactivo</p>
        </div>
      )}
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
      if (!res.ok) return []
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
    toast.success(`${data.name} agregado al equipo`)
  }

  async function handleEdit(data: UserFormData) {
    if (!editing) return
    const payload: Partial<UserFormData> = { name: data.name, email: data.email, role: data.role, area_ids: data.area_ids }
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

  const activeUsers   = users.filter(u => u.active)
  const inactiveUsers = users.filter(u => !u.active)

  // Role distribution
  const roleCount: Partial<Record<UserRole, number>> = {}
  for (const u of activeUsers) {
    roleCount[u.role] = (roleCount[u.role] ?? 0) + 1
  }

  return (
    <RoleGuard allowed={['admin', 'encargado']}>
    <div className="min-h-screen bg-[#F7F5F0]">

      {/* Header */}
      <div className="bg-[#F7F5F0] px-5 pt-8 pb-4 border-b border-[#EDE9E2]">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={() => router.back()}
              className="w-8 h-8 flex items-center justify-center rounded-xl bg-white border border-[#E7E1D8] text-[#7A756D] press-scale shrink-0"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M19 12H5M12 5l-7 7 7 7"/>
              </svg>
            </button>
            <div>
              <p className="text-[#A9A39C] text-[10px] uppercase tracking-[0.2em] font-bold">Gestión</p>
              <h1 className="text-[#1F1F1F] text-2xl font-bold tracking-tight leading-tight">Equipo</h1>
            </div>
          </div>
          <button
            onClick={() => setShowCreate(true)}
            className="flex items-center gap-1.5 bg-[#1B3428] text-white font-bold px-4 py-2.5 rounded-xl text-sm btn-primary mt-1"
          >
            <span className="text-base leading-none">+</span> Nuevo
          </button>
        </div>

        {/* Stats row */}
        {!isLoading && users.length > 0 && (
          <div className="flex items-center gap-3 mt-4">
            <div className="flex items-center gap-1.5 bg-white border border-[#E7E1D8] rounded-full px-3 py-1.5">
              <div className="w-2 h-2 rounded-full bg-[#6D8A5C]" />
              <span className="text-[#3D5E30] text-xs font-semibold">{activeUsers.length} activos</span>
            </div>
            {inactiveUsers.length > 0 && (
              <div className="flex items-center gap-1.5 bg-white border border-[#E7E1D8] rounded-full px-3 py-1.5">
                <div className="w-2 h-2 rounded-full bg-[#A9A39C]" />
                <span className="text-[#7A756D] text-xs font-medium">{inactiveUsers.length} inactivos</span>
              </div>
            )}
            {/* Role chips */}
            {Object.entries(roleCount).map(([role, count]) => {
              const rc = roleCfg(role as UserRole)
              return (
                <div key={role} className={cn('flex items-center gap-1 border rounded-full px-2.5 py-1', rc.bg)}>
                  <span className={cn('text-[10px] font-bold', rc.color)}>{rc.label} {count! > 1 ? `×${count}` : ''}</span>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* List */}
      <div className="px-4 pt-4 pb-10 space-y-2.5 max-w-2xl mx-auto">
        {isLoading ? (
          Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-[88px] bg-white border border-[#E7E1D8] rounded-2xl skeleton" />
          ))
        ) : users.length === 0 ? (
          <div className="flex flex-col items-center py-20 text-center">
            <div className="w-16 h-16 rounded-2xl bg-white border border-[#E7E1D8] flex items-center justify-center mb-4">
              <span className="text-3xl">👥</span>
            </div>
            <p className="text-[#1F1F1F] text-sm font-semibold">Sin colaboradores aún</p>
            <p className="text-[#A9A39C] text-xs mt-1">Agrega a tu equipo para comenzar</p>
            <button
              onClick={() => setShowCreate(true)}
              className="mt-4 bg-[#1B3428] text-white font-semibold px-5 py-2.5 rounded-xl text-sm btn-primary"
            >
              Agregar colaborador
            </button>
          </div>
        ) : (
          <>
            {/* Active users */}
            {activeUsers.length > 0 && (
              <div className="space-y-2.5">
                {activeUsers.map(user => (
                  <UserCard
                    key={user.id}
                    user={user}
                    onEdit={() => setEditing(user)}
                    onToggle={() => toggleActive(user)}
                  />
                ))}
              </div>
            )}

            {/* Inactive divider */}
            {inactiveUsers.length > 0 && (
              <>
                <div className="flex items-center gap-3 pt-2 pb-1">
                  <div className="flex-1 h-px bg-[#EDE9E2]" />
                  <p className="text-[10px] font-bold uppercase tracking-widest text-[#A9A39C]">Inactivos</p>
                  <div className="flex-1 h-px bg-[#EDE9E2]" />
                </div>
                <div className="space-y-2.5">
                  {inactiveUsers.map(user => (
                    <UserCard
                      key={user.id}
                      user={user}
                      onEdit={() => setEditing(user)}
                      onToggle={() => toggleActive(user)}
                    />
                  ))}
                </div>
              </>
            )}
          </>
        )}
      </div>

      {showCreate && <UserSheet onSave={handleCreate} onClose={() => setShowCreate(false)} />}
      {editing    && <UserSheet initial={editing} onSave={handleEdit} onClose={() => setEditing(null)} />}
    </div>
    </RoleGuard>
  )
}
