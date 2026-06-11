import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import type { CartItem } from '@/types'

// Unique key per cart line: same product + same modifiers + same notes + same guest + same combo → same line
export function cartKey(item: CartItem): string {
  const mods  = item.modifiers.map((m) => m.modifierId).sort().join(',')
  const note  = item.notes?.trim() ?? ''
  const guest = item.guestName?.trim() ?? ''
  const combo = item.comboKey ?? ''
  return `${item.productId}:${mods}:${note}:${guest}:${combo}`
}

interface OrderStore {
  tableId:     string | null
  tableCode:   string | null
  items:       CartItem[]
  guests:      string[]
  activeGuest: string | null

  setTable:       (id: string, code: string) => void
  addItem:        (item: CartItem) => void
  updateItemQty:  (key: string, delta: number) => void
  removeItem:     (key: string) => void
  removeCombo:    (comboKey: string) => void
  clearCart:      () => void
  total:          () => number

  addGuest:       (name: string) => void
  setActiveGuest: (name: string | null) => void
  removeGuest:    (name: string) => void
  renameGuest:    (oldName: string, newName: string) => void
}

export const useOrderStore = create<OrderStore>()(
  persist(
    (set, get) => ({
      tableId:     null,
      tableCode:   null,
      items:       [],
      guests:      [],
      activeGuest: null,

      setTable: (id, code) => set({ tableId: id, tableCode: code, items: [], guests: [], activeGuest: null }),

      addItem: (item) => {
        // Attach the active guest automatically
        const guest = get().activeGuest
        const fullItem: CartItem = guest ? { ...item, guestName: guest } : item
        const key = cartKey(fullItem)
        const existing = get().items.find((i) => cartKey(i) === key)
        if (existing) {
          set((s) => ({
            items: s.items.map((i) =>
              cartKey(i) === key ? { ...i, quantity: i.quantity + fullItem.quantity } : i
            ),
          }))
        } else {
          set((s) => ({ items: [...s.items, fullItem] }))
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

      removeCombo: (comboKey) =>
        set((s) => ({ items: s.items.filter((i) => i.comboKey !== comboKey) })),

      clearCart: () => set({ tableId: null, tableCode: null, items: [], guests: [], activeGuest: null }),

      total: () => {
        return get().items.reduce((sum, item) => {
          const modTotal = item.modifiers.reduce((m, mod) => m + mod.price, 0)
          return sum + (item.unitPrice + modTotal) * item.quantity
        }, 0)
      },

      addGuest: (name) => {
        if (!name.trim()) return
        if (get().guests.includes(name.trim())) return
        set((s) => ({ guests: [...s.guests, name.trim()], activeGuest: name.trim() }))
      },

      setActiveGuest: (name) => set({ activeGuest: name }),

      removeGuest: (name) =>
        set((s) => ({
          guests: s.guests.filter((g) => g !== name),
          activeGuest: s.activeGuest === name ? null : s.activeGuest,
          // unlink items that belonged to this guest
          items: s.items.map((i) => i.guestName === name ? { ...i, guestName: undefined } : i),
        })),

      renameGuest: (oldName, newName) => {
        const trimmed = newName.trim()
        if (!trimmed || trimmed === oldName) return
        if (get().guests.includes(trimmed)) return
        set((s) => ({
          guests:      s.guests.map((g) => g === oldName ? trimmed : g),
          activeGuest: s.activeGuest === oldName ? trimmed : s.activeGuest,
          items:       s.items.map((i) => i.guestName === oldName ? { ...i, guestName: trimmed } : i),
        }))
      },
    }),
    {
      name: 'gf-order-cart',
      storage: createJSONStorage(() => sessionStorage),
      partialize: (state) => ({
        tableId:     state.tableId,
        tableCode:   state.tableCode,
        items:       state.items,
        guests:      state.guests,
        activeGuest: state.activeGuest,
      }),
    }
  )
)
