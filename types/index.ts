// ─── Roles & Areas ───────────────────────────────────────────────────────────

// Roles legacy (bar, kitchen, salon) mantenidos para compatibilidad con DB existente
export type UserRole =
  | 'admin'
  | 'encargado'
  | 'barista'
  | 'servicio'
  | 'caja'
  | 'delivery'
  | 'salon'     // legacy
  | 'bar'       // legacy
  | 'kitchen'   // legacy

export type AreaType = 'bar' | 'kitchen' | 'salon' | 'delivery' | 'admin'

export interface Area {
  id: string
  name: string
  type: AreaType
}

export interface User {
  id: string
  name: string
  email: string
  role: UserRole
  pin?: string
  active: boolean
  created_at: string
  last_login?: string | null
  areas?: Area[]
}

// ─── Tables ──────────────────────────────────────────────────────────────────

export type TableStatus = 'free' | 'occupied' | 'cleaning'
export type TableZone = 'salon1' | 'salon2' | 'terrace'

export interface Table {
  id: string
  code: string
  zone: TableZone
  capacity: number
  status: TableStatus
  parent_table_id: string | null
  active: boolean
  updated_at: string
}

// ─── Products ────────────────────────────────────────────────────────────────

export interface Category {
  id: string
  name: string
  sort_order: number
  active: boolean
}

export type StockStatus = 'available' | 'low' | 'out'

export interface Product {
  id: string
  name: string
  category_id: string
  primary_area_id: string
  price: number
  description?: string
  active: boolean
  is_favorite: boolean
  sort_order: number
  image_url?: string | null
  product_type?: 'standard' | 'breakfast' | 'ice_cream'
  stock_status?: StockStatus
  category?: Category
  primary_area?: Area
}

export interface Modifier {
  id: string
  name: string
  price: number
  modifier_group: string
  active: boolean
}

// ─── Orders ──────────────────────────────────────────────────────────────────

export type OrderType = 'table' | 'delivery' | 'takeaway' | 'task'
export type OrderStatus = 'open' | 'in_progress' | 'closed' | 'cancelled'

export interface Order {
  id: string
  type: OrderType
  table_id: string | null
  status: OrderStatus
  total: number
  created_by: string
  notes?: string
  created_at: string
  closed_at?: string
  table?: Table
  items?: OrderItem[]
  area_cards?: { id: string; status: CardStatus; area_id: string }[]
}

export interface OrderItem {
  id: string
  order_id: string
  product_id: string
  quantity: number
  unit_price: number
  area_id: string
  notes?: string
  guest_label?: string | null
  product?: Product
  area?: Area
  modifiers?: OrderItemModifier[]
}

export interface OrderItemModifier {
  id: string
  order_item_id: string
  modifier_id: string
  price: number
  modifier?: Modifier
}

// ─── Area Cards ──────────────────────────────────────────────────────────────

export type CardStatus = 'pending' | 'received' | 'delivered'

export interface AreaCard {
  id: string
  order_id: string | null
  area_id: string
  status: CardStatus
  assigned_to: string | null
  title: string | null
  notes: string | null
  created_at: string
  received_at: string | null
  delivered_at: string | null
  // Migration 013 fields (nullable, added via ALTER TABLE)
  operator_note?: string | null
  delay_minutes?: number | null
  delay_reason?: string | null
  delay_set_at?: string | null
  order?: Order
  area?: Area
  assignee?: User
}

// ─── Cart (UI state only) ─────────────────────────────────────────────────────

export interface CartItem {
  productId: string
  productName: string
  quantity: number
  unitPrice: number
  areaId: string
  areaType: AreaType
  notes?: string
  guestName?: string    // per-person ordering — UI-only, not persisted
  comboKey?: string     // UUID linking all items from the same combo (e.g. breakfast)
  comboRole?: 'main' | 'bar_included'  // main = priced item; bar_included = $0 bar component
  modifiers: Array<{
    modifierId: string
    name: string
    price: number
  }>
}

// ─── Shifts & Analytics ───────────────────────────────────────────────────────

export interface ShiftAreaStat {
  area_id:          string
  area_name:        string
  area_type:        string
  cards:            number
  avg_reaction_min: number | null
  avg_prep_min:     number | null
  avg_total_min:    number | null
}

export interface ShiftStaffStat {
  user_id:          string
  name:             string
  cards_handled:    number
  avg_reaction_min: number | null
}

export interface ShiftHourlyLoad {
  hour:         number
  cards:        number
  avg_prep_min: number | null
}

export interface ShiftSummary {
  period:               { from: string; to: string }
  cards_total:          number
  orders_closed:        number
  avg_reaction_time_min: number | null
  avg_prep_time_min:    number | null
  avg_total_time_min:   number | null
  avg_table_cycle_min:  number | null
  by_area:              ShiftAreaStat[]
  by_staff:             ShiftStaffStat[]
  hourly_load:          ShiftHourlyLoad[]
}

export interface Shift {
  id:          string
  started_at:  string
  ended_at:    string | null
  started_by:  string | null
  ended_by:    string | null
  notes:       string | null
  summary:     ShiftSummary | null
  started_by_user?: { id: string; name: string } | null
  ended_by_user?:   { id: string; name: string } | null
}

export interface RealtimeAreaStat {
  area_type:    string
  pending:      number
  avg_wait_min: number | null
}

export interface RealtimeAlert {
  type:        string
  area?:       string
  card_id?:    string
  table_code?: string
  minutes:     number
}

export interface RealtimeKPIs {
  timestamp:          string
  tables_occupied:    number
  tables_total:       number
  longest_table_min:  number
  area_stats:         RealtimeAreaStat[]
  alerts:             RealtimeAlert[]
}

// ─── Auth ────────────────────────────────────────────────────────────────────

export interface AuthSession {
  user: User
  token: string
}

// ─── Activity Logs ───────────────────────────────────────────────────────────

export type LogAction =
  | 'login' | 'logout'
  | 'order_created' | 'order_modified' | 'order_closed' | 'order_cancelled'
  | 'item_added' | 'item_removed' | 'item_modified'
  | 'card_status_changed'
  | 'table_opened' | 'table_freed' | 'table_joined' | 'table_moved'
  | 'product_created' | 'product_modified'
  | 'user_created' | 'user_modified'
  | 'reservation_created' | 'reservation_modified' | 'reservation_cancelled'

export interface ActivityLog {
  id: string
  user_id: string | null
  action: LogAction
  area_id?: string | null
  table_id?: string | null
  order_id?: string | null
  product_id?: string | null
  old_state?: string | null
  new_state?: string | null
  metadata?: Record<string, unknown> | null
  created_at: string
  user?: User
  area?: Area
}

// ─── Reservations ────────────────────────────────────────────────────────────

export type ReservationStatus =
  | 'pending' | 'confirmed' | 'in_progress' | 'finished' | 'cancelled' | 'no_show'

export interface Reservation {
  id: string
  customer_name: string
  customer_phone?: string | null
  date: string
  start_time: string
  end_time: string
  party_size: number
  zone?: TableZone
  menu_type?: 'brunch' | 'simple' | null
  status: ReservationStatus
  notes?: string | null
  created_by?: string | null
  created_at: string
  tables?: Table[]
  creator?: User
}
