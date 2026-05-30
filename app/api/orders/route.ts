import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { verifyToken } from '@/lib/auth'
import type { CartItem } from '@/types'

export async function GET(req: NextRequest) {
  const supabase = await createClient()
  const { searchParams } = new URL(req.url)
  const tableId = searchParams.get('tableId')
  const status = searchParams.get('status') ?? 'open'

  const from = searchParams.get('from')
  const to   = searchParams.get('to')

  let query = supabase
    .from('orders')
    .select(`
      *,
      table:tables(id, code, zone),
      items:order_items(
        *,
        product:products(id, name, price),
        area:areas(id, name, type),
        modifiers:order_item_modifiers(*, modifier:modifiers(id, name, price))
      )
    `)
    .eq('status', status)
    .order('created_at', { ascending: false })

  if (tableId) query = query.eq('table_id', tableId)
  if (from)    query = query.gte('created_at', from)
  if (to)      query = query.lte('created_at', to)

  const { data, error } = await query
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

export async function POST(req: NextRequest) {
  const token = req.cookies.get('gf_session')?.value
  const payload = token ? await verifyToken(token) : null

  const body = await req.json()
  const { tableId, items, notes, type = 'table' }: {
    tableId: string | null
    items: CartItem[]
    notes?: string
    type?: string
  } = body

  if (!items?.length) {
    return NextResponse.json({ error: 'El pedido no tiene items' }, { status: 400 })
  }

  const supabase = await createClient()

  // Check if there's an existing open order for this table
  let orderId: string

  if (tableId && type === 'table') {
    const { data: existingOrder } = await supabase
      .from('orders')
      .select('id')
      .eq('table_id', tableId)
      .eq('status', 'open')
      .single()

    if (existingOrder) {
      orderId = existingOrder.id
    } else {
      // Create new order
      const total = items.reduce((sum, item) => {
        const modTotal = item.modifiers.reduce((m, mod) => m + mod.price, 0)
        return sum + (item.unitPrice + modTotal) * item.quantity
      }, 0)

      const { data: newOrder, error: orderError } = await supabase
        .from('orders')
        .insert({
          type,
          table_id: tableId,
          status: 'open',
          total,
          created_by: payload?.userId ?? null,
          notes,
        })
        .select()
        .single()

      if (orderError) return NextResponse.json({ error: orderError.message }, { status: 500 })
      orderId = newOrder.id

      // Mark table as occupied
      await supabase.from('tables').update({ status: 'occupied' }).eq('id', tableId)
    }
  } else {
    // Delivery / task order
    const { data: newOrder, error: orderError } = await supabase
      .from('orders')
      .insert({ type, table_id: null, status: 'open', created_by: payload?.userId ?? null, notes })
      .select()
      .single()

    if (orderError) return NextResponse.json({ error: orderError.message }, { status: 500 })
    orderId = newOrder.id
  }

  // Insert order items one-by-one to guarantee ID alignment with modifier insertion
  const insertedItemIds: string[] = []
  for (const item of items) {
    const { data: dbItem, error: itemError } = await supabase
      .from('order_items')
      .insert({
        order_id: orderId,
        product_id: item.productId,
        quantity: item.quantity,
        unit_price: item.unitPrice,
        area_id: item.areaId,
        notes: item.notes ?? null,
      })
      .select('id')
      .single()

    if (itemError) return NextResponse.json({ error: itemError.message }, { status: 500 })
    insertedItemIds.push(dbItem.id)
  }

  // Insert modifiers — IDs are now correctly aligned with items
  const modifiersToInsert = insertedItemIds.flatMap((orderItemId, idx) =>
    items[idx].modifiers.map((mod) => ({
      order_item_id: orderItemId,
      modifier_id: mod.modifierId,
      price: mod.price,
    }))
  )

  if (modifiersToInsert.length) {
    await supabase.from('order_item_modifiers').insert(modifiersToInsert)
  }

  // Create or wake up area cards — group items by area
  const areaIds = [...new Set(items.map((i) => i.areaId))]

  for (const areaId of areaIds) {
    const { data: existingCard } = await supabase
      .from('area_cards')
      .select('id, status')
      .eq('order_id', orderId)
      .eq('area_id', areaId)
      .maybeSingle()

    if (!existingCard) {
      // First time this area gets items for this order
      await supabase.from('area_cards').insert({
        order_id: orderId,
        area_id: areaId,
        status: 'pending',
      })
    } else if (existingCard.status === 'received' || existingCard.status === 'delivered') {
      // New items added to an already in-progress or completed card — reset to pending
      await supabase
        .from('area_cards')
        .update({ status: 'pending', received_at: null, delivered_at: null })
        .eq('id', existingCard.id)
    }
    // If already pending, the Realtime UPDATE on order_items triggers a refetch in bar/kitchen
  }

  // Update order total if adding to existing order
  const { data: allItems } = await supabase
    .from('order_items')
    .select('quantity, unit_price, modifiers:order_item_modifiers(price)')
    .eq('order_id', orderId)

  if (allItems) {
    const newTotal = allItems.reduce((sum, item) => {
      const modTotal = (item.modifiers as Array<{ price: number }>).reduce((m, mod) => m + mod.price, 0)
      return sum + (item.unit_price + modTotal) * item.quantity
    }, 0)

    await supabase.from('orders').update({ total: newTotal }).eq('id', orderId)
  }

  return NextResponse.json({ orderId }, { status: 201 })
}
