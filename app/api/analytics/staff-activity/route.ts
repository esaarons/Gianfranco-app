import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET() {
  const supabase = await createClient()

  const since = new Date(Date.now() - 15 * 60 * 1000).toISOString()

  const { data: logs, error } = await supabase
    .from('activity_logs')
    .select('user_id, created_at, action')
    .gte('created_at', since)
    .order('created_at', { ascending: false })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Most recent log per user within the 15-min window
  const byUser = new Map<string, { user_id: string; created_at: string; action: string }>()
  for (const log of (logs ?? [])) {
    if (!byUser.has(log.user_id)) {
      byUser.set(log.user_id, log)
    }
  }

  const now = Date.now()
  const users = Array.from(byUser.values()).map(log => {
    const ageMin = (now - new Date(log.created_at).getTime()) / 60000
    return {
      user_id:     log.user_id,
      last_action: log.action,
      last_seen:   log.created_at,
      status:      ageMin < 5 ? 'active' : 'absent',
    }
  })

  const active = users.filter(u => u.status === 'active').length
  const absent = users.filter(u => u.status === 'absent').length

  return NextResponse.json({ active, absent, total: users.length, users })
}
