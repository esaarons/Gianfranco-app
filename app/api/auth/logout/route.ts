import { NextRequest, NextResponse } from 'next/server'
import { verifyToken } from '@/lib/auth'
import { createLog } from '@/lib/log'

export async function POST(req: NextRequest) {
  const token = req.cookies.get('gf_session')?.value
  if (token) {
    const payload = await verifyToken(token)
    if (payload) createLog({ userId: payload.userId, action: 'logout' })
  }

  const response = NextResponse.json({ ok: true })
  response.cookies.set('gf_session', '', { maxAge: 0, path: '/' })
  return response
}
