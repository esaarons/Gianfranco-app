import { createClient } from '@/lib/supabase/server'
import type { LogAction } from '@/types'

interface LogParams {
  userId:     string
  action:     LogAction
  areaId?:    string
  tableId?:   string
  orderId?:   string
  productId?: string
  oldState?:  string
  newState?:  string
  metadata?:  Record<string, unknown>
}

// Fire-and-forget — nunca bloquea la respuesta HTTP
export async function createLog(params: LogParams): Promise<void> {
  try {
    const supabase = await createClient()
    await supabase.from('activity_logs').insert({
      user_id:    params.userId,
      action:     params.action,
      area_id:    params.areaId    ?? null,
      table_id:   params.tableId   ?? null,
      order_id:   params.orderId   ?? null,
      product_id: params.productId ?? null,
      old_state:  params.oldState  ?? null,
      new_state:  params.newState  ?? null,
      metadata:   params.metadata  ?? null,
    })
  } catch {
    // El log nunca debe romper el flujo principal
  }
}
