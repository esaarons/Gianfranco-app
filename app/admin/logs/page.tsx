'use client'

import { useState, useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useRouter } from 'next/navigation'
import { cn } from '@/lib/utils'
import type { ActivityLog, LogAction } from '@/types'

// ── Helpers ───────────────────────────────────────────────────────────────────

const ACTION_CFG: Record<string, { label: string; icon: string; color: string }> = {
  login:                 { label: 'Ingresó',            icon: '🔑', color: '#3D7050' },
  logout:                { label: 'Salió',              icon: '🚪', color: '#8A8278' },
  order_created:         { label: 'Pedido creado',      icon: '🛒', color: '#2A5FA0' },
  order_modified:        { label: 'Pedido modificado',  icon: '✏️',  color: '#7C5640' },
  order_closed:          { label: 'Pedido cerrado',     icon: '✅', color: '#3D7050' },
  order_cancelled:       { label: 'Pedido cancelado',   icon: '✕',  color: '#C76868' },
  item_added:            { label: 'Ítem agregado',      icon: '➕', color: '#2A5FA0' },
  item_removed:          { label: 'Ítem eliminado',     icon: '➖', color: '#C76868' },
  item_modified:         { label: 'Ítem modificado',    icon: '✏️',  color: '#7C5640' },
  card_status_changed:   { label: 'Estado de comanda',  icon: '📋', color: '#6D9EEB' },
  table_opened:          { label: 'Mesa abierta',       icon: '🪑', color: '#2A5FA0' },
  table_freed:           { label: 'Mesa liberada',      icon: '🪑', color: '#3D7050' },
  table_joined:          { label: 'Mesas unidas',       icon: '🔗', color: '#7C5640' },
  table_moved:           { label: 'Mesa movida',        icon: '↔️',  color: '#7C5640' },
  product_created:       { label: 'Producto creado',    icon: '🍽',  color: '#2A5FA0' },
  product_modified:      { label: 'Producto modificado',icon: '✏️',  color: '#7C5640' },
  user_created:          { label: 'Usuario creado',     icon: '👤', color: '#2A5FA0' },
  user_modified:         { label: 'Usuario modificado', icon: '👤', color: '#7C5640' },
  reservation_created:   { label: 'Reserva creada',     icon: '📅', color: '#2A5FA0' },
  reservation_modified:  { label: 'Reserva modificada', icon: '📅', color: '#7C5640' },
  reservation_cancelled: { label: 'Reserva cancelada',  icon: '📅', color: '#C76868' },
}

const ACTION_GROUPS = [
  { label: 'Sesión',      actions: ['login', 'logout'] },
  { label: 'Pedidos',     actions: ['order_created', 'order_modified', 'order_closed', 'order_cancelled', 'item_added', 'item_removed', 'item_modified'] },
  { label: 'Mesas',       actions: ['table_opened', 'table_freed', 'table_joined', 'table_moved', 'card_status_changed'] },
  { label: 'Reservas',    actions: ['reservation_created', 'reservation_modified', 'reservation_cancelled'] },
  { label: 'Catálogo',    actions: ['product_created', 'product_modified'] },
  { label: 'Usuarios',    actions: ['user_created', 'user_modified'] },
]

function relativeTime(ts: string): string {
  const diff = Math.floor((Date.now() - new Date(ts).getTime()) / 1000)
  if (diff < 60)   return 'hace un momento'
  if (diff < 3600) return `hace ${Math.floor(diff / 60)} min`
  if (diff < 86400) return `hace ${Math.floor(diff / 3600)}h`
  const d = new Date(ts)
  return d.toLocaleDateString('es-PE', { day: 'numeric', month: 'short' })
}

function fullTime(ts: string): string {
  return new Date(ts).toLocaleString('es-PE', {
    day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit',
  })
}

function actionCfg(action: string) {
  return ACTION_CFG[action] ?? { label: action, icon: '•', color: '#8A8278' }
}

