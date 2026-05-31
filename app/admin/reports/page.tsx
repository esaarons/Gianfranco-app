'use client'

import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { cn } from '@/lib/utils'

// ── Types ─────────────────────────────────────────────────────────────────────
interface ShiftStat { orders: number; avgTime: number }

interface AnalyticsData {
  period: number
  totalOrders: number
  avgOrderTime: number
  peakHour: { hour: number; count: number }
  ordersByDay: { date: string; count: number }[]
  ordersByHour: { hour: number; count: number }[]
  stationTimes: { name: string; type: string; avgMinutes: number; count: number }[]
  topItems: { name: string; am: number; pm: number; weekend: number; total: number }[]
  slowestItems: { name: string; avgMinutes: number }[]
  shiftStats: { am: ShiftStat; pm: ShiftStat; weekend: ShiftStat }
}

const PERIODS = [
  { label: '7 días',  value: 7  },
  { label: '30 días', value: 30 },
  { label: '90 días', value: 90 },
]

function fmtHour(h: number) {
  if (h === 0)  return '12am'
  if (h < 12)   return `${h}am`
  if (h === 12) return '12pm'
  return `${h - 12}pm`
}

function fmtMins(m: number) {
  if (m < 1)  return '<1 min'
  if (m < 60) return `${m} min`
  const h = Math.floor(m / 60)
  const r = Math.round(m % 60)
  return r > 0 ? `${h}h ${r}m` : `${h}h`
}

// ── Heatmap ───────────────────────────────────────────────────────────────────
function Heatmap({ ordersByDay }: { ordersByDay: { date: string; count: number }[] }) {
  const max = Math.max(...ordersByDay.map((d) => d.count), 1)

  const weeks: typeof ordersByDay[] = []
  for (let i = 0; i < ordersByDay.length; i += 7) {
    weeks.push(ordersByDay.slice(i, i + 7))
  }

  const DOW = ['L', 'M', 'X', 'J', 'V', 'S', 'D']

  function cellColor(count: number) {
    if (count === 0) return '#EDE9E2'
    const intensity = count / max
    if (intensity < 0.25) return '#C9D9C2'
    if (intensity < 0.5)  return '#9DBF97'
    if (intensity < 0.75) return '#6D8A5C'
    return '#4A6B3E'
  }

  return (
    <div>
      <div className="flex gap-1.5 overflow-x-auto scrollbar-hide pb-1">
        <div className="flex flex-col gap-1 shrink-0 mr-0.5">
          {DOW.map((d) => (
            <div key={d} className="w-5 h-5 flex items-center justify-end">
              <span className="text-[9px] text-[#A9A39C] font-medium">{d}</span>
            </div>
          ))}
        </div>
        {weeks.map((week, wi) => {
          const firstDate = week[0]?.date
          const weekLabel = firstDate
            ? new Date(firstDate + 'T00:00:00').toLocaleDateString('es', { day: 'numeric', month: 'short' })
            : ''
          return (
            <div key={wi} className="flex flex-col gap-1 shrink-0">
              {DOW.map((_, di) => {
                const entry = week[di]
                if (!entry) return <div key={di} className="w-5 h-5" />
                return (
                  <div
                    key={di}
                    title={`${entry.date}: ${entry.count} pedidos`}
                    className="w-5 h-5 rounded-sm transition-all"
                    style={{ background: cellColor(entry.count) }}
                  />
                )
              })}
              <span className="text-[8px] text-[#A9A39C] text-center mt-0.5 leading-none">{weekLabel}</span>
            </div>
          )
        })}
      </div>
      <div className="flex items-center gap-2 mt-3">
        <span className="text-[9px] text-[#A9A39C]">Menos</span>
        {[0, 0.25, 0.5, 0.75, 1].map((i) => (
          <div key={i} className="w-3.5 h-3.5 rounded-sm" style={{ background: cellColor(Math.round(i * max)) }} />
        ))}
        <span className="text-[9px] text-[#A9A39C]">Más</span>
      </div>
    </div>
  )
}

