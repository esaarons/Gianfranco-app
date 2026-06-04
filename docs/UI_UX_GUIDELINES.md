# UI_UX_GUIDELINES.md
> Sistema Operacional Cafetería Gianfranco  
> Última actualización: 2026-06-04  
> Plataforma principal: PWA Mobile First (Android, iPhone, Tablets)

---

## 1. Principios UX

### 1.1 Prioridades de Diseño

1. **Velocidad de acción** — El staff opera con las manos ocupadas. Cada acción crítica debe completarse en ≤ 2 taps.
2. **Legibilidad a distancia** — Pantallas de cocina/barra se ven desde 50–80 cm. Texto mínimo 16px, botones mínimo 44px.
3. **Estado siempre visible** — El usuario nunca debe preguntarse "¿qué pasó?". Feedback visual inmediato en cada acción.
4. **Sin ambigüedad** — Íconos siempre acompañados de texto en acciones críticas. No usar íconos solos para destructive actions.
5. **Resistente a ruido** — Alertas sonoras múltiples modos. Visual como fallback.

### 1.2 Anti-patrones Prohibidos

- ❌ Sidebar lateral en móvil (reemplazado por Bottom Navigation)
- ❌ Dropdowns anidados en vistas de operación
- ❌ Modales sobre modales (máximo 1 nivel de modal)
- ❌ Formularios largos sin scroll evidente
- ❌ Acciones destructivas sin confirmación
- ❌ Texto de menos de 14px en cualquier vista operacional

---

## 2. Navegación Global — Bottom Navigation

### 2.1 Estructura Obligatoria

**Todas las pantallas** deben tener Bottom Navigation con 4 tabs:

```
┌──────────────────────────────────────────────────────┐
│                   CONTENIDO                          │
│                                                      │
│                                                      │
├──────────────────────────────────────────────────────┤
│  🏠 Inicio  │  ⚡ Operación  │  📋 Pedidos  │  ⋯ Más  │
└──────────────────────────────────────────────────────┘
```

| Tab | Ícono | Contenido | Roles que lo ven |
|---|---|---|---|
| **Inicio** | Home | Dashboard / vista principal del rol | Todos |
| **Operación** | Bolt/Flash | Bottom Sheet con áreas (ver 2.2) | Admin, Encargado |
| **Pedidos** | ClipboardList | Lista de pedidos activos | Servicio, Admin |
| **Más** | Menu | Configuración, logout, perfil | Todos |

### 2.2 Bottom Sheet "Operación"

Al tocar el tab "Operación", se abre un Bottom Sheet con acceso rápido a:

```
┌──────────────────────────────────────────────────────┐
│  ━━━━━━━ (handle)                                    │
│                                                      │
│  ÁREAS DE TRABAJO                                    │
│  ┌──────────┐  ┌──────────┐                         │
│  │  Salón   │  │  Barra   │                         │
│  └──────────┘  └──────────┘                         │
│  ┌──────────┐  ┌──────────┐                         │
│  │  Cocina  │  │ Delivery │                         │
│  └──────────┘  └──────────┘                         │
│                                                      │
│  ACCIONES RÁPIDAS                                    │
│  ○ Pedidos activos                                   │
│  ○ Nueva reserva                                     │
│  ○ Estado de mesas                                   │
└──────────────────────────────────────────────────────┘
```

### 2.3 Reglas de Navegación

- El tab activo tiene color primario + label visible
- Tabs inactivos en gris neutro con label
- Badge numérico sobre tab para contadores (ej: "3 pedidos pendientes")
- Back navigation: swipe-back en iOS, botón atrás en Android (no flechas custom en header)
- **NO** usar sidebar/hamburger en ninguna vista móvil

---

## 3. Paleta de Colores

### 3.1 Colores Base

| Token | Hex | Uso |
|---|---|---|
| `primary` | `#1E3541` | Headers, texto principal, botones primarios |
| `cream` | `#F5F1E8` | Fondos principales |
| `bg` | `#F7F5F0` | Background de página |
| `border` | `#E7E1D8` | Bordes de cards y separadores |
| `text-muted` | `#A9A39C` | Texto secundario, placeholders |

### 3.2 Colores por Área

