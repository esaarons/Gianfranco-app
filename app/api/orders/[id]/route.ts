import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { verifyToken } from '@/lib/auth'

export async function GET(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()

  const { data, error } = await supabase
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
    .eq('id', id)
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 404 })
  return NextResponse.json(data)
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const body = await req.json()
  const supabase = await createClient()

  const token  = req.cookies.get('gf_session')?.value
  const userId = token ? (await verifyToken(token))?.userId ?? null : null

  const updates: Record<string, unknown> = {}
  if (body.status) updates.status = body.status
  if (body.status === 'closed') {
    updates.closed_at = new Date().toISOString()
    if (userId) updates.closed_by = userId
  }

  const { data, error } = await supabase
    .from('orders')
    .update(updates)
    .eq('id', id)
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // When closing order, put table in cleaning
  if (body.status === 'closed' && data.table_id) {
    await supabase.from('tables').update({ status: 'cleaning' }).eq('id', data.table_id)
  }

  return NextResponse.json(data)
}
