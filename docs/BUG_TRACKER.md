# BUG_TRACKER.md
> Sistema Operacional Cafetería Gianfranco  
> Última actualización: 2026-06-04  
> Basado en análisis estático del código — no en runtime observado

---

## Prioridades

| Prioridad | Definición |
|---|---|
| **P0** | Sistema inutilizable / pérdida de datos / riesgo de seguridad |
| **P1** | Funcionalidad crítica rota / flujo operacional bloqueado |
| **P2** | Degradación de experiencia / funcionalidad parcialmente rota |
| **P3** | Mejora de UX / deuda técnica / edge cases menores |

---

## P0 — Crítico

### BUG-001 · Seguridad: PINs de seed en producción
**Área**: Autenticación  
**Archivo**: `supabase/migrations/002_seed_tables.sql`, `008_hash_pins.sql`  
**Descripción**: Los PINs de seed (1234, 2222, 3333, 4444) están documentados en el código. Si el sistema va a producción sin cambiarlos, cualquier persona con acceso al repositorio puede ingresar.  
**Impacto**: Acceso completo al sistema como admin.  
**Fix**: Cambiar todos los PINs antes de go-live. Agregar documentación de onboarding que lo exija.  
**Estado**: Abierto

---

### BUG-002 · Seguridad: Sin RLS en Supabase
**Área**: Base de datos  
**Descripción**: La app usa `service_role` key en todas las API Routes. No hay Row Level Security activo. Si un atacante encuentra forma de hacer queries directas a Supabase (bypassing la API), tiene acceso a todos los datos.  
**Impacto**: Exposición total de datos si service_role key se filtra.  
**Fix**: Implementar RLS básico como segunda capa de defensa. Al menos para tablas con datos sensibles (users, sessions, orders).  
**Estado**: Abierto

---

### BUG-003 · Mesa "fantasma" occupied sin pedido
**Área**: Mesas / Pedidos  
**Archivo**: `api/orders/[id]/route.ts` (PATCH status=closed)  
**Descripción**: Al cerrar un pedido, la mesa NO se libera automáticamente. Si el staff olvida marcarla como limpieza → libre, la mesa queda en estado `occupied` permanentemente sin pedido activo. Esto bloquea crear nuevos pedidos en esa mesa.  
**Impacto**: Mesa inutilizable hasta que un admin la libere manualmente.  
**Reproducción**: Crear pedido en mesa → cerrar pedido → no tocar mesa → intentar crear nuevo pedido.  
**Fix**: Al cerrar pedido, cambiar mesa a `cleaning` automáticamente (o preguntar).  
**Estado**: Abierto

---

## P1 — Alta prioridad

### BUG-004 · Inconsistencia admin vs encargado en permisos API
**Área**: Autorización  
**Archivo**: `api/` routes con verificación de rol  
**Descripción**: Los roles `admin` y `encargado` están definidos como distintos en el sistema pero tienen permisos idénticos en todas las API routes. Algunas rutas verifican solo `admin`, excluyendo `encargado`.  
**Impacto**: Encargado puede ser bloqueado en acciones que debería poder hacer.  
**Fix**: Auditar todas las API routes y unificar verificación a `['admin', 'encargado']`.  
**Estado**: Abierto

---

### BUG-005 · `closed_by` no se actualiza al cerrar pedido
**Área**: Pedidos / Analytics  
**Archivo**: `api/orders/[id]/route.ts`  
**Descripción**: La migración 012 agrega `closed_by` a orders. Si la API no actualiza este campo al cerrar, los reportes de atribución por staff son incorrectos.  
**Impacto**: Métricas de cierre de pedidos incorrectas.  
**Fix**: Verificar que el PATCH de cierre incluye `closed_by: userId`.  
**Estado**: Requiere verificación en runtime

---