// ── Log row ───────────────────────────────────────────────────────────────────

function LogRow({ log }: { log: ActivityLog }) {
  const [expanded, setExpanded] = useState(false)
  const cfg = actionCfg(log.action)

  const hasDetail = log.old_state || log.new_state || log.metadata

  return (
    <div
      className={cn('border-b border-[#F0EDE8] last:border-0', hasDetail && 'cursor-pointer')}
      onClick={() => hasDetail && setExpanded((e) => !e)}
    >
      <div className="px-4 py-3 flex items-start gap-3">
        <div className="w-8 h-8 rounded-xl flex items-center justify-center text-sm shrink-0"
             style={{ background: cfg.color + '15' }}>
          {cfg.icon}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-[#252525] text-sm font-semibold">{cfg.label}</span>
            {log.user && (
              <span className="text-[#8A8278] text-xs">· {log.user.name}</span>
            )}
          </div>
          <div className="flex items-center gap-2 mt-0.5">
            {log.new_state && (
              <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-md"
                    style={{ background: cfg.color + '15', color: cfg.color }}>
                {log.new_state}
              </span>
            )}
            <span className="text-[#B0AB9F] text-[11px]" title={fullTime(log.created_at)}>
              {relativeTime(log.created_at)}
            </span>
          </div>
        </div>
        {hasDetail && (
          <span className={cn('text-[#B0AB9F] text-xs transition-transform shrink-0 mt-1', expanded && 'rotate-180')}>
            ▾
          </span>
        )}
      </div>
      {expanded && hasDetail && (
        <div className="px-4 pb-3 ml-11 space-y-1.5">
          {log.old_state && (
            <div className="flex items-center gap-2">
              <span className="text-[10px] text-[#B0AB9F] w-12 shrink-0">Antes</span>
              <span className="text-xs bg-[#FEF2F2] text-[#C76868] px-2 py-0.5 rounded-md font-mono">{log.old_state}</span>
            </div>
          )}
          {log.new_state && (
            <div className="flex items-center gap-2">
              <span className="text-[10px] text-[#B0AB9F] w-12 shrink-0">Después</span>
              <span className="text-xs bg-[#F0FDF4] text-[#3D7050] px-2 py-0.5 rounded-md font-mono">{log.new_state}</span>
            </div>
          )}
          {log.metadata && (
            <div className="bg-[#F6F2EA] rounded-xl px-3 py-2 mt-1">
              <pre className="text-[10px] text-[#6A6460] font-mono whitespace-pre-wrap break-all">
                {JSON.stringify(log.metadata, null, 2)}
              </pre>
            </div>
          )}
          <p className="text-[#B0AB9F] text-[10px]">{fullTime(log.created_at)}</p>
        </div>
      )}
    </div>
  )
}

// ── Filter pill ───────────────────────────────────────────────────────────────

function FilterPill({
  label, active, onClick,
}: { label: string; active: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className={cn(
        'px-3 py-1.5 rounded-full text-xs font-bold border transition-all press-scale shrink-0',
        active
          ? 'bg-[#0F3A43] text-white border-[#0F3A43]'
          : 'bg-white text-[#8A8278] border-[#E8E4DC]'
      )}
    >
      {label}
    </button>
  )
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function LogsPage() {
  const router = useRouter()
  const [activeGroup, setActiveGroup] = useState<string | null>(null)
  const [search, setSearch] = useState('')

  const groupActions: LogAction[] | undefined = useMemo(() => {
    if (!activeGroup) return undefined
    return ACTION_GROUPS.find((g) => g.label === activeGroup)?.actions as LogAction[]
  }, [activeGroup])

  const { data: logs = [], isLoading } = useQuery<ActivityLog[]>({
    queryKey: ['logs', activeGroup],
    queryFn: async () => {
      const params = new URLSearchParams({ limit: '100' })
      const res = await fetch(`/api/logs?${params}`)
      if (!res.ok) throw new Error()
      return res.json()
    },
    staleTime: 15000,
    refetchInterval: 30000,
  })

  const filtered = useMemo(() => {
    let list = logs
    if (groupActions) {
      list = list.filter((l) => groupActions.includes(l.action))
    }
    if (search.trim()) {
      const q = search.toLowerCase()
      list = list.filter((l) =>
        l.user?.name?.toLowerCase().includes(q) ||
        actionCfg(l.action).label.toLowerCase().includes(q) ||
        l.new_state?.toLowerCase().includes(q)
      )
    }
    return list
  }, [logs, groupActions, search])

  // Group by relative date
  const grouped = useMemo(() => {
    const groups: { label: string; items: ActivityLog[] }[] = []
    let currentLabel = ''
    for (const log of filtered) {
      const d    = new Date(log.created_at)
      const now  = new Date()
      const diff = Math.floor((now.getTime() - d.getTime()) / 86400000)
      const label = diff === 0 ? 'Hoy' : diff === 1 ? 'Ayer' : d.toLocaleDateString('es-PE', { weekday: 'long', day: 'numeric', month: 'long' })
      if (label !== currentLabel) {
        currentLabel = label
        groups.push({ label, items: [] })
      }
      groups[groups.length - 1].items.push(log)
    }
    return groups
  }, [filtered])

  return (
    <div className="min-h-screen bg-[#F6F2EA] pb-24">

      {/* Header */}
      <div className="px-5 pt-8 pb-4">
        <div className="flex items-center gap-3 mb-4">
          <button onClick={() => router.back()}
            className="w-8 h-8 flex items-center justify-center rounded-xl bg-white border border-[#E8E4DC] text-[#3A3630] press-scale shrink-0">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M19 12H5M12 5l-7 7 7 7"/>
            </svg>
          </button>
          <div>
            <p className="text-[#8A8278] text-[10px] uppercase tracking-[0.2em] font-medium">Administración</p>
            <h1 className="text-[#252525] text-2xl font-bold tracking-tight leading-tight">Actividad</h1>
          </div>
        </div>

        {/* Search */}
        <div className="relative mb-3">
          <svg className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#B0AB9F]" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
          </svg>
          <input
            type="text"
            placeholder="Buscar por usuario o acción…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-white border border-[#E8E4DC] rounded-xl pl-9 pr-4 py-2.5 text-sm text-[#252525] outline-none focus:border-[#0F3A43]/30 placeholder:text-[#B0AB9F]"
          />
          {search && (
            <button onClick={() => setSearch('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-[#B0AB9F] press-scale">✕</button>
          )}
        </div>

        {/* Filter pills */}
        <div className="flex gap-2 overflow-x-auto scrollbar-hide pb-1">
          <FilterPill label="Todo" active={!activeGroup} onClick={() => setActiveGroup(null)} />
          {ACTION_GROUPS.map((g) => (
            <FilterPill key={g.label} label={g.label} active={activeGroup === g.label} onClick={() => setActiveGroup(g.label === activeGroup ? null : g.label)} />
          ))}
        </div>
      </div>

      {/* Log list */}
      <div className="px-5">
        {isLoading ? (
          <div className="space-y-2">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="h-14 bg-white border border-[#E8E4DC] rounded-2xl animate-pulse" />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center py-20">
            <p className="text-5xl mb-4 opacity-30">📋</p>
            <p className="text-[#8A8278] text-sm font-medium">Sin actividad registrada</p>
          </div>
        ) : (
          <div className="space-y-4">
            {grouped.map((group) => (
              <div key={group.label}>
                <p className="text-[#B0AB9F] text-[10px] uppercase tracking-widest font-bold mb-2 px-1">
                  {group.label}
                </p>
                <div className="bg-white border border-[#E8E4DC] rounded-2xl overflow-hidden card-shadow">
                  {group.items.map((log) => (
                    <LogRow key={log.id} log={log} />
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
