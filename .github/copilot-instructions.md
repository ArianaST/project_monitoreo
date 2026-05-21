# GitHub Copilot Instructions — MonitoreoTremor App (Tesis Maestría)

## ¿Qué es este proyecto?
App hibrida de monitoreo de temblor para pacientes con parkinson. Registra tomas de medicacion antes y despues de cada toma maneja los estados correctamente, captura tappings, lee el acelerómetro del celular para medir el temblor y envía alertas al médico por correo cuando este empeorando despues de un tiempo el paciente. Tiene dos interfaces separadas: app móvil híbrida para el paciente accesible con correctos manejos de logos colores.
---

## Stack tecnológico 

### App Paciente (híbrida móvil)
- **Vue 3** con Composition API (`<script setup lang="ts">`)
- **Quasar Framework** para componentes UI mobile-first
- **Tailwind CSS** para estilos utilitarios (instalado junto a Quasar)
- **Capacitor** como puente a hardware nativo
- **Pinia** para manejo de estado global

Plugins de Capacitor en uso:
- `@capacitor/motion` → acelerómetro
- `@capacitor/camera` → grabación de video tapping
- `@capacitor/local-notifications` → alertas locales
- `@capacitor/network` → detección de conexión para sync offline
- `@capacitor/preferences` → almacenamiento temporal offline

### Dashboard Médico (web SPA)
- **Vue 3** + **Quasar** (modo SPA) + **Pinia** + **Tailwind CSS**
- **ApexCharts** + `vue3-apexcharts` para gráficas de series de tiempo

### Backend
- **Node.js** + **Express** (TypeScript, clases, inyección manual de dependencias)
- **Firebase Auth** → autenticación con roles (paciente / médico)
- **Firebase Storage** → almacenamiento de videos
- **Firebase Realtime Database** → stream en vivo de datos al médico
- **Nodemailer + Gmail SMTP** → envío de alertas por correo al médico

### Base de datos
- **PostgreSQL** → almacenamiento histórico estructurado
- **Firestore** → sincronización offline y datos en tiempo real

---

## Arquitectura y estructura de carpetas

```
/
├── app-paciente/          # Vue 3 + Quasar + Capacitor
│   ├── src/
│   │   ├── components/
│   │   ├── pages/
│   │   ├── stores/        # Pinia stores
│   │   ├── composables/   # lógica reutilizable (acelerómetro, cámara, etc.)
│   │   └── services/      # llamadas al backend / Firebase
│
├── web-medico/            # Vue 3 + Quasar SPA
│   ├── src/
│   │   ├── components/
│   │   ├── pages/
│   │   ├── stores/
│   │   └── services/
│
└── backend/               # Node.js + Express + TypeScript
    ├── src/
    │   ├── routes/        # funciones que retornan Router
    │   ├── services/      # lógica de negocio (clases)
    │   ├── repositories/  # acceso a datos (clases)
    │   └── shared/        # tipos, helpers, errores
```

---

## UI/UX — Reglas estrictas para componentes

### Estructura de cada componente Vue
Todo componente debe estar completo en un solo archivo `.vue` con las tres secciones:
```vue
<template>   <!-- HTML con clases Tailwind + componentes Quasar -->
<script setup lang="ts">   <!-- lógica con Composition API -->
<style scoped>   <!-- solo si se necesita algo que Tailwind no cubre -->
```

### Paleta de colores (usar siempre estas variables)
```js
// tailwind.config.js
colors: {
  primary:   '#1A73E8',  // azul médico principal
  secondary: '#34A853',  // verde estado OK / activo
  warning:   '#FBBC04',  // amarillo alerta leve
  danger:    '#EA4335',  // rojo alerta crítica / off
  neutral:   '#F8F9FA',  // fondo claro
  dark:      '#1E293B',  // texto principal
  muted:     '#94A3B8',  // texto secundario
}
```

### Tipografía
- Fuente principal: **Inter** (importar desde Google Fonts)
- Tamaño mínimo de texto: `text-base` (16px)
- Títulos de sección: `text-xl font-semibold text-dark`
- Texto secundario: `text-sm text-muted`

### Tamaños y espaciado para app paciente (mobile)
- Botones de acción principal: mínimo `h-14` (56px) con `text-lg font-medium`
- Padding de tarjetas: `p-5` o `p-6`
- Espacio entre secciones: `space-y-4` o `gap-4`
- Bordes redondeados: `rounded-2xl` para tarjetas, `rounded-xl` para botones

### Componentes Quasar + Tailwind — cómo combinarlos
- Usar componentes Quasar (`QCard`, `QBtn`, `QList`, etc.) como base estructural
- Aplicar clases Tailwind para espaciado, colores y tipografía encima
- NO duplicar lo que Quasar ya hace (no reinventar QBtn con divs)
- Ejemplo correcto:
```vue
<QBtn
  class="w-full h-14 rounded-xl bg-primary text-white text-lg font-medium
         shadow-md active:scale-95 transition-transform"
  @click="startRecording"
>
  Iniciar registro
</QBtn>
```

### Feedback visual obligatorio en cada componente
- Estados de carga: usar `QSkeleton` de Quasar mientras cargan datos
- Acelerómetro activo: punto pulsante rojo con `animate-pulse` siempre visible
- Errores: banner rojo con mensaje claro, nunca solo console.log
- Éxito: feedback visual mínimo 2 segundos antes de navegar

