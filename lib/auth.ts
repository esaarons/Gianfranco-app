import { SignJWT, jwtVerify } from 'jose'
import type { User, AuthSession } from '@/types'

const secret = new TextEncoder().encode(
  process.env.JWT_SECRET ?? 'gianfranco-dev-secret-change-in-production'
)

export async function signToken(payload: { userId: string; role: string }): Promise<string> {
  return new SignJWT(payload)
    .setProtectedHeader({ alg: 'HS256' })
    .setExpirationTime('8h')
    .setIssuedAt()
    .sign(secret)
}

export async function verifyToken(token: string): Promise<{ userId: string; role: string } | null> {
  try {
    const { payload } = await jwtVerify(token, secret)
    return payload as { userId: string; role: string }
  } catch {
    return null
  }
}

export function getSessionFromCookie(cookies: string | null): string | null {
  if (!cookies) return null
  const match = cookies.match(/gf_session=([^;]+)/)
  return match ? match[1] : null
}
