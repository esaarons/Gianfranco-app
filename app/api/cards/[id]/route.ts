import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { verifyToken } from '@/lib/auth'
import type { CardStatus } from '@/types'

const FULL_SELECT = `
  id, status, area_id, delivered_at, created_at,
  operator_note, delay_minutes, delay_reason,
  area:areas(id, name, type),
  order:orders(
    id, type,
    table:tables(id, code, zone),
    items:order_items(
      id, quantity, notes,
      product:products(id, name),
      area:areas(id, type)
    )
  )
`

export async function GET(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('area_cards')
    .select(FULL_SELECT)
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

  if (body.status) {
    updates.status = body.status as CardStatus
    if (body.status === 'received') {
      updates.received_at = new Date().toISOString()
      if (userId) updates.received_by = userId
    }
    if (body.status === 'delivered') {
      updates.delivered_at = new Date().toISOString()
      if (userId) updates.delivered_by = userId
    }
  }

  if ('operator_note' in body) updates.operator_note = body.operator_note ?? null

  if ('delay_minutes' in body) {
    updates.delay_minutes = body.delay_minutes ?? null
    updates.delay_reason  = body.delay_reason  ?? null
    updates.delay_set_at  = body.delay_minutes != null ? new Date().toISOString() : null
  }

  if (body.status === 'delivered') {
    updates.delay_minutes = null
    updates.delay_reason  = null
    updates.delay_set_at  = null
  }

  const { data, error } = await supabase
    .from('area_cards')
    .update(updates)
    .eq('id', id)
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}
