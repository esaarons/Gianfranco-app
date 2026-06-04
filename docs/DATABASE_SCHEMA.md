# DATABASE_SCHEMA.md
> Sistema Operacional Cafetería Gianfranco  
> Última actualización: 2026-06-04  
> Basado en: 15 migraciones SQL (`supabase/migrations/001` → `015`)

---

## 1. Enums

```sql
CREATE TYPE user_role AS ENUM (
  'admin', 'encargado', 'barista', 'servicio', 'caja',
  'delivery', 'salon', 'bar', 'kitchen'  -- los 3 últimos son legacy
);

CREATE TYPE table_status AS ENUM ('free', 'occupied', 'cleaning');
CREATE TYPE table_zone   AS ENUM ('salon1', 'salon2', 'terrace');
CREATE TYPE order_type   AS ENUM ('table', 'delivery', 'takeaway', 'task');
CREATE TYPE order_status AS ENUM ('open', 'in_progress', 'closed', 'cancelled');
CREATE TYPE card_status  AS ENUM ('pending', 'received', 'delivered');
CREATE TYPE stock_status AS ENUM ('available', 'low', 'out');

CREATE TYPE reservation_status AS ENUM (
  'pending', 'confirmed', 'in_progress', 'finished', 'cancelled', 'no_show'
);
```

---

## 2. Tablas

### 2.1 `users`

| Columna | Tipo | Notas |
|---|---|---|
| `id` | UUID PK | `gen_random_uuid()` |
| `name` | TEXT NOT NULL | Nombre de display |
| `email` | TEXT UNIQUE NOT NULL | Login identifier |
| `role` | user_role NOT NULL | Ver enums arriba |
| `pin` | TEXT | Hash bcrypt del PIN numérico |
| `active` | BOOLEAN DEFAULT true | Soft delete |
| `created_at` | TIMESTAMPTZ DEFAULT now() | |
| `last_login` | TIMESTAMPTZ | Actualizado en login |

**Índices recomendados:**
```sql
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_role ON users(role) WHERE active = true;
```

**Usuarios seed:**
- `admin@gianfranco.com` / PIN: 1234 (role: admin)
- `bar@gianfranco.com` / PIN: 2222 (role: barista)
- `kitchen@gianfranco.com` / PIN: 3333 (role: kitchen — legacy)
- `salon@gianfranco.com` / PIN: 4444 (role: salon — legacy)

---

### 2.2 `areas`

| Columna | Tipo | Notas |
|---|---|---|
| `id` | UUID PK | **IDs fijos (hardcoded en código)** |
| `name` | TEXT NOT NULL | |
| `type` | TEXT NOT NULL | 'bar', 'kitchen', 'salon', 'delivery' |

**IDs Fijos (inmutables — hardcoded en `lib/constants.ts`):**
```
BAR:      aaaaaaaa-0000-0000-0000-000000000001
KITCHEN:  aaaaaaaa-0000-0000-0000-000000000002
SALON:    aaaaaaaa-0000-0000-0000-000000000003
DELIVERY: aaaaaaaa-0000-0000-0000-000000000004
```

> ⚠️ **Riesgo**: Si estos IDs cambian en producción sin actualizar el código, el sistema de cards colapsa completamente.

---

### 2.3 `user_areas`

| Columna | Tipo | Notas |
|---|---|---|
| `user_id` | UUID FK → users.id | ON DELETE CASCADE |
| `area_id` | UUID FK → areas.id | ON DELETE CASCADE |
| PRIMARY KEY | (user_id, area_id) | |

**Regla de negocio**: admin y encargado tienen acceso a TODAS las áreas. Otros roles se asignan por área específica.

---

### 2.4 `tables`

| Columna | Tipo | Notas |
|---|---|---|
| `id` | UUID PK | |
| `code` | TEXT UNIQUE NOT NULL | M1–M5, V1–V2, G1–G2, TG, T1–T3 |
| `zone` | table_zone NOT NULL | salon1, salon2, terrace |
| `capacity` | INT DEFAULT 4 | Personas |
| `status` | table_status DEFAULT 'free' | |
| `parent_table_id` | UUID FK → tables.id | Para unión de mesas |
| `active` | BOOLEAN DEFAULT true | |
| `updated_at` | TIMESTAMPTZ | Actualizado en cada cambio de estado |

**Mesas seed (13 total):**

| Código | Zona | Capacidad |
|---|---|---|
| M1–M5 | salon1 | 4 |
| V1–V2 | salon2 | 4–6 |
| G1–G2 | salon2 | 4 |
| TG | salon2 | 8 |
| T1–T3 | terrace | 4 |

