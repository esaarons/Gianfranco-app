# TECHNICAL_AUDIT.md
> Auditoría Técnica Completa — Cafetería Gianfranco  
> Fecha: 2026-06-04  
> Basado en análisis estático del código real del proyecto

---

## 1. Qué está bien diseñado

### ✅ Arquitectura de Area Cards

El concepto de `area_cards` como unidad de trabajo por área es elegante y correcto. Un pedido puede generar múltiples cards (una por área), cada una con su propio ciclo de vida independiente. Esto desacopla correctamente la responsabilidad de barra y cocina. Los campos de timestamp (`received_at`, `delivered_at`) permiten calcular tiempos reales de operación sin lógica adicional.

### ✅ Realtime + Polling como estrategia de resiliencia

La combinación de Supabase Realtime como canal primario y polling como fallback es la estrategia correcta para una PWA en iOS. El handler de `visibilitychange` que fuerza refetch al regresar al foreground es una solución pragmática y efectiva para el problema de background/foreground en PWA.

### ✅ IDs de área fijos (hardcoded)

Usar UUIDs fijos y predecibles (`aaaaaaaa-0000-0000-0000-00000000000X`) para las áreas en lugar de UUIDs generados es una decisión deliberada y correcta para un sistema con 4 áreas fijas. Permite referenciarlos en el código sin queries adicionales y simplifica las suscripciones de Realtime. **La documentación de este patrón es crítica** (ya documentado en DATABASE_SCHEMA.md).

### ✅ Snapshot de precios en order_items

`order_items.unit_price` y `order_item_modifiers.price` almacenan el precio al momento del pedido. Esto es correcto y evita que cambios de precio futuros afecten pedidos históricos.

### ✅ Autenticación con JWT + httpOnly cookie

Almacenar el JWT en una cookie httpOnly (no accesible desde JavaScript) es la práctica más segura para PWAs. Protege contra XSS. El sistema de revocación mediante `sessions.revoked_at` agrega una capa de control que los JWTs puros no tienen.

### ✅ Zustand para estado de UI

La separación entre estado de auth (authStore), carrito de pedido (orderStore) y notificaciones (notificationStore) es limpia. La persistencia de orderStore en sessionStorage (no localStorage) es correcta: el carrito debe sobrevivir refreshes pero no entre sesiones.

### ✅ React Query con invalidación y stale-time diferenciados

Diferentes stale-times para diferentes datos (productos: 2min, modificadores: 10min, cards: 3s) refleja un entendimiento correcto de la volatilidad de cada tipo de dato.

### ✅ Sistema de turnos con ShiftSummary calculado

Calcular el `summary` al cerrar el turno (vs. calcular on-demand en cada consulta) es eficiente: el cálculo ocurre una vez, el acceso es O(1) después. La estructura del JSONB está bien tipada con `ShiftSummary` interface.

### ✅ Migraciones versionadas y ordenadas

Las 15 migraciones están ordenadas secuencialmente y son additive (no destructivas). Existe un `FULL_MIGRATION.sql` para setup desde cero. Buen patrón para trabajo en equipo.

### ✅ TypeScript estricto

El uso de tipos explícitos para enums (UserRole, OrderType, CardStatus, etc.) y los types de Supabase responses previene errores en tiempo de compilación.

---

## 2. Qué requiere refactorización

### 🔧 Polling agresivo múltiple — duplicación de carga

**Problema**: Múltiples hooks hacen polling independiente a diferentes intervalos. Con 4 áreas y 8 dispositivos, el servidor recibe ~100 requests/min solo de polling.

**Refactor propuesto**: 
- Unificar en un único hook `useRealtimeSync()` que maneje todas las suscripciones
- Aumentar intervalos de polling a 15–30s para queries con cobertura de Realtime
- Usar Realtime como única fuente de verdad para cards y tables; polling solo como heartbeat cada 30s

---

### 🔧 Sin separación entre lógica de dominio y lógica de UI en hooks

**Problema**: Los hooks como `useCards.ts` mezclan lógica de negocio (calcular urgencia, tiempo transcurrido) con lógica de data fetching.

**Refactor propuesto**: Separar en:
- `useCardsData(areaId)` — solo fetching + realtime
- `useCardUrgency(card)` — calcular nivel de alerta
- `useCardActions(cardId)` — mutaciones

---

