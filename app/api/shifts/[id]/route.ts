import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { verifyToken } from '@/lib/auth'
import { computeAndCloseShift } from '@/lib/shiftSummary'

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()

  const token  = req.cookies.get('gf_session')?.value
  const userId = token ? (await verifyToken(token))?.userId ?? null : null

  const { data: shift, error: shiftError } = await supabase
    .from('shifts')
    .select('id, started_at, ended_at')
    .eq('id', id)
    .single()

  if (shiftError || !shift) return NextResponse.json({ error: 'Turno no encontrado' }, { status: 404 })
  if (shift.ended_at)       return NextResponse.json({ error: 'El turno ya fue cerrado' }, { status: 409 })

  const { data, error } = await computeAndCloseShift(supabase, id, shift.started_at, userId)

  if (error) return NextResponse.json({ error: (error as Error).message ?? error }, { status: 500 })
  return NextResponse.json(data)
}
