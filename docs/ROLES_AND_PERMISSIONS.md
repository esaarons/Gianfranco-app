# ROLES_AND_PERMISSIONS.md
> Sistema Operacional Cafetería Gianfranco  
> Última actualización: 2026-06-04

---

## 1. Arquitectura de Permisos

El sistema usa **dos capas de autorización**:
1. **Role-based**: El rol del usuario determina qué rutas puede ver.
2. **Area-based**: Las áreas asignadas al usuario determinan qué datos puede acceder (cards, productos por área).

La autorización se aplica **únicamente en las API Routes** (server-side). No hay RLS en Supabase.

---

## 2. Roles Actuales

### 2.1 ADMIN

**Ruta home**: `/admin`

| Capacidad | Puede |
|---|---|
| Ver todas las mesas | ✅ |
| Crear/cerrar pedidos | ✅ |
| Ver todos los pedidos (open, closed, cancelled) | ✅ |
| Ver todas las area cards (barra, cocina, salón, delivery) | ✅ |
| Crear area cards manuales (delivery/task) | ✅ |
| Iniciar/cerrar turno | ✅ |
| Ver reportes y KPIs | ✅ |
| Gestionar productos y modificadores | ✅ |
| Ver/revocar sesiones de dispositivos | ✅ |
| Crear/gestionar reservas | ✅ |
| Ver logs de actividad | ✅ |
| Gestionar usuarios (stub `/staff`) | 🔲 pendiente |
| Unir/separar/mover mesas | ✅ |
| Marcar estado de mesa (libre/ocupada/limpieza) | ✅ |

---

### 2.2 ENCARGADO

**Ruta home**: `/admin`

Idéntico a ADMIN en la implementación actual. Comparte el mismo `homeRoute` y no tiene restricciones diferenciadas en el código.

> ⚠️ **Gap documentado**: No existe diferenciación real entre admin y encargado en la lógica de autorización. El campo `role` está presente pero las API routes no distinguen entre ambos roles de forma granular. Pendiente implementar si se requieren permisos distintos (ej: encargado no puede eliminar usuarios).

---

### 2.3 BARISTA

**Ruta home**: `/bar`  
**Área asignada**: `AREA_IDS.BAR`

| Capacidad | Puede |
|---|---|
| Ver queue de barra (area cards pendientes/recibidas/entregadas) | ✅ |
| Marcar card como received | ✅ |
| Marcar card como delivered | ✅ |
| Agregar nota de operador a card | ✅ |
| Ver stock de productos | ✅ |
| Actualizar stock de productos (available/low/out) | ✅ |
| Modo rush (cocina_ruidosa en barra) | ✅ |
| Ver otras áreas (cocina, salón, delivery) | ❌ |
| Crear pedidos | ❌ |
| Ver reportes/analytics | ❌ |
| Ver reservas | ❌ |

---

### 2.4 SERVICIO

**Ruta home**: `/salon`  
**Área asignada**: `AREA_IDS.SALON`

| Capacidad | Puede |
|---|---|
| Ver estado de todas las mesas | ✅ |
| Crear pedidos de mesa | ✅ |
| Crear pedidos para llevar (takeaway) | ✅ |
| Ver estado de cards (barra + cocina) para sus mesas | ✅ |
| Ver alertas de reservas próximas | ✅ |
| Ver alertas de stock | ✅ |
| Marcar tabla como libre/ocupada | ✅ (limitado) |
| Ver reservas | ✅ (read-only) |
| Crear/editar reservas | ❌ |
| Ver analytics/reportes | ❌ |
| Gestionar productos | ❌ |

---

### 2.5 CAJA

**Ruta home**: `/salon`  
**Área asignada**: `AREA_IDS.SALON`

Actualmente idéntico a SERVICIO en la implementación. El rol `caja` está definido pero sin diferenciación funcional en el código.

> ⚠️ **Gap documentado**: No hay distinción de permisos entre `servicio` y `caja`. Si se requiere que caja pueda cerrar pedidos pero no crearlos, necesita implementación adicional.

