'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuthStore } from '@/store/authStore'

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const setUser = useAuthStore((s) => s.setUser)
  const user    = useAuthStore((s) => s.user)
  const router  = useRouter()
  const [checked, setChecked] = useState(false)

  useEffect(() => {
    fetch('/api/auth/me')
      .then((r) => r.json())
      .then(({ user: u }) => {
        if (u) setUser(u)
        else router.push('/login')
      })
      .catch(() => router.push('/login'))
      .finally(() => setChecked(true))
  }, [setUser, router])

  if (!checked || !user) return null

  return <>{children}</>
}
