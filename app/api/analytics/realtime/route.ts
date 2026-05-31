import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

const ALERT_REACTION_MIN = 10  // card unattended threshold
const ALERT_TABLE_MIN    = 90  // table open too long threshold

export async function GET() {
  const supabase = await createClient()
  const now = new Date().toISOString()

  const [cardsResult, tablesResult, ordersResult] = await Promise.all([
    supabase
      .from('area_cards')
      .select('id, area_id, status, created_at, received_at, area:areas(id,name,type)')
      .in('status', ['pending', 'received']),
    supabase
      .from('tables')
      .select('id, code, status'),
    supabase
      .from('orders')
      .select('id, table_id, created_at, status')
      .eq('status', 'open'),
  ])

  const cards  = cardsResult.data  ?? []
  const tables = tablesResult.data ?? []
  const orders = ordersResult.data ?? []

  const diffMin = (a: string, b: string) => (new Date(b).getTime() - new Date(a).getTime()) / 60000

  // Group pending cards by area
  const byArea: Record<string, { pending: number; waitMins: number[] }> = {}
  const alerts: Array<{ type: string; area?: string; card_id?: string; table_code?: string; minutes: number }> = []

  for (const c of cards) {
    const area = c.area as unknown as { id: string; name: string; type: string } | null
    if (!area) continue
    const key = area.type
    if (!byArea[key]) byArea[key] = { pending: 0, waitMins: [] }
    if (c.status === 'pending') {
      byArea[key].pending++
      const waited = diffMin(c.created_at, now)
      byArea[key].waitMins.push(waited)
      if (waited >= ALERT_REACTION_MIN) {
        alerts.push({ type: 'card_unattended', area: area.name, card_id: c.id, minutes: Math.round(waited) })
      }
    }
  }

  // Table metrics
  const occupiedTables = tables.filter(t => t.status === 'occupied')
  const totalTables    = tables.length

  // Match orders to tables to get cycle time
  let longestTableMin = 0
  for (const o of orders) {
    if (!o.table_id) continue
    const mins = diffMin(o.created_at, now)
    if (mins > longestTableMin) longestTableMin = mins
    if (mins >= ALERT_TABLE_MIN) {
      const table = tables.find(t => t.id === o.table_id)
      alerts.push({ type: 'table_long', table_code: table?.code ?? '?', minutes: Math.round(mins) })
    }
  }

  const avg = (arr: number[]) => arr.length ? arr.reduce((s, v) => s + v, 0) / arr.length : null

  const areaStats = Object.entries(byArea).map(([type, v]) => ({
    area_type:    type,
    pending:      v.pending,
    avg_wait_min: avg(v.waitMins),
  }))

  return NextResponse.json({
    timestamp:       now,
    tables_occupied: occupiedTables.length,
    tables_total:    tables.length,
    longest_table_min: longestTableMin > 0 ? Math.round(longestTableMin) : 0,
    area_stats:      areaStats,
    alerts,
  })
}