**Índices recomendados:**
```sql
CREATE INDEX idx_tables_status ON tables(status) WHERE active = true;
CREATE INDEX idx_tables_zone ON tables(zone) WHERE active = true;
```

---

### 2.5 `categories`

| Columna | Tipo | Notas |
|---|---|---|
| `id` | UUID PK | |
| `name` | TEXT NOT NULL | |
| `sort_order` | INT | Orden en UI |
| `active` | BOOLEAN DEFAULT true | |

**12 categorías seed**: Café, Matcha, Bebidas Frías, Specialty Lattes, Jugos, Tostones, Sandwiches, Pizzas, Postres, Pastas/Ensaladas, Smoothie Bowls, Otros

---

### 2.6 `products`

| Columna | Tipo | Notas |
|---|---|---|
| `id` | UUID PK | |
| `name` | TEXT NOT NULL | |
| `category_id` | UUID FK → categories.id | |
| `primary_area_id` | UUID FK → areas.id | Determina a qué área se envía |
| `price` | NUMERIC(10,2) DEFAULT 0 | |
| `description` | TEXT | |
| `active` | BOOLEAN DEFAULT true | |
| `is_favorite` | BOOLEAN DEFAULT false | Aparece en tab "Favoritos" |
| `sort_order` | INT DEFAULT 0 | |
| `image_url` | TEXT | URL de imagen (columna existe, UI incompleta) |
| `product_type` | TEXT DEFAULT 'standard' | 'standard', 'breakfast', 'ice_cream' |
| `stock_status` | stock_status DEFAULT 'available' | Visible en alertas de stock |

**~60 productos seed** agrupados por categoría y área.

**Índices recomendados:**
```sql
CREATE INDEX idx_products_category ON products(category_id) WHERE active = true;
CREATE INDEX idx_products_area ON products(primary_area_id) WHERE active = true;
CREATE INDEX idx_products_favorite ON products(is_favorite) WHERE active = true;
```

---

### 2.7 `modifiers`

| Columna | Tipo | Notas |
|---|---|---|
| `id` | UUID PK | |
| `name` | TEXT NOT NULL | |
| `price` | NUMERIC(10,2) DEFAULT 0 | Precio adicional |
| `modifier_group` | TEXT | 'temperature', 'milk', 'extras', 'food_addon', 'note' |
| `active` | BOOLEAN DEFAULT true | |

**9 modificadores seed**: ICED, leche avena, leche almendra, shot extra, descafeinado, sin azúcar, extras varios.

---

### 2.8 `orders`

| Columna | Tipo | Notas |
|---|---|---|
| `id` | UUID PK | |
| `type` | order_type NOT NULL | 'table', 'delivery', 'takeaway', 'task' |
| `table_id` | UUID FK → tables.id | NULL para delivery/takeaway |
| `status` | order_status DEFAULT 'open' | |
| `total` | NUMERIC(10,2) DEFAULT 0 | Calculado al crear, no transaccional |
| `created_by` | UUID FK → users.id | |
| `notes` | TEXT | |
| `created_at` | TIMESTAMPTZ DEFAULT now() | |
| `closed_at` | TIMESTAMPTZ | Timestamp de cierre |
| `closed_by` | UUID FK → users.id | |

> ⚠️ **Mejora pendiente**: `closed_by` columna agregada en migración 012 (`ops_attribution`). Verificar que la API actualiza este campo correctamente al cerrar.

**Índices recomendados:**
```sql
CREATE INDEX idx_orders_table ON orders(table_id) WHERE status = 'open';
CREATE INDEX idx_orders_status ON orders(status);
CREATE INDEX idx_orders_created_by ON orders(created_by);
CREATE INDEX idx_orders_created_at ON orders(created_at DESC);
```

---

### 2.9 `order_items`

| Columna | Tipo | Notas |
|---|---|---|
| `id` | UUID PK | |
| `order_id` | UUID FK → orders.id ON DELETE CASCADE | |
| `product_id` | UUID FK → products.id | |
| `quantity` | INT DEFAULT 1 | |
| `unit_price` | NUMERIC(10,2) | Precio al momento del pedido (no actualiza con cambios de producto) |
| `area_id` | UUID FK → areas.id | Determina a qué area_card pertenece |
| `notes` | TEXT | Nota específica del item |
| `guest_label` | TEXT | Etiqueta por persona (ej: "Laura") — datos existen, UI incompleta |

**Índices recomendados:**
```sql
CREATE INDEX idx_order_items_order ON order_items(order_id);
CREATE INDEX idx_order_items_area ON order_items(area_id);
```

---

### 2.10 `order_item_modifiers`

