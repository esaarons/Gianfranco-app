import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { verifyToken } from '@/lib/auth'

export async function GET(req: NextRequest) {
  const supabase = await createClient()
  const { searchParams } = new URL(req.url)
  const date   = searchParams.get('date')   // YYYY-MM-DD
  const status = searchParams.get('status') // comma-separated

  let query = supabase
    .from('reservations')
    .select('*, creator:users(id, name)')
    .order('start_time', { ascending: true })

  if (date)   query = query.eq('date', date)
  if (status) query = query.in('status', status.split(','))

  const { data, error } = await query
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

export async function POST(req: NextRequest) {
  const token   = req.cookies.get('gf_session')?.value
  const payload = token ? await verifyToken(token) : null
  const body    = await req.json()

  const { customer_name, customer_phone, date, start_time, end_time,
          party_size, zone, menu_type, notes } = body

  if (!customer_name || !date || !start_time || !end_time || !party_size) {
    return NextResponse.json({ error: 'Faltan campos obligatorios' }, { status: 400 })
  }

  const supabase = await createClient()
  const { data, error } = await supabase
    .from('reservations')
    .insert({
      customer_name,
      customer_phone: customer_phone || null,
      date,
      start_time,
      end_time,
      party_size: Number(party_size),
      zone:       zone       || 'salon2',
      menu_type:  menu_type  || null,
      notes:      notes      || null,
      status:     'pending',
      created_by: payload?.userId ?? null,
    })
    .select('*, creator:users(id, name)')
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data, { status: 201 })
}
