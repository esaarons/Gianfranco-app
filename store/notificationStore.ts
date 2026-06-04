import { create } from 'zustand'

export type NotificationMode = 'normal' | 'alto' | 'cocina_ruidosa'

interface NotificationStore {
  enabled: boolean
  onShift: boolean         // user is actively working and should receive alerts
  mode: NotificationMode
  permissionStatus: NotificationPermission | 'unsupported' | null
  _hydrated: boolean
  enable: () => void
  setOnShift: (v: boolean) => void
  setMode: (m: NotificationMode) => void
  setPermissionStatus: (s: NotificationPermission | 'unsupported') => void
  hydrate: () => void
}

export const useNotificationStore = create<NotificationStore>((set, get) => ({
  enabled: false,
  onShift: true,   // default: on shift (user must explicitly go offline)
  mode: 'normal',
  permissionStatus: null,
  _hydrated: false,

  enable: () => {
    set({ enabled: true })
    localStorage.setItem('gf_sound_enabled', 'true')
  },

  setOnShift: (v) => {
    set({ onShift: v })
    localStorage.setItem('gf_on_shift', v ? 'true' : 'false')
  },

  setMode: (m) => {
    set({ mode: m })
    localStorage.setItem('gf_notification_mode', m)
  },

  setPermissionStatus: (s) => set({ permissionStatus: s }),

  hydrate: () => {
    if (get()._hydrated) return
    const enabled   = localStorage.getItem('gf_sound_enabled') === 'true'
    const onShift   = localStorage.getItem('gf_on_shift') !== 'false'  // default true
    const saved     = localStorage.getItem('gf_notification_mode') as NotificationMode | null
    const mode: NotificationMode = saved ?? 'normal'
    const permissionStatus: NotificationPermission | 'unsupported' =
      'Notification' in window ? Notification.permission : 'unsupported'
    set({ enabled, onShift, mode, permissionStatus, _hydrated: true })
  },
}))
