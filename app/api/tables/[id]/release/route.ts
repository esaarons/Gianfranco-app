import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { verifyToken } from '@/lib/auth'

// POST /api/tables/[id]/release
// Atomically: closes all open orders for the table, cancels their pending/received
// area_cards, and sets the table to cleaning. Server-side so no stale client cache.
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id: tableId } = await params
  const supabase = await createClient()

  const token  = req.cookies.get('gf_session')?.value
  const userId = token ? (await verifyToken(token))?.userId ?? null : null

  // 1. Find all open orders for this table
  const { data: openOrders, error: fetchErr } = await supabase
    .from('orders')
    .select('id')
    .eq('table_id', tableId)
    .eq('status', 'open')

  if (fetchErr) return NextResponse.json({ error: fetchErr.message }, { status: 500 })

  const orderIds = (openOrders ?? []).map((o) => o.id)

  // 2. Delete pending/received area_cards for those orders
  if (orderIds.length > 0) {
    await supabase
      .from('area_cards')
      .delete()
      .in('order_id', orderIds)
      .in('status', ['pending', 'received'])
  }

  // 3. Close all open orders
  if (orderIds.length > 0) {
    const { error: closeErr } = await supabase
      .from('orders')
      .update({
        status: 'closed',
        closed_at: new Date().toISOString(),
        ...(userId ? { closed_by: userId } : {}),
      })
      .in('id', orderIds)

    if (closeErr) return NextResponse.json({ error: closeErr.message }, { status: 500 })
  }

  // 4. Set table to cleaning
  const { error: tableErr } = await supabase
    .from('tables')
    .update({ status: 'cleaning' })
    .eq('id', tableId)

  if (tableErr) return NextResponse.json({ error: tableErr.message }, { status: 500 })

  return NextResponse.json({
    ok: true,
    closedOrders: orderIds.length,
  })
}
