import { NextRequest, NextResponse } from 'next/server'
import { hash } from 'bcryptjs'
import { createClient } from '@/lib/supabase/server'
import type { Area } from '@/types'

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const body = await req.json()
  const supabase = await createClient()

  // Whitelist updatable fields to prevent mass-assignment
  const allowed: Record<string, unknown> = {}
  if (body.name   !== undefined) allowed.name   = body.name
  if (body.email  !== undefined) allowed.email  = String(body.email).toLowerCase().trim()
  if (body.role   !== undefined) allowed.role   = body.role
  if (body.active !== undefined) allowed.active = body.active
  if (body.pin    !== undefined) allowed.pin    = await hash(String(body.pin), 10)

  if (Object.keys(allowed).length > 0) {
    const { error } = await supabase.from('users').update(allowed).eq('id', id)
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  }

  // Replace area assignments atomically
  if (Array.isArray(body.area_ids)) {
    await supabase.from('user_areas').delete().eq('user_id', id)
    if (body.area_ids.length > 0) {
      await supabase.from('user_areas').insert(
        body.area_ids.map((areaId: string) => ({ user_id: id, area_id: areaId }))
      )
    }
  }

  const { data, error: fetchError } = await supabase
    .from('users')
    .select('id, name, email, role, active, user_areas(areas(id, name, type))')
    .eq('id', id)
    .single()

  if (fetchError) return NextResponse.json({ error: fetchError.message }, { status: 500 })

  const areas: Area[] = ((data.user_areas ?? []) as unknown as { areas: Area | null }[])
    .map((ua) => ua.areas)
    .filter((a): a is Area => a !== null)

  const { user_areas: _ua, ...safeUser } = data
  return NextResponse.json({ ...safeUser, areas })
}
