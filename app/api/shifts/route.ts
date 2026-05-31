import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { verifyToken } from '@/lib/auth'

export async function GET() {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('shifts')
    .select('*, started_by_user:users!shifts_started_by_fkey(id,name), ended_by_user:users!shifts_ended_by_fkey(id,name)')
    .order('started_at', { ascending: false })
    .limit(20)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

export async function POST(req: NextRequest) {
  const supabase = await createClient()

  // Check no active shift
  const { data: active } = await supabase
    .from('shifts')
    .select('id')
    .is('ended_at', null)
    .maybeSingle()

  if (active) return NextResponse.json({ error: 'Ya hay un turno activo' }, { status: 409 })

  const token  = req.cookies.get('gf_session')?.value
  const userId = token ? (await verifyToken(token))?.userId ?? null : null

  const body = await req.json().catch(() => ({}))

  const { data, error } = await supabase
    .from('shifts')
    .insert({ started_by: userId, notes: body.notes ?? null })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data, { status: 201 })
}