### 🔧 API Routes sin validación de input (Zod/tipos)

**Problema**: Las API Routes validan rol y auth, pero no validan el shape del body de entrada. Un body malformado puede causar errores de DB o comportamiento inesperado.

**Refactor propuesto**: Agregar validación con Zod en todos los POST/PATCH. Especialmente crítico en `/api/orders` (crea múltiples registros relacionados).

---

### 🔧 `lib/constants.ts` mezcla config y lógica

**Problema**: `constants.ts` tiene constantes puras (AREA_IDS, colores) mezcladas con funciones de negocio (`homeRouteFromAreas`, `getOrderAnnouncementText`).

**Refactor propuesto**: Separar en:
- `lib/constants.ts` — solo constantes
- `lib/routing.ts` — lógica de redirección
- `lib/announcements.ts` — textos dinámicos

---

### 🔧 Estado de mesa no sincronizado con ciclo de pedido

**Problema**: El estado de la mesa y el estado del pedido son independientes y no se sincronizan automáticamente. Un pedido cerrado no libera su mesa.

**Refactor propuesto**: En `PATCH /api/orders/[id]` cuando `status = 'closed'`:
1. Actualizar `orders.closed_at` y `orders.closed_by`
2. Actualizar `tables.status = 'cleaning'` automáticamente
3. Emitir evento Realtime que actualice ambas vistas

---

### 🔧 `orderStore` no se limpia en errores de pedido

**Problema**: Si la creación de un pedido falla en el servidor, el carrito queda en sessionStorage con los datos del pedido fallido. El usuario puede quedar en un estado confuso.

**Refactor propuesto**: En el `onError` de la mutation de crear pedido, decidir explícitamente si limpiar o preservar el carrito. Mostrar mensaje de error claro con opción de reintentar.

---

## 3. Riesgos para 100 pedidos/día

### Riesgo BAJO — Volumen manejable con la arquitectura actual

100 pedidos/día es un volumen bajo para Vercel + Supabase. Los riesgos no son de capacidad sino de calidad operacional:

| Riesgo | Impacto | Mitigación |
|---|---|---|
| Mesas fantasma (BUG-003) | 5–10 mesas bloqueadas/día sin auto-liberación | Fix BUG-003 antes de producción |
| Total desactualizado (BUG-014) | ~1–2% de pedidos con total incorrecto (edge case) | Recalcular server-side |
| activity_logs crecimiento | ~500 rows/día = 18k/mes = manejable por ahora | Monitorear, purgar a los 6 meses |
| Cards sin cerrar al final del día | Métricas de turno incorrectas | Alerta de cards abiertas en cierre de turno |

**Conclusión**: Con 100 pedidos/día, el sistema actual es estable. Los riesgos son operacionales (mesas bloqueadas, datos incorrectos), no de escala.

---

## 4. Riesgos con múltiples usuarios simultáneos

### Escenario: 8 usuarios simultáneos (realista en hora pico)

| Riesgo | Descripción | Severidad |
|---|---|---|
| **Race condition en mesa** | Dos usuarios abren pedido en la misma mesa al mismo tiempo → dos pedidos para una mesa | Alta |
| **Race condition en turno** | Dos admins intentan iniciar turno simultáneamente → dos turnos activos | Media |
| **Realtime lag en iOS** | Un barista con iPhone no ve card nueva por 30–60s | Alta en operación |
| **Polling storm** | 8 dispositivos × 4 hooks × 5s = ~96 req/min en peaks | Media |
| **Push subscription duplicada** | Usuario re-instala PWA → múltiples subscriptions para mismo dispositivo → notificaciones duplicadas | Media |

### Race Condition de Mesa (más crítico)

```
Usuario A abre mesa M3 en /order/M3  (mesa: free)
Usuario B abre mesa M3 en /order/M3  (mesa: free, aún no actualizado)
Usuario A confirma pedido → mesa: occupied
Usuario B confirma pedido → crea segundo pedido en mesa occupied
```

**Fix**: 
1. En `POST /api/orders`, verificar con `SELECT FOR UPDATE` o una transacción atómica que la mesa esté en estado `free` antes de crear el pedido.
2. Si la mesa ya está `occupied`, retornar error 409 Conflict.

### Race Condition de Turno

La API de shifts tiene verificación de turno activo, pero no usa transacción. Con dos requests simultáneos, ambos podrían pasar la verificación.

