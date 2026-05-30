import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const userId = searchParams.get('userId')
  const action = searchParams.get('action')
  const from   = searchParams.get('from')   // ISO date
  const to     = searchParams.get('to')     // ISO date
  const limit  = Math.min(Number(searchParams.get('limit') ?? '50'), 200)

  const supabase = await createClient()

  let query = supabase
    .from('activity_logs')
    .select('*, user:users(id, name, role)')
    .order('created_at', { ascending: false })
    .limit(limit)

  if (userId) query = query.eq('user_id', userId)
  if (action) query = query.eq('action', action)
  if (from)   query = query.gte('created_at', from)
  if (to)     query = query.lte('created_at', to)

  const { data, error } = await query
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}
