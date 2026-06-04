# BUSINESS_RULES.md
> Sistema Operacional Cafetería Gianfranco  
> Última actualización: 2026-06-04

---

## 1. Mesas

### 1.1 Estados de Mesa

```
libre ────────► ocupada ────────► limpieza ────────► libre
(free)         (occupied)        (cleaning)          (free)
```

| Estado | Significado | Quién puede cambiar |
|---|---|---|
| `free` | Mesa disponible para nuevos pedidos | Servicio, Admin |
| `occupied` | Mesa con pedido activo abierto | Sistema (al crear pedido) |
| `cleaning` | Mesa liberada, esperando limpieza | Servicio, Admin |

**Regla**: Solo se puede crear un pedido en una mesa `free`. Si el estado es `occupied` o `cleaning`, el sistema debe rechazar o redirigir.

**Regla**: Al cerrar un pedido, la mesa NO cambia de estado automáticamente. Debe marcarse manualmente como `cleaning` → `free`.

> ⚠️ **Inconsistencia detectada**: El sistema crea el pedido y puede marcar la mesa como `occupied`, pero el flujo inverso (cerrar pedido → liberar mesa) no es automático. Riesgo de mesas fantasma "occupied" sin pedido abierto.

### 1.2 Unión de Mesas

- Una mesa puede tener una `parent_table_id` → mesa "hijo" agrupada bajo una mesa "padre"
- Solo el admin puede unir/separar/mover mesas
- Al unir: el pedido de la mesa hijo se transfiere o asocia a la mesa padre
- Al separar: `parent_table_id` se establece en NULL

### 1.3 Zonas

| Código | Zona | Descripción |
|---|---|---|
| M1–M5 | salon1 | Salón interior principal |
| V1–V2, G1–G2, TG | salon2 | Salón interior secundario |
| T1–T3 | terrace | Terraza exterior |

---

## 2. Pedidos

### 2.1 Tipos de Pedido

| Tipo | `order_type` | Descripción |
|---|---|---|
| Mesa | `table` | Vinculado a una mesa específica |
| Para llevar | `takeaway` | Sin mesa, para recoger en barra |
| Delivery | `delivery` | Servicio de entrega a domicilio |
| Tarea | `task` | Tarea operacional interna (no es pedido de cliente) |

### 2.2 Ciclo de Vida del Pedido

```
CREACIÓN
  ↓
Rol servicio/admin crea pedido → status: 'open'
  ↓
Sistema crea area_cards automáticamente:
  - Si hay items de barra → card para BAR
  - Si hay items de cocina → card para KITCHEN
  - Si es delivery → card para DELIVERY
  ↓
EN PROGRESO → status: 'in_progress' (cuando alguna card cambia de pending)
  ↓
CIERRE → status: 'closed' (manual por servicio/admin)
  ↓
Mesa marcada como 'cleaning' → luego 'free'
```

**Regla**: Un pedido `closed` o `cancelled` no puede reabrirse.

**Regla**: El `total` del pedido se calcula al momento de creación (suma de items + modificadores). Si los precios cambian después, el total histórico del pedido NO cambia.

### 2.3 Creación de Pedido — Validaciones

- Debe haber al menos 1 item
- Cada item debe tener `product_id`, `quantity >= 1`, `area_id`
- Para tipo `table`: debe existir `table_id` con mesa en estado `free`
- Para tipo `takeaway`/`delivery`: `table_id` = NULL

### 2.4 Distribución Automática por Área

Al crear un pedido, el sistema agrupa los items por `area_id` y crea una `area_card` por cada área involucrada:

```
items del pedido
  ├── items con area_id = BAR     → area_card(area_id: BAR, status: 'pending')
  ├── items con area_id = KITCHEN → area_card(area_id: KITCHEN, status: 'pending')
  └── items con area_id = SALON   → (área de soporte, no genera card actualmente)
```

---

## 3. Area Cards

### 3.1 Ciclo de Vida

```
pending ──────► received ──────► delivered
  │                                  │
  └── puede tener delay_minutes set  └── barra/cocina terminó
```

| Estado | Significado | Tiempo objetivo |
|---|---|---|
| `pending` | Enviado, esperando que el área lo reciba | < 2 min (barra), < 3 min (cocina) |
| `received` | El área reconoció y está preparando | Variable |
| `delivered` | Listo para servir al cliente | — |

### 3.2 Alertas por Tiempo

| Área | Alerta amarilla | Alerta roja (urgente) |
|---|---|---|
| Barra | > 5 minutos en pending | > 8 minutos en pending |
| Cocina | > 8 minutos en pending | > 15 minutos en pending |
| Delivery | > 8 minutos en pending | > 15 minutos en pending |

### 3.3 Marcador de Demora (Cocina)

La cocina puede marcar una card con:
- `delay_minutes`: tiempo estimado de demora (5, 10, 15 min o valor custom)
- `delay_reason`: razón textual (ej: "esperando insumo")
- `delay_set_at`: timestamp de cuándo se marcó

**Propósito**: Comunicar al salón que el pedido tomará más tiempo, sin cambiar el estado del card.

### 3.4 Nota de Operador

Cualquier área puede agregar `operator_note` a una card (ej: "cliente pidió sin hielo", "verificar alergia").

### 3.5 Cards de Tarea (Manual)

