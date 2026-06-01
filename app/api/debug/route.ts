import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// Temporary diagnostic endpoint — remove after debugging
export async function GET() {
  const supabase = await createClient()

  // Basic areas + cards check
  const areas = await supabase.from('areas').select('id, name, type').order('name')

  const simpleCards = await supabase
    .from('area_cards')
    .select('id, area_id, status, created_at, order_id, area:areas(id, name, type)')
    .in('status', ['pending', 'received'])
    .order('created_at', { ascending: false })
    .limit(5)

  // Test the FULL select that /api/cards actually uses
  const fullCardsBar = await supabase
    .from('area_cards')
    .select(`
      *,
      area:areas(id, name, type),
      assignee:users!area_cards_assigned_to_fkey(id, name, role),
      order:orders(
        id, type, total, created_at, notes,
        table:tables(id, code, zone),
        items:order_items(
          id, quantity, unit_price, notes, guest_label,
          product:products(id, name),
          area:areas(id, name, type),
          modifiers:order_item_modifiers(price, modifier:modifiers(name))
        )
      )
    `)
    .eq('area_id', 'aaaaaaaa-0000-0000-0000-000000000001')
    .in('status', ['pending', 'received', 'delivered'])
    .order('created_at', { ascending: false })
    .limit(3)

  return NextResponse.json({
    areas:          areas.data       ?? { error: areas.error },
    simpleCards:    simpleCards.data ?? { error: simpleCards.error },
    fullCardsBar:   fullCardsBar.data   !== null
                      ? `OK — ${fullCardsBar.data?.length} cards returned`
                      : { error: fullCardsBar.error },
  })
}
