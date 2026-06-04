# OPERATIONAL_FLOWS.md
> Sistema Operacional Cafetería Gianfranco  
> Última actualización: 2026-06-04

---

## 1. Flujo de Mesa

```
┌─────────────────────────────────────────────────────────┐
│                    FLUJO DE MESA                        │
└─────────────────────────────────────────────────────────┘

[Mesa LIBRE]
     │
     ▼
Servicio abre pedido en mesa  (/tables → /order/[tableId])
     │
     ▼
[Mesa OCUPADA]  ← Sistema actualiza tabla
     │
     ▼
Pedido procesado (cards received + delivered)
     │
     ▼
Servicio cierra pedido (PATCH /api/orders/[id] status=closed)
     │
     ▼
Servicio marca mesa como LIMPIEZA (manual)
     │
     ▼
[Mesa LIMPIEZA]
     │
     ▼
Staff marca mesa como LIBRE
     │
     ▼
[Mesa LIBRE] ← ciclo completo
```

**Actores**: Servicio, Admin  
**Pantallas**: `/tables`, `/order/[tableId]`, `/salon`

---

## 2. Flujo de Pedido

```
┌─────────────────────────────────────────────────────────┐
│                   FLUJO DE PEDIDO                       │
└─────────────────────────────────────────────────────────┘

SERVICIO/ADMIN
  │
  ├── Selecciona mesa en /tables
  │
  ▼
  Abre formulario de pedido (/order/[tableId])
  │
  ├── Navega categorías → selecciona productos
  ├── Agrega modificadores (leche, temperatura, extras)
  ├── Agrega notas por item
  ├── [Opcional] Asigna ítems por persona (guest label)
  │
  ▼
  Confirma pedido → POST /api/orders
  │
  Sistema:
  ├── Crea registro en orders{}          (status: open)
  ├── Crea order_items[] + modifiers[]
  ├── Agrupa items por area_id
  ├── Crea area_card para cada área      (status: pending)
  ├── Mesa → occupied
  └── Envía push notifications a staff del área
  │
  ▼
  ┌──────────────────────────────────────────────────┐
  │                 BARRA (/bar)                     │
  │                                                  │
  │  Card: PENDING → [Barista toca "Recibido"]       │
  │                         ↓                        │
  │  Card: RECEIVED   [Barista prepara]              │
  │                         ↓                        │
  │  Card: DELIVERED → [Barista toca "Listo"]        │
  └──────────────────────────────────────────────────┘
           │
           │  (en paralelo)
           │
  ┌──────────────────────────────────────────────────┐
  │               COCINA (/kitchen)                  │
  │                                                  │
  │  Card: PENDING → [Cocinero toca "Recibido"]      │
  │                         ↓                        │
  │  Card: RECEIVED   [Cocina prepara]               │
  │   └── [Opcional: marcar demora + razón]          │
  │                         ↓                        │
  │  Card: DELIVERED → [Cocinero toca "Listo"]       │
  └──────────────────────────────────────────────────┘
           │
           ▼
  SALÓN (/salon) ve badge "LISTO" en la mesa
           │
           ▼
  Servicio entrega al cliente
           │
           ▼
  Servicio cierra el pedido → status: closed
```

**Tiempo objetivo total**: < 15 min (bebidas < 5 min, cocina < 12 min)

---

## 3. Flujo de Para Llevar (Takeaway)

```
┌─────────────────────────────────────────────────────────┐
│                 FLUJO PARA LLEVAR                       │
└─────────────────────────────────────────────────────────┘

Servicio/Admin accede a /order/takeaway
     │
     ▼
Selecciona productos (mismo formulario que mesa)
     │
     ▼
Confirma → POST /api/orders (type: 'takeaway', table_id: null)
     │
     ▼
Sistema crea area_cards (igual que pedido de mesa)
     │
     ▼
Barra/Cocina procesa igual que pedido normal
     │
     ▼
Card DELIVERED → "Listo para retirar" visible en salón
     │
     ▼
Cliente retira → Servicio cierra pedido
```

**Diferencia vs pedido de mesa**: No está asociado a ninguna mesa. No hay cambio de estado de mesa.

---

## 4. Flujo de Delivery

```
┌─────────────────────────────────────────────────────────┐
│                  FLUJO DE DELIVERY                      │
└─────────────────────────────────────────────────────────┘

Admin crea pedido de tipo delivery
O
Admin crea tarea manual en /delivery
     │
     ▼
Sistema crea area_card para área DELIVERY (pending)
     │
     ▼
Staff de Delivery (/delivery) ve card en cola
     │
     ▼
Delivery toca "Recibido" → card: received
     │
     ▼
Delivery realiza la entrega
     │
     ▼
Delivery toca "Entregado" → card: delivered
     │
     ▼
Admin puede cerrar el pedido
```

**Actor principal**: Delivery  
**Pantalla**: `/delivery`  
**Restricción**: Solo admin puede crear tareas manuales de delivery

---

## 5. Flujo de Unión de Mesas

```
┌─────────────────────────────────────────────────────────┐
│               FLUJO UNIÓN DE MESAS                     │
└─────────────────────────────────────────────────────────┘

Admin accede a /tables
     │
     ▼
Selecciona mesa origen (con pedido) y mesa destino
     │
     ▼
Confirma unión → PATCH /api/tables/[id] (acción: join)
     │
     ▼
Sistema:
  ├── mesa hijo → parent_table_id = mesa padre
  └── [Opcional] transfiere pedido de hijo a padre
     │
     ▼
Visual en /tables: mesas agrupadas bajo la mesa padre
     │
     ▼
[Para separar]
Admin selecciona mesa hijo → "Separar mesa"
  └── PATCH /api/tables/[id] (acción: split)
      └── parent_table_id = NULL
```