| Área | Color | Hex |
|---|---|---|
| Barra | Dorado cálido | `#EAD9B1` |
| Cocina | Pizarra | `#6B9CA8` |
| Salón | Salvia | `#A7B897` |
| Delivery | Pizarra | `#6B9CA8` |
| Admin | Óxido | `#C46F4E` |

### 3.3 Colores de Estado

| Estado | Color | Hex |
|---|---|---|
| `pending` | Ámbar | `#E08A50` |
| `received` | Azul | `#6D9EEB` |
| `delivered` | Verde | `#9DAA7D` |
| Warning (>5 min) | Naranja | `#C98933` |
| Urgent (>8 min) | Rojo | `#B8574E` |

### 3.4 Estados de Mesa

| Estado | Color de fondo | Color borde |
|---|---|---|
| `free` | `bg-gray-100` | `border-gray-300` |
| `occupied` | `bg-emerald-50` | `border-emerald-400` |
| `cleaning` | `bg-gray-700` | `border-gray-500` |

---

## 4. Tipografía

| Variable | Font | Peso | Tamaño mínimo |
|---|---|---|---|
| Fuente principal | Space Grotesk | 400–700 | 14px |
| Títulos de página | Space Grotesk | 700 | 20px |
| Subtítulos | Space Grotesk | 600 | 16px |
| Texto operacional (cards) | Space Grotesk | 500 | 15px |
| Labels de estado | Space Grotesk | 600 | 13px (con background) |
| Contador de tiempo | Space Grotesk | 700 | 20px (kitchen/bar) |

**Regla**: Nunca usar texto < 13px en interfaces táctiles.

---

## 5. Espaciados

Sistema basado en múltiplos de 4px (Tailwind scale):

| Token | Valor | Uso |
|---|---|---|
| `xs` | 4px | Gaps mínimos entre íconos y texto |
| `sm` | 8px | Padding interno de badges/labels |
| `md` | 16px | Padding estándar de cards |
| `lg` | 24px | Espaciado entre secciones |
| `xl` | 32px | Márgenes de página |
| `2xl` | 48px | Separación de grupos mayores |

**Safe areas**: Siempre respetar `safe-area-inset-bottom` para Bottom Navigation en iPhone (notch/home indicator).

---

## 6. Botones

### 6.1 Tipos

| Variante | Uso | Altura mínima |
|---|---|---|
| **Primary** | Acción principal (Confirmar, Enviar pedido) | 48px |
| **Secondary** | Acción alternativa (Cancelar, Editar) | 44px |
| **Destructive** | Eliminar, Cancelar pedido | 44px + confirmación |
| **Ghost** | Acciones secundarias en contexto | 40px |
| **Icon-only** | Solo en headers/toolbars, nunca en acciones críticas | 44×44px |

### 6.2 Estados de Botón

```
Normal → Hover/Focus → Active → Loading → Disabled
```

- **Loading**: spinner + texto "Cargando..." — nunca dejar el botón inactivo sin feedback
- **Disabled**: opacidad 40%, cursor not-allowed
- Mínimo touch target: 44×44px (Apple HIG) incluso si visualmente más pequeño

### 6.3 Botones de Area Cards

```
┌─────────────────────────────────┐
│  [✓ Recibido]    [↑ Entregado]  │  ← Primarios, full-width en mobile
└─────────────────────────────────┘
```

Los botones de cards deben ser full-width en móvil para facilitar el tap en entornos ocupados.

---

## 7. Cards

### 7.1 Area Card (Kanban)

```
┌─────────────────────────────────────────────┐
│  Mesa M3  ·  12:34  ·  ⏱ 8 min  [URGENTE]  │  ← header
├─────────────────────────────────────────────┤
│  2× Cappuccino                              │
│     + Leche avena                           │
│  1× Matcha latte (ICED)                     │
├─────────────────────────────────────────────┤
│  📝 Nota: Sin azúcar por favor              │  ← operator note
├─────────────────────────────────────────────┤
│  [✓ Recibido]          [↑ Entregado]        │  ← actions
└─────────────────────────────────────────────┘
```

**Colores de borde por urgencia**:
- Normal: gris claro
- Warning (>5 min): `#C98933` ámbar
- Urgent (>8 min): `#B8574E` rojo, con animación de pulso

