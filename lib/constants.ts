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

export const ROLE_CONFIG: Record<UserRole, { label: string; homeRoute: string; color: string; bg: string }> = {
  admin:     { label: 'Admin',      homeRoute: '/admin',    color: 'text-[#C46F4E]', bg: 'bg-[#C46F4E]/15 border-[#C46F4E]/30' },
  encargado: { label: 'Encargado',  homeRoute: '/admin',    color: 'text-[#C46F4E]', bg: 'bg-[#C46F4E]/15 border-[#C46F4E]/30' },
  barista:   { label: 'Barista',    homeRoute: '/bar',      color: 'text-[#EAD9B1]', bg: 'bg-[#EAD9B1]/15 border-[#EAD9B1]/30' },
  servicio:  { label: 'Servicio',   homeRoute: '/tables',   color: 'text-[#A7B897]', bg: 'bg-[#A7B897]/15 border-[#A7B897]/30' },
  caja:      { label: 'Caja',       homeRoute: '/tables',   color: 'text-[#8BA0BE]', bg: 'bg-[#8BA0BE]/15 border-[#8BA0BE]/30' },
  delivery:  { label: 'Delivery',   homeRoute: '/delivery', color: 'text-[#6B9CA8]', bg: 'bg-[#6B9CA8]/15 border-[#6B9CA8]/30' },
  // Legacy roles — mantenidos para compatibilidad con usuarios existentes en DB
  salon:     { label: 'Salón',      homeRoute: '/tables',   color: 'text-[#A7B897]', bg: 'bg-[#A7B897]/15 border-[#A7B897]/30' },
  bar:       { label: 'Barra',      homeRoute: '/bar',      color: 'text-[#EAD9B1]', bg: 'bg-[#EAD9B1]/15 border-[#EAD9B1]/30' },
  kitchen:   { label: 'Cocina',     homeRoute: '/kitchen',  color: 'text-[#6B9CA8]', bg: 'bg-[#6B9CA8]/15 border-[#6B9CA8]/30' },
}

// ─── Area IDs (seeded, deben coincidir con la DB) ─────────────────────────────

export const AREA_IDS = {
  BAR:      'aaaaaaaa-0000-0000-0000-000000000001',
  KITCHEN:  'aaaaaaaa-0000-0000-0000-000000000002',
  SALON:    'aaaaaaaa-0000-0000-0000-000000000003',
  DELIVERY: 'aaaaaaaa-0000-0000-0000-000000000004',
} as const

// ─── Table Zones ──────────────────────────────────────────────────────────────

export const ZONE_LABELS: Record<string, string> = {
  salon1:  'Salón 1',
  salon2:  'Salón 2',
  terrace: 'Terraza',
}

// ─── Order Status Flow ────────────────────────────────────────────────────────

export const TABLE_STATUS_FLOW: Record<TableStatus, TableStatus> = {
  free:     'occupied',
  occupied: 'cleaning',
  cleaning: 'free',
}

// ─── Home route desde áreas del usuario ──────────────────────────────────────

export function homeRouteFromAreas(role: string, areaIds: string[]): string {
  if (role === 'admin' || role === 'encargado') return '/admin'
  if (areaIds.includes(AREA_IDS.SALON))         return '/tables'
  if (areaIds.includes(AREA_IDS.BAR))           return '/bar'
  if (areaIds.includes(AREA_IDS.KITCHEN))       return '/kitchen'
  if (areaIds.includes(AREA_IDS.DELIVERY))      return '/delivery'
  return ROLE_CONFIG[role as UserRole]?.homeRoute ?? '/tables'
}

// ─── Sound Texts ──────────────────────────────────────────────────────────────

export function getOrderAnnouncementText(tableCode: string | null, type: string = 'table') {
  if (type === 'delivery' || type === 'task') return 'Nueva tarea Delivery'
  return `Pedido Mesa ${tableCode ?? ''}`
}
