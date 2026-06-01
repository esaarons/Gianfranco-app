import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(req: NextRequest) {
  const supabase = await createClient()
  const { searchParams } = new URL(req.url)
  const areaId   = searchParams.get('areaId')
  const areaType = searchParams.get('areaType')
  const status   = searchParams.get('status')

  // If areaType provided, resolve area IDs dynamically — avoids hardcoded UUID mismatch
  let resolvedAreaIds: string[] | null = null
  if (areaType && !areaId) {
    const { data: areas } = await supabase
      .from('areas')
      .select('id')
      .eq('type', areaType)
    resolvedAreaIds = areas?.map((a: { id: string }) => a.id) ?? []
    if (resolvedAreaIds.length === 0) return NextResponse.json([])
  }

  let query = supabase
    .from('area_cards')
    .select(`
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
    `)
    .order('created_at', { ascending: false })

  if (resolvedAreaIds)      query = query.in('area_id', resolvedAreaIds)
  else if (areaId)          query = query.eq('area_id', areaId)

  if (status) query = query.eq('status', status)
  else        query = query.in('status', ['pending', 'received'])

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
