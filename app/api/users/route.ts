import { NextRequest, NextResponse } from 'next/server'
import { hash } from 'bcryptjs'
import { createClient } from '@/lib/supabase/server'
import type { Area } from '@/types'

export async function GET() {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('users')
    .select('id, name, email, role, active, created_at')
    .order('name')

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Fetch areas separately — graceful fallback if user_areas doesn't exist yet
  let areasByUser: Record<string, Area[]> = {}
  try {
    const { data: ua } = await supabase
      .from('user_areas')
      .select('user_id, areas(id, name, type)')
    if (ua) {
      for (const row of ua as unknown as { user_id: string; areas: Area | null }[]) {
        const uid = row.user_id
        const area = row.areas
        if (area) {
          areasByUser[uid] = [...(areasByUser[uid] ?? []), area]
        }
      }
    }
  } catch {
    // user_areas not yet migrated
  }

  const users = (data ?? []).map((user) => ({
    ...user,
    areas: areasByUser[user.id] ?? [],
  }))

  return NextResponse.json(users)
}

export async function POST(req: NextRequest) {
  const { name, email, role, pin, area_ids } = await req.json()

  if (!name || !email || !role || !pin) {
    return NextResponse.json({ error: 'Todos los campos son requeridos' }, { status: 400 })
  }

  const pinHash = await hash(String(pin), 10)

  const supabase = await createClient()
  const { data, error } = await supabase
    .from('users')
    .insert({ name, email: email.toLowerCase().trim(), role, pin: pinHash, active: true })
    .select('id, name, email, role, active, created_at')
    .single()

  if (error) {
    const msg = error.message.includes('invalid input value for enum')
      ? 'Rol no válido. Ejecuta la migración 009 en Supabase para habilitar los nuevos roles.'
      : error.message
    return NextResponse.json({ error: msg }, { status: 500 })
  }

  if (Array.isArray(area_ids) && area_ids.length > 0) {
    await supabase.from('user_areas').insert(
      area_ids.map((areaId: string) => ({ user_id: data.id, area_id: areaId }))
    )
  }

  return NextResponse.json({ ...data, areas: [] }, { status: 201 })
}
