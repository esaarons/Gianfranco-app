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

// ── Icons ────────────────────────────────────────────────────────────────────

function IconGrid({ size = 22 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3" width="7" height="7" rx="1.5" />
      <rect x="14" y="3" width="7" height="7" rx="1.5" />
      <rect x="3" y="14" width="7" height="7" rx="1.5" />
      <rect x="14" y="14" width="7" height="7" rx="1.5" />
    </svg>
  )
}

function IconZap({ size = 22 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
    </svg>
  )
}

function IconClipboard({ size = 22 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M9 5H7a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-2" />
      <rect x="9" y="3" width="6" height="4" rx="1" />
      <line x1="9" y1="12" x2="15" y2="12" />
      <line x1="9" y1="16" x2="13" y2="16" />
    </svg>
  )
}

function IconMore({ size = 22 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" strokeWidth="1.8">
      <circle cx="5" cy="12" r="1.5" fill="currentColor" />
      <circle cx="12" cy="12" r="1.5" fill="currentColor" />
      <circle cx="19" cy="12" r="1.5" fill="currentColor" />
    </svg>
  )
}

function IconCoffee({ size = 20 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M18 8h1a4 4 0 0 1 0 8h-1" />
      <path d="M2 8h16v9a4 4 0 0 1-4 4H6a4 4 0 0 1-4-4V8z" />
      <line x1="6" y1="1" x2="6" y2="4" />
      <line x1="10" y1="1" x2="10" y2="4" />
      <line x1="14" y1="1" x2="14" y2="4" />
    </svg>
  )
}

function IconPot({ size = 20 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 11l19-9-9 19-2-8-8-2z" />
    </svg>
  )
}

function IconMap({ size = 20 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <polygon points="1 6 1 22 8 18 16 22 23 18 23 2 16 6 8 2 1 6" />
      <line x1="8" y1="2" x2="8" y2="18" />
      <line x1="16" y1="6" x2="16" y2="22" />
    </svg>
  )
}

function IconTruck({ size = 20 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <rect x="1" y="3" width="15" height="13" rx="1" />
      <polygon points="16 8 20 8 23 11 23 16 16 16 16 8" />
      <circle cx="5.5" cy="18.5" r="2.5" />
      <circle cx="18.5" cy="18.5" r="2.5" />
    </svg>
  )
}

