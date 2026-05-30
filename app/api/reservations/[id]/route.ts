import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const body   = await req.json()

  const allowed: Record<string, unknown> = {}
  if (body.status         !== undefined) allowed.status         = body.status
  if (body.customer_name  !== undefined) allowed.customer_name  = body.customer_name
  if (body.customer_phone !== undefined) allowed.customer_phone = body.customer_phone
  if (body.date           !== undefined) allowed.date           = body.date
  if (body.start_time     !== undefined) allowed.start_time     = body.start_time
  if (body.end_time       !== undefined) allowed.end_time       = body.end_time
  if (body.party_size     !== undefined) allowed.party_size     = Number(body.party_size)
  if (body.zone           !== undefined) allowed.zone           = body.zone
  if (body.menu_type      !== undefined) allowed.menu_type      = body.menu_type || null
  if (body.notes          !== undefined) allowed.notes          = body.notes     || null

  const supabase = await createClient()
  const { data, error } = await supabase
    .from('reservations')
    .update(allowed)
    .eq('id', id)
    .select('*, creator:users(id, name)')
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const { error } = await supabase.from('reservations').delete().eq('id', id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