**Fix**: Usar `INSERT INTO shifts ... WHERE NOT EXISTS (SELECT 1 FROM shifts WHERE ended_at IS NULL)` en una sola query atómica.

---

## 5. Mejoras antes de producción real

### Críticas (deben estar antes del go-live)

1. **Cambiar PINs de seed** — Crear proceso de onboarding que exija esto
2. **Fix BUG-003** — Auto-liberar mesa al cerrar pedido
3. **Fix race condition de mesa** — SELECT FOR UPDATE en creación de pedido
4. **Verificar campos de atribución** — `closed_by`, `received_by`, `delivered_by` se actualizan correctamente
5. **Revisar variables de entorno** — `JWT_SECRET`, `SUPABASE_SERVICE_ROLE_KEY` y `VAPID_PRIVATE_KEY` deben ser secretos fuertes en producción (no los de desarrollo)

### Importantes (primera semana de operación)

6. **Bottom Navigation global** — Sin esto, la navegación móvil es inconsistente
7. **Warning en cierre con cards activas** — Evitar pedidos cerrados con comida sin entregar
8. **Banner "Sin turno activo"** — Los datos de KPIs no tienen sentido sin turno
9. **Revisar intervalos de polling** — Reducir carga de servidor

### Recomendadas (primera quincena)

10. **RLS básico en Supabase** — Segunda capa de seguridad
11. **Política de retención en activity_logs** — Cron que elimina logs >90 días
12. **Monitoreo de errores** — Integrar Sentry o similar para errores en producción

---

## 6. Acciones priorizadas — Próximas 2 semanas

### Semana 1 (2026-06-04 → 2026-06-11)

| Día | Acción | Prioridad | Tiempo est. |
|---|---|---|---|
| Lun | Commit `FloorTable.tsx` o descarte (BUG-009) | P1 | 30 min |
| Lun | Fix: auto-liberar mesa al cerrar pedido (BUG-003) | P0 | 2h |
| Lun-Mar | Fix: race condition en creación de pedido (§4) | P0 | 3h |
| Mar | Fix: incluir `encargado` en verificaciones de admin (BUG-004) | P1 | 2h |
| Mié | Fix: race condition en inicio de turno (§4) | P1 | 1h |
| Mié-Jue | Implementar Bottom Navigation global (UI_UX_GUIDELINES §2) | P1 | 6h |
| Vie | Fix: warning al cerrar pedido con cards activas (BUG-008) | P1 | 2h |
| Vie | Banner "Sin turno activo" en dashboard (BUG-020) | P2 | 1h |

### Semana 2 (2026-06-11 → 2026-06-18)

| Día | Acción | Prioridad | Tiempo est. |
|---|---|---|---|
| Lun | Revisar y reducir intervalos de polling (BUG-007) | P1 | 2h |
| Lun-Mar | Agregar validación Zod en API routes críticas (orders, cards) | P1 | 4h |
| Mar | Verificar `closed_by` se actualiza correctamente (BUG-005) | P1 | 1h |
| Mié | Implementar RLS básico en Supabase (tablas críticas) | P0 | 4h |
| Mié | Documentar proceso de cambio de PINs para producción | P0 | 1h |
| Jue | Integrar Sentry u otro servicio de monitoreo de errores | P2 | 2h |
| Jue-Vie | Tests de carga simulados: 8 usuarios concurrentes, 20 pedidos simultáneos | P1 | 4h |
| Vie | Review de seguridad de variables de entorno en Vercel | P0 | 1h |

---

## 7. Inconsistencias código vs documentación previa

| Inconsistencia | Descripción |
|---|---|
| Rol `kitchen` sin equivalente moderno | El rol legacy `kitchen` existe pero no hay rol `cocinero` moderno. La ruta `/kitchen` sirve a este rol, pero no debería usarse para usuarios nuevos. |
| `settings` tabla sin uso | Creada en migraciones pero sin ninguna query que la use. |
| `assigned_to` en area_cards sin UI | El campo existe y hay FK correcta, pero no hay UI para asignar manualmente una card a un staff. |
| Roles `caja` y `servicio` idénticos | Documentados como distintos pero implementados igual. |
| `image_url` en products sin upload funcional | Columna y migración existen, pero no hay endpoint de upload ni UI. |