### BUG-006 · Realtime no funciona en iOS con app en background
**Área**: PWA / Notificaciones  
**Archivo**: `hooks/useCards.ts`, `hooks/useTables.ts`  
**Descripción**: iOS pausa WebSockets cuando la PWA pasa a background. El fallback de polling (5–60s según query) introduce latencia. En una operación activa, una card puede estar 60s sin actualizarse.  
**Impacto**: Staff de cocina o barra no ve pedidos nuevos por hasta 1 minuto.  
**Fix actual**: El polling de 5s en cards mitiga parcialmente. Pero 5s con 8 dispositivos = 96 requests/min.  
**Fix ideal**: Notificaciones Push como canal primario cuando Realtime no está disponible.  
**Estado**: Parcialmente mitigado, necesita revisión

---

### BUG-007 · Polling agresivo — sobrecarga en operación pico
**Área**: Performance  
**Archivo**: `hooks/useCards.ts`, `hooks/useTables.ts`, múltiples  
**Descripción**: React Query tiene polling activado en múltiples hooks simultáneamente:
- `cards`: 5s poll × 4 vistas posibles
- `tables`: 5s poll
- `orders`: 15s poll
- `shifts`: 60s poll

Con 8 dispositivos activos y 4 hooks por dispositivo = ~100 requests/minuto solo de polling.  
**Impacto**: Posible degradación de rendimiento en Vercel serverless (cold starts + límites de invocaciones).  
**Fix**: Aumentar intervalos de polling y confiar más en Realtime. Centralizar suscripciones Realtime.  
**Estado**: Abierto

---

### BUG-008 · Ausencia de validación para cerrar pedido con cards pendientes
**Área**: Flujo de pedidos  
**Descripción**: El sistema permite cerrar un pedido aunque haya area_cards en estado `pending` o `received`. Esto puede resultar en pedidos cerrados con ítems sin preparar.  
**Impacto**: Pedido marcado como cerrado con comida sin entregar.  
**Fix**: Agregar validación en API y advertencia en UI antes de cerrar pedido con cards activas.  
**Estado**: Abierto

---

### BUG-009 · `FloorTable.tsx` sin trackear en git
**Área**: Código  
**Archivo**: `components/tables/FloorTable.tsx`  
**Descripción**: Aparece como untracked (`??`) en git status. Nuevo componente no commiteado.  
**Impacto**: Si se pierde localmente, trabajo perdido.  
**Fix**: Integrado en el redesign de salon/page.tsx — pendiente commit.  
**Estado**: Resuelto (pendiente commit)

---

## P2 — Media prioridad

### BUG-010 · Guest labels en UI incompleta (datos existen, UI no)
**Área**: UX / Pedidos  
**Descripción**: La tabla `order_items` tiene columna `guest_label` y el `orderStore` tiene soporte de guests. La UI de creación de pedido tiene la lógica de guests, pero la visualización en area cards y la experiencia de split bill no están completas.  
**Impacto**: Feature de pedido por persona documentada pero no funcional end-to-end.  
**Fix**: Completar UI de asignación por huésped y visualización en cards.  
**Estado**: Abierto

---

### BUG-011 · Imágenes de productos sin UI funcional
**Área**: Productos  
**Descripción**: La columna `image_url` existe en products, hay migración 007 que la agrega, pero la UI de carga de imágenes y visualización en el formulario de pedidos está incompleta.  
**Impacto**: Feature no operativa.  
**Fix**: Implementar upload a Supabase Storage + visualización en ProductCard.  
**Estado**: Abierto

---

### BUG-012 · Reservas no bloquean mesas automáticamente
**Área**: Reservas  
**Descripción**: Una reserva confirmada con mesas asignadas NO cambia el estado de esas mesas a `reserved`. El staff puede crear un pedido en una mesa que tiene reserva próxima.  
**Impacto**: Conflictos operacionales (mesa ocupada cuando llega el cliente de reserva).  
**Fix**: Agregar estado `reserved` a `table_status` enum, o implementar bloqueo soft con alerta.  
**Estado**: Abierto

