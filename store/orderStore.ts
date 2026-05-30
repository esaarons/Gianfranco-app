import { create } from 'zustand'
import type { CartItem } from '@/types'

// Unique key per cart line: same product with different modifiers → different lines
export function cartKey(item: CartItem): string {
  return `${item.productId}:${item.modifiers.map((m) => m.modifierId).sort().join(',')}`
}

interface OrderStore {
  tableId: string | null
  tableCode: string | null
  items: CartItem[]
  setTable: (id: string, code: string) => void
  addItem: (item: CartItem) => void
  updateItemQty: (key: string, delta: number) => void
  removeItem: (key: string) => void
  clearCart: () => void
  total: () => number
}

export const useOrderStore = create<OrderStore>((set, get) => ({
  tableId: null,
  tableCode: null,
  items: [],

  setTable: (id, code) => set({ tableId: id, tableCode: code, items: [] }),

  addItem: (item) => {
    const key = cartKey(item)
    const existing = get().items.find((i) => cartKey(i) === key)
    if (existing) {
      set((s) => ({
        items: s.items.map((i) =>
          cartKey(i) === key ? { ...i, quantity: i.quantity + item.quantity } : i
        ),
      }))
    } else {
      set((s) => ({ items: [...s.items, item] }))
    }
  },

  updateItemQty: (key, delta) => {
    set((s) => ({
      items: s.items
        .map((i) => (cartKey(i) === key ? { ...i, quantity: i.quantity + delta } : i))
        .filter((i) => i.quantity > 0),
    }))
  },

  removeItem: (key) =>
    set((s) => ({ items: s.items.filter((i) => cartKey(i) !== key) })),

  clearCart: () => set({ tableId: null, tableCode: null, items: [] }),

  total: () => {
    return get().items.reduce((sum, item) => {
      const modTotal = item.modifiers.reduce((m, mod) => m + mod.price, 0)
      return sum + (item.unitPrice + modTotal) * item.quantity
    }, 0)
  },
}))
