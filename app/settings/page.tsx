'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuthStore } from '@/store/authStore'
import { useSound, MODE_CFG } from '@/hooks/useSound'
import { ROLE_CONFIG } from '@/lib/constants'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import type { NotificationMode } from '@/store/notificationStore'
import type { UserRole } from '@/types'

export default function SettingsPage() {
  const router  = useRouter()
  const user    = useAuthStore((s) => s.user)
  const setUser = useAuthStore((s) => s.setUser)
  const { enabled: soundEnabled, mode, permissionStatus, enableSound, setMode } = useSound()

  const [name, setName]             = useState(user?.name ?? '')
  const [pin, setPin]               = useState('')
  const [pinConfirm, setPinConfirm] = useState('')
  const [saving, setSaving]         = useState(false)
  const [section, setSection]       = useState<'profile' | 'pin'>('profile')

  if (!user) return null

  const rc = ROLE_CONFIG[user.role as UserRole] ?? ROLE_CONFIG['servicio']

  async function saveProfile() {
    if (!name.trim()) { toast.error('El nombre no puede estar vacío'); return }
    setSaving(true)
    try {
      const res = await fetch(`/api/users/${user!.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: name.trim() }),
      })
      if (!res.ok) throw new Error()
      setUser({ ...user!, name: name.trim() })
      toast.success('Nombre actualizado')
    } catch {
      toast.error('Error al guardar')
    } finally {
      setSaving(false)
    }
  }

  async function savePin() {
    if (pin.length < 4) { toast.error('El PIN debe tener al menos 4 dígitos'); return }
    if (pin !== pinConfirm) { toast.error('Los PINs no coinciden'); return }
    setSaving(true)
    try {
      const res = await fetch(`/api/users/${user!.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pin }),
      })
      if (!res.ok) throw new Error()
      toast.success('PIN actualizado')
      setPin('')
      setPinConfirm('')
    } catch {
      toast.error('Error al guardar')
    } finally {
      setSaving(false)
    }
  }

  async function handleLogout() {
    await fetch('/api/auth/logout', { method: 'POST' })
    setUser(null)
    router.push('/login')
  }

  return (
    <div className="min-h-screen bg-[#F6F2EA] pb-24">

      {/* Header */}
      <div className="px-5 pt-8 pb-6">
        <p className="text-[#8A8278] text-[10px] uppercase tracking-[0.2em] font-medium mb-1">Cuenta</p>
        <h1 className="text-[#252525] text-2xl font-bold tracking-tight">Ajustes</h1>
      </div>

      {/* Profile card */}
      <div className="mx-5 mb-5 bg-white border border-[#E8E4DC] rounded-2xl px-5 py-4 flex items-center gap-4 card-shadow">
        <div className="w-14 h-14 rounded-2xl bg-[#0F3A43] flex items-center justify-center text-2xl font-bold shrink-0">
          <span className="text-white">{user.name[0]?.toUpperCase()}</span>
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-[#252525] font-bold text-base truncate">{user.name}</p>
          <p className="text-[#8A8278] text-xs truncate mt-0.5">{user.email}</p>
          <div className="flex flex-wrap items-center gap-1.5 mt-1.5">
            <span className={cn('text-[10px] font-bold px-2 py-0.5 rounded-full border', rc.bg, rc.color)}>
              {rc.label}
            </span>
            {user.areas?.map((area) => (
              <span key={area.id} className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-[#F0EDE8] border border-[#DDD9D3] text-[#6A6460]">
                {area.name}
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* Section tabs */}
      <div className="flex gap-2 px-5 mb-5">
        {(['profile', 'pin'] as const).map((s) => (
          <button
            key={s}
            onClick={() => setSection(s)}
            className={cn(
              'flex-1 py-2.5 rounded-xl text-sm font-bold transition-all press-scale',
              section === s ? 'bg-[#0F3A43] text-white' : 'bg-white border border-[#E8E4DC] text-[#8A8278]'
            )}
          >
            {s === 'profile' ? 'Perfil' : 'Cambiar PIN'}
          </button>
        ))}
      </div>

      <div className="px-5 space-y-4">

        {section === 'profile' ? (
          <>
            <div className="space-y-1.5">
              <label className="text-[#8A8278] text-[10px] font-bold uppercase tracking-widest">Nombre</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full bg-white border border-[#E8E4DC] focus:border-[#0F3A43]/30 rounded-xl px-4 py-3 text-sm text-[#252525] outline-none transition-all"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-[#8A8278] text-[10px] font-bold uppercase tracking-widest">Email</label>
              <div className="bg-[#F9F7F3] border border-[#E8E4DC] rounded-xl px-4 py-3">
                <p className="text-[#8A8278] text-sm">{user.email}</p>
              </div>
              <p className="text-[#B0AB9F] text-[10px]">El email solo puede cambiarse desde Administración</p>
            </div>
            <button
              onClick={saveProfile}
              disabled={saving || name.trim() === user.name}
              className="w-full bg-[#0F3A43] text-white font-bold py-4 rounded-2xl text-sm btn-primary disabled:opacity-40"
            >
              {saving ? 'Guardando…' : 'Guardar nombre'}
            </button>
          </>
        ) : (
          <>
            <div className="space-y-1.5">
              <label className="text-[#8A8278] text-[10px] font-bold uppercase tracking-widest">Nuevo PIN</label>
              <input
                type="password"
                inputMode="numeric"
                value={pin}
                onChange={(e) => setPin(e.target.value)}
                placeholder="Mínimo 4 dígitos"
                className="w-full bg-white border border-[#E8E4DC] focus:border-[#0F3A43]/30 rounded-xl px-4 py-3 text-sm text-[#252525] outline-none transition-all placeholder:text-[#B0AB9F] tracking-widest"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-[#8A8278] text-[10px] font-bold uppercase tracking-widest">Confirmar PIN</label>
              <input
                type="password"
                inputMode="numeric"
                value={pinConfirm}
                onChange={(e) => setPinConfirm(e.target.value)}
                placeholder="Repite el PIN"
                className={cn(
                  'w-full bg-white border rounded-xl px-4 py-3 text-sm text-[#252525] outline-none transition-all placeholder:text-[#B0AB9F] tracking-widest',
                  pinConfirm && pin !== pinConfirm
                    ? 'border-[#C76868]/50'
                    : 'border-[#E8E4DC] focus:border-[#0F3A43]/30'
                )}
              />
              {pinConfirm && pin !== pinConfirm && (
                <p className="text-[#C76868] text-[10px]">Los PINs no coinciden</p>
              )}
            </div>
            <button
              onClick={savePin}
              disabled={saving || !pin || pin !== pinConfirm}
              className="w-full bg-[#0F3A43] text-white font-bold py-4 rounded-2xl text-sm btn-primary disabled:opacity-40"
            >
              {saving ? 'Guardando…' : 'Actualizar PIN'}
            </button>
          </>
        )}

        {/* Notificaciones */}
        <div className="h-px bg-[#E8E4DC]" />

        {/* Sound on/off */}
        <div className="bg-white border border-[#E8E4DC] rounded-2xl px-4 py-3.5 flex items-center justify-between card-shadow">
          <div className="flex items-center gap-3">
            <span className="text-xl">🔔</span>
            <div>
              <p className="text-[#252525] text-sm font-semibold">Sonido y notificaciones</p>
              <p className="text-[#8A8278] text-xs mt-0.5">
                {soundEnabled ? 'Activados' : 'Toca para activar'}
              </p>
            </div>
          </div>
          {soundEnabled ? (
            <span className="text-[10px] font-bold px-2.5 py-1 rounded-full bg-[#F0FDF4] border border-[#86EFAC]/50 text-[#166534]">
              Activo
            </span>
          ) : (
            <button
              onClick={enableSound}
              className="text-[10px] font-bold px-3 py-1.5 rounded-full bg-[#0F3A43] text-white press-scale"
            >
              Activar
            </button>
          )}
        </div>

        {/* Notification permission */}
        {soundEnabled && permissionStatus !== null && permissionStatus !== 'granted' && (
          <div className={cn(
            'rounded-2xl px-4 py-3.5 flex items-center justify-between border',
            permissionStatus === 'unsupported'
              ? 'bg-[#F9F7F3] border-[#E8E4DC]'
              : 'bg-[#FEF9EE] border-[#D79A57]/30'
          )}>
            <div className="flex items-center gap-3">
              <span className="text-xl">{permissionStatus === 'unsupported' ? '📵' : '⚠️'}</span>
              <div>
                <p className="text-[#252525] text-sm font-semibold">Notificaciones del sistema</p>
                <p className="text-[#8A8278] text-xs mt-0.5">
                  {permissionStatus === 'unsupported'
                    ? 'No disponible en este navegador'
                    : permissionStatus === 'denied'
                      ? 'Bloqueadas — actívalas en Ajustes del dispositivo'
                      : 'Permiso no otorgado aún'}
                </p>
              </div>
            </div>
            {permissionStatus === 'default' && (
              <button
                onClick={async () => {
                  const perm = await Notification.requestPermission()
                  // permissionStatus updates via store
                  void perm
                }}
                className="text-[10px] font-bold px-3 py-1.5 rounded-full bg-[#0F3A43] text-white press-scale shrink-0"
              >
                Permitir
              </button>
            )}
          </div>
        )}

        {/* Alert mode selector */}
        {soundEnabled && (
          <div className="space-y-2.5">
            <label className="text-[#8A8278] text-[10px] font-bold uppercase tracking-widest px-1">
              Modo de alerta
            </label>
            {(Object.entries(MODE_CFG) as [NotificationMode, typeof MODE_CFG[NotificationMode]][]).map(([key, cfg]) => {
              const active = mode === key
              const chimeIcons = '♪'.repeat(cfg.chimes)
              const vibrIcon = cfg.vibratePattern.length > 1 ? '📳' : '·'
              return (
                <button
                  key={key}
                  onClick={() => setMode(key)}
                  className={cn(
                    'w-full text-left rounded-2xl px-4 py-3.5 border transition-all press-scale',
                    active
                      ? 'bg-[#0F3A43] border-[#0F3A43] text-white'
                      : 'bg-white border-[#E8E4DC] text-[#252525]'
                  )}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <p className={cn('text-sm font-bold', active ? 'text-white' : 'text-[#252525]')}>
                        {cfg.label}
                      </p>
                      <p className={cn('text-xs mt-0.5', active ? 'text-white/60' : 'text-[#8A8278]')}>
                        {cfg.description}
                      </p>
                    </div>
                    <div className={cn('flex items-center gap-2 text-xs shrink-0', active ? 'text-white/70' : 'text-[#8A8278]')}>
                      <span title="Chimes">{chimeIcons}</span>
                      <span title="Vibración">{vibrIcon}</span>
                      <span title="Volumen">{Math.round(cfg.volume * 100)}%</span>
                      {active && <span className="ml-1 text-[#A7B897] font-bold">✓</span>}
                    </div>
                  </div>
                  {active && (
                    <p className="text-[10px] text-white/50 mt-2">
                      {key === 'normal' && 'Alerta si no hay atención en 5 min'}
                      {key === 'alto' && 'Alerta si no hay atención en 3 min'}
                      {key === 'cocina_ruidosa' && 'Alerta si no hay atención en 2 min'}
                    </p>
                  )}
                </button>
              )
            })}
          </div>
        )}

        {/* Logout */}
        <div className="h-px bg-[#E8E4DC]" />
        <button
          onClick={handleLogout}
          className="w-full bg-white border border-[#C76868]/25 text-[#C76868] font-semibold py-3.5 rounded-2xl text-sm press-scale hover:border-[#C76868]/50 transition-all"
        >
          Cerrar sesión
        </button>

      </div>
    </div>
  )
}
