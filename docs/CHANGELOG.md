# CHANGELOG.md
> Sistema Operacional Cafetería Gianfranco  
> Formato: [Fecha] · [Versión] · [Cambio] · [Impacto] · [Responsable]

---

## Formato de Entrada

```markdown
### [YYYY-MM-DD] · v[X.Y.Z] · [Título del cambio]

**Tipo**: feat | fix | refactor | security | perf | docs | breaking
**Impacto**: Alto | Medio | Bajo
**Área**: auth | pedidos | mesas | reservas | barra | cocina | salón | delivery | admin | analytics | infra | ui
**Responsable**: [nombre o alias]
**Tickets relacionados**: BUG-XXX, FEAT-XXX

**Descripción**:
[Qué cambió y por qué]

**Archivos modificados**:
- `path/to/file.ts`

**Notas de migración** (si aplica):
[Qué debe hacer quien despliega este cambio]
```

---

## v1.0.0 — MVP inicial

### [2026-06-04] · v1.0.0 · MVP completado

**Tipo**: feat  
**Impacto**: Alto  
**Área**: global  
**Responsable**: Equipo inicial  

**Descripción**:  
MVP v1.0 completado. Sistema operacional funcional con autenticación PIN, gestión de mesas (13 mesas, 3 zonas), pedidos con distribución automática por área, area cards con flujo pending→received→delivered, dashboard admin, reservas, turnos con analítica, PWA instalable y notificaciones push.

**Migraciones incluidas**:
- 001: Schema base
- 002: Seed de mesas y usuarios
- 003–005: Productos y precios
- 006: Modificadores y merge de mesas
- 007: Imágenes de productos (columna)
- 008: Hash de PINs con bcrypt
- 009: user_areas, activity_logs, reservas
- 010: Tipo de pedido takeaway
- 011: Desayunos, infusiones, helados
- 012: Atribución ops (received_by, delivered_by, closed_by)
- 013: Area cards con ops (delay, operator_note)
- 014: Push subscriptions
- 015: Sessions multi-dispositivo

---

## Próximas entradas (plantillas)

### [YYYY-MM-DD] · v1.1.0 · Estabilización y Bottom Navigation

**Tipo**: fix + feat  
**Impacto**: Alto  
**Área**: ui, seguridad, mesas  
**Responsable**: [pendiente]

**Descripción**:  
[Completar al momento del deploy]

**Cambios esperados**:
- Implementación de Bottom Navigation global
- Auto-liberación de mesa al cerrar pedido
- Warning en cierre de pedido con cards activas
- Corrección de permisos admin/encargado

---

*Este archivo debe actualizarse con cada deploy a producción.*  
*Entries de desarrollo/staging no son obligatorias pero sí recomendadas.*
