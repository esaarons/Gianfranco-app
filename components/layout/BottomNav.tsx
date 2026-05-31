'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useAuthStore } from '@/store/authStore'
import { AREA_IDS } from '@/lib/constants'
import { cn } from '@/lib/utils'
import type { AreaCard, User } from '@/types'

function hasArea(user: User | null, areaId: string): boolean {
  return user?.areas?.some((a) => a.id === areaId) ?? false
}

function usePendingCount(areaId: string | null) {
  const { data } = useQuery<AreaCard[]>({
    queryKey: ['cards', areaId],
    queryFn: async () => {
      const res = await fetch(`/api/cards?areaId=${areaId}`)
      if (!res.ok) return []
      const json = await res.json()
      return Array.isArray(json) ? json : []
    },
    enabled: !!areaId,
    refetchInterval: 20000,
    staleTime: 10000,
  })
  return data?.filter((c) => c.status === 'pending').length ?? 0
}

// ── Svg icons (minimal, inline) ──────────────────────────────────────────────

function IconGrid() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3" width="7" height="7" rx="1.5" />
      <rect x="14" y="3" width="7" height="7" rx="1.5" />
      <rect x="3" y="14" width="7" height="7" rx="1.5" />
      <rect x="14" y="14" width="7" height="7" rx="1.5" />
    </svg>
  )
}

function IconZap() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
    </svg>
  )
}

function IconClipboard() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M9 5H7a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-2" />
      <rect x="9" y="3" width="6" height="4" rx="1" />
      <line x1="9" y1="12" x2="15" y2="12" />
      <line x1="9" y1="16" x2="13" y2="16" />
    </svg>
  )
}

function IconMore() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="5" cy="12" r="1.5" fill="currentColor" stroke="none" />
      <circle cx="12" cy="12" r="1.5" fill="currentColor" stroke="none" />
      <circle cx="19" cy="12" r="1.5" fill="currentColor" stroke="none" />
    </svg>
  )
}

function IconCoffee() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M18 8h1a4 4 0 0 1 0 8h-1" />
      <path d="M2 8h16v9a4 4 0 0 1-4 4H6a4 4 0 0 1-4-4V8z" />
      <line x1="6" y1="1" x2="6" y2="4" />
      <line x1="10" y1="1" x2="10" y2="4" />
      <line x1="14" y1="1" x2="14" y2="4" />
    </svg>
  )
}

function IconPot() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 11l19-9-9 19-2-8-8-2z" />
    </svg>
  )
}

function IconMap() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <polygon points="1 6 1 22 8 18 16 22 23 18 23 2 16 6 8 2 1 6" />
      <line x1="8" y1="2" x2="8" y2="18" />
      <line x1="16" y1="6" x2="16" y2="22" />
    </svg>
  )
}

function IconTruck() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <rect x="1" y="3" width="15" height="13" rx="1" />
      <polygon points="16 8 20 8 23 11 23 16 16 16 16 8" />
      <circle cx="5.5" cy="18.5" r="2.5" />
      <circle cx="18.5" cy="18.5" r="2.5" />
    </svg>
  )
}

// ── Drawer (slide up) ─────────────────────────────────────────────────────────

interface DrawerItem {
  href: string
  label: string
  icon: React.ReactNode
  badge?: number
  color?: string
}

