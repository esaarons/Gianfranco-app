# PROJECT_CONTEXT.md
> Sistema Operacional Cafetería Gianfranco  
> Última actualización: 2026-06-04

---

## 1. Objetivo del Sistema

Gianfranco es un **sistema de gestión operacional interno** diseñado exclusivamente para coordinar el trabajo diario de una cafetería. No es un POS (Point of Sale). No registra ventas ni gestiona inventario contable.

**Su función principal es:**
- Organizar y distribuir comandas entre áreas de trabajo
- Comunicar en tiempo real el estado de los pedidos entre salón, barra y cocina
- Gestionar el estado de las mesas (libre, ocupada, limpieza)
- Gestionar reservas de clientes
- Coordinar pedidos para llevar y delivery
- Dar visibilidad operacional al encargado/admin en tiempo real

---

## 2. Tipo de Negocio

**Cafetería con comida**: Gianfranco opera como una cafetería premium con múltiples zonas (Salón 1, Salón 2, Terraza), servicio de barra (bebidas de café, tés, smoothies), cocina (tostadas, sandwiches, pizzas, postres) y servicio de delivery/para llevar.

**Volumen estimado actual**: 50–150 pedidos/día, 3–8 staff simultáneos.

---

## 3. Problemas que Resuelve

| Problema sin el sistema | Solución implementada |
|---|---|
| Comandas en papel perdidas o ilegibles | Comandas digitales distribuidas por área |
| Cocina/barra sin saber el estado de la mesa | Area cards en tiempo real (Supabase Realtime) |
| Encargado sin visibilidad global | Dashboard con KPIs en vivo |
| Pedidos duplicados o perdidos | Sistema de items con estado por card |
| Demoras sin comunicación | Marcador de demora con tiempo estimado |
| Reservas gestionadas por WhatsApp | Módulo de reservas integrado |
| Sin historial de operaciones | Logs de actividad por acción |

---

## 4. Usuarios Principales

| Rol | Dispositivo típico | Tarea principal |
|---|---|---|
| **Admin / Encargado** | Tablet / móvil | Supervisión global, turnos, reportes |
| **Barista** | Móvil (bar) | Ver y gestionar comandas de bebidas |
| **Cocina** | Tablet fija | Ver y gestionar comandas de cocina |
| **Servicio / Salón** | Móvil | Tomar pedidos, gestionar mesas, ver estado |
| **Delivery** | Móvil | Ver y gestionar tareas de delivery |
| **Caja** | Tablet | Vista salón, cierre de pedidos |

---

## 5. Alcance Actual (MVP v1.0)

### ✅ Implementado

- Autenticación PIN + JWT + sesiones multi-dispositivo
- Gestión de mesas: 13 mesas en 3 zonas, estados, unión de mesas
- Creación de pedidos: mesa, para llevar, delivery
- Distribución automática de comandas por área (barra / cocina)
- Area cards: flujo pending → received → delivered con tiempos
- Marcador de demora (kitchen) con razón y tiempo estimado
- Alertas de abandono: barra >5 min, cocina >8 min
- Dashboard admin con KPIs en tiempo real
- Módulo de reservas (crear, confirmar, cancelar, no-show)
- Turnos operacionales con resumen analítico
- Logs de actividad completos
- Notificaciones Push (Web Push API / VAPID)
- Notificaciones de sonido (modo normal / alto / cocina ruidosa)
- PWA instalable con splash screens para iOS/Android
- Wake lock para pantallas de cocina/barra
- Módulo de sesiones: ver y revocar por dispositivo
- Gestión de productos y modificadores (admin)
- Módulo de reportes por turno

### 🔲 Pendiente / Stub

- Gestión de personal CRUD (`/staff`)
- Configuración de usuario (`/settings`)
- Imágenes de productos (columna existe, UI incompleta)
- Split bill completo con guest labels UI
- Horarios de empleados
- Multi-local

---

## 6. Alcance Futuro

### Versión 1.1 (próximas 2 semanas)
- Refactor de navegación a Bottom Navigation global
- Corrección de bugs P0/P1 identificados en auditoría
- FloorTable.tsx nuevo componente (actualmente untracked en git)

### Versión 1.2
- Gestión de personal completa
- Horarios y asignación de turnos
- Imágenes de productos funcionales

### Versión 2.0
- Reportes operacionales avanzados con gráficos
- Métricas históricas entre turnos
- Reservas con asignación automática de mesa

### Versión 3.0
- Multi-local (múltiples cafeterías en una cuenta)
- Módulo de configuración avanzada
- Integración con sistemas de pago (solo registro, no procesamiento)

---

## 7. Stack Tecnológico (Resumen)

| Capa | Tecnología |
|---|---|
| Frontend | Next.js 16.2.6, React 19.2.4, TypeScript, Tailwind CSS v4 |
| Backend | Next.js API Routes (serverless) |
| Base de datos | Supabase (PostgreSQL) |
| Tiempo real | Supabase Realtime (WebSocket pub/sub) |
| Autenticación | JWT custom + bcryptjs PIN |
| Estado | Zustand + React Query 5 |
| Notificaciones | Web Push API (VAPID) + Service Worker |
| Hosting | Vercel |
| PWA | Service Worker + Web App Manifest |