### App Paciente — patrones de UI específicos
- Pantalla principal: estado ON/OFF del día debe ser el elemento más grande y visible
- Botón "Iniciar registro": `bg-secondary` (verde) cuando está disponible
- Botón "Detener": `bg-danger` (rojo) cuando está grabando
- Indicador grabación activa: punto rojo `animate-pulse` en esquina superior derecha
- Historial del día: lista de tarjetas `QCard` con hora inicio, hora fin y duración
- Navegación: `QTabsBar` fijo en la parte inferior (patrón móvil estándar)

### Dashboard Médico — patrones de UI específicos
- Layout: sidebar fijo izquierda (lista pacientes) + área principal (gráficas y detalle)
- Badge de alertas no leídas actualizado en tiempo real via Firestore
- Tarjeta por paciente: nombre, última sesión, estado actual, botón "Ver detalle"
- Gráficas ApexCharts: `primary` para temblor, `danger` para alertas, fondo `neutral`
- Tablas de historial: `QTable` de Quasar con paginación

---

## Convenciones de código

### Vue 3
- Siempre `<script setup lang="ts">`
- Composables con prefijo `use` (ej. `useAccelerometer`, `useTappingVideo`)
- Props y emits siempre tipados con TypeScript
- Stores Pinia con `defineStore` y Composition API (no Options API)
- Un componente = una responsabilidad

### Backend (Express + TypeScript)
- Clases para servicios y repositorios (ej. `TremorService`, `PostgresTremorRepository`)
- Rutas como funciones que retornan `Router` (ej. `createTremorRoutes`)
- Error shape estándar: `{ error: { code: string, message: string } }`
- Validación de inputs en el servicio, no en la ruta
- JSON únicamente en todas las respuestas

### Naming
- Componentes Vue: PascalCase (`TremorChart.vue`, `SessionCard.vue`)
- Composables: camelCase con prefijo `use` (`useMotionSensor.ts`)
- Stores Pinia: camelCase con sufijo `Store` (`tremorStore`, `sessionStore`)
- Rutas API: kebab-case (`/api/tremor-sessions`, `/api/alerts`)
- Tablas PostgreSQL: snake_case (`tremor_records`, `monitoring_sessions`)
- Clases Tailwind: ordenar → layout → spacing → typography → colors → effects

---

## Base de datos — Esquema principal

```sql
-- PostgreSQL
usuarios            (id, nombre, email, rol: 'paciente'|'medico', medico_id_fk)
sesiones_monitoreo  (id, paciente_id, fecha, hora_inicio, hora_fin, estado: 'on'|'off')
registros_temblor   (id, sesion_id, timestamp, eje_x, eje_y, eje_z, intensidad)
videos_tapping      (id, paciente_id, fecha, url_storage, duracion_seg)
alertas             (id, paciente_id, medico_id, tipo, mensaje, enviada_at, vista_at)
```

```
// Firestore
temblor_live/{paciente_id}/   → stream en vivo para el médico
sync_queue/{paciente_id}/     → datos offline esperando subir
```

---

## Flujos clave a respetar

### Registro de temblor (paciente)
1. Pantalla principal: estado ON/OFF del día con botón grande centrado
2. "Iniciar registro" → activa acelerómetro → punto rojo pulsante visible
3. Datos → Firestore (tiempo real) + cola offline simultáneamente
4. "Detener" → cierra sesión → sube a PostgreSQL via backend
5. Sin internet → `@capacitor/preferences` → sincroniza al reconectar

### Alerta al médico
1. Backend detecta umbral o paciente activa alerta manual
2. Guarda en `alertas` (PostgreSQL)
3. Nodemailer envía correo al médico vinculado
4. Badge del dashboard se actualiza en tiempo real via Firestore

### Video de tapping
1. Paciente graba con `@capacitor/camera`
2. Comprime antes de subir
3. Sube a Firebase Storage → URL guardada en PostgreSQL

---

## Lo que Copilot NO debe hacer
- No sugerir React, Angular ni otros frameworks
- No usar Options API de Vue (solo Composition API `<script setup>`)
- No crear tests unitarios salvo que se pidan
- No usar `var`, siempre `const` o `let`
- No escribir lógica de negocio dentro de componentes Vue
- No mezclar lógica de Firestore y PostgreSQL en el mismo archivo
- No generar componentes sin clases Tailwind — siempre completos y estilizados
- No usar colores hardcodeados — siempre clases de la paleta definida
- No generar botones menores a `h-12` en la app paciente

---

## Comandos del proyecto

```bash
# App paciente
cd app-paciente && npm run dev
npx quasar dev -m capacitor -T android
npx quasar dev -m capacitor -T ios

# Web médico
cd web-medico && npm run dev

# Backend
cd backend && npm run dev     # hot reload
cd backend && npm run build   # tsc → dist/
cd backend && npm run start   # producción
cd backend && npm test        # Jest + supertest
```


## Contexto de tesis
Este proyecto es parte de una tesis de maestría sobre monitoreo de trastornos del movimiento (tracking). El repositorio principal es `ArianaST/project_monitoreo`. Priorizar código claro, bien comentado en español y documentable para la tesis.
