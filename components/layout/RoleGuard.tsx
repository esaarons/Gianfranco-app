'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuthStore } from '@/store/authStore'
import type { UserRole } from '@/types'

export function RoleGuard({
  allowed,
  children,
}: {
  allowed: UserRole[]
  children: React.ReactNode
}) {
  const user   = useAuthStore((s) => s.user)
  const router = useRouter()

  useEffect(() => {
    if (user && !allowed.includes(user.role as UserRole)) {
      router.replace('/')
    }
  }, [user, router, allowed])

  if (!user || !allowed.includes(user.role as UserRole)) return null
  return <>{children}</>
}