| Columna | Tipo | Notas |
|---|---|---|
| `id` | UUID PK | |
| `order_item_id` | UUID FK → order_items.id ON DELETE CASCADE | |
| `modifier_id` | UUID FK → modifiers.id | |
| `price` | NUMERIC(10,2) | Precio del modificador al momento (snapshot) |

---

### 2.11 `area_cards` ⭐ (Tabla Central)

| Columna | Tipo | Notas |
|---|---|---|
| `id` | UUID PK | |
| `order_id` | UUID FK → orders.id | NULL para cards manuales (delivery tasks) |
| `area_id` | UUID FK → areas.id | Qué área debe atender este card |
| `status` | card_status DEFAULT 'pending' | pending → received → delivered |
| `assigned_to` | UUID FK → users.id | (columna existe, UI no implementa asignación manual) |
| `title` | TEXT | Para tareas manuales (delivery) |
| `notes` | TEXT | Notas del pedido (copia) |
| `created_at` | TIMESTAMPTZ DEFAULT now() | |
| `received_at` | TIMESTAMPTZ | Set al marcar received |
| `delivered_at` | TIMESTAMPTZ | Set al marcar delivered |
| `operator_note` | TEXT | Nota del operador (ej: "cliente pidió sin hielo") |
| `delay_minutes` | SMALLINT | Minutos de demora marcados (cocina) |
| `delay_reason` | TEXT | Razón de la demora |
| `delay_set_at` | TIMESTAMPTZ | Cuándo se marcó la demora |
| `received_by` | UUID FK → users.id | Quién marcó received (migración 012) |
| `delivered_by` | UUID FK → users.id | Quién marcó delivered (migración 012) |

> ⚠️ **FK ambiguity conocida**: Múltiples FK a `users` en esta tabla. Si se hace JOIN con alias, usar FK explícita: `users!area_cards_received_by_fkey`. Ver [feedback_supabase_fk_ambiguity.md](../memory/feedback_supabase_fk_ambiguity.md).

**Índices recomendados:**
```sql
CREATE INDEX idx_area_cards_area_status ON area_cards(area_id, status);
CREATE INDEX idx_area_cards_order ON area_cards(order_id);
CREATE INDEX idx_area_cards_created ON area_cards(created_at DESC);
CREATE INDEX idx_area_cards_status ON area_cards(status);
```

---

### 2.12 `shifts`

| Columna | Tipo | Notas |
|---|---|---|
| `id` | UUID PK | |
| `started_at` | TIMESTAMPTZ NOT NULL | |
| `ended_at` | TIMESTAMPTZ | NULL si activo |
| `started_by` | UUID FK → users.id | |
| `ended_by` | UUID FK → users.id | |
| `notes` | TEXT | |
| `summary` | JSONB | Calculado al cerrar. Ver `ShiftSummary` type |

**Regla**: Solo puede haber un turno activo (ended_at IS NULL).

**Estructura del JSONB `summary`**:
```typescript
{
  period: { from: ISO, to: ISO }
  cards_total: number
  orders_closed: number
  avg_reaction_time_min: number | null
  avg_prep_time_min: number | null
  avg_total_time_min: number | null
  avg_table_cycle_min: number | null
  by_area: ShiftAreaStat[]
  by_staff: ShiftStaffStat[]
  hourly_load: ShiftHourlyLoad[]
}
```

---

### 2.13 `activity_logs`

| Columna | Tipo | Notas |
|---|---|---|
| `id` | UUID PK | |
| `user_id` | UUID FK → users.id | NULL posible |
| `action` | TEXT NOT NULL | Ver LogAction type |
| `area_id` | UUID FK → areas.id | |
| `table_id` | UUID FK → tables.id | |
| `order_id` | UUID FK → orders.id | |
| `product_id` | UUID FK → products.id | |
| `old_state` | TEXT | Estado anterior |
| `new_state` | TEXT | Estado nuevo |
| `metadata` | JSONB | Datos adicionales |
| `created_at` | TIMESTAMPTZ DEFAULT now() | |

**Acciones registradas**: login, logout, order_created, order_modified, order_closed, order_cancelled, item_added, item_removed, card_status_changed, table_opened, table_freed, table_joined, table_moved, product_created, product_modified, user_created, user_modified, reservation_created, reservation_modified, reservation_cancelled

**Índices recomendados:**
```sql
CREATE INDEX idx_logs_user ON activity_logs(user_id);
CREATE INDEX idx_logs_action ON activity_logs(action);
CREATE INDEX idx_logs_created ON activity_logs(created_at DESC);
```

> ⚠️ **Riesgo de crecimiento**: Sin purga periódica, esta tabla crecerá indefinidamente. Considerar retention policy (ej: eliminar logs >90 días).

