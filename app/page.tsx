import { redirect } from 'next/navigation'
import { cookies } from 'next/headers'
import { verifyToken } from '@/lib/auth'
import { ROLE_CONFIG } from '@/lib/constants'
import type { UserRole } from '@/types'

export default async function HomePage() {
  const cookieStore = await cookies()
  const token = cookieStore.get('gf_session')?.value

  if (!token) redirect('/login')

  const payload = await verifyToken(token)
  if (!payload) redirect('/login')

  const { homeRoute } = ROLE_CONFIG[payload.role as UserRole]
  redirect(homeRoute)
}
