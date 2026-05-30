import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// ── Shift helper ──────────────────────────────────────────────────────────────
// Weekdays (Mon–Fri):  AM 7:30–14:00 · PM 14:00–21:30
// Weekends (Sat–Sun):  8:00–21:30 (single shift)
function getShift(isoDate: string): 'am' | 'pm' | 'weekend' | 'off' {
  const d = new Date(isoDate)
  const dow  = d.getDay()                          // 0=Sun … 6=Sat
  const mins = d.getHours() * 60 + d.getMinutes()
  if (dow === 0 || dow === 6) {
    return mins >= 480 && mins < 1290 ? 'weekend' : 'off'  // 8:00–21:30
  }
  if (mins >= 450 && mins < 840)  return 'am'   // 7:30–14:00
  if (mins >= 840 && mins < 1290) return 'pm'   // 14:00–21:30
  return 'off'
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const period = parseInt(searchParams.get('period') ?? '30')
  const from = new Date(Date.now() - period * 86400000).toISOString()

  const supabase = await createClient()

  // ── Fetch raw data ─────────────────────────────────────────────────────────
  const { data: ordersRaw } = await supabase
    .from('orders')
    .select('id, created_at, closed_at, type, status')
    .gte('created_at', from)
    .order('created_at', { ascending: true })

  const orders: any[] = ordersRaw ?? []
  const closedOrders  = orders.filter((o) => o.closed_at)
  const orderIds      = orders.map((o) => o.id)

  const [{ data: items = [] }, { data: cards = [] }] = await Promise.all([
    orderIds.length
      ? supabase
          .from('order_items')
          .select('order_id, product_id, quantity, area_id, product:products(id, name)')
          .in('order_id', orderIds)
      : { data: [] as any[] },
    supabase
      .from('area_cards')
      .select('order_id, area_id, created_at, delivered_at, area:areas(id, name, type)')
      .not('delivered_at', 'is', null)
      .gte('created_at', from),
  ])

  // ── 1. Average order time (minutes, created_at → closed_at) ───────────────
  const avgOrderTime = closedOrders.length
    ? closedOrders.reduce((s: number, o: any) => {
        return s + (new Date(o.closed_at).getTime() - new Date(o.created_at).getTime()) / 60000
      }, 0) / closedOrders.length
    : 0

  // ── 2. Orders by day ──────────────────────────────────────────────────────
  const dayMap: Record<string, number> = {}
  for (let i = period - 1; i >= 0; i--) {
    const d = new Date(Date.now() - i * 86400000)
    dayMap[d.toISOString().slice(0, 10)] = 0
  }
  orders.forEach((o: any) => {
    const day = o.created_at.slice(0, 10)
    if (day in dayMap) dayMap[day]++
  })
  const ordersByDay = Object.entries(dayMap).map(([date, count]) => ({ date, count }))

  // ── 3. Orders by hour ─────────────────────────────────────────────────────
  const hourMap: number[] = Array(24).fill(0)
  orders.forEach((o: any) => {
    hourMap[new Date(o.created_at).getHours()]++
  })
  const ordersByHour = hourMap.map((count, hour) => ({ hour, count }))
  const peakHour = ordersByHour.reduce((best, cur) => cur.count > best.count ? cur : best, { hour: 0, count: 0 })

  // ── 4. Station times (avg delivered_at - created_at per area) ─────────────
  const stationAcc: Record<string, { name: string; type: string; total: number; count: number }> = {}
  ;(cards as any[]).forEach((c) => {
    if (!c.delivered_at || !c.area) return
    const mins = (new Date(c.delivered_at).getTime() - new Date(c.created_at).getTime()) / 60000
    const areaId = c.area_id
    if (!stationAcc[areaId]) stationAcc[areaId] = { name: c.area.name, type: c.area.type, total: 0, count: 0 }
    stationAcc[areaId].total += mins
    stationAcc[areaId].count++
  })
  const stationTimes = Object.values(stationAcc).map((s) => ({
    name: s.name,
    type: s.type,
    avgMinutes: s.count > 0 ? Math.round((s.total / s.count) * 10) / 10 : 0,
    count: s.count,
  }))

  // ── 5. Top items by shift (AM / PM / Weekend) ─────────────────────────────
  const itemAcc: Record<string, { name: string; am: number; pm: number; weekend: number; total: number }> = {}
  ;(items as any[]).forEach((item) => {
    const order = orders.find((o: any) => o.id === item.order_id)
    if (!order) return
    const shift = getShift((order as any).created_at)
    if (shift === 'off') return
    const pid  = item.product_id
    const name = (item.product as any)?.name ?? pid
    if (!itemAcc[pid]) itemAcc[pid] = { name, am: 0, pm: 0, weekend: 0, total: 0 }
    const qty = item.quantity
    itemAcc[pid][shift] += qty
    itemAcc[pid].total  += qty
  })
  const topItems = Object.values(itemAcc)
    .sort((a, b) => b.total - a.total)
    .slice(0, 10)

  // ── 6. Slowest items ──────────────────────────────────────────────────────
  const productTiming: Record<string, { name: string; totalMins: number; orderCount: number }> = {}
  ;(cards as any[]).forEach((c) => {
    if (!c.delivered_at) return
    const mins = (new Date(c.delivered_at).getTime() - new Date(c.created_at).getTime()) / 60000
    const relatedItems = (items as any[]).filter(
      (i) => i.order_id === c.order_id && i.area_id === c.area_id
    )
    relatedItems.forEach((item) => {
      const pid  = item.product_id
      const name = (item.product as any)?.name ?? pid
      if (!productTiming[pid]) productTiming[pid] = { name, totalMins: 0, orderCount: 0 }
      productTiming[pid].totalMins  += mins
      productTiming[pid].orderCount += 1
    })
  })
  const slowestItems = Object.values(productTiming)
    .filter((p) => p.orderCount >= 2)
    .map((p) => ({ name: p.name, avgMinutes: Math.round((p.totalMins / p.orderCount) * 10) / 10 }))
    .sort((a, b) => b.avgMinutes - a.avgMinutes)
    .slice(0, 8)

  // ── 7. Shift stats ────────────────────────────────────────────────────────
  const shiftAcc: Record<'am' | 'pm' | 'weekend', { orders: number; totalMins: number; closed: number }> = {
    am:      { orders: 0, totalMins: 0, closed: 0 },
    pm:      { orders: 0, totalMins: 0, closed: 0 },
    weekend: { orders: 0, totalMins: 0, closed: 0 },
  }
  orders.forEach((o: any) => {
    const shift = getShift(o.created_at)
    if (shift === 'off') return
    shiftAcc[shift].orders++
    if (o.closed_at) {
      shiftAcc[shift].totalMins += (new Date(o.closed_at).getTime() - new Date(o.created_at).getTime()) / 60000
      shiftAcc[shift].closed++
    }
  })
  const shiftStats = {
    am:      { orders: shiftAcc.am.orders,      avgTime: shiftAcc.am.closed      > 0 ? Math.round(shiftAcc.am.totalMins      / shiftAcc.am.closed      * 10) / 10 : 0 },
    pm:      { orders: shiftAcc.pm.orders,      avgTime: shiftAcc.pm.closed      > 0 ? Math.round(shiftAcc.pm.totalMins      / shiftAcc.pm.closed      * 10) / 10 : 0 },
    weekend: { orders: shiftAcc.weekend.orders, avgTime: shiftAcc.weekend.closed > 0 ? Math.round(shiftAcc.weekend.totalMins / shiftAcc.weekend.closed * 10) / 10 : 0 },
  }

  return NextResponse.json({
    period,
    totalOrders: orders.length,
    avgOrderTime:  Math.round(avgOrderTime * 10) / 10,
    peakHour,
    ordersByDay,
    ordersByHour,
    stationTimes,
    topItems,
    slowestItems,
    shiftStats,
  })
}
