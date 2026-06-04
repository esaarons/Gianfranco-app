# ROADMAP.md
> Sistema Operacional Cafetería Gianfranco  
> Última actualización: 2026-06-04

---

## Estado Actual: MVP v1.0 ✅

Sistema operacional funcional con:
- Autenticación PIN + JWT + multi-dispositivo
- Gestión de mesas (13 mesas, 3 zonas)
- Creación de pedidos (mesa, takeaway, delivery)
- Distribución automática por área (cards barra/cocina)
- Flujo pending → received → delivered
- Alertas de abandono y demora
- Dashboard admin con KPIs en tiempo real
- Módulo de reservas
- Turnos operacionales con analítica
- PWA instalable (iOS/Android)
- Notificaciones Push + sonido

---

## Versión 1.1 — Estabilización (2 semanas)

**Objetivo**: Preparar para operación real sin riesgos.

### Seguridad y Estabilidad

- [ ] **BUG-001**: Cambiar PINs de seed por PINs seguros antes de go-live
- [ ] **BUG-002**: Implementar RLS básico en Supabase como segunda capa
- [ ] **BUG-003**: Auto-liberar mesa a `cleaning` al cerrar pedido
- [ ] **BUG-005**: Verificar y corregir `closed_by` en cierre de pedidos
- [ ] **BUG-008**: Agregar warning al cerrar pedido con cards activas
- [ ] **BUG-009**: Commit o descarte de `FloorTable.tsx` (untracked)

### Navegación y UX

- [ ] Implementar Bottom Navigation global (ver UI_UX_GUIDELINES.md §2)
- [ ] Bottom Sheet "Operación" para admin/encargado
- [ ] Eliminar sidebar lateral en móvil si existe
- [ ] **BUG-020**: Banner de "Sin turno activo" en dashboard

### Performance

- [ ] **BUG-007**: Revisar intervalos de polling — aumentar a 15–30s donde Realtime cubre
- [ ] Centralizar suscripciones Realtime (evitar canales duplicados)

### Permisos

- [ ] **BUG-004**: Auditar API routes para incluir `encargado` en todas las verificaciones de admin

---

## Versión 1.2 — Completar Funcionalidades Core (4–6 semanas)

**Objetivo**: Completar features parcialmente implementadas.

### Gestión de Personal (`/staff`)

- [ ] Listado de staff activo con rol y área
- [ ] Crear nuevo usuario (email + PIN + rol + áreas)
- [ ] Editar usuario existente (cambiar PIN, rol, estado activo)
- [ ] Historial de actividad por usuario

### Configuración de Usuario (`/settings`)

- [ ] Cambio de PIN propio
- [ ] Preferencias de notificación
- [ ] Modo de pantalla (auto, claro, oscuro)

### Split Bill

- [ ] UI completa de asignación de ítems por huésped
- [ ] Visualización en area cards por huésped
- [ ] Resumen de cuenta por persona

### Imágenes de Productos

- [ ] Upload de imagen a Supabase Storage
- [ ] Visualización en formulario de pedido
- [ ] Lazy loading + placeholder

### Mejoras de Reservas

- [ ] Estado `reserved` en mesas con reserva confirmada próxima
- [ ] Conversión de reserva → pedido en un tap
- [ ] Vista de calendario de reservas

---

## Versión 2.0 — Reportes y Analítica Avanzada (2–3 meses)

**Objetivo**: Dar al encargado/admin visibilidad histórica real del negocio.

### Módulo de Reportes

- [ ] Dashboard histórico: pedidos por período (hoy, semana, mes)
- [ ] Comparativa entre turnos
- [ ] Productos más pedidos por área y período
- [ ] Tiempos de preparación por producto y barista/cocinero
- [ ] Exportación a CSV/PDF

### Métricas Operacionales

- [ ] Tiempo promedio de atención por mesa
- [ ] Pico de demanda por franja horaria
- [ ] Tasa de demoras por área y razón
- [ ] Performance individual por staff (cards procesadas, tiempos)

### Reservas Avanzadas

- [ ] Asignación automática de mesa por zona y capacidad
- [ ] Recordatorio por SMS/WhatsApp al cliente (integración externa)
- [ ] Lista de espera

### Gestión de Personal

- [ ] Horarios de trabajo por empleado
- [ ] Asignación de turnos
- [ ] Registro de llegada/salida (integrado con sesiones)

---

## Versión 2.1 — Operaciones Avanzadas (3–4 meses)

**Objetivo**: Reducir fricción operacional y agregar automatizaciones.

### Automatizaciones

- [ ] Auto-cierre de turno a hora configurada
- [ ] Notificación de stock bajo al encargado
- [ ] Resumen diario automático al cerrar

### Configuración del Negocio

- [ ] Tabla `settings` con configuración editable: nombre, zonas, límites
- [ ] Horarios de atención configurables
- [ ] Menú del día configurable

### Inventory Light

- [ ] Registro de stock inicial al inicio del turno
- [ ] Descuento de stock por producto vendido (estimado)
- [ ] Alerta cuando producto llega a umbral

---

## Versión 3.0 — Multi-local y Escalabilidad (6+ meses)

**Objetivo**: Permitir operar múltiples sucursales desde una sola plataforma.

### Arquitectura Multi-tenant

- [ ] Modelo de datos con `tenant_id` en todas las tablas
- [ ] Subdominios por local (`gianfranco1.app`, `gianfranco2.app`)
- [ ] Super admin con visibilidad cross-tenant
- [ ] Configuración independiente por local

### Gestión Centralizada

- [ ] Catálogo de productos compartido + override por local
- [ ] Reportes consolidados cross-local
- [ ] Staff compartido entre locales

### Integraciones

- [ ] Webhook outbound para integraciones externas (contabilidad, etc.)
- [ ] API pública documentada para integradores
- [ ] Integración con impresoras de tickets (opcional)

---

## Backlog sin versión asignada

- [ ] Modo quiosco para tablets fijas (sin Bottom Nav, pantalla completa)
- [ ] QR por mesa para pedido propio del cliente (futuro)
- [ ] Historial de pedidos por cliente (requiere registro de clientes)
- [ ] Integración con Google Calendar para reservas
- [ ] Alertas por WhatsApp vía Twilio para eventos críticos
- [ ] Modo offline completo con sync al reconectar
