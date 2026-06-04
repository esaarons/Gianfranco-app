import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// ── Midnight reset ────────────────────────────────────────────────────────────
// Called at 00:00 Lima time (05:00 UTC) via Vercel cron.
// Closes all open orders and resets all tables to 'free'.
// Auth: CRON_SECRET env var (same pattern as /api/shifts/cron).

export async function GET(req: NextRequest) {
  const cronSecret = process.env.CRON_SECRET
  const authHeader  = req.headers.get('authorization')
  const isVercelCron = cronSecret && authHeader === `Bearer ${cronSecret}`

  if (!isVercelCron) {
    if (cronSecret) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
  }

  const supabase = await createClient()
  const now      = new Date().toISOString()

  // 1. Close all open / in-progress orders
  const { data: closedOrders, error: ordErr } = await supabase
    .from('orders')
    .update({ status: 'closed', closed_at: now })
    .in('status', ['open', 'in_progress'])
    .select('id')

  if (ordErr) {
    return NextResponse.json({ error: 'Failed to close orders', detail: ordErr.message }, { status: 500 })
  }

  // 2. Reset all non-free tables to 'free'
  const { data: resetTables, error: tblErr } = await supabase
    .from('tables')
    .update({ status: 'free', updated_at: now })
    .neq('status', 'free')
    .select('id, code')

  if (tblErr) {
    return NextResponse.json({ error: 'Failed to reset tables', detail: tblErr.message }, { status: 500 })
  }

  // 3. Audit log
  await supabase.from('activity_logs').insert({
    action: 'order_closed',
    metadata: {
      reason:         'midnight_reset',
      orders_closed:  closedOrders?.length  ?? 0,
      tables_reset:   resetTables?.length   ?? 0,
      tables_codes:   (resetTables ?? []).map((t: { code: string }) => t.code),
      triggered_at:   now,
    },
  })

  return NextResponse.json({
    ok:             true,
    timestamp:      now,
    orders_closed:  closedOrders?.length  ?? 0,
    tables_reset:   resetTables?.length   ?? 0,
  })
}
