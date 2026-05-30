import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { AREA_IDS } from '@/lib/constants'

export async function GET() {
  const supabase = await createClient()

  // Cards marked as delivered in the last 4 hours from Bar or Kitchen
  const since = new Date(Date.now() - 4 * 60 * 60 * 1000).toISOString()

  const { data, error } = await supabase
    .from('area_cards')
    .select(`
      id, status, delivered_at, created_at,
      area:areas(id, name, type),
      order:orders(
        id, type,
        table:tables(id, code),
        items:order_items(
          id, quantity,
          product:products(id, name),
          area:areas(id, type)
        )
      )
    `)
    .in('area_id', [AREA_IDS.BAR, AREA_IDS.KITCHEN])
    .eq('status', 'delivered')
    .gte('delivered_at', since)
    .order('delivered_at', { ascending: false })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}