Solo el admin puede crear cards de delivery/tarea sin asociar a un pedido:
- `order_id`: NULL
- `title`: descripción de la tarea
- `notes`: detalles

---

## 4. Reservas

### 4.1 Ciclo de Vida

```
pending ──► confirmed ──► in_progress ──► finished
                │                              
                └──────────────────────► cancelled
                                    └──► no_show
```

| Estado | Significado |
|---|---|
| `pending` | Creada, sin confirmar |
| `confirmed` | Confirmada con el cliente |
| `in_progress` | Cliente presente, mesa activa |
| `finished` | Reserva completada |
| `cancelled` | Cancelada antes de la fecha |
| `no_show` | Cliente no se presentó |

### 4.2 Reglas de Reserva

- Una reserva puede asociarse a múltiples mesas (tabla `reservation_tables`)
- La zona de la reserva (`zone`) es referencial, no bloquea las mesas automáticamente
- La alerta de "reserva próxima" aparece 30 minutos antes en la vista de salón
- Tipos de menú: `brunch` o `simple`

> ⚠️ **Regla no implementada**: Las reservas NO bloquean las mesas automáticamente. El estado de la mesa sigue siendo `free` aunque haya una reserva confirmada. El staff debe marcar manualmente la mesa como ocupada al llegar el cliente.

### 4.3 Conversión de Reserva a Mesa Activa

Para activar una reserva:
1. Encargado/admin cambia status → `in_progress`
2. Se crea pedido manualmente en la mesa asignada
3. Mesa → `occupied`

(No hay flujo automático de reserva → mesa → pedido)

---

## 5. Turnos

### 5.1 Reglas de Turno

- Solo puede haber **un turno activo** a la vez (`ended_at IS NULL`)
- El turno lo inicia el encargado/admin
- Al cerrar el turno, el sistema calcula automáticamente el `summary` JSONB con:
  - Total de cards procesadas
  - Tiempo promedio de reacción (pending → received)
  - Tiempo promedio de preparación (received → delivered)
  - Desglose por área y por staff
  - Carga horaria

### 5.2 Datos Calculados en el Cierre

El cálculo se hace en `lib/shiftSummary.ts`. Consulta directamente:
- `area_cards` del período del turno
- `orders` cerrados en el período

---

## 6. Modificadores

### 6.1 Grupos de Modificadores

| Grupo | Modificadores | Precio |
|---|---|---|
| `temperature` | ICED | Variable |
| `milk` | Leche avena, leche almendra | Variable |
| `extras` | Shot extra, descafeinado, sin azúcar | Variable |
| `food_addon` | Extras de comida | Variable |
| `note` | Nota especial | $0 |

### 6.2 Regla de Precio

El precio del modificador en `order_item_modifiers.price` es un **snapshot** del precio en el momento del pedido. Si el precio del modificador cambia en la DB, los pedidos anteriores no se ven afectados.

---

## 7. Notificaciones

### 7.1 Trigger de Notificaciones

| Evento | Quién recibe | Canal |
|---|---|---|
| Nueva card pendiente en barra | Baristas con área BAR | Push + sonido |
| Nueva card pendiente en cocina | Cocina con área KITCHEN | Push + sonido |
| Nueva tarea delivery | Delivery con área DELIVERY | Push + sonido |
| Card delivered (listo para servir) | Salón con área SALON | Sonido + badge |
| Reserva en 30 min | Salón | Banner visual |

### 7.2 Modos de Sonido

| Modo | Comportamiento |
|---|---|
| `normal` | Sonido a volumen estándar |
| `alto` | Sonido a volumen máximo |
| `cocina_ruidosa` | Sin sonido (cocina con mucho ruido) |

### 7.3 `onShift`

El usuario puede marcar que está "en turno" (`onShift: true`). Solo usuarios en turno reciben notificaciones push activas.

---

## 8. Productos

### 8.1 Tipos de Producto

| Tipo | `product_type` | Comportamiento especial |
|---|---|---|
| Estándar | `standard` | Normal |
| Desayuno | `breakfast` | Puede tener ítems combinados (combo) |
| Helado | `ice_cream` | Sección separada en UI |

### 8.2 Estados de Stock

| Estado | `stock_status` | Visible en |
|---|---|---|
| Disponible | `available` | Sin alerta |
| Bajo | `low` | Alerta amarilla en salón |
| Agotado | `out` | Alerta roja en salón, producto oculto en orden |

**Quién puede actualizar stock**: barista (su área), admin (todos).

---

## 9. Sesiones y Autenticación

### 9.1 Reglas de Sesión

- Cada dispositivo genera una sesión independiente (`sessions` table)
- No hay límite de sesiones activas por usuario
- Expiración: 30 días desde creación
- Admin puede revocar cualquier sesión individual desde `/admin/devices`
- Al revocar: `revoked_at` se actualiza; el JWT sigue siendo técnicamente válido pero el servidor lo rechaza al verificar

### 9.2 PIN

- PINs numéricos de 4–6 dígitos
- Almacenados con hash bcrypt en la DB
- Los PINs de seed (1234, 2222, etc.) son solo para desarrollo — deben cambiarse en producción

> ⚠️ **Riesgo de seguridad**: Si los PINs de seed no se cambian antes de ir a producción real, cualquier persona con acceso a este repositorio puede ingresar al sistema.