---

## 6. Flujo de Cierre de Mesa

```
┌─────────────────────────────────────────────────────────┐
│               FLUJO CIERRE DE MESA                     │
└─────────────────────────────────────────────────────────┘

Mesa: OCUPADA
     │
     ▼
Servicio verifica todas las cards estén DELIVERED
     │
     ▼
Servicio cierra pedido (en /salon o /tables)
     │
     ▼
orders.status = 'closed'
orders.closed_at = now()
orders.closed_by = userId
     │
     ▼
Servicio marca mesa → LIMPIEZA (manual)
tables.status = 'cleaning'
     │
     ▼
[Staff limpia mesa físicamente]
     │
     ▼
Staff marca mesa → LIBRE
tables.status = 'free'
     │
     ▼
Mesa disponible para nuevo pedido
```

> ⚠️ **Pendiente**: No hay validación que impida cerrar un pedido con cards aún en `pending`. Se podría agregar un warning o bloqueo si hay cards sin procesar.

---

## 7. Flujo de Reservas

```
┌─────────────────────────────────────────────────────────┐
│               FLUJO DE RESERVAS                        │
└─────────────────────────────────────────────────────────┘

Admin crea reserva (/admin/reservations)
  ├── Nombre cliente, teléfono
  ├── Fecha, hora inicio/fin
  ├── Tamaño del grupo
  ├── Zona (salon1, salon2, terrace)
  ├── Tipo de menú (brunch/simple)
  └── Mesas asignadas (reservation_tables)
     │
     ▼
Reserva: PENDING
     │
     ▼
Admin confirma → status: CONFIRMED
(llamada al cliente o confirmación directa)
     │
     ▼
─── 30 MINUTOS ANTES ───────────────────
Salón ve banner de alerta: "Reserva próxima: [nombre]"
─────────────────────────────────────────
     │
     ▼
Cliente llega → Admin cambia status: IN_PROGRESS
     │
     ▼
[Staff crea pedido manualmente en la mesa correspondiente]
(No automático — debe hacerse de forma manual)
     │
     ▼
Mesa → OCUPADA (al crear el pedido)
     │
     ▼
Flujo normal de pedido (ver Flujo 2)
     │
     ▼
Al terminar → Admin cambia reserva: FINISHED
     │
     ▼
─── ALTERNATIVAS ───────────────────────
Cliente cancela → status: CANCELLED
Cliente no llega → status: NO_SHOW
─────────────────────────────────────────
```

---

## 8. Flujo de Notificaciones

```
┌─────────────────────────────────────────────────────────┐
│             FLUJO DE NOTIFICACIONES                    │
└─────────────────────────────────────────────────────────┘

REGISTRO (una vez por dispositivo):
  1. Staff abre app en dispositivo
  2. App solicita permiso de notificaciones al browser
  3. Browser genera suscripción VAPID
  4. App guarda suscripción → POST /api/push/subscribe
     con area_ids[] del usuario
  └── Guardado en push_subscriptions{}

ENVÍO (evento → notificación):
  Evento: nueva area_card creada
     │
     ▼
  Server (API Route) llama lib/webpush.ts
     │
     ▼
  webpush filtra push_subscriptions por area_id
     │
     ▼
  Envía push notification a cada dispositivo suscrito
     │
     ▼
  Service Worker (sw.js) recibe push
     │
     ▼
  Si app en foreground: toast + sonido (useSound)
  Si app en background: notificación del sistema operativo

SONIDO (client-side):
  useSound() → reproduce audio según modo:
    normal:          volumen estándar
    alto:            volumen máximo
    cocina_ruidosa:  silencio

ALERTAS VISUALES:
  PickupBanner:     cards en estado 'delivered' sin cerrar
  ReservationBanner: reservas en próximos 30 min
  UnattendedAlerts: cards pending > umbral de tiempo
```

---

## 9. Flujo de Turno

```
┌─────────────────────────────────────────────────────────┐
│                 FLUJO DE TURNO                         │
└─────────────────────────────────────────────────────────┘

Admin abre /admin/operations
     │
     ▼
"Iniciar Turno" → POST /api/shifts
  ├── Verifica que no haya turno activo
  └── Crea registro: started_at = now(), started_by = userId
     │
     ▼
[TURNO ACTIVO]
  ├── Badge "Turno activo" visible en dashboard
  ├── KPIs en tiempo real en /admin
  └── Todas las acciones quedan dentro del turno
     │
     ▼
Admin termina servicio → "Cerrar Turno"
     │
     ▼
PATCH /api/shifts/[id] (ended_at)
  ├── Consulta area_cards del período
  ├── Consulta orders cerrados del período
  ├── Calcula ShiftSummary (lib/shiftSummary.ts)
  └── Guarda summary en shifts.summary JSONB
     │
     ▼
Modal de cierre muestra resumen:
  ├── Cards totales procesadas
  ├── Tiempos promedio por área
  ├── Desempeño por staff
  └── Carga horaria
     │
     ▼
[TURNO CERRADO]
Historial visible en /admin/reports
```
