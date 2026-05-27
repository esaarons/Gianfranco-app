'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useAuthStore } from '@/store/authStore'
import { cn } from '@/lib/utils'
import { ROLE_CONFIG } from '@/lib/constants'
import type { UserRole } from '@/types'

const NAV_LINKS: Record<UserRole, Array<{ href: string; label: string }>> = {
  admin: [
    { href: '/admin', label: 'Dashboard' },
    { href: '/tables', label: 'Mesas' },
    { href: '/bar', label: 'Barra' },
    { href: '/kitchen', label: 'Cocina' },
    { href: '/delivery', label: 'Delivery' },
    { href: '/products', label: 'Productos' },
    { href: '/staff', label: 'Equipo' },
  ],
  salon: [
    { href: '/tables', label: 'Mesas' },
  ],
  bar: [
    { href: '/bar', label: 'Barra' },
    { href: '/delivery', label: 'Delivery' },
  ],
  kitchen: [
    { href: '/kitchen', label: 'Cocina' },
  ],
}

export function Navbar() {
  const user = useAuthStore((s) => s.user)
  const pathname = usePathname()
  const router = useRouter()

  if (!user) return null

  const links = NAV_LINKS[user.role] ?? []

  async function handleLogout() {
    await fetch('/api/auth/logout', { method: 'POST' })
    router.push('/login')
  }

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-stone-900 text-white h-14 flex items-center px-4 gap-2 shadow-lg">
      <span className="font-bold text-amber-400 text-sm mr-3 shrink-0">☕ Gianfranco</span>

      <div className="flex gap-1 overflow-x-auto flex-1 scrollbar-hide">
        {links.map((link) => (
          <Link
            key={link.href}
            href={link.href}
            className={cn(
              'px-3 py-1.5 rounded-md text-sm font-medium whitespace-nowrap transition-colors',
              pathname === link.href || pathname.startsWith(link.href + '/')
                ? 'bg-amber-500 text-stone-900'
                : 'text-stone-300 hover:bg-stone-700'
            )}
          >
            {link.label}
          </Link>
        ))}
      </div>

      <div className="flex items-center gap-2 ml-2 shrink-0">
        <span className="text-xs text-stone-400 hidden sm:block">{user.name}</span>
        <button
          onClick={handleLogout}
          className="text-xs text-stone-400 hover:text-white px-2 py-1 rounded hover:bg-stone-700 transition-colors"
        >
          Salir
        </button>
      </div>
    </nav>
  )
}