// ── Bar chart (hourly) ────────────────────────────────────────────────────────
function HourlyChart({ ordersByHour }: { ordersByHour: { hour: number; count: number }[] }) {
  const max = Math.max(...ordersByHour.map((h) => h.count), 1)

  function barColor(hour: number) {
    if (hour >= 7  && hour < 14) return '#C98933'
    if (hour >= 14 && hour <= 21) return '#4A7FA5'
    return '#D4CFC5'
  }

  return (
    <div className="flex items-end gap-0.5 h-28">
      {ordersByHour.map(({ hour, count }) => {
        const pct = count === 0 ? 2 : Math.max(4, Math.round((count / max) * 100))
        return (
          <div key={hour} className="flex-1 flex flex-col items-center gap-1 group">
            <div
              className="w-full rounded-t-sm transition-all duration-500"
              style={{ height: `${pct}%`, background: barColor(hour), opacity: count === 0 ? 0.18 : 1 }}
              title={`${fmtHour(hour)}: ${count} pedidos`}
            />
            {(hour % 3 === 0) && (
              <span className="text-[8px] text-[#A9A39C] leading-none shrink-0">{fmtHour(hour)}</span>
            )}
          </div>
        )
      })}
    </div>
  )
}

// ── Horizontal bar ────────────────────────────────────────────────────────────
function HBar({ label, value, max, color, sub }: {
  label: string; value: number; max: number; color: string; sub?: string
}) {
  const pct = max > 0 ? Math.max(2, (value / max) * 100) : 2
  return (
    <div className="flex items-center gap-3">
      <div className="flex-1 min-w-0">
        <p className="text-[#1F1F1F] text-xs font-semibold truncate">{label}</p>
        {sub && <p className="text-[#A9A39C] text-[10px]">{sub}</p>}
      </div>
      <div className="w-28 shrink-0">
        <div className="h-2 bg-[#EDE9E2] rounded-full overflow-hidden">
          <div className="h-full rounded-full transition-all duration-700" style={{ width: `${pct}%`, background: color }} />
        </div>
      </div>
      <span className="text-[#1F1F1F] text-xs font-bold shrink-0 w-12 text-right">{fmtMins(value)}</span>
    </div>
  )
}

// ── Top items list ────────────────────────────────────────────────────────────
function TopItemsList({
  items,
  field,
  color,
}: {
  items: AnalyticsData['topItems']
  field: 'am' | 'pm' | 'weekend'
  color: string
}) {
  const top = [...items].sort((a, b) => b[field] - a[field]).slice(0, 6)
  const max = Math.max(...top.map((i) => i[field]), 1)
  return (
    <div className="space-y-2.5">
      {top.map((item, idx) => {
        const pct = Math.max(3, (item[field] / max) * 100)
        return (
          <div key={item.name} className="flex items-center gap-2.5">
            <span className="text-[10px] text-[#A9A39C] font-bold w-4 shrink-0">{idx + 1}</span>
            <div className="flex-1 min-w-0">
              <p className="text-[#1F1F1F] text-xs font-semibold truncate">{item.name}</p>
              <div className="mt-1 h-1.5 bg-[#EDE9E2] rounded-full overflow-hidden">
                <div className="h-full rounded-full transition-all duration-700" style={{ width: `${pct}%`, background: color }} />
              </div>
            </div>
            <span className="text-xs font-bold shrink-0" style={{ color }}>{item[field]}</span>
          </div>
        )
      })}
    </div>
  )
}

