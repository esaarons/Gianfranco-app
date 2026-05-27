import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(req: NextRequest) {
  const supabase = await createClient()
  const { searchParams } = new URL(req.url)
  const areaId = searchParams.get('areaId')
  const status = searchParams.get('status')

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
          id, quantity, unit_price, notes,
          product:products(id, name),
          area:areas(id, name, type),
          modifiers:order_item_modifiers(price, modifier:modifiers(name))
        )
      )
    `)
    .order('created_at', { ascending: false })

  if (areaId) query = query.eq('area_id', areaId)
  if (status) query = query.eq('status', status)
  else query = query.in('status', ['pending', 'received'])

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
