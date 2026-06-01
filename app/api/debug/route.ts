import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// Temporary diagnostic endpoint — remove after debugging
export async function GET() {
  const supabase = await createClient()

  const [areas, recentCards, recentOrders] = await Promise.all([
    supabase.from('areas').select('id, name, type').order('name'),
    supabase
      .from('area_cards')
      .select('id, area_id, status, created_at, order_id, area:areas(id, name, type)')
      .order('created_at', { ascending: false })
      .limit(10),
    supabase
      .from('orders')
      .select('id, type, status, created_at, items:order_items(id, area_id, product_id)')
      .eq('status', 'open')
      .order('created_at', { ascending: false })
      .limit(5),
  ])

  return NextResponse.json({
    areas:         areas.data    ?? areas.error,
    recentCards:   recentCards.data  ?? recentCards.error,
    recentOrders:  recentOrders.data ?? recentOrders.error,
  })
}
