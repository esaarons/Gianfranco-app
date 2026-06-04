'use client'

import { useState, useEffect } from 'react'
import { useAuthStore } from '@/store/authStore'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'

interface Session {
  id: string
  device_name: string | null
  platform: string | null
  ip_address: string | null
  created_at: string
  last_active: string
  expires_at: string
  revoked_at: string | null
  user: { id: string; name: string; email: string; role: string } | null
}

const ROLE_COLORS: Record<string, string> = {
  admin:     '#C46F4E',
  encargado: '#C46F4E',
  barista:   '#C98933',
  bar:       '#C98933',
  servicio:  '#5A9E60',
  salon:     '#5A9E60',
  caja:      '#5A9E60',
  kitchen:   '#B8574E',
  delivery:  '#6D9EEB',
}

const PLATFORM_EMOJI: Record<string, string> = {
  iOS: '📱', iPadOS: '📱', Android: '📱', macOS: '💻', Windows: '💻', Linux: '🖥️', Web: '🌐',
}

function elapsed(ts: string): string {
  const diff = Math.floor((Date.now() - new Date(ts).getTime()) / 1000)
  if (diff < 60)   return 'ahora'
  if (diff < 3600) return `${Math.floor(diff / 60)}m`
  if (diff < 86400) return `${Math.floor(diff / 3600)}h`
  return `${Math.floor(diff / 86400)}d`
}

function isOnline(lastActive: string): boolean {
  return Date.now() - new Date(lastActive).getTime() < 5 * 60 * 1000  // 5 min
}

export default function DevicesPage() {
  const currentUser = useAuthStore(s => s.user)
  const [sessions, setSessions] = useState<Session[]>([])
  const [loading, setLoading]   = useState(true)
  const [revoking, setRevoking] = useState<string | null>(null)

  async function load() {
    setLoading(true)
    try {
      const res = await fetch('/api/sessions')
      if (res.ok) setSessions(await res.json())
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [])

  async function revoke(sessionId: string, deviceName: string | null) {
    if (!confirm(`¿Revocar acceso de "${deviceName ?? 'Dispositivo'}"?`)) return
    setRevoking(sessionId)
    try {
      const res = await fetch('/api/sessions', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId }),
      })
      if (res.ok) {
        toast.success(`Sesión revocada`)
        setSessions(s => s.map(x => x.id === sessionId ? { ...x, revoked_at: new Date().toISOString() } : x))
      } else {
        const d = await res.json()
        toast.error(d.error ?? 'Error al revocar')
      }
    } finally {
      setRevoking(null)
    }
  }

  // Group by user
  const grouped = sessions.reduce<Record<string, { user: Session['user']; sessions: Session[] }>>((acc, s) => {
    const uid = s.user?.id ?? 'unknown'
    if (!acc[uid]) acc[uid] = { user: s.user, sessions: [] }
    acc[uid].sessions.push(s)
    return acc
  }, {})

  const activeSessions  = sessions.filter(s => !s.revoked_at && new Date(s.expires_at) > new Date())
  const onlineNow       = activeSessions.filter(s => isOnline(s.last_active))

  return (
    <div className="min-h-screen bg-[#F7F5F0] pt-safe">
      {/* Header */}
      <div className="px-5 pt-8 pb-4 flex items-start justify-between">
        <div>
          <p className="section-label mb-1">Admin</p>
          <h1 className="text-[#1F1F1F] text-2xl font-bold tracking-tight">Dispositivos</h1>
        </div>
        <div className="flex gap-2 mt-1">
          <div className="flex items-center gap-1.5 bg-[#5A9E60]/10 text-[#1E4D22] text-xs font-bold px-3 py-1.5 rounded-full border border-[#5A9E60]/25">
            <span className="w-1.5 h-1.5 rounded-full bg-[#5A9E60] dot-pulse" />
            {onlineNow.length} online
          </div>
          <div className="bg-white border border-[#E7E1D8] text-[#7A756D] text-xs font-bold px-3 py-1.5 rounded-full">
            {activeSessions.length} activos
          </div>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-40">
          <div className="w-7 h-7 border-2 border-[#E7E1D8] border-t-[#1E3541] rounded-full animate-spin" />
        </div>
      ) : (
        <div className="px-4 pb-nav space-y-4">
          {Object.entries(grouped).map(([uid, { user, sessions: userSessions }]) => (
            <div key={uid} className="bg-white rounded-2xl border border-[#E7E1D8] overflow-hidden card-shadow">
              {/* User header */}
              <div className="px-4 py-3 flex items-center gap-3 border-b border-[#F2EFE9]">
                <div
                  className="w-8 h-8 rounded-xl flex items-center justify-center text-white text-xs font-bold shrink-0"
                  style={{ background: ROLE_COLORS[user?.role ?? ''] ?? '#A9A39C' }}
                >
                  {user?.name?.slice(0, 1).toUpperCase() ?? '?'}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold text-[#1F1F1F] truncate">{user?.name ?? 'Usuario'}</p>
                  <p className="text-[11px] text-[#A9A39C] truncate">{user?.email}</p>
                </div>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full"
                  style={{ background: (ROLE_COLORS[user?.role ?? ''] ?? '#A9A39C') + '18', color: ROLE_COLORS[user?.role ?? ''] ?? '#A9A39C' }}>
                  {user?.role}
                </span>
              </div>

              {/* Sessions */}
              <div className="divide-y divide-[#F2EFE9]">
                {userSessions.map(session => {
                  const active   = !session.revoked_at && new Date(session.expires_at) > new Date()
                  const online   = active && isOnline(session.last_active)
                  const isMe     = session.id === (currentUser as unknown as { sessionId?: string })?.sessionId
                  const platformEmoji = PLATFORM_EMOJI[session.platform ?? ''] ?? '📱'

                  return (
                    <div key={session.id} className={cn(
                      'flex items-center gap-3 px-4 py-3',
                      !active && 'opacity-40'
                    )}>
                      <div className="text-xl shrink-0">{platformEmoji}</div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5">
                          {online && <span className="w-1.5 h-1.5 rounded-full bg-[#5A9E60] shrink-0" />}
                          <p className="text-sm font-semibold text-[#1F1F1F] truncate">
                            {session.device_name ?? session.platform ?? 'Dispositivo'}
                            {isMe && <span className="text-[10px] text-[#7A756D] font-normal ml-1.5">(este dispositivo)</span>}
                          </p>
                        </div>
                        <p className="text-[11px] text-[#A9A39C] mt-0.5">
                          {session.platform ?? 'Web'}
                          {session.ip_address ? ` · ${session.ip_address}` : ''}
                          {' · '}
                          {session.revoked_at
                            ? `Revocada`
                            : active
                              ? `Activo hace ${elapsed(session.last_active)}`
                              : `Expirada`}
                        </p>
                      </div>
                      {active && !isMe && (
                        <button
                          onClick={() => revoke(session.id, session.device_name)}
                          disabled={revoking === session.id}
                          className="text-[11px] font-semibold text-[#B8574E] bg-[#B8574E]/8 border border-[#B8574E]/20 px-2.5 py-1.5 rounded-lg press-scale shrink-0 disabled:opacity-40"
                        >
                          {revoking === session.id ? '…' : 'Revocar'}
                        </button>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>
          ))}

          {Object.keys(grouped).length === 0 && (
            <div className="flex flex-col items-center justify-center h-40">
              <p className="text-3xl mb-2 opacity-30">📱</p>
              <p className="text-[#7A756D] text-sm">Sin sesiones registradas</p>
              <p className="text-[#A9A39C] text-xs mt-1">Aparecerán al iniciar sesión</p>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