function Drawer({ items, onClose }: { items: DrawerItem[]; onClose: () => void }) {
  return (
    <>
      <div
        className="fixed inset-0 z-[45] bg-[#252525]/20 overlay-fade"
        onClick={onClose}
      />
      <div className="fixed bottom-0 left-0 right-0 z-[50] spring-up">
        <div className="bg-[#F6F2EA] rounded-t-3xl border-t border-x border-[#E8E4DC] pb-safe">
          <div className="w-10 h-1 bg-[#D4CFC5] rounded-full mx-auto mt-3 mb-4" />
          <div className="px-4 pb-6 grid grid-cols-2 gap-2.5">
            {items.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                onClick={onClose}
                className={cn(
                  'relative flex items-center gap-3 px-4 py-3.5 rounded-2xl border press-scale transition-all',
                  item.color ? '' : 'bg-white border-[#E8E4DC] text-[#252525]'
                )}
                style={item.color ? { background: item.color + '18', borderColor: item.color + '30' } : undefined}
              >
                <span style={item.color ? { color: item.color } : { color: '#0F3A43' }}>{item.icon}</span>
                <span className="font-semibold text-sm">{item.label}</span>
                {(item.badge ?? 0) > 0 && (
                  <span className="absolute top-2 right-2 min-w-[18px] h-[18px] px-1 rounded-full bg-[#E08A50] text-white text-[10px] font-bold flex items-center justify-center">
                    {item.badge}
                  </span>
                )}
              </Link>
            ))}
          </div>
        </div>
      </div>
    </>
  )
}

// ── BottomNav ─────────────────────────────────────────────────────────────────

