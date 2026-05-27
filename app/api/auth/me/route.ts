import { NextRequest, NextResponse } from 'next/server'
import { verifyToken } from '@/lib/auth'
import { createClient } from '@/lib/supabase/server'

export async function GET(req: NextRequest) {
  const token = req.cookies.get('gf_session')?.value
  if (!token) return NextResponse.json({ user: null }, { status: 401 })

  const payload = await verifyToken(token)
  if (!payload) return NextResponse.json({ user: null }, { status: 401 })

  const supabase = await createClient()
  const { data: user } = await supabase
    .from('users')
    .select('id, name, email, role, active')
    .eq('id', payload.userId)
    .single()

  if (!user) return NextResponse.json({ user: null }, { status: 401 })

  return NextResponse.json({ user })
}
