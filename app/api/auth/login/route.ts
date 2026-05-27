import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { signToken } from '@/lib/auth'
import { ROLE_CONFIG } from '@/lib/constants'

export async function POST(req: NextRequest) {
  const { email, pin } = await req.json()

  if (!email || !pin) {
    return NextResponse.json({ error: 'Email y PIN requeridos' }, { status: 400 })
  }

  const supabase = await createClient()
  const { data: user, error } = await supabase
    .from('users')
    .select('*')
    .eq('email', email.toLowerCase().trim())
    .eq('pin', pin)
    .eq('active', true)
    .single()

  if (error || !user) {
    return NextResponse.json({ error: 'Credenciales inválidas' }, { status: 401 })
  }

  const token = await signToken({ userId: user.id, role: user.role })
  const { homeRoute } = ROLE_CONFIG[user.role as keyof typeof ROLE_CONFIG]

  const response = NextResponse.json({ user, redirect: homeRoute })
  response.cookies.set('gf_session', token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 60 * 60 * 8, // 8 horas
    path: '/',
  })

  return response
}