---

### 2.6 DELIVERY

**Ruta home**: `/delivery`  
**Área asignada**: `AREA_IDS.DELIVERY`

| Capacidad | Puede |
|---|---|
| Ver cards de delivery (pending/received/delivered) | ✅ |
| Marcar card como received | ✅ |
| Marcar card como delivered | ✅ |
| Ver detalles del pedido asociado | ✅ |
| Crear tareas de delivery (card manual) | ❌ (solo admin) |
| Ver otras áreas | ❌ |

---

### 2.7 Roles Legacy (Compatibilidad)

Estos roles existen en la base de datos para usuarios creados antes de la migración de roles. Son funcionales pero **no deben usarse para usuarios nuevos**.

| Role | Equivalente actual | Ruta home |
|---|---|---|
| `salon` | `servicio` | `/salon` |
| `bar` | `barista` | `/bar` |
| `kitchen` | — | `/kitchen` |

> La ruta `/kitchen` existe en el código pero no tiene un rol moderno equivalente. Si se necesita un rol de cocinero separado del barista, se debe crear `cocinero` en el enum.

---

## 3. Matriz de Acceso por Ruta

| Ruta | admin | encargado | barista | servicio | caja | delivery |
|---|---|---|---|---|---|---|
| `/admin` | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ |
| `/admin/products` | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ |
| `/admin/reports` | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ |
| `/admin/reservations` | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ |
| `/admin/operations` | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ |
| `/salon` | ✅ | ✅ | ❌ | ✅ | ✅ | ❌ |
| `/tables` | ✅ | ✅ | ❌ | ✅ | ✅ | ❌ |
| `/order/[tableId]` | ✅ | ✅ | ❌ | ✅ | ✅ | ❌ |
| `/bar` | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ |
| `/kitchen` | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ |
| `/delivery` | ✅ | ✅ | ❌ | ❌ | ❌ | ✅ |
| `/login` | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |

---

## 4. Implementación Técnica

### Guards en Frontend

```typescript
// components/layout/RoleGuard.tsx
// Verifica: token válido + role permitido para la ruta
// Redirige a homeRoute si el role no coincide
```

### Verificación en API

```typescript
// Patrón en cada API route:
const { userId, role, areaIds } = await verifyToken(req)
if (role !== 'admin' && role !== 'encargado') {
  return res.status(403).json({ error: 'Forbidden' })
}
```

### Mapeo role → home route (`lib/constants.ts`)

```typescript
export function homeRouteFromAreas(role: string, areaIds: string[]): string {
  if (role === 'admin' || role === 'encargado') return '/admin'
  if (areaIds.includes(AREA_IDS.SALON))         return '/salon'
  if (areaIds.includes(AREA_IDS.BAR))           return '/bar'
  if (areaIds.includes(AREA_IDS.KITCHEN))       return '/kitchen'
  if (areaIds.includes(AREA_IDS.DELIVERY))      return '/delivery'
  return ROLE_CONFIG[role as UserRole]?.homeRoute ?? '/tables'
}
```

---

## 5. Estructura Escalable para Futuros Roles

Para agregar un nuevo rol:

1. Agregar el valor al enum `UserRole` en `types/index.ts`
2. Agregar al enum SQL en Supabase (nueva migración)
3. Agregar a `ROLE_CONFIG` en `lib/constants.ts` con homeRoute y colores
4. Actualizar `homeRouteFromAreas()` si aplica
5. Actualizar `RoleGuard` en el componente de layout
6. Agregar lógica de permisos en las API routes afectadas
7. Documentar en esta tabla

### Roles Planificados (Futuro)

| Role | Descripción | Home |
|---|---|---|
| `supervisor` | Entre encargado y servicio: puede ver reportes pero no gestionar productos | `/admin` |
| `cocinero` | Separación de `/kitchen` del rol kitchen legacy | `/kitchen` |
| `mozo` | Alias limpio de `servicio` | `/salon` |
| `cajero` | Caja con permisos explícitos de cierre de pedido | `/salon` |
