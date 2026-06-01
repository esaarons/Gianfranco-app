import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

const FULL_SELECT = `
  *,
  area:areas(id, name, type),
  assignee:users(id, name, role),
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
`

// Spanish aliases for area types used in different DB setups
const AREA_TYPE_ALIASES: Record<string, string[]> = {
  bar:      ['bar', 'barra', 'Bar', 'Barra', 'BAR'],
  kitchen:  ['kitchen', 'cocina', 'Kitchen', 'Cocina', 'KITCHEN', 'COCINA'],
  salon:    ['salon', 'salón', 'Salon', 'Salón', 'SALON'],
  delivery: ['delivery', 'Delivery', 'DELIVERY'],
}

export async function GET(req: NextRequest) {
  const supabase = await createClient()
  const { searchParams } = new URL(req.url)
  const areaId   = searchParams.get('areaId')
  const areaType = searchParams.get('areaType')
  const status   = searchParams.get('status')

  let query = supabase
    .from('area_cards')
    .select(FULL_SELECT)
    .order('created_at', { ascending: false })

  if (areaType && !areaId) {
    // Resolve area IDs by type — supports Spanish aliases (barra/cocina)
    const { data: allAreas } = await supabase.from('areas').select('id, type')
    const candidates = AREA_TYPE_ALIASES[areaType] ?? [areaType]
    const matchedIds = (allAreas ?? [])
      .filter((a: { id: string; type: string }) => candidates.includes(a.type))
      .map((a: { id: string; type: string }) => a.id)

    console.log(`[cards] areaType=${areaType} candidates=${JSON.stringify(candidates)} matched=${JSON.stringify(matchedIds)} allAreas=${JSON.stringify(allAreas)}`)

    if (!matchedIds.length) return NextResponse.json([])
    query = query.in('area_id', matchedIds)
  } else if (areaId) {
    query = query.eq('area_id', areaId)
  }

  if (status) query = query.eq('status', status)
  else        query = query.in('status', ['pending', 'received', 'delivered'])

  const { data, error } = await query
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

// Create manual delivery/task card
export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const body = await req.json()

  const { data, error } = await supabase
    .from('area_cards')
    .insert({
      order_id: null,
      area_id: body.areaId,
      status: 'pending',
      assigned_to: body.assignedTo ?? null,
      title: body.title,
      notes: body.notes ?? null,
    })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data, { status: 201 })
}
