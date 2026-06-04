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

  // ── Run all 3 DB queries in parallel instead of sequentially ─────────────
  // Before: sessions → users → user_areas  (~150–600 ms total, 3 round trips)
  // After:  Promise.all([...])             (~50–200 ms total, 1 effective round trip)

  const sessionQuery = payload.sessionId
    ? supabase
        .from('sessions')
        .select('id, revoked_at, expires_at')
        .eq('id', payload.sessionId)
        .maybeSingle()
    : Promise.resolve({ data: null, error: null })

  const userQuery = supabase
    .from('users')
    .select('id, name, email, role, active')
    .eq('id', payload.userId)
    .single()

  const areasQuery = supabase
    .from('user_areas')
    .select('areas(id, name, type)')
    .eq('user_id', payload.userId)

  const [sessionResult, userResult, areasResult] = await Promise.all([
    sessionQuery,
    userQuery,
    areasQuery,
  ])

  // ── Session revocation check ───────────────────────────────────────────────
  if (payload.sessionId && sessionResult.data) {
    const session = sessionResult.data as { revoked_at: string | null; expires_at: string }
    if (session.revoked_at)                            return NextResponse.json({ user: null }, { status: 401 })
    if (new Date(session.expires_at) < new Date())     return NextResponse.json({ user: null }, { status: 401 })

    // Update last_active — fire-and-forget, doesn't block response
    void supabase
      .from('sessions')
      .update({ last_active: new Date().toISOString() })
      .eq('id', payload.sessionId)
  }

  // ── User check ────────────────────────────────────────────────────────────
  const user = userResult.data as { id: string; name: string; email: string; role: string; active: boolean } | null
  if (!user || !user.active) return NextResponse.json({ user: null }, { status: 401 })

  // ── Areas ──────────────────────────────────────────────────────────────────
  const areas: Area[] = ((areasResult.data ?? []) as unknown as { areas: Area | null }[])
    .map(r => r.areas)
    .filter((a): a is Area => a !== null)

  return NextResponse.json({ user: { ...user, areas } })
}
