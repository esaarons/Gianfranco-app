import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const from = searchParams.get('from')
  const to   = searchParams.get('to') ?? new Date().toISOString()

  if (!from) return NextResponse.json({ error: 'Param "from" required' }, { status: 400 })

  const supabase = await createClient()

  const [cardsResult, ordersResult] = await Promise.all([
    supabase
      .from('area_cards')
      .select(`
        id, area_id, created_at, received_at, delivered_at,
        received_by, delivered_by,
        area:areas(id,name,type),
        received_by_user:users!area_cards_received_by_fkey(id,name),
        delivered_by_user:users!area_cards_delivered_by_fkey(id,name)
      `)
      .gte('created_at', from)
      .lte('created_at', to)
      .not('delivered_at', 'is', null),
    supabase
      .from('orders')
      .select('id, created_at, closed_at')
      .gte('created_at', from)
      .lte('created_at', to)
      .not('closed_at', 'is', null),
  ])

  const cards  = cardsResult.data  ?? []
  const orders = ordersResult.data ?? []

  const diffMin = (a: string, b: string) => (new Date(b).getTime() - new Date(a).getTime()) / 60000
  const avg = (arr: number[]) => arr.length ? arr.reduce((s, v) => s + v, 0) / arr.length : null

  // Overall
  const reactionTimes = cards.filter(c => c.received_at).map(c => diffMin(c.created_at, c.received_at))
  const prepTimes     = cards.filter(c => c.received_at && c.delivered_at).map(c => diffMin(c.received_at, c.delivered_at))
  const totalTimes    = cards.map(c => diffMin(c.created_at, c.delivered_at))
  const cycleTimes    = orders.map(o => diffMin(o.created_at, o.closed_at))

  // By area
  const areaMap: Record<string, { id: string; name: string; type: string; reactions: number[]; preps: number[]; totals: number[] }> = {}
  for (const c of cards) {
    const area = c.area as unknown as { id: string; name: string; type: string } | null
    if (!area) continue
    if (!areaMap[area.id]) areaMap[area.id] = { id: area.id, name: area.name, type: area.type, reactions: [], preps: [], totals: [] }
    if (c.received_at)                     areaMap[area.id].reactions.push(diffMin(c.created_at, c.received_at))
    if (c.received_at && c.delivered_at)   areaMap[area.id].preps.push(diffMin(c.received_at, c.delivered_at))
    areaMap[area.id].totals.push(diffMin(c.created_at, c.delivered_at))
  }

  // By staff
  const staffMap: Record<string, { id: string; name: string; reactions: number[]; deliveries: number }> = {}
  for (const c of cards) {
    const receiver  = c.received_by_user  as unknown as { id: string; name: string } | null
    const deliverer = c.delivered_by_user as unknown as { id: string; name: string } | null
    if (receiver && c.received_at) {
      if (!staffMap[receiver.id]) staffMap[receiver.id] = { id: receiver.id, name: receiver.name, reactions: [], deliveries: 0 }
      staffMap[receiver.id].reactions.push(diffMin(c.created_at, c.received_at))
    }
    if (deliverer) {
      if (!staffMap[deliverer.id]) staffMap[deliverer.id] = { id: deliverer.id, name: deliverer.name, reactions: [], deliveries: 0 }
      staffMap[deliverer.id].deliveries++
    }
  }

  // Hourly load
  const hourMap: Record<number, { cards: number; preps: number[] }> = {}
  for (const c of cards) {
    const h = new Date(c.created_at).getHours()
    if (!hourMap[h]) hourMap[h] = { cards: 0, preps: [] }
    hourMap[h].cards++
    if (c.received_at && c.delivered_at) hourMap[h].preps.push(diffMin(c.received_at, c.delivered_at))
  }

  return NextResponse.json({
    period:               { from, to },
    cards_total:          cards.length,
    orders_closed:        orders.length,
    avg_reaction_time_min: avg(reactionTimes),
    avg_prep_time_min:    avg(prepTimes),
    avg_total_time_min:   avg(totalTimes),
    avg_table_cycle_min:  avg(cycleTimes),
    by_area: Object.values(areaMap).map(a => ({
      area_id:          a.id,
      area_name:        a.name,
      area_type:        a.type,
      cards:            a.totals.length,
      avg_reaction_min: avg(a.reactions),
      avg_prep_min:     avg(a.preps),
      avg_total_min:    avg(a.totals),
    })),
    by_staff: Object.values(staffMap)
      .sort((a, b) => (avg(a.reactions) ?? 999) - (avg(b.reactions) ?? 999))
      .map(s => ({
        user_id:          s.id,
        name:             s.name,
        cards_handled:    s.deliveries,
        avg_reaction_min: avg(s.reactions),
      })),
    hourly_load: Object.entries(hourMap)
      .sort(([a], [b]) => Number(a) - Number(b))
      .map(([hour, v]) => ({ hour: Number(hour), cards: v.cards, avg_prep_min: avg(v.preps) })),
  })
}
