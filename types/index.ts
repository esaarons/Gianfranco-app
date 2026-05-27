// ─── Roles & Areas ───────────────────────────────────────────────────────────

export type UserRole = 'admin' | 'salon' | 'bar' | 'kitchen'
export type AreaType = 'bar' | 'kitchen'

export interface User {
  id: string
  name: string
  email: string
  role: UserRole
  pin?: string
  active: boolean
  created_at: string
}

export interface Area {
  id: string
  name: string
  type: AreaType
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

export type OrderType = 'table' | 'delivery' | 'task'
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