// ── Ops drawer ────────────────────────────────────────────────────────────────

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
      <div className="fixed inset-0 z-[45] bg-[#1E3541]/20 overlay-fade" onClick={onClose} />
      <div className="fixed bottom-0 left-0 right-0 z-[50] spring-up">
        <div className="bg-[#F7F5F0] rounded-t-3xl border-t border-x border-[#E7E1D8] pb-safe">
          <div className="w-9 h-1 bg-[#D4CFC5] rounded-full mx-auto mt-3 mb-4" />
          <div className="px-4 pb-6 grid grid-cols-2 gap-2.5">
            {items.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                onClick={onClose}
                className="relative flex items-center gap-3 px-4 py-3.5 rounded-2xl border press-scale transition-all"
                style={item.color
                  ? { background: item.color + '18', borderColor: item.color + '30' }
                  : { background: 'white', borderColor: '#E7E1D8' }}
              >
                <span style={{ color: item.color ?? '#1E3541' }}>{item.icon}</span>
                <span className="font-semibold text-sm text-[#1F1F1F]">{item.label}</span>
                {(item.badge ?? 0) > 0 && (
                  <span className="absolute top-2 right-2 min-w-[18px] h-[18px] px-1 rounded-full bg-[#C98933] text-white text-[10px] font-bold flex items-center justify-center">
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

// ── Grouped "Más" drawer ──────────────────────────────────────────────────────

interface NavSection { label: string; items: DrawerItem[] }

function GroupedDrawer({ sections, onClose }: { sections: NavSection[]; onClose: () => void }) {
  return (
    <>
      <div className="fixed inset-0 z-[45] bg-[#1E3541]/20 overlay-fade" onClick={onClose} />
      <div className="fixed bottom-0 left-0 right-0 z-[50] spring-up">
        <div
          className="bg-[#F7F5F0] rounded-t-3xl border-t border-x border-[#E7E1D8]"
          style={{ paddingBottom: 'calc(env(safe-area-inset-bottom) + 16px)' }}
        >
          <div className="w-9 h-1 bg-[#D4CFC5] rounded-full mx-auto mt-3 mb-1" />
          <div className="overflow-y-auto max-h-[72vh] px-4 pb-2 pt-3 space-y-4">
            {sections.map((section) => (
              <div key={section.label}>
                <p className="text-[#A9A39C] text-[9px] font-bold uppercase tracking-[0.2em] px-1 mb-2">
                  {section.label}
                </p>
                <div className="grid grid-cols-2 gap-2">
                  {section.items.map((item) => (
                    <Link
                      key={item.href}
                      href={item.href}
                      onClick={onClose}
                      className="relative flex items-center gap-2.5 px-3.5 py-3 rounded-xl border press-scale transition-all"
                      style={item.color
                        ? { background: item.color + '15', borderColor: item.color + '25' }
                        : { background: 'white', borderColor: '#E7E1D8' }}
                    >
                      <span className="text-base leading-none" style={{ color: item.color ?? '#1E3541' }}>
                        {item.icon}
                      </span>
                      <span className="font-semibold text-sm text-[#1F1F1F] leading-none">{item.label}</span>
                      {(item.badge ?? 0) > 0 && (
                        <span className="absolute top-1.5 right-1.5 min-w-[16px] h-[16px] px-0.5 rounded-full bg-[#C98933] text-white text-[9px] font-bold flex items-center justify-center">
                          {item.badge}
                        </span>
                      )}
                    </Link>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </>
  )
}

// ── BottomNav ─────────────────────────────────────────────────────────────────

// NAV_BG — the collar ring around the floating circle uses this exact color
// so the circle appears embedded in the bar.
const NAV_BG   = '#1E3541'
const CIRCLE_BG = '#EAD9B1'   // warm gold — active indicator
const ACTIVE_ICON_COLOR  = '#1E3541'
const INACTIVE_ICON_COLOR = 'rgba(245,241,232,0.45)'
const ACTIVE_LABEL_COLOR  = '#EAD9B1'
const INACTIVE_LABEL_COLOR = 'rgba(245,241,232,0.38)'

export function BottomNav() {
  const user     = useAuthStore((s) => s.user)
  const pathname = usePathname()
  const [drawer, setDrawer] = useState<'ops' | 'more' | null>(null)

  const barPending     = usePendingCount(hasArea(user, AREA_IDS.BAR)     ? AREA_IDS.BAR     : null)
  const kitchenPending = usePendingCount(hasArea(user, AREA_IDS.KITCHEN) ? AREA_IDS.KITCHEN : null)

  if (!user) return null

  const role        = user.role
  const isAdminRole = role === 'admin' || role === 'encargado'
  const opsBadge    = barPending + kitchenPending

  // ── Ops drawer items ──────────────────────────────────────────────────────────
  const opsItems: DrawerItem[] = [
    { href: '/salon',    label: 'Salón',    icon: <IconMap />,    color: '#1E3541' },
    { href: '/bar',      label: 'Barra',    icon: <IconCoffee />, color: '#C98933', badge: barPending },
    { href: '/kitchen',  label: 'Cocina',   icon: <IconPot />,    color: '#B8574E', badge: kitchenPending },
    { href: '/delivery', label: 'Delivery', icon: <IconTruck />,  color: '#6D9EEB' },
  ]

  // ── "Más" grouped sections ────────────────────────────────────────────────────
  const moreSections: NavSection[] = isAdminRole
    ? [
        {
          label: 'Operaciones',
          items: [
            { href: '/admin/operations',  label: 'Turnos',    icon: '🎛' },
            { href: '/admin/orders',      label: 'Pedidos',   icon: <IconClipboard size={16} /> },
            { href: '/admin/reservations',label: 'Reservas',  icon: '📅' },
          ],
        },
        {
          label: 'Inteligencia',
          items: [
            { href: '/admin/reports',              label: 'Métricas',   icon: '📊' },
            { href: '/admin/logs',                 label: 'Actividad',  icon: '🗂️' },
            { href: '/admin/operations/history',   label: 'Historial',  icon: '📈' },
          ],
        },
        {
          label: 'Gestión',
          items: [
            { href: '/admin/products',  label: 'Productos',     icon: '🍽' },
            { href: '/admin/modifiers', label: 'Modificadores', icon: '🧩' },
            { href: '/staff',           label: 'Personal',      icon: '👥' },
            { href: '/admin/devices',   label: 'Dispositivos',  icon: '📱' },
            { href: '/settings',        label: 'Ajustes',       icon: '⚙️' },
          ],
        },
      ]
    : [{ label: 'Cuenta', items: [{ href: '/settings', label: 'Ajustes', icon: '⚙️' }] }]

  // ── Active path detection ─────────────────────────────────────────────────────
  const inOps    = ['/salon', '/tables', '/bar', '/kitchen', '/delivery'].some(
    p => pathname === p || pathname.startsWith(p + '/')
  )
  const inOrders = pathname.startsWith('/admin/orders')
  const inAdmin  = pathname === '/admin'
  const inMore   = !inAdmin && !inOps && !inOrders

  // ── Tab definitions ───────────────────────────────────────────────────────────
  type TabItem =
    | { type: 'link';   href: string; label: string; icon: React.ReactNode; active: boolean; badge?: number }
    | { type: 'drawer'; key: 'ops' | 'more'; label: string; icon: React.ReactNode; active: boolean; badge?: number }

  let tabs: TabItem[]

  if (isAdminRole) {
    tabs = [
      { type: 'link',   href: '/admin',        label: 'Inicio',     icon: <IconGrid />,      active: inAdmin  },
      { type: 'drawer', key: 'ops',            label: 'Operación',  icon: <IconZap />,       active: inOps,   badge: opsBadge > 0 ? opsBadge : undefined },
      { type: 'link',   href: '/admin/orders', label: 'Pedidos',    icon: <IconClipboard />, active: inOrders },
      { type: 'drawer', key: 'more',           label: 'Más',        icon: <IconMore />,      active: inMore   },
    ]
  } else {
    const dynamicTabs: TabItem[] = []
    if (hasArea(user, AREA_IDS.SALON))
      dynamicTabs.push({ type: 'link', href: '/salon',    label: 'Salón',    icon: <IconMap />,    active: pathname.startsWith('/salon') || pathname.startsWith('/tables') })
    if (hasArea(user, AREA_IDS.BAR))
      dynamicTabs.push({ type: 'link', href: '/bar',      label: 'Barra',    icon: <IconCoffee />, active: pathname.startsWith('/bar'),     badge: barPending > 0 ? barPending : undefined })
    if (hasArea(user, AREA_IDS.KITCHEN))
      dynamicTabs.push({ type: 'link', href: '/kitchen',  label: 'Cocina',   icon: <IconPot />,    active: pathname.startsWith('/kitchen'),  badge: kitchenPending > 0 ? kitchenPending : undefined })
    if (hasArea(user, AREA_IDS.DELIVERY))
      dynamicTabs.push({ type: 'link', href: '/delivery', label: 'Delivery', icon: <IconTruck />,  active: pathname.startsWith('/delivery') })
    dynamicTabs.push({ type: 'drawer', key: 'more', label: 'Más', icon: <IconMore />, active: inMore })
    tabs = dynamicTabs
  }

  const numTabs    = tabs.length
  const activeIdx  = tabs.findIndex(t => t.active)
  // If no tab is active (e.g. deep sub-page), treat first as fallback
  const safeIdx    = activeIdx >= 0 ? activeIdx : 0
  const activeTab  = tabs[safeIdx]

  // Circle left% = center of the active tab column
  const circlePct  = ((safeIdx + 0.5) / numTabs) * 100

  return (
    <>
      {drawer === 'ops'  && <Drawer items={opsItems} onClose={() => setDrawer(null)} />}
      {drawer === 'more' && <GroupedDrawer sections={moreSections} onClose={() => setDrawer(null)} />}

      <nav className="fixed bottom-0 left-0 right-0 z-20">

        {/* ── Floating active circle ── */}
        <div
          className="absolute z-10 pointer-events-none"
          style={{
            left: `${circlePct}%`,
            top: 0,
            transform: 'translate(-50%, -50%)',
            transition: 'left 320ms cubic-bezier(0.34, 1.56, 0.64, 1)',
          }}
        >
          {/* Collar ring: same color as the bar so the circle looks embedded */}
          <div
            className="w-[54px] h-[54px] rounded-full flex items-center justify-center"
            style={{
              background: CIRCLE_BG,
              boxShadow: `0 0 0 6px ${NAV_BG}, 0 6px 20px rgba(30,58,65,0.4)`,
            }}
          >
            <span style={{ color: ACTIVE_ICON_COLOR }}>
              {activeTab?.icon}
            </span>
            {/* Badge on active circle */}
            {(activeTab?.badge ?? 0) > 0 && (
              <span
                className="absolute -top-0.5 -right-0.5 min-w-[16px] h-[16px] px-0.5 rounded-full text-white text-[9px] font-bold flex items-center justify-center"
                style={{ background: '#C98933' }}
              >
                {activeTab!.badge}
              </span>
            )}
          </div>
        </div>

        {/* ── Bar ── */}
        <div
          className="flex items-stretch"
          style={{
            background: NAV_BG,
            borderRadius: '22px 22px 0 0',
            paddingBottom: 'calc(env(safe-area-inset-bottom) + 4px)',
            minHeight: '60px',
          }}
        >
          {tabs.map((tab, i) => {
            const isActive = i === safeIdx

            const handleTap = () => {
              if (tab.type === 'drawer') {
                setDrawer(drawer === tab.key ? null : tab.key)
              }
            }

            const inner = (
              // Each tab column: top half is "air" for the circle, bottom has icon + label
              <div className="flex flex-col items-center justify-end pb-1" style={{ paddingTop: '24px' }}>
                {!isActive && (
                  <div className="relative">
                    <span style={{ color: INACTIVE_ICON_COLOR }}>
                      {tab.icon}
                    </span>
                    {(tab.badge ?? 0) > 0 && (
                      <span
                        className="absolute -top-1 -right-1.5 min-w-[14px] h-[14px] px-0.5 rounded-full text-white text-[9px] font-bold flex items-center justify-center"
                        style={{ background: '#C98933' }}
                      >
                        {tab.badge}
                      </span>
                    )}
                  </div>
                )}
                {isActive && <div style={{ height: 22 }} />}
                <span
                  className="text-[9px] font-semibold mt-0.5 transition-colors"
                  style={{ color: isActive ? ACTIVE_LABEL_COLOR : INACTIVE_LABEL_COLOR }}
                >
                  {tab.label}
                </span>
              </div>
            )

            if (tab.type === 'link') {
              return (
                <Link key={tab.href} href={tab.href} className="flex-1">
                  {inner}
                </Link>
              )
            }

            return (
              <button key={tab.key} onClick={handleTap} className="flex-1">
                {inner}
              </button>
            )
          })}
        </div>
      </nav>
    </>
  )
}
