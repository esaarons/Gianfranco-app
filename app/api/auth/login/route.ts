import { NextRequest, NextResponse } from 'next/server'
import { compare } from 'bcryptjs'
import { createClient } from '@/lib/supabase/server'
import { signToken } from '@/lib/auth'
import { homeRouteFromAreas } from '@/lib/constants'
import { createLog } from '@/lib/log'
import type { Area } from '@/types'

export async function POST(req: NextRequest) {
  const { email, pin } = await req.json()

  if (!email || !pin) {
    return NextResponse.json({ error: 'Email y PIN requeridos' }, { status: 400 })
  }

  const supabase = await createClient()

  // Step 1: fetch user + PIN only (no joins — never fails on missing user_areas)
  const { data: user, error } = await supabase
    .from('users')
    .select('id, name, email, role, active, pin')
    .eq('email', email.toLowerCase().trim())
    .eq('active', true)
    .single()

  if (error || !user) {
    return NextResponse.json({ error: 'Credenciales inválidas' }, { status: 401 })
  }

  const pinValid = await compare(String(pin), user.pin)
  if (!pinValid) {
    return NextResponse.json({ error: 'Credenciales inválidas' }, { status: 401 })
  }

  // Step 2: fetch areas separately (graceful fallback if user_areas doesn't exist yet)
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
    // user_areas not yet migrated — continue with empty areas
  }

  const areaIds   = areas.map((a) => a.id)
  const token     = await signToken({ userId: user.id, role: user.role, areaIds })
  const homeRoute = homeRouteFromAreas(user.role, areaIds)

  // Fire-and-forget side effects
  supabase.from('users').update({ last_login: new Date().toISOString() }).eq('id', user.id)
  createLog({ userId: user.id, action: 'login' })

  const { pin: _pin, ...safeUser } = user

  const response = NextResponse.json({ user: { ...safeUser, areas }, redirect: homeRoute })
  response.cookies.set('gf_session', token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 60 * 60 * 8,
    path: '/',
  })

  return response
}
