import { redirect } from 'next/navigation'
import { cookies } from 'next/headers'
import { verifyToken } from '@/lib/auth'
import { homeRouteFromAreas } from '@/lib/constants'

export default async function HomePage() {
  const cookieStore = await cookies()
  const token = cookieStore.get('gf_session')?.value

  if (!token) redirect('/login')

  const payload = await verifyToken(token)
  if (!payload) redirect('/login')

  redirect(homeRouteFromAreas(payload.role, payload.areaIds ?? []))
}
