// Gianfranco Coffee Roasters — Service Worker
// Handles Web Push notifications so they arrive even when the app is closed.
// iOS 16.4+: registered PWAs receive push through this SW.

const CACHE_NAME = 'gf-v1'

// ── Install / Activate ────────────────────────────────────────────────────────

self.addEventListener('install', () => self.skipWaiting())
self.addEventListener('activate', (e) => e.waitUntil(self.clients.claim()))

// ── Push handler ──────────────────────────────────────────────────────────────
// Payload shape (JSON):
// {
//   title: string          — short, shown as notification title
//   body:  string          — items list / message — what Siri reads
//   tag:   string          — deduplication key
//   url:   string          — page to open on click
//   level: 'info' | 'warning' | 'critical'
//   badge: number          — optional pending count
// }

self.addEventListener('push', (event) => {
  if (!event.data) return

  let payload
  try {
    payload = event.data.json()
  } catch {
    payload = { title: 'Gianfranco', body: event.data.text(), tag: 'gf-generic', url: '/', level: 'info' }
  }

  const { title, body, tag, url = '/', level = 'info', badge } = payload

  // Icon per level — all map to app icon but structured for future custom icons
  const icon  = '/icons/icon-192.png'
  const image = level === 'critical' ? undefined : undefined  // future: custom images

  // Vibration patterns via notification (Android) — iOS ignores these but fine
  const vibrateMap = {
    info:     [200],
    warning:  [200, 100, 200],
    critical: [300, 100, 300, 100, 300],
  }

  const options = {
    body,
    icon,
    badge: '/icons/icon-192.png',
    tag: tag ?? 'gf-push',
    renotify: true,          // re-alert even with same tag (new order = new sound)
    requireInteraction: level === 'critical',  // critical stays on screen until dismissed
    silent: false,           // let the OS play its default sound (+ our in-app audio)
    data: { url, level },
    vibrate: vibrateMap[level] ?? [200],
    // iOS 16.4+ honors these actions for quick-reply from lock screen
    actions: level !== 'info' ? [
      { action: 'open', title: 'Ver' },
    ] : [],
  }

  if (badge !== undefined) {
    // Badge API — supported on Android Chrome, silently ignored elsewhere
    self.navigator?.setAppBadge?.(badge).catch(() => {})
  }

  event.waitUntil(
    self.registration.showNotification(title, options)
  )
})

// ── Notification click ────────────────────────────────────────────────────────

self.addEventListener('notificationclick', (event) => {
  event.notification.close()

  const url = event.notification.data?.url ?? '/'

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      // Focus existing window if open
      for (const client of clientList) {
        if (client.url.includes(self.location.origin) && 'focus' in client) {
          client.focus()
          client.navigate?.(url)
          return
        }
      }
      // Otherwise open a new window
      if (self.clients.openWindow) return self.clients.openWindow(url)
    })
  )
})

// ── Notification close (badge clear on last notification dismissed) ───────────

self.addEventListener('notificationclose', () => {
  self.registration.getNotifications().then((notifications) => {
    if (notifications.length === 0) {
      self.navigator?.clearAppBadge?.().catch(() => {})
    }
  })
})
