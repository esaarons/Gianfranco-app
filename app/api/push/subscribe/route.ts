import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { verifyToken } from '@/lib/auth'

// POST — save or update a push subscription for the current user
export async function POST(req: NextRequest) {
  const token = req.cookies.get('gf_session')?.value
  const payload = token ? await verifyToken(token) : null
  if (!payload?.userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  const { endpoint, keys, areaIds = [] } = body as {
    endpoint: string
    keys: { p256dh: string; auth: string }
    areaIds: string[]
  }

  if (!endpoint || !keys?.p256dh || !keys?.auth) {
    return NextResponse.json({ error: 'Invalid subscription' }, { status: 400 })
  }

  const supabase = await createClient()

  // Upsert by endpoint — same device updating its area subscriptions
  const { error } = await supabase
    .from('push_subscriptions')
    .upsert(
      {
        user_id:  payload.userId,
        endpoint,
        p256dh:   keys.p256dh,
        auth:     keys.auth,
        area_ids: areaIds,
      },
      { onConflict: 'endpoint' }
    )

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}

// DELETE — remove subscription on sign-out or explicit opt-out
export async function DELETE(req: NextRequest) {
  const body = await req.json()
  const { endpoint } = body as { endpoint: string }
  if (!endpoint) return NextResponse.json({ error: 'endpoint required' }, { status: 400 })

  const supabase = await createClient()
  await supabase.from('push_subscriptions').delete().eq('endpoint', endpoint)
  return NextResponse.json({ ok: true })
}
