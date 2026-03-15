# Context — Kriyā

Documento técnico para retomar el proyecto con una IA o desarrollador externo.

---

## Qué es esto

Aplicación web PWA (Progressive Web App) para gestión de clases de yoga. Uso personal de una profesora freelance. No requiere login. Se instala en el móvil desde el navegador como si fuera una app nativa.

---

## Stack técnico

| Capa | Tecnología | Por qué |
|---|---|---|
| Framework | Next.js 14 (App Router) | Cero configuración, deploy directo en Vercel |
| UI | React 18 + CSS global | Sin librerías de componentes, control total del diseño |
| Tipado | TypeScript | Seguridad en los tipos de datos |
| Datos | localStorage | MVP sin backend. Clave: `kriya_data` |
| Deploy | Vercel | CI/CD automático desde GitHub, tier gratuito suficiente |
| PWA | manifest.json + service worker | Instalable en iOS/Android desde Safari/Chrome |

---

## Estructura del proyecto

```
kriya/
├── src/
│   ├── app/
│   │   ├── layout.tsx        # Root layout, meta PWA, registro service worker
│   │   ├── page.tsx          # Entrada de la app, router de pantallas
│   │   └── globals.css       # Todos los estilos, design tokens como variables CSS
│   ├── components/
│   │   ├── BottomNav.tsx     # Navegación inferior (Clases / Alumnas / Finanzas)
│   │   ├── HomeScreen.tsx    # Vista semanal de clases + FAB nueva clase
│   │   ├── ClaseScreen.tsx   # Detalle de clase, lista alumnas, cambio estado; estado de sala usa toggle switch (no badge)
│   │   ├── AlumnasScreen.tsx # Directorio de alumnas
│   │   ├── AlumnaDetalle.tsx # Ficha alumna + historial + notas
│   │   ├── FinanzasScreen.tsx# Resumen financiero por mes; lista de meses con orden fijo (mes actual siempre primero), solo cambia selección visual
│   │   └── Sheet.tsx         # Bottom sheet reutilizable
│   ├── hooks/
│   │   └── useStore.ts       # Estado global, todas las mutaciones de datos
│   └── lib/
│       ├── types.ts          # Interfaces TypeScript (Sala, Clase, Alumna, Inscripcion)
│       └── data.ts           # localStorage I/O, seed data, helpers de cálculo
├── public/
│   ├── manifest.json         # PWA manifest
│   ├── sw.js                 # Service worker (cache offline)
│   ├── icon-192.png          # Icono PWA (hay que añadirlo manualmente)
│   └── icon-512.png          # Icono PWA grande (hay que añadirlo manualmente)
├── BUSINESS_RULES.md         # Lógica de negocio y flujos de usuario
├── CONTEXT.md                # Este archivo
├── next.config.js            # Config Next.js (output: export para static)
├── package.json
└── tsconfig.json
```

---

## Arquitectura de datos

### Modelo (src/lib/types.ts)

```ts
Sala        { id, nombre, direccion }
Clase       { id, nombre, fecha, hora, salaId, capacidad, costeSala, salaPagada }
Alumna      { id, nombre, tel, notas }
Inscripcion { id, claseId, alumnaId, estado, reserva, total }
```

### Persistencia

Todo el estado vive en `AppData` (objeto con arrays de las 4 entidades). Se serializa/deserializa de localStorage en cada operación. El hook `useStore` es el único punto de escritura — nunca se escribe localStorage directamente desde los componentes.

### Flujo de datos

```
localStorage → loadData() → useStore (useState) → componentes
componentes → mutación en useStore → saveData() → localStorage
```

---

## Design system

Paleta definida como variables CSS en `globals.css`:

| Variable | Valor | Uso |
|---|---|---|
| `--olive` | #3d4a2e | Headers, nav activo |
| `--terracota` | #b85c38 | Botones primarios, FAB |
| `--cream` | #f5f0e8 | Fondo general |
| `--cream-dark` | #f0ebe0 | Cards de finanzas |
| `--green-light` | #c8d9a0 | Métricas positivas, mes activo |
| `--border` | #e8e0d0 | Bordes de cards |

Tipografías:
- **Cormorant Garamond** — títulos de pantalla (serif, elegante)
- **DM Sans** — todo lo demás (sans-serif, legible)

---

## Cómo añadir una nueva pantalla

1. Crear `src/components/NuevaScreen.tsx`
2. Añadir el tipo a `Screen` en `src/app/page.tsx`
3. Añadir el render condicional en `page.tsx`
4. Si tiene tab propio, añadir a `Tab` y a `BottomNav.tsx`

---

## Cómo añadir un nuevo campo a una entidad

1. Añadir el campo a la interfaz en `src/lib/types.ts`
2. Añadir el campo al seed data en `src/lib/data.ts`
3. Añadir la mutación correspondiente en `src/hooks/useStore.ts`
4. Actualizar el formulario en el componente correspondiente

---

## Migración a backend (cuando se necesite)

Solo hay que tocar dos archivos:

- `src/lib/data.ts` → reemplazar funciones `loadData` / `saveData` por llamadas a API
- `src/hooks/useStore.ts` → hacer las funciones async, añadir estados `isLoading` / `error`

El resto del proyecto (componentes, tipos, CSS) no cambia.

Backend recomendado: **Supabase**. El schema de tablas es 1:1 con las 4 entidades del modelo.

---

## PWA — instalación en móvil

### iOS (Safari)
1. Abrir la URL en Safari
2. Pulsar el icono de compartir
3. "Añadir a pantalla de inicio"
4. Se instala con el icono y nombre definidos en `manifest.json`

### Android (Chrome)
Chrome muestra automáticamente un banner de instalación.

### Iconos pendientes
Los archivos `icon-192.png` e `icon-512.png` en `/public` deben crearse manualmente. Tamaños: 192×192 y 512×512 px. Fondo `#3d4a2e`, símbolo en `#f0ebe0`.

---

## CI/CD

Push a rama `main` en GitHub → Vercel detecta el cambio → build automático → deploy.

No hay tests configurados en MVP. Si se añaden, usar **Vitest** (compatible con Next.js sin configuración extra).

---

## Decisiones tomadas y por qué

| Decisión | Alternativa descartada | Razón |
|---|---|---|
| localStorage | Supabase desde el inicio | MVP de uso personal, un solo dispositivo |
| CSS global | Tailwind / CSS Modules | Control total, menos capas, más fácil de leer para una IA |
| Next.js static export | React + Vite | Mismo resultado, mejor integración con Vercel |
| Sin login | Auth con email | Uso personal, complejidad innecesaria en fase 1 |
| Estados simples (4) | Más granularidad | UX más clara, suficiente para el caso de uso actual |
