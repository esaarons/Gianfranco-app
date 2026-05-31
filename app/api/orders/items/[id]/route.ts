import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { verifyToken } from '@/lib/auth'
import type { SupabaseClient } from '@supabase/supabase-js'

async function syncOrderTotal(supabase: SupabaseClient, orderId: string) {
  const { data: items } = await supabase
    .from('order_items')
    .select('quantity, unit_price, modifiers:order_item_modifiers(price)')
    .eq('order_id', orderId)

  if (!items) return
  const total = items.reduce((sum, item) => {
    const modTotal = (item.modifiers as Array<{ price: number }>).reduce((m, mod) => m + mod.price, 0)
    return sum + (item.unit_price + modTotal) * item.quantity
  }, 0)
  await supabase.from('orders').update({ total }).eq('id', orderId)
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const token = req.cookies.get('gf_session')?.value
  if (!token || !(await verifyToken(token))) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  }

  const { quantity } = await req.json()

  if (!quantity || quantity < 1) {
    return NextResponse.json({ error: 'Quantity must be >= 1' }, { status: 400 })
  }

  const supabase = await createClient()
  const { data, error } = await supabase
    .from('order_items')
    .update({ quantity })
    .eq('id', id)
    .select('id, order_id, quantity, unit_price')
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  await syncOrderTotal(supabase, data.order_id)

  return NextResponse.json(data)
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const token = req.cookies.get('gf_session')?.value
  if (!token || !(await verifyToken(token))) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  }

  const supabase = await createClient()

  // Fetch order_id before deleting so we can recalculate total
  const { data: item } = await supabase
    .from('order_items')
    .select('order_id')
    .eq('id', id)
    .single()

  const { error } = await supabase
    .from('order_items')
    .delete()
    .eq('id', id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  if (item?.order_id) {
    await syncOrderTotal(supabase, item.order_id)
  }

  return new NextResponse(null, { status: 204 })
}
