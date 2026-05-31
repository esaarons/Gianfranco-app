import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { verifyToken } from '@/lib/auth'
import type { CardStatus } from '@/types'

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

  const { data, error } = await supabase
    .from('area_cards')
    .update(updates)
    .eq('id', id)
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}