// ── KPI card — large number + context ────────────────────────────────────────
function KpiCard({ label, value, sub, accent, icon }: {
  label: string; value: string; sub?: string; accent?: string; icon?: string
}) {
  return (
    <div className="bg-white rounded-2xl px-4 py-4 border border-[#E7E1D8] card-shadow">
      {icon && <p className="text-xl mb-2">{icon}</p>}
      <p className="section-label mb-1.5">{label}</p>
      <p className="text-[28px] font-bold tracking-tight leading-none" style={{ color: accent ?? '#1E3541' }}>{value}</p>
      {sub && <p className="text-[#A9A39C] text-[11px] mt-1.5 leading-snug">{sub}</p>}
    </div>
  )
}

// ── Shift row ─────────────────────────────────────────────────────────────────
function ShiftRow({ label, hours, orders, avgTime, color, max }: {
  label: string; hours: string; orders: number; avgTime: number; color: string; max: number
}) {
  const pct = max > 0 ? Math.round((orders / max) * 100) : 0
  return (
    <div className="flex items-start gap-3">
      <div className="w-2 h-2 rounded-full mt-1.5 shrink-0" style={{ background: color }} />
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between mb-0.5">
          <div className="flex items-baseline gap-1.5">
            <span className="text-[#1F1F1F] text-xs font-semibold">{label}</span>
            <span className="text-[#A9A39C] text-[10px]">{hours}</span>
          </div>
          <span className="text-[#1F1F1F] text-xs font-bold shrink-0 ml-2">
            {orders} ped.
          </span>
        </div>
        <div className="h-1.5 bg-[#EDE9E2] rounded-full overflow-hidden">
          <div className="h-full rounded-full transition-all duration-700" style={{ width: `${pct}%`, background: color }} />
        </div>
        <p className="text-[#A9A39C] text-[10px] mt-0.5 text-right">
          {avgTime > 0 ? `Ø ${fmtMins(avgTime)} / pedido` : '—'}
        </p>
      </div>
    </div>
  )
}

