# ARCHITECTURE.md
> Sistema Operacional Cafetería Gianfranco  
> Última actualización: 2026-06-04

---

## 1. Diagrama de Arquitectura

```
┌─────────────────────────────────────────────────────────────────┐
│                        CLIENTES (PWA)                           │
│  iPhone · Android · Tablet · Desktop                            │
│                                                                 │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐          │
│  │  /admin  │ │  /salon  │ │  /bar    │ │ /kitchen │          │
│  │  /tables │ │  /order  │ │ /delivery│ │ /login   │          │
│  └────┬─────┘ └────┬─────┘ └────┬─────┘ └────┬─────┘          │
│       │             │            │             │                │
│  ┌────▼─────────────▼────────────▼─────────────▼─────┐         │
│  │              Next.js App Router (React 19)         │         │
│  │  Zustand (authStore, orderStore, notifStore)       │         │
│  │  React Query 5 (cache + polling + realtime sync)   │         │
│  │  Supabase Realtime Client (WebSocket subscriptions)│         │
│  │  Service Worker (push, offline, wake lock)         │         │
│  └────────────────────┬───────────────────────────────┘         │
└───────────────────────│─────────────────────────────────────────┘
                        │ HTTPS (SSR / API Routes / RSC)
┌───────────────────────▼─────────────────────────────────────────┐
│                    VERCEL (Serverless)                           │
│                                                                 │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │              Next.js API Routes                         │    │
│  │                                                         │    │
│  │  /api/auth/*      JWT verify + session management       │    │
│  │  /api/orders/*    Order CRUD + area card creation       │    │
│  │  /api/cards/*     Area card CRUD + status updates       │    │
│  │  /api/tables/*    Table status + join/split/move        │    │
│  │  /api/products/*  Product + modifier management         │    │
│  │  /api/shifts/*    Shift start/end + analytics           │    │
│  │  /api/analytics/* KPIs realtime + histórico             │    │
│  │  /api/sessions/*  Multi-device session management       │    │
│  │  /api/push/*      Web Push VAPID subscriptions          │    │
│  └──────────────┬──────────────────────────────────────────┘    │
└─────────────────│───────────────────────────────────────────────┘
                  │ Supabase client (service_role key)
┌─────────────────▼───────────────────────────────────────────────┐
│                  SUPABASE (PostgreSQL)                           │
│                                                                 │
│  PostgreSQL 15+                                                 │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐          │
│  │  users   │ │  orders  │ │area_cards│ │  tables  │          │
│  │user_areas│ │order_item│ │  shifts  │ │reserv.   │          │
│  │ sessions │ │ products │ │  logs    │ │push_subs │          │
│  └──────────┘ └──────────┘ └──────────┘ └──────────┘          │
│                                                                 │
│  Realtime (pub/sub via PostgreSQL CDC)                          │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │  tables → [status changes]                               │   │
│  │  area_cards → [INSERT new card, UPDATE status]           │   │
│  │  orders → [INSERT, UPDATE status]                        │   │
│  └──────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
```

---

## 2. Frontend

### 2.1 Next.js App Router (v16.2.6)

**Estructura de rutas:**

```
app/
├── layout.tsx          → Root layout: PWA meta, providers, fonts
├── page.tsx            → Redirect basado en rol del usuario
├── login/              → Autenticación PIN
├── admin/              → Dashboard + sub-páginas admin
│   ├── page.tsx
│   ├── products/
│   ├── modifiers/
│   ├── devices/
│   ├── reservations/
│   ├── operations/
│   ├── reports/
│   ├── logs/
│   └── orders/
├── salon/              → Vista de salón/servicio
├── bar/                → Queue de barra
├── kitchen/            → Queue de cocina
├── tables/             → Plano de mesas
├── delivery/           → Board de delivery
├── order/
│   ├── [tableId]/      → Crear pedido para mesa
│   └── takeaway/       → Crear pedido para llevar
├── settings/           → (stub)
├── staff/              → (stub)
└── api/                → API Routes (serverless)
```

**Convenciones:**
- Todos los Client Components usan `'use client'`
- Data fetching en Server Components o via React Query hooks
- Protección de rutas: `AuthProvider` → `RoleGuard` → página

### 2.2 Estado Global (Zustand)

| Store | Contenido | Persistencia |
|---|---|---|
| `authStore` | Usuario logueado + áreas asignadas | Memoria (sesión) |
| `orderStore` | Carrito de pedido activo | `sessionStorage` (`gf-order-cart`) |
| `notificationStore` | Configuración de notificaciones | `localStorage` |

### 2.3 Caché y Fetching (React Query 5)

| Query Key | Stale Time | Revalidación |
|---|---|---|
| `['products']` | 2 min | Manual + pull-to-refresh |
| `['modifiers']` | 10 min | Manual |
| `['tables']` | Realtime | 5s poll fallback |
| `['cards', areaId]` | 3s | 5s poll + Realtime |
| `['table-order', tableId]` | Realtime | 60s poll |
| `['shifts', 'active']` | 30s | 60s poll |
| `['orders', 'open']` | 15s poll | — |

### 2.4 Real-time (Supabase Realtime)

Canales suscritos por tabla:

```
tables        → todos los clientes (useTables)
area_cards    → filtrado por area_id (useAreaCards, useAreaCardsByType)
orders        → filtrado por table_id (useTableOrder)
```