---

### 2.14 `reservations`

| Columna | Tipo | Notas |
|---|---|---|
| `id` | UUID PK | |
| `customer_name` | TEXT NOT NULL | |
| `customer_phone` | TEXT | |
| `date` | DATE NOT NULL | |
| `start_time` | TIME NOT NULL | |
| `end_time` | TIME NOT NULL | |
| `party_size` | INT NOT NULL | |
| `zone` | table_zone | |
| `menu_type` | TEXT | 'brunch', 'simple' |
| `status` | reservation_status DEFAULT 'pending' | |
| `notes` | TEXT | |
| `created_by` | UUID FK → users.id | |
| `created_at` | TIMESTAMPTZ DEFAULT now() | |

**Índices recomendados:**
```sql
CREATE INDEX idx_reservations_date ON reservations(date);
CREATE INDEX idx_reservations_status ON reservations(status);
```

---

### 2.15 `reservation_tables`

| Columna | Tipo | Notas |
|---|---|---|
| `reservation_id` | UUID FK → reservations.id ON DELETE CASCADE | |
| `table_id` | UUID FK → tables.id | |
| PRIMARY KEY | (reservation_id, table_id) | |

---

### 2.16 `push_subscriptions`

| Columna | Tipo | Notas |
|---|---|---|
| `id` | UUID PK | |
| `user_id` | UUID FK → users.id ON DELETE CASCADE | |
| `endpoint` | TEXT UNIQUE NOT NULL | URL del push service |
| `p256dh` | TEXT NOT NULL | Clave pública del cliente |
| `auth` | TEXT NOT NULL | Auth secret |
| `area_ids` | UUID[] | Filtro de áreas para notificaciones |
| `created_at` | TIMESTAMPTZ DEFAULT now() | |

**Un registro por dispositivo por usuario.**

---

### 2.17 `sessions`

| Columna | Tipo | Notas |
|---|---|---|
| `id` | UUID PK | = `jti` del JWT |
| `user_id` | UUID FK → users.id ON DELETE CASCADE | |
| `device_name` | TEXT | Ej: "iPhone 15", "Chrome / Windows" |
| `platform` | TEXT | iOS, Android, Web |
| `ip_address` | TEXT | IP del último login |
| `user_agent` | TEXT | |
| `created_at` | TIMESTAMPTZ DEFAULT now() | |
| `last_active` | TIMESTAMPTZ | Actualizado en cada request |
| `expires_at` | TIMESTAMPTZ | 30 días desde creación |
| `revoked_at` | TIMESTAMPTZ | NULL si activa |

**Índices recomendados:**
```sql
CREATE INDEX idx_sessions_user ON sessions(user_id) WHERE revoked_at IS NULL;
CREATE INDEX idx_sessions_expires ON sessions(expires_at);
```

---

### 2.18 `settings`

| Columna | Tipo | Notas |
|---|---|---|
| `key` | TEXT PRIMARY KEY | |
| `value` | JSONB | |

**Stub** — tabla creada pero sin uso en la aplicación actual.

---

## 3. Relaciones Principales

```
users ──< user_areas >── areas
users ──< sessions
users ──< push_subscriptions
users ──< orders (created_by, closed_by)
users ──< area_cards (assigned_to, received_by, delivered_by)
users ──< reservations (created_by)
users ──< activity_logs

tables ──< orders
tables ──< reservation_tables >── reservations
tables ── tables (parent_table_id — self-referential)

orders ──< order_items ──< order_item_modifiers
orders ──< area_cards

products >── categories
products >── areas (primary_area_id)
order_items >── products
order_items >── areas (area_id)
order_item_modifiers >── modifiers

shifts (standalone, computed from area_cards + orders)
activity_logs (polymorphic references — user, area, table, order, product)
```

---

## 4. Mejoras Recomendadas

| Mejora | Prioridad | Motivo |
|---|---|---|
| Añadir índices faltantes en `area_cards(area_id, status)` | Alta | Tabla más consultada en tiempo real |
| Añadir índices en `orders(status)`, `orders(table_id)` | Alta | Queries frecuentes sin índice |
| Política de retención en `activity_logs` | Media | Crecimiento indefinido |
| Activar RLS básico en Supabase | Alta | Actualmente sin protección a nivel DB |
| Migrar enums legacy (`bar`, `kitchen`, `salon`) | Baja | Limpieza técnica — no urgente |
| Agregar `deleted_at` a tablas soft-deleteable | Baja | Mejor auditoría |
| Snapshot de precio en `order_items.unit_price` | ✅ Ya implementado | |
| Timestamp en cambios de estado de card | ✅ Ya implementado | received_at, delivered_at |
