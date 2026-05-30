import { NextRequest, NextResponse } from 'next/server'
import { verifyToken } from '@/lib/auth'
import { createClient } from '@/lib/supabase/server'
import type { Area } from '@/types'

export async function GET(req: NextRequest) {
  const token = req.cookies.get('gf_session')?.value
  if (!token) return NextResponse.json({ user: null }, { status: 401 })

  const payload = await verifyToken(token)
  if (!payload) return NextResponse.json({ user: null }, { status: 401 })

  const supabase = await createClient()
  const { data: user } = await supabase
    .from('users')
    .select('id, name, email, role, active')
    .eq('id', payload.userId)
    .single()

  if (!user) return NextResponse.json({ user: null }, { status: 401 })

  let areas: Area[] = []
  try {
    const { data: ua } = await supabase
      .from('user_areas')
      .select('areas(id, name, type)')
      .eq('user_id', user.id)
    areas = ((ua ?? []) as unknown as { areas: Area | null }[])
      .map((r) => r.areas)
      .filter((a): a is Area => a !== null)
  } catch {
    // user_areas not yet migrated
  }

  return NextResponse.json({ user: { ...user, areas } })
}
