import type { SupabaseClient } from '@supabase/supabase-js'
import type { ShiftSummary } from '@/types'

const diffMin = (a: string, b: string) =>
  (new Date(b).getTime() - new Date(a).getTime()) / 60000

const avg = (arr: number[]) =>
  arr.length ? arr.reduce((s, v) => s + v, 0) / arr.length : null

// ── Computes the shift summary and closes the shift record ────────────────────

export async function computeAndCloseShift(
  supabase: SupabaseClient,
  shiftId:  string,
  startedAt: string,
  endedBy:  string | null,
): Promise<{ data: unknown; error: unknown }> {
  const endedAt = new Date().toISOString()

  const [cardsResult, ordersResult] = await Promise.all([
    supabase
      .from('area_cards')
      .select('id, area_id, created_at, received_at, delivered_at, received_by, delivered_by, area:areas(id,name,type)')
      .gte('created_at', startedAt)
      .lte('created_at', endedAt)
      .not('delivered_at', 'is', null),
    supabase
      .from('orders')
      .select('id, created_at, closed_at')
      .gte('created_at', startedAt)
      .lte('created_at', endedAt)
      .not('closed_at', 'is', null),
  ])

  const cards  = cardsResult.data  ?? []
  const orders = ordersResult.data ?? []

  const reactionTimes = cards.filter(c => c.received_at).map(c => diffMin(c.created_at, c.received_at))
  const prepTimes     = cards.filter(c => c.received_at && c.delivered_at).map(c => diffMin(c.received_at, c.delivered_at))
  const totalTimes    = cards.filter(c => c.delivered_at).map(c => diffMin(c.created_at, c.delivered_at))

  // By area
  const areaMap: Record<string, { id: string; name: string; type: string; reactions: number[]; preps: number[]; totals: number[] }> = {}
  for (const c of cards) {
    const area = c.area as unknown as { id: string; name: string; type: string } | null
    if (!area) continue
    if (!areaMap[area.id]) areaMap[area.id] = { id: area.id, name: area.name, type: area.type, reactions: [], preps: [], totals: [] }
    if (c.received_at)                    areaMap[area.id].reactions.push(diffMin(c.created_at, c.received_at))
    if (c.received_at && c.delivered_at) areaMap[area.id].preps.push(diffMin(c.received_at, c.delivered_at))
    if (c.delivered_at)                  areaMap[area.id].totals.push(diffMin(c.created_at, c.delivered_at))
  }

  const by_area = Object.values(areaMap).map(a => ({
    area_id:          a.id,
    area_name:        a.name,
    area_type:        a.type,
    cards:            a.totals.length,
    avg_reaction_min: avg(a.reactions),
    avg_prep_min:     avg(a.preps),
    avg_total_min:    avg(a.totals),
  }))

  // By staff
  const staffMap: Record<string, { user_id: string; reactions: number[]; deliveries: number[] }> = {}
  for (const c of cards) {
    if (c.received_by && c.received_at) {
      const uid = c.received_by as string
      if (!staffMap[uid]) staffMap[uid] = { user_id: uid, reactions: [], deliveries: [] }
      staffMap[uid].reactions.push(diffMin(c.created_at, c.received_at))
    }
    if (c.delivered_by) {
      const uid = c.delivered_by as string
      if (!staffMap[uid]) staffMap[uid] = { user_id: uid, reactions: [], deliveries: [] }
      staffMap[uid].deliveries.push(1)
    }
  }

  const staffIds = Object.keys(staffMap)
  let userNames: Record<string, string> = {}
  if (staffIds.length > 0) {
    const { data: users } = await supabase.from('users').select('id, name').in('id', staffIds)
    for (const u of users ?? []) userNames[u.id] = u.name
  }

  const by_staff = Object.values(staffMap).map(s => ({
    user_id:          s.user_id,
    name:             userNames[s.user_id] ?? 'Desconocido',
    cards_handled:    s.deliveries.length,
    avg_reaction_min: avg(s.reactions),
  }))

  // Hourly load
  const hourMap: Record<number, { cards: number; preps: number[] }> = {}
  for (const c of cards) {
    const h = new Date(c.created_at).getHours()
    if (!hourMap[h]) hourMap[h] = { cards: 0, preps: [] }
    hourMap[h].cards++
    if (c.received_at && c.delivered_at) hourMap[h].preps.push(diffMin(c.received_at, c.delivered_at))
  }

  const hourly_load = Object.entries(hourMap)
    .sort(([a], [b]) => Number(a) - Number(b))
    .map(([hour, v]) => ({ hour: Number(hour), cards: v.cards, avg_prep_min: avg(v.preps) }))

  const cycleTimes = orders.filter(o => o.closed_at).map(o => diffMin(o.created_at, o.closed_at))

  const summary: ShiftSummary = {
    period:                { from: startedAt, to: endedAt },
    cards_total:           cards.length,
    orders_closed:         orders.length,
    avg_reaction_time_min: avg(reactionTimes),
    avg_prep_time_min:     avg(prepTimes),
    avg_total_time_min:    avg(totalTimes),
    avg_table_cycle_min:   avg(cycleTimes),
    by_area,
    by_staff,
    hourly_load,
  }

  const result = await supabase
    .from('shifts')
    .update({ ended_at: endedAt, ended_by: endedBy, summary })
    .eq('id', shiftId)
    .select()
    .single()

  return result
}