// ── Page ──────────────────────────────────────────────────────────────────────
export default function ReportsPage() {
  const [period, setPeriod] = useState(30)

  const { data, isLoading } = useQuery<AnalyticsData>({
    queryKey: ['analytics', period],
    queryFn: async () => {
      const res = await fetch(`/api/analytics?period=${period}`)
      if (!res.ok) throw new Error('Error cargando métricas')
      return res.json()
    },
    staleTime: 60000,
  })

  const stationMax = data ? Math.max(...data.stationTimes.map((s) => s.avgMinutes), 1) : 1
  const slowestMax = data ? Math.max(...data.slowestItems.map((s) => s.avgMinutes), 1) : 1
  const shiftMax   = data?.shiftStats
    ? Math.max(data.shiftStats.am.orders, data.shiftStats.pm.orders, data.shiftStats.weekend.orders, 1)
    : 1

  return (
    <div className="min-h-screen bg-[#F7F5F0]">

      {/* Dark hero header */}
      <div className="bg-[#1E3541] px-5 pt-8 pb-6">
        <p className="section-label text-[#6D9EAA] mb-2">Inteligencia Operacional</p>
        <h1 className="text-white text-2xl font-bold tracking-tight">Métricas</h1>
        <p className="text-[#9BBAC4] text-xs mt-1">Flujo de trabajo · Rendimiento · Cuellos de botella</p>

        {/* Period selector inside header */}
        <div className="flex gap-2 mt-4">
          {PERIODS.map((p) => (
            <button
              key={p.value}
              onClick={() => setPeriod(p.value)}
              className={cn(
                'px-4 py-2 rounded-xl text-xs font-bold transition-all press-scale',
                period === p.value
                  ? 'bg-white text-[#1E3541]'
                  : 'bg-white/10 text-white/70 border border-white/15'
              )}
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>

      {isLoading ? (
        <div className="flex flex-col items-center py-20 gap-3">
          <div className="w-8 h-8 border-2 border-[#E7E1D8] border-t-[#1E3541] rounded-full animate-spin" />
          <p className="text-[#7A756D] text-sm">Calculando métricas…</p>
        </div>
      ) : !data ? null : (
        <div className="px-4 space-y-4 pb-12 pt-4">

          {/* ── KPI grid ── */}
          <div className="grid grid-cols-2 gap-3">
            <KpiCard
              icon="📋"
              label="Pedidos totales"
              value={String(data.totalOrders)}
              sub={`en los últimos ${data.period} días`}
              accent="#1E3541"
            />
            <KpiCard
              icon="⏱"
              label="Tiempo promedio"
              value={fmtMins(data.avgOrderTime)}
              sub="por pedido, apertura → cierre"
              accent="#6D8A5C"
            />
            <KpiCard
              icon="🔥"
              label="Hora pico"
              value={fmtHour(data.peakHour.hour)}
              sub={`${data.peakHour.count} pedidos en esa hora`}
              accent="#C98933"
            />
            <KpiCard
              icon="🏪"
              label="Estaciones"
              value={String(data.stationTimes.length)}
              sub={data.stationTimes.map((s) => s.name).join(' · ') || 'Sin datos aún'}
              accent="#4A7FA5"
            />
          </div>

          {/* ── Turnos ── */}
          {data.shiftStats && (
            <div className="bg-white rounded-2xl p-4 border border-[#E7E1D8] card-shadow">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <p className="text-[#1F1F1F] text-sm font-bold">Pedidos por turno</p>
                  <p className="text-[#7A756D] text-xs mt-0.5">Volumen y velocidad promedio</p>
                </div>
                <span className="text-[10px] font-bold bg-[#EDE9E2] text-[#7A756D] px-2.5 py-1 rounded-full uppercase tracking-wider">
                  {data.period}d
                </span>
              </div>
              <div className="space-y-4">
                <ShiftRow
                  label="Turno AM"
                  hours="L–V · 7:30–14:00"
                  orders={data.shiftStats.am.orders}
                  avgTime={data.shiftStats.am.avgTime}
                  color="#C98933"
                  max={shiftMax}
                />
                <div className="h-px bg-[#EDE9E2]" />
                <ShiftRow
                  label="Turno PM"
                  hours="L–V · 14:00–21:30"
                  orders={data.shiftStats.pm.orders}
                  avgTime={data.shiftStats.pm.avgTime}
                  color="#4A7FA5"
                  max={shiftMax}
                />
                <div className="h-px bg-[#EDE9E2]" />
                <ShiftRow
                  label="Fin de semana"
                  hours="Sa–Do · 8:00–21:30"
                  orders={data.shiftStats.weekend.orders}
                  avgTime={data.shiftStats.weekend.avgTime}
                  color="#6D8A5C"
                  max={shiftMax}
                />
              </div>
            </div>
          )}

          {/* ── Actividad por hora ── */}
          <div className="bg-white rounded-2xl p-4 border border-[#E7E1D8] card-shadow">
            <div className="mb-4">
              <p className="text-[#1F1F1F] text-sm font-bold">Actividad por hora</p>
              <p className="text-[#7A756D] text-xs mt-0.5">Distribución de pedidos a lo largo del día</p>
            </div>
            <HourlyChart ordersByHour={data.ordersByHour} />
            <div className="flex gap-4 mt-3">
              {[
                { label: 'AM (7:30–14h)', color: '#C98933' },
                { label: 'PM (14–21:30h)', color: '#4A7FA5' },
              ].map((l) => (
                <div key={l.label} className="flex items-center gap-1.5">
                  <div className="w-2.5 h-2.5 rounded-sm" style={{ background: l.color }} />
                  <span className="text-[10px] text-[#7A756D]">{l.label}</span>
                </div>
              ))}
            </div>
          </div>

          {/* ── Termómetro semanal ── */}
          <div className="bg-white rounded-2xl p-4 border border-[#E7E1D8] card-shadow">
            <div className="flex items-center justify-between mb-4">
              <div>
                <p className="text-[#1F1F1F] text-sm font-bold">Termómetro semanal</p>
                <p className="text-[#7A756D] text-xs mt-0.5">Volumen de pedidos por día</p>
              </div>
            </div>
            <Heatmap ordersByDay={data.ordersByDay} />
          </div>

          {/* ── Rendimiento por estación ── */}
          {data.stationTimes.length > 0 && (
            <div className="bg-white rounded-2xl p-4 border border-[#E7E1D8] card-shadow">
              <div className="mb-4">
                <p className="text-[#1F1F1F] text-sm font-bold">Rendimiento por estación</p>
                <p className="text-[#7A756D] text-xs mt-0.5">Tiempo promedio desde comanda hasta entrega</p>
              </div>
              <div className="space-y-3">
                {data.stationTimes.map((s) => (
                  <HBar
                    key={s.name}
                    label={s.name}
                    value={s.avgMinutes}
                    max={stationMax}
                    color={s.type === 'bar' ? '#6D8A5C' : '#B8574E'}
                    sub={`${s.count} comandas`}
                  />
                ))}
              </div>
            </div>
          )}

          {/* ── Turno AM vs PM ── */}
          {data.topItems.length > 0 && (
            <div className="bg-white rounded-2xl p-4 border border-[#E7E1D8] card-shadow">
              <div className="mb-4">
                <p className="text-[#1F1F1F] text-sm font-bold">Turno AM vs Turno PM</p>
                <p className="text-[#7A756D] text-xs mt-0.5">Qué se vende más en cada turno</p>
              </div>
              <div className="grid grid-cols-2 gap-5">
                <div>
                  <div className="flex items-center gap-2 mb-3">
                    <div className="w-2 h-2 rounded-full bg-[#C98933]" />
                    <span className="section-label">AM</span>
                  </div>
                  <TopItemsList items={data.topItems} field="am" color="#C98933" />
                </div>
                <div>
                  <div className="flex items-center gap-2 mb-3">
                    <div className="w-2 h-2 rounded-full bg-[#4A7FA5]" />
                    <span className="section-label">PM</span>
                  </div>
                  <TopItemsList items={data.topItems} field="pm" color="#4A7FA5" />
                </div>
              </div>
            </div>
          )}

          {/* ── Items más lentos ── */}
          {data.slowestItems.length > 0 && (
            <div className="bg-white rounded-2xl p-4 border border-[#E7E1D8] card-shadow">
              <div className="mb-4">
                <p className="text-[#1F1F1F] text-sm font-bold">Cuello de botella</p>
                <p className="text-[#7A756D] text-xs mt-0.5">Items con mayor tiempo de preparación</p>
              </div>
              <div className="space-y-3">
                {data.slowestItems.map((item, i) => (
                  <div key={item.name} className="flex items-center gap-3">
                    <span className="text-[10px] text-[#A9A39C] font-bold w-4 shrink-0">{i + 1}</span>
                    <HBar label={item.name} value={item.avgMinutes} max={slowestMax} color="#B8574E" />
                  </div>
                ))}
              </div>
              <p className="text-[#A9A39C] text-[10px] mt-4">
                * Basado en tiempo de comanda por estación. Mínimo 2 muestras.
              </p>
            </div>
          )}

          {data.slowestItems.length === 0 && data.stationTimes.length === 0 && (
            <div className="bg-white rounded-2xl p-8 border border-[#E7E1D8] card-shadow flex flex-col items-center text-center">
              <div className="w-12 h-12 rounded-2xl bg-[#F7F5F0] flex items-center justify-center text-2xl mb-3">📊</div>
              <p className="text-[#1F1F1F] text-sm font-semibold">Sin suficientes datos aún</p>
              <p className="text-[#A9A39C] text-xs mt-1.5 max-w-[220px]">Las métricas se generan a medida que se completan pedidos</p>
            </div>
          )}

        </div>
      )}
    </div>
  )
}
