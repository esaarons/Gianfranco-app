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
}

export interface OrderItem {
  id: string
  order_id: string
  product_id: string
  quantity: number
  unit_price: number
  area_id: string
  notes?: string
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
  modifiers: Array<{
    modifierId: string
    name: string
    price: number
  }>
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