**Estrategia de fallback:**
1. WebSocket activo → actualizaciones instantáneas
2. WebSocket desconectado → polling cada 3–5s
3. App regresa a foreground → `visibilitychange` → refetch todo

---

## 3. Backend (API Routes)

Cada ruta API es una función serverless desplegada en Vercel.

**Patrón estándar:**
```typescript
1. Verificar JWT (jose) + validar sesión no revocada
2. Extraer userId, role, areaIds del token
3. Validar autorización (role/area)
4. Ejecutar query con Supabase service_role (sin RLS)
5. Loggear acción en activity_logs (fire-and-forget)
6. Retornar JSON
```

**Dependencias críticas:**
- `jose` — JWT sign/verify
- `@supabase/supabase-js` — cliente Supabase
- `bcryptjs` — hash/verify PIN
- `web-push` — envío de notificaciones Push

---

## 4. Base de Datos (Supabase / PostgreSQL)

Ver [DATABASE_SCHEMA.md](DATABASE_SCHEMA.md) para detalle completo.

**18 tablas principales**, organizadas en:
- Core: `users`, `user_areas`, `areas`
- Operación: `tables`, `orders`, `order_items`, `order_item_modifiers`, `area_cards`
- Catálogo: `products`, `categories`, `modifiers`
- Analítica: `shifts`, `activity_logs`
- Reservas: `reservations`, `reservation_tables`
- Infraestructura: `push_subscriptions`, `sessions`, `settings`

**Sin RLS activo**: La app usa `service_role` key en el servidor. La autorización es completamente a nivel de código (API Routes). Esto es un riesgo técnico documentado.

---

## 5. Autenticación

```
Usuario → ingresa email + PIN
         ↓
API /api/auth/login:
  1. Busca user por email
  2. bcrypt.compare(pin, user.pin)
  3. Crea registro en sessions{}
  4. Firma JWT con jose (HS256, 30 días)
     payload: { userId, role, areaIds[], sessionId }
  5. Set cookie httpOnly 'gf_session'
  6. Log 'login' en activity_logs
         ↓
Middleware / AuthProvider:
  GET /api/auth/me → verifica JWT + sessions.revoked_at
         ↓
RoleGuard → redirige según role
```

**Tokens**: HS256, 30 días, almacenados en cookie httpOnly (no accesible desde JS).

**Revocación**: Campo `revoked_at` en tabla `sessions`. Al revocar, el JWT válido queda inutilizable en la próxima verificación.

---

## 6. Notificaciones

```
Registro:
  1. SW solicita permiso Push al browser
  2. Suscripción VAPID guardada en push_subscriptions{}
  3. area_ids[] filtra qué eventos recibe cada dispositivo

Envío (server-side):
  /lib/webpush.ts → web-push.sendNotification()
  Triggereado desde: creación de area card, actualizaciones críticas

Sonido (client-side):
  useSound() → reproduce archivo de audio local
  Modos: normal, alto, cocina_ruidosa (mute)
  notificationStore.mode determina volumen/silencio
```

---

## 7. PWA

- `public/manifest.json` — nombre, iconos, colores de tema
- `public/sw.js` — Service Worker para push + offline
- 13 splash screens para iPhone/iPad (`public/splashscreens/`)
- Wake lock: `useWakeLock()` activo en `/bar` y `/kitchen`
- `display: standalone` — instalable como app nativa

---

## 8. Módulos y Dependencias

| Módulo | Archivos clave | Depende de |
|---|---|---|
| Auth | `lib/auth.ts`, `api/auth/*` | `jose`, `bcryptjs`, Supabase |
| Orders | `api/orders/*`, `hooks/useCards.ts` | Auth, Supabase, area_cards |
| Tables | `hooks/useTables.ts`, `api/tables/*` | Auth, Supabase, Realtime |
| Cards | `hooks/useCards.ts`, `api/cards/*` | Auth, Supabase, Realtime, Notif |
| Shifts | `hooks/useActiveShift.ts`, `lib/shiftSummary.ts` | Auth, area_cards, orders |
| Notifications | `lib/webpush.ts`, `store/notificationStore.ts` | SW, VAPID, push_subscriptions |
| Analytics | `api/analytics/*`, `hooks/useRealtimeKPIs.ts` | Shifts, area_cards, tables |

---

## 9. Riesgos y Cuellos de Botella

### Riesgo Crítico
- **Sin RLS**: Si la service_role key se expone, acceso total a la DB. Mitigar con variables de entorno estrictas en Vercel.
- **JWT de 30 días sin renovación**: Si el secreto JWT cambia, todas las sesiones quedan inválidas sin aviso.

### Cuellos de Botella
- **Polling agresivo**: React Query hace polling cada 3–5s en múltiples queries simultáneas. Con 8 dispositivos activos = ~16 requests/segundo solo de polling.
- **Realtime en iOS**: Los WebSockets de Supabase Realtime se pausan cuando iOS pone la app en background. El fallback de polling lo mitiga pero introduce latencia de hasta 60s.
- **Serverless cold starts**: Vercel puede tener cold starts de 200–800ms en funciones no invocadas recientemente. En operación continua no debería ser problema.
- **área_cards sin índice en `status`**: Queries frecuentes por status sin índice pueden degradar en volumen alto. Ver [DATABASE_SCHEMA.md](DATABASE_SCHEMA.md).
