import { NextRequest, NextResponse } from 'next/server'
import { jwtVerify } from 'jose'

// Inline secret to avoid shared-module issues in Edge runtime
const secret = new TextEncoder().encode(
  process.env.JWT_SECRET ?? 'gianfranco-dev-secret-change-in-production'
)

// Routes that never require a session
const PUBLIC_PATHS = [
  '/login',
  '/api/auth/login',
  '/api/auth/logout',
  '/api/debug',
  '/api/push/vapid-key',   // VAPID public key is not sensitive — needed before auth for SW setup
]

export async function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl

  if (PUBLIC_PATHS.some((p) => pathname.startsWith(p))) {
    return NextResponse.next()
  }

  const token = req.cookies.get('gf_session')?.value
  const isApi = pathname.startsWith('/api/')

  if (!token) {
    return isApi
      ? NextResponse.json({ error: 'No autorizado' }, { status: 401 })
      : NextResponse.redirect(new URL('/login', req.url))
  }

  try {
    await jwtVerify(token, secret)
    return NextResponse.next()
  } catch {
    return isApi
      ? NextResponse.json({ error: 'Sesión inválida' }, { status: 401 })
      : NextResponse.redirect(new URL('/login', req.url))
  }
}

export const config = {
  // Exclude static assets AND the service worker from auth checks
  matcher: ['/((?!_next/static|_next/image|favicon.ico|icons|sounds|manifest.json|sw\\.js).*)'],
}
