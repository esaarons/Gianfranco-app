import webpush from 'web-push'
import { createClient } from '@/lib/supabase/server'

// Configure VAPID once at module load — server-side only
webpush.setVapidDetails(
  process.env.VAPID_SUBJECT!,
  process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!,
  process.env.VAPID_PRIVATE_KEY!,
)

export type PushLevel = 'info' | 'warning' | 'critical'

export interface PushPayload {
  title: string
  body:  string
  tag:   string
  url?:  string
  level?: PushLevel
  badge?: number
}

interface PushSub {
  endpoint: string
  p256dh:   string
  auth:     string
}

// Send to a single subscription — swallows 410/404 (expired) and removes them
async function sendOne(sub: PushSub & { id: string }, payload: PushPayload): Promise<boolean> {
  try {
    await webpush.sendNotification(
      { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
      JSON.stringify(payload),
      {
        TTL: 60,                               // 60s TTL — stale delivery is useless
        urgency: payload.level === 'critical' || payload.level === 'warning'
          ? 'high'
          : 'normal',
        topic: payload.tag,                    // collapses same-topic pushes on Android
      }
    )
    return true
  } catch (err: unknown) {
    // 410 Gone / 404 Not Found = subscription expired — clean up
    const status = (err as { statusCode?: number }).statusCode
    if (status === 410 || status === 404) {
      const supabase = await createClient()
      await supabase.from('push_subscriptions').delete().eq('id', sub.id)
    }
    return false
  }
}

// Send push to all subscribers that cover a given area_id
export async function sendPushToArea(areaId: string, payload: PushPayload) {
  const supabase = await createClient()

  const { data: subs } = await supabase
    .from('push_subscriptions')
    .select('id, endpoint, p256dh, auth')
    .contains('area_ids', [areaId])

  if (!subs?.length) return

  await Promise.allSettled(subs.map((s) => sendOne(s, payload)))
}

// Send push to a specific user (all their subscribed devices)
export async function sendPushToUser(userId: string, payload: PushPayload) {
  const supabase = await createClient()

  const { data: subs } = await supabase
    .from('push_subscriptions')
    .select('id, endpoint, p256dh, auth')
    .eq('user_id', userId)

  if (!subs?.length) return

  await Promise.allSettled(subs.map((s) => sendOne(s, payload)))
}
