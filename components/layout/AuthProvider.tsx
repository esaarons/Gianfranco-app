'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuthStore } from '@/store/authStore'

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const setUser = useAuthStore((s) => s.setUser)
  const router = useRouter()

  useEffect(() => {
    fetch('/api/auth/me')
      .then((r) => r.json())
      .then(({ user }) => {
        if (user) setUser(user)
        else router.push('/login')
      })
      .catch(() => router.push('/login'))
  }, [setUser, router])

  return <>{children}</>
}
