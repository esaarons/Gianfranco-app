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

  // Validate session is not revoked (graceful: if sessions table doesn't exist, skip)
  if (payload.sessionId) {
    try {
      const { data: session } = await supabase
        .from('sessions')
        .select('id, revoked_at, expires_at')
        .eq('id', payload.sessionId)
        .maybeSingle()

      if (session) {
        // Explicitly revoked by admin
        if (session.revoked_at) return NextResponse.json({ user: null }, { status: 401 })
        // Expired (belt + suspenders alongside JWT exp)
        if (new Date(session.expires_at) < new Date()) return NextResponse.json({ user: null }, { status: 401 })

        // Update last_active for device tracking (fire-and-forget)
        void supabase
          .from('sessions')
          .update({ last_active: new Date().toISOString() })
          .eq('id', payload.sessionId)
      }
    } catch {
      // sessions table not yet created — continue without revocation check
    }
  }

  const { data: user } = await supabase
    .from('users')
    .select('id, name, email, role, active')
    .eq('id', payload.userId)
    .single()

  if (!user || !user.active) return NextResponse.json({ user: null }, { status: 401 })

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
