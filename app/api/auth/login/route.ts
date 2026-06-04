import { NextRequest, NextResponse } from 'next/server'
import { compare } from 'bcryptjs'
import { createClient } from '@/lib/supabase/server'
import { signToken, parseUserAgent } from '@/lib/auth'
import { homeRouteFromAreas } from '@/lib/constants'
import { createLog } from '@/lib/log'
import type { Area } from '@/types'

export async function POST(req: NextRequest) {
  const { email, pin } = await req.json()

  if (!email || !pin) {
    return NextResponse.json({ error: 'Email y PIN requeridos' }, { status: 400 })
  }

  const supabase = await createClient()

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

  // Create a session record for this device
  const ua         = req.headers.get('user-agent') ?? ''
  const ip         = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? req.headers.get('x-real-ip') ?? null
  const { deviceName, platform } = parseUserAgent(ua)
  const expiresAt  = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()

  let sessionId: string
  try {
    const { data: session } = await supabase
      .from('sessions')
      .insert({
        user_id:     user.id,
        device_name: deviceName,
        platform,
        ip_address:  ip,
        user_agent:  ua.slice(0, 500),  // cap at 500 chars
        expires_at:  expiresAt,
      })
      .select('id')
      .single()
    sessionId = session?.id ?? crypto.randomUUID()
  } catch {
    // sessions table not yet migrated — use random UUID (backwards compatible)
    sessionId = crypto.randomUUID()
  }

  const areaIds   = areas.map((a) => a.id)
  const token     = await signToken({ userId: user.id, role: user.role, areaIds, sessionId })
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
    maxAge: 60 * 60 * 24 * 30,  // 30 days
    path: '/',
  })

  return response
}
