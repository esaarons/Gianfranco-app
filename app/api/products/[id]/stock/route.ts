import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { verifyToken } from '@/lib/auth'
import type { StockStatus } from '@/types'

const VALID_STATUSES: StockStatus[] = ['available', 'low', 'out']

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const token = req.cookies.get('gf_session')?.value
  const payload = token ? await verifyToken(token) : null

  const body = await req.json()
  const { stock_status }: { stock_status: StockStatus } = body

  if (!VALID_STATUSES.includes(stock_status)) {
    return NextResponse.json({ error: 'stock_status inválido' }, { status: 400 })
  }

  const supabase = await createClient()

  const { data: current } = await supabase
    .from('products')
    .select('name, stock_status')
    .eq('id', id)
    .single()

  const { data, error } = await supabase
    .from('products')
    .update({ stock_status })
    .eq('id', id)
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  if (payload?.userId) {
    await supabase.from('activity_logs').insert({
      user_id:    payload.userId,
      action:     'product_modified',
      product_id: id,
      old_state:  current?.stock_status ?? 'available',
      new_state:  stock_status,
      metadata:   { product_name: current?.name, field: 'stock_status' },
    })
  }

  return NextResponse.json(data)
}