---

### BUG-013 · Sin límite de sesiones activas por usuario
**Área**: Seguridad / Sesiones  
**Descripción**: No hay límite de cuántas sesiones puede tener un usuario activas simultáneamente.  
**Impacto**: Si un dispositivo se pierde/roba y no se revoca, queda activo indefinidamente (30 días).  
**Fix**: Alerta visual cuando hay >3 sesiones activas. Límite configurable.  
**Estado**: Abierto

---

### BUG-014 · Cálculo de total no verifica precios actuales
**Área**: Pedidos  
**Descripción**: El total del pedido se calcula en el cliente (orderStore) usando precios de la query de productos (que tiene 2 min de caché). Si un precio se actualiza en DB mientras el carrito está abierto, el total puede estar desactualizado.  
**Impacto**: Total incorrecto en edge case. El servidor no recalcula al recibir el pedido.  
**Fix**: Recalcular total server-side al crear el pedido, rechazando si difiere >5% del enviado.  
**Estado**: Abierto

---

### BUG-015 · `activity_logs` sin política de retención
**Área**: Base de datos  
**Descripción**: La tabla activity_logs no tiene límite de filas ni política de purga. A 100 pedidos/día con ~5 logs por pedido = ~500 rows/día = ~180,000 rows/año.  
**Impacto**: Degradación de queries de logs en el tiempo. Costo de almacenamiento.  
**Fix**: Implementar purga de logs >90 días vía cron o Supabase Edge Function.  
**Estado**: Abierto

---

## P3 — Baja prioridad

### BUG-016 · /staff y /settings son stubs vacíos
**Área**: UX  
**Descripción**: Las rutas `/staff` y `/settings` existen pero no tienen contenido funcional. Si un usuario navega a ellas, ve una página vacía o en construcción.  
**Fix**: Redirigir a home o mostrar "En construcción" con ETA.  
**Estado**: Abierto

---

### BUG-017 · Roles legacy en selector de creación de usuarios
**Área**: Admin  
**Descripción**: Si el admin puede crear usuarios (cuando se implemente `/staff`), el selector de rol podría mostrar los roles legacy (`bar`, `kitchen`, `salon`) que no deben usarse.  
**Fix**: Filtrar roles legacy del selector de UI en creación de usuarios nuevos.  
**Estado**: Preventivo

---

### BUG-018 · Sin feedback de error claro en login incorrecto
**Área**: UX / Auth  
**Descripción**: El mensaje de error en login incorrecto puede ser genérico. No hay diferenciación entre "email no existe" y "PIN incorrecto" (por seguridad), pero el mensaje debe ser amigable.  
**Fix**: Revisar copy de error de login. "Email o PIN incorrectos. Intenta de nuevo."  
**Estado**: Abierto

---

### BUG-019 · Navegación sin Bottom Nav en vistas de pedido
**Área**: UX / Navegación  
**Descripción**: Las vistas `/order/[tableId]` y `/order/takeaway` actualmente pueden no tener el Bottom Navigation global definido en los guidelines de UX.  
**Fix**: Implementar Bottom Nav global en todo el layout según UI_UX_GUIDELINES.md.  
**Estado**: Pendiente de validación

---

### BUG-020 · No hay manejo explícito de turno sin iniciar
**Área**: UX  
**Descripción**: Si no hay turno activo, los KPIs en el dashboard muestran datos del último turno o vacíos. No hay alerta clara de "No hay turno activo — los datos no se están registrando".  
**Fix**: Banner prominente en dashboard admin cuando no hay turno activo.  
**Estado**: Abierto

---

## Resumen de Estado

| Prioridad | Total | Abiertos |
|---|---|---|
| P0 | 3 | 3 |
| P1 | 6 | 5 + 1 pendiente verificación |
| P2 | 6 | 6 |
| P3 | 5 | 5 |
| **Total** | **20** | **20** |
