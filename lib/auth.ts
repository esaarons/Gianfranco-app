import { SignJWT, jwtVerify } from 'jose'

if (!process.env.JWT_SECRET && process.env.NODE_ENV === 'production') {
  throw new Error('JWT_SECRET environment variable is required in production')
}

const secret = new TextEncoder().encode(
  process.env.JWT_SECRET ?? 'gianfranco-dev-secret-change-in-production'
)

export interface TokenPayload {
  userId:    string
  role:      string
  areaIds:   string[]
  sessionId: string   // jti — unique per device session
}

export async function signToken(payload: TokenPayload): Promise<string> {
  return new SignJWT(payload as unknown as Record<string, unknown>)
    .setProtectedHeader({ alg: 'HS256' })
    .setExpirationTime('30d')   // 30 days — covers any shift length
    .setIssuedAt()
    .setJti(payload.sessionId)  // JWT ID = sessionId for revocation
    .sign(secret)
}

export async function verifyToken(token: string): Promise<TokenPayload | null> {
  try {
    const { payload } = await jwtVerify(token, secret)
    // sessionId may come from jti (new tokens) or sessionId field (legacy)
    const sessionId = (payload.jti ?? (payload as Record<string, unknown>).sessionId ?? '') as string
    return {
      userId:    payload.userId    as string,
      role:      payload.role      as string,
      areaIds:   (payload.areaIds  as string[]) ?? [],
      sessionId,
    }
  } catch {
    return null
  }
}

export function getSessionFromCookie(cookies: string | null): string | null {
  if (!cookies) return null
  const match = cookies.match(/gf_session=([^;]+)/)
  return match ? match[1] : null
}

// Parse User-Agent into human-readable device name and platform
export function parseUserAgent(ua: string): { deviceName: string; platform: string } {
  if (!ua) return { deviceName: 'Dispositivo desconocido', platform: 'Web' }

  let platform = 'Web'
  if (/iPhone/i.test(ua))                               platform = 'iOS'
  else if (/iPad/i.test(ua))                            platform = 'iPadOS'
  else if (/Android/i.test(ua))                         platform = 'Android'
  else if (/Macintosh|MacIntel/i.test(ua))              platform = 'macOS'
  else if (/Windows/i.test(ua))                         platform = 'Windows'
  else if (/Linux/i.test(ua))                           platform = 'Linux'

  let deviceName = platform
  const iphoneMatch  = ua.match(/iPhone OS ([\d_]+)/)
  const androidMatch = ua.match(/Android ([\d.]+)/)
  const chromeMatch  = ua.match(/Chrome\/([\d]+)/)
  const safariMatch  = ua.match(/Version\/([\d]+).*Safari/)

  if (iphoneMatch)       deviceName = `iPhone (iOS ${iphoneMatch[1].replace(/_/g, '.')})`
  else if (/iPad/i.test(ua)) deviceName = `iPad`
  else if (androidMatch) deviceName = `Android ${androidMatch[1]}`
  else if (safariMatch)  deviceName = `Safari ${safariMatch[1]}`
  else if (chromeMatch)  deviceName = `Chrome ${chromeMatch[1]}`

  return { deviceName, platform }
}