export function BottomNav() {
  const user     = useAuthStore((s) => s.user)
  const pathname = usePathname()
  const [drawer, setDrawer] = useState<'ops' | 'more' | null>(null)

  const barPending     = usePendingCount(hasArea(user, AREA_IDS.BAR)     ? AREA_IDS.BAR     : null)
  const kitchenPending = usePendingCount(hasArea(user, AREA_IDS.KITCHEN) ? AREA_IDS.KITCHEN : null)

  if (!user) return null

  const role        = user.role
  const isAdminRole = role === 'admin' || role === 'encargado'

  // ── Operations drawer items (admin + encargado)
  const opsItems: DrawerItem[] = [
    { href: '/tables',   label: 'Salón',    icon: <IconMap />,    color: '#0F3A43' },
    { href: '/bar',      label: 'Barra',    icon: <IconCoffee />, color: '#7C5640', badge: barPending },
    { href: '/kitchen',  label: 'Cocina',   icon: <IconPot />,    color: '#C76868', badge: kitchenPending },
    { href: '/delivery', label: 'Delivery', icon: <IconTruck />,  color: '#6D9EEB' },
  ]

  // ── More drawer items
  const moreItems: DrawerItem[] = isAdminRole
    ? [
        { href: '/admin/operations',    label: 'Operaciones',   icon: <span className="text-lg">📈</span> },
        { href: '/admin/orders',        label: 'Pedidos',       icon: <IconClipboard /> },
        { href: '/admin/reservations',  label: 'Reservas',      icon: <span className="text-lg">📅</span> },
        { href: '/admin/reports',       label: 'Reportes',      icon: <span className="text-lg">📊</span> },
        { href: '/admin/logs',          label: 'Actividad',     icon: <span className="text-lg">🗂️</span> },
        { href: '/admin/products',      label: 'Productos',     icon: <span className="text-lg">🍽</span> },
        { href: '/admin/modifiers',     label: 'Modificadores', icon: <span className="text-lg">🧩</span> },
        { href: '/staff',               label: 'Personal',      icon: <span className="text-lg">👥</span> },
        { href: '/settings',            label: 'Ajustes',       icon: <span className="text-lg">⚙️</span> },
      ]
    : [{ href: '/settings', label: 'Ajustes', icon: <span className="text-lg">⚙️</span> }]

  // ── Total ops badge
  const opsBadge = barPending + kitchenPending

  // ── Determine active section
  const inOps    = ['/tables', '/bar', '/kitchen', '/delivery'].some((p) => pathname === p || pathname.startsWith(p + '/'))
  const inOrders = pathname.startsWith('/admin/orders')
  const inAdmin  = pathname === '/admin'
  const inMore   = !inAdmin && !inOps && !inOrders

  type TabItem =
    | { type: 'link';   href: string; label: string; icon: React.ReactNode; active: boolean; badge?: number }
    | { type: 'drawer'; key: 'ops' | 'more'; label: string; icon: React.ReactNode; active: boolean; badge?: number }

  let tabs: TabItem[]

  if (isAdminRole) {
    tabs = [
      { type: 'link',   href: '/admin',        label: 'Dashboard',  icon: <IconGrid />,      active: inAdmin  },
      { type: 'drawer', key: 'ops',            label: 'Estaciones', icon: <IconZap />,       active: inOps,   badge: opsBadge > 0 ? opsBadge : undefined },
      { type: 'link',   href: '/admin/orders', label: 'Pedidos',    icon: <IconClipboard />, active: inOrders },
      { type: 'drawer', key: 'more',           label: 'Más',        icon: <IconMore />,      active: inMore   },
    ]
  } else {
    const dynamicTabs: TabItem[] = []

    if (hasArea(user, AREA_IDS.SALON))
      dynamicTabs.push({ type: 'link', href: '/tables',   label: 'Salón',    icon: <IconMap />,    active: pathname.startsWith('/tables') })
    if (hasArea(user, AREA_IDS.BAR))
      dynamicTabs.push({ type: 'link', href: '/bar',      label: 'Barra',    icon: <IconCoffee />, active: pathname.startsWith('/bar'),      badge: barPending > 0 ? barPending : undefined })
    if (hasArea(user, AREA_IDS.KITCHEN))
      dynamicTabs.push({ type: 'link', href: '/kitchen',  label: 'Cocina',   icon: <IconPot />,    active: pathname.startsWith('/kitchen'),   badge: kitchenPending > 0 ? kitchenPending : undefined })
    if (hasArea(user, AREA_IDS.DELIVERY))
      dynamicTabs.push({ type: 'link', href: '/delivery', label: 'Delivery', icon: <IconTruck />,  active: pathname.startsWith('/delivery') })

    dynamicTabs.push({ type: 'drawer', key: 'more', label: 'Más', icon: <IconMore />, active: inMore })
    tabs = dynamicTabs
  }

  return (
    <>
      {drawer === 'ops'  && <Drawer items={opsItems}   onClose={() => setDrawer(null)} />}
      {drawer === 'more' && <Drawer items={moreItems}  onClose={() => setDrawer(null)} />}

      <nav className="bottom-nav fixed bottom-0 left-0 right-0 z-20 h-16 safe-area-pb flex items-center justify-around px-2"
           style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}>
        {tabs.map((tab) => {
          const isActive = tab.active
          const badge    = tab.badge

          const content = (
            <>
              <div className="relative">
                <span className={cn('transition-colors', isActive ? 'text-[#0F3A43]' : 'text-[#8A8278]')}>
                  {tab.icon}
                </span>
                {(badge ?? 0) > 0 && (
                  <span className="absolute -top-1 -right-1.5 min-w-[16px] h-[16px] px-0.5 rounded-full bg-[#E08A50] text-white text-[9px] font-bold flex items-center justify-center leading-none">
                    {badge}
                  </span>
                )}
              </div>
              <span className={cn(
                'text-[10px] font-semibold tracking-tight mt-0.5',
                isActive ? 'text-[#0F3A43]' : 'text-[#B0AB9F]'
              )}>
                {tab.label}
              </span>
              {isActive && (
                <span className="absolute bottom-1 w-4 h-0.5 rounded-full bg-[#0F3A43]" />
              )}
            </>
          )

          if (tab.type === 'link') {
            return (
              <Link
                key={tab.href}
                href={tab.href}
                className="relative flex flex-col items-center justify-center gap-0.5 flex-1 py-2 press-scale"
              >
                {content}
              </Link>
            )
          }

          return (
            <button
              key={tab.key}
              onClick={() => setDrawer(drawer === tab.key ? null : tab.key)}
              className="relative flex flex-col items-center justify-center gap-0.5 flex-1 py-2 press-scale"
            >
              {content}
            </button>
          )
        })}
      </nav>
    </>
  )
}
