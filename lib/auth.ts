import { SignJWT, jwtVerify } from 'jose'

if (!process.env.JWT_SECRET && process.env.NODE_ENV === 'production') {
  throw new Error('JWT_SECRET environment variable is required in production')
}

const secret = new TextEncoder().encode(
  process.env.JWT_SECRET ?? 'gianfranco-dev-secret-change-in-production'
)

export interface TokenPayload {
  userId:  string
  role:    string
  areaIds: string[]
}

export async function signToken(payload: TokenPayload): Promise<string> {
  return new SignJWT(payload as unknown as Record<string, unknown>)
    .setProtectedHeader({ alg: 'HS256' })
    .setExpirationTime('8h')
    .setIssuedAt()
    .sign(secret)
}

export async function verifyToken(token: string): Promise<TokenPayload | null> {
  try {
    const { payload } = await jwtVerify(token, secret)
    return payload as unknown as TokenPayload
  } catch {
    return null
  }
}

export function getSessionFromCookie(cookies: string | null): string | null {
  if (!cookies) return null
  const match = cookies.match(/gf_session=([^;]+)/)
  return match ? match[1] : null
}
