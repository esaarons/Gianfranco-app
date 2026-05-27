import type { TableStatus, CardStatus, UserRole } from '@/types'

// ─── Status Colors ────────────────────────────────────────────────────────────

export const TABLE_STATUS_CONFIG: Record<TableStatus, { label: string; color: string; bg: string; border: string }> = {
  free: {
    label: 'Libre',
    color: 'text-gray-600',
    bg: 'bg-gray-100',
    border: 'border-gray-300',
  },
  occupied: {
    label: 'Ocupado',
    color: 'text-emerald-700',
    bg: 'bg-emerald-50',
    border: 'border-emerald-400',
  },
  cleaning: {
    label: 'Limpieza',
    color: 'text-gray-500',
    bg: 'bg-gray-700',
    border: 'border-gray-500',
  },
}

export const CARD_STATUS_CONFIG: Record<CardStatus, { label: string; color: string; bg: string }> = {
  pending: {
    label: 'Pendiente',
    color: 'text-orange-700',
    bg: 'bg-orange-50',
  },
  received: {
    label: 'Recibido',
    color: 'text-blue-700',
    bg: 'bg-blue-50',
  },
  delivered: {
    label: 'Entregado',
    color: 'text-emerald-700',
    bg: 'bg-emerald-50',
  },
}

// ─── Roles ────────────────────────────────────────────────────────────────────

export const ROLE_CONFIG: Record<UserRole, { label: string; homeRoute: string }> = {
  admin: { label: 'Admin', homeRoute: '/admin' },
  salon: { label: 'Salón', homeRoute: '/tables' },
  bar: { label: 'Barra / Servicio', homeRoute: '/bar' },
  kitchen: { label: 'Cocina', homeRoute: '/kitchen' },
}

// ─── Table Zones ──────────────────────────────────────────────────────────────

export const ZONE_LABELS: Record<string, string> = {
  salon1: 'Salón 1',
  salon2: 'Salón 2',
  terrace: 'Terraza',
}

// ─── Order Status Flow ────────────────────────────────────────────────────────

export const TABLE_STATUS_FLOW: Record<TableStatus, TableStatus> = {
  free: 'occupied',
  occupied: 'cleaning',
  cleaning: 'free',
}

// ─── Area IDs (seeded — must match DB) ───────────────────────────────────────

export const AREA_IDS = {
  BAR: 'bar-area-uuid',
  KITCHEN: 'kitchen-area-uuid',
} as const

// ─── Sound Texts ──────────────────────────────────────────────────────────────

export function getOrderAnnouncementText(tableCode: string | null, type: string = 'table') {
  if (type === 'delivery' || type === 'task') return 'Nueva tarea Delivery'
  return `Pedido Mesa ${tableCode ?? ''}`
}