### 7.2 Card de Mesa

```
┌──────────┐
│    M1    │  ← código grande, legible a 60cm
│  4/4 💺  │  ← ocupación
│  ● OCUP. │  ← estado con color
└──────────┘
```

### 7.3 Card de Producto

```
┌────────────────────┐
│  Cappuccino    $8  │
│  ☕ Café        [+]│  ← botón de agregar
└────────────────────┘
```

---

## 8. Modales y Bottom Sheets

### 8.1 Reglas Generales

- Máximo **1 nivel** de modal activo
- Siempre incluir `X` o "Cancelar" claramente visible
- Bottom Sheets en lugar de modales centrados en móvil (más natural para el pulgar)
- Backdrop semi-transparente (no opaco) para mantener contexto

### 8.2 Tipos

| Tipo | Uso | Comportamiento |
|---|---|---|
| **Bottom Sheet** | Acciones rápidas, selecciones | Swipe down para cerrar |
| **Dialog Modal** | Confirmaciones destructivas | Solo cerrar con botones |
| **Toast** | Feedback de acciones completadas | Auto-dismiss 3–4s |
| **Alert Banner** | Estado persistente (reservas, stock) | Permanece hasta resolver |

### 8.3 Bottom Sheet — Selección de Modificadores

```
┌───────────────────────────────────────────┐
│  ━━━━━━━ (handle — swipe para cerrar)     │
│  TEMPERATURA                              │
│  ○ Caliente (incluido)                   │
│  ● Frío +$0.50 ←── seleccionado           │
│  LECHE                                    │
│  ○ Regular                                │
│  ○ Avena +$1.00                           │
│  [Confirmar modificadores]                │
└───────────────────────────────────────────┘
```

---

## 9. Estados de UI

Toda vista con datos asíncronos debe manejar:

| Estado | UI |
|---|---|
| **Loading** | Skeleton loader (no spinner de página completa) |
| **Error** | Card de error con botón "Reintentar" |
| **Empty** | Ilustración + texto descriptivo (no pantalla en blanco) |
| **Offline** | Banner "Sin conexión — última actualización: X" |
| **Stale** | Indicador sutil de datos desactualizados |

---

## 10. Animaciones

| Contexto | Animación | Duración |
|---|---|---|
| Nuevo card en queue | Slide-in desde arriba + flash de color | 300ms |
| Card marcado como delivered | Fade-out + verde → desaparece | 400ms |
| Estado urgente | Pulso de borde rojo | 2s loop |
| Bottom Sheet abrir/cerrar | Spring up/down | 300ms |
| Toast notificación | Slide-in desde arriba/abajo | 250ms |
| Carga de página | Skeleton fade-in | 200ms |

**Principio**: Animaciones funcionales, no decorativas. Comunican cambio de estado. Nunca bloquean la interacción.

---

## 11. Consideraciones Específicas por Plataforma

### 11.1 iOS (PWA)

- Respetar `env(safe-area-inset-bottom)` para Bottom Nav
- Splash screens configurados para todos los modelos de iPhone/iPad
- `apple-mobile-web-app-capable: yes` en meta tags
- Status bar: `apple-mobile-web-app-status-bar-style: default`
- Evitar `position: fixed` sin safe-area — se superpone con home indicator

### 11.2 Android

- Manifest configurado con `display: standalone`
- Tema de la barra de estado: `#1E3541`
- Touch feedback: ripple effect en botones
- `overscroll-behavior: none` en vistas de queue para evitar pull-to-refresh accidental

### 11.3 Tablets

- Layout de 2 columnas disponible (breakpoint `md:` = 768px)
- En cocina/barra con tablet fija: vista optimizada sin Bottom Nav (modo quiosco)
- Wake lock activo para evitar que la pantalla se apague

---

## 12. Accesibilidad

- Contraste mínimo WCAG AA (4.5:1) para texto normal
- Focus visible en todos los elementos interactivos (no eliminar outline)
- Roles ARIA en modales y bottom sheets
- Botones con labels descriptivos (no solo íconos)
- Soporte de screen reader en flujos críticos (crear pedido, cerrar mesa)
