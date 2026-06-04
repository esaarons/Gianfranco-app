import { NextRequest, NextResponse } from 'next/server'
import { verifyToken } from '@/lib/auth'
import { createClient } from '@/lib/supabase/server'
import { createLog } from '@/lib/log'

export async function POST(req: NextRequest) {
  const token = req.cookies.get('gf_session')?.value

  if (token) {
    const payload = await verifyToken(token)
    if (payload) {
      createLog({ userId: payload.userId, action: 'logout' })

      // Revoke ONLY this device's session — other devices stay logged in
      if (payload.sessionId) {
        try {
          const supabase = await createClient()
          await supabase
            .from('sessions')
            .update({ revoked_at: new Date().toISOString() })
            .eq('id', payload.sessionId)
        } catch {
          // sessions table not yet migrated — no-op
        }
      }
    }
  }

  const response = NextResponse.json({ ok: true })
  response.cookies.set('gf_session', '', { maxAge: 0, path: '/' })
  return response
}
