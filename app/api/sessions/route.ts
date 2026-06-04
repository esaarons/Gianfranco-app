import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { verifyToken } from '@/lib/auth'

// GET — list all active sessions (admin only)
export async function GET(req: NextRequest) {
  const token   = req.cookies.get('gf_session')?.value
  const payload = token ? await verifyToken(token) : null
  if (!payload || (payload.role !== 'admin' && payload.role !== 'encargado')) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const supabase = await createClient()

  const { data, error } = await supabase
    .from('sessions')
    .select(`
      id, device_name, platform, ip_address,
      created_at, last_active, expires_at, revoked_at,
      user:users(id, name, email, role)
    `)
    .order('last_active', { ascending: false })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

// DELETE — revoke a specific session (admin only)
export async function DELETE(req: NextRequest) {
  const token   = req.cookies.get('gf_session')?.value
  const payload = token ? await verifyToken(token) : null
  if (!payload || (payload.role !== 'admin' && payload.role !== 'encargado')) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { sessionId } = await req.json()
  if (!sessionId) return NextResponse.json({ error: 'sessionId required' }, { status: 400 })

  // Can't revoke your own current session via this endpoint (use /api/auth/logout)
  if (sessionId === payload.sessionId) {
    return NextResponse.json({ error: 'Use /api/auth/logout to end your own session' }, { status: 400 })
  }

  const supabase = await createClient()
  const { error } = await supabase
    .from('sessions')
    .update({ revoked_at: new Date().toISOString() })
    .eq('id', sessionId)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
