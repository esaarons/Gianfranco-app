import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import type { TableStatus } from '@/types'

// PATCH /api/tables/[id] — change status, move order, join/split
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const body = await req.json()
  const supabase = await createClient()

  // Simple status change
  if (body.status) {
    const { data, error } = await supabase
      .from('tables')
      .update({ status: body.status as TableStatus })
      .eq('id', id)
      .select()
      .single()

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json(data)
  }

  // Join tables — set parent_table_id on child
  if (body.action === 'join' && body.parentId) {
    const { data, error } = await supabase
      .from('tables')
      .update({ parent_table_id: body.parentId })
      .eq('id', id)
      .select()
      .single()

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json(data)
  }

  // Split — remove parent relationship
  if (body.action === 'split') {
    const { data, error } = await supabase
      .from('tables')
      .update({ parent_table_id: null })
      .eq('id', id)
      .select()
      .single()

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json(data)
  }

  // Move order to another table
  if (body.action === 'move' && body.targetTableId && body.orderId) {
    const { error } = await supabase
      .from('orders')
      .update({ table_id: body.targetTableId })
      .eq('id', body.orderId)

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    // Set old table to cleaning
    await supabase.from('tables').update({ status: 'cleaning' }).eq('id', id)
    // Occupy new table
    await supabase.from('tables').update({ status: 'occupied' }).eq('id', body.targetTableId)

    return NextResponse.json({ ok: true })
  }

  return NextResponse.json({ error: 'Acción no reconocida' }, { status: 400 })
}
