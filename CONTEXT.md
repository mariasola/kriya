# Context — Kriyā

Documento técnico para retomar el proyecto con una IA o desarrollador externo.

---

## Qué es esto

Aplicación web PWA (Progressive Web App) para gestión de clases de yoga. Uso personal de una profesora freelance. Requiere login con email/contraseña (Supabase Auth). Se instala en el móvil desde el navegador como si fuera una app nativa.

---

## Stack técnico

| Capa | Tecnología | Por qué |
|---|---|---|
| Framework | Next.js 14 (App Router) | Cero configuración, deploy directo en Vercel |
| UI | React 18 + CSS global | Sin librerías de componentes, control total del diseño |
| Tipado | TypeScript | Seguridad en los tipos de datos |
| Datos | Supabase (PostgreSQL) | Multi-dispositivo, sincronización en la nube, Auth integrado |
| Auth | Supabase Auth (email/password) | Login/signup con confirmación por email |
| Deploy | Vercel | CI/CD automático desde GitHub, tier gratuito suficiente |
| PWA | manifest.json + service worker | Instalable en iOS/Android desde Safari/Chrome |

---

## Variables de entorno requeridas

Crear `.env.local` en la raíz del proyecto:

```
NEXT_PUBLIC_SUPABASE_URL=https://xxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
```

En Vercel: Settings → Environment Variables → añadir las mismas dos variables → Redeploy.

---

## Estructura del proyecto

```
kriya/
├── src/
│   ├── app/
│   │   ├── layout.tsx        # Root layout, meta PWA, registro service worker
│   │   ├── page.tsx          # Entrada de la app, router de pantallas, gestión de sesión
│   │   └── globals.css       # Todos los estilos, design tokens como variables CSS
│   ├── components/
│   │   ├── AuthScreen.tsx    # Pantalla de login/signup
│   │   ├── BottomNav.tsx     # Navegación inferior (Clases / Alumnas / Finanzas) + botón salir
│   │   ├── HomeScreen.tsx    # Vista semanal de clases + FAB nueva clase (solo visible en home tab); room selector usa edición inline — clicar "Añadir sala" expande campos inline sin abrir sheet
│   │   ├── ClassScreen.tsx   # Detalle de clase, lista alumnas, cambio estado; sala usa toggle switch; room selector en edición usa edición inline igual que HomeScreen
│   │   ├── StudentsScreen.tsx# Directorio de alumnas
│   │   ├── StudentDetail.tsx # Ficha alumna + historial + notas
│   │   ├── FinanceScreen.tsx # Resumen financiero por mes; lista de meses con orden fijo; filas de sala son tapeables y abren sheet de edición
│   │   └── Sheet.tsx         # Bottom sheet reutilizable
│   ├── hooks/
│   │   └── useStore.ts       # Estado global, todas las mutaciones de datos (async)
│   └── lib/
│       ├── types.ts          # Interfaces TypeScript (Room, Class, Student, Enrollment)
│       ├── data.ts           # Supabase I/O, mappers snake_case↔camelCase, helpers de cálculo
│       └── supabase.ts       # Cliente Supabase (singleton)
├── public/
│   ├── manifest.json         # PWA manifest
│   ├── sw.js                 # Service worker (cache offline)
│   ├── favicon.ico           # Favicon navegador
│   ├── icon-192.png          # Icono PWA 192×192 (fondo #3d4a2e, símbolo crema)
│   └── icon-512.png          # Icono PWA 512×512
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
Room       { id, name, address }
Class      { id, name, date, time, roomId, capacity, roomCost, roomPaid }
Student    { id, name, phone, notes }
Enrollment { id, classId, studentId, status, deposit, total }
```

### Persistencia

Todo el estado vive en Supabase (PostgreSQL). Las tablas en la base de datos usan snake_case (`room_id`, `room_cost`, etc.) y los mappers en `data.ts` convierten a camelCase para el frontend. El hook `useStore` es el único punto de escritura — nunca se llama a Supabase directamente desde los componentes.

Cada registro pertenece a un usuario (`user_id`). Row Level Security (RLS) en Supabase garantiza que cada usuario solo ve sus propios datos.

### Flujo de datos

```
Supabase → loadData() → useStore (useState) → componentes
componentes → mutación en useStore → Supabase → reload()
```

---

## Auth

- Login y signup con email/contraseña vía `supabase.auth.signInWithPassword` / `signUp`
- `page.tsx` escucha `onAuthStateChange` y muestra `AuthScreen` si no hay sesión
- El botón "Salir" en `BottomNav` llama a `supabase.auth.signOut()`
- Signup requiere confirmación de email antes de poder entrar

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

Jerarquía de botones:

| Clase | Uso | Estilo |
|---|---|---|
| `btn-primary` | Acción más importante por vista (Guardar, Añadir, Confirmar) | Fondo terracota, una por pantalla/sheet |
| `btn-secondary` | Acciones auxiliares de creación o apertura (+ Añadir alumna) | Lighter weight than primary — smaller padding, thinner border, lighter border color. Used for auxiliary actions in forms. Never competes visually with btn-primary. |
| `btn-ghost` | Cancelar, Cerrar, Volver cuando es un botón | Sin borde, texto gris cálido |
| `btn-destructive` | Acciones irreversibles (Eliminar) — reservado para uso futuro | Outline rojo tierra |

Room selector pattern in class forms: when user clicks "+ Añadir sala", two input fields appear inline within the form — no second sheet is opened. On save, the new room is selected automatically and the inline form collapses. Shows only the inline form when no rooms exist yet.

FAB is only visible when the active tab is 'home'. Hidden on alumnas and finanzas tabs.

---

## Cómo añadir una nueva pantalla

1. Crear `src/components/NuevaScreen.tsx`
2. Añadir el tipo a `Screen` en `src/app/page.tsx`
3. Añadir el render condicional en `page.tsx`
4. Si tiene tab propio, añadir a `Tab` y a `BottomNav.tsx`

---

## Cómo añadir un nuevo campo a una entidad

1. Añadir el campo a la interfaz en `src/lib/types.ts`
2. Añadir el mapper en `src/lib/data.ts` (función `mapX` + función `createX`/`updateX`)
3. Añadir la mutación correspondiente en `src/hooks/useStore.ts`
4. Actualizar el formulario en el componente correspondiente

---

## PWA — instalación en móvil

### iOS (Safari)
1. Abrir la URL en Safari
2. Pulsar el icono de compartir
3. "Añadir a pantalla de inicio"
4. Se instala con el icono y nombre definidos en `manifest.json`

### Android (Chrome)
Chrome muestra automáticamente un banner de instalación.

### Iconos
Los archivos `icon-192.png`, `icon-512.png` y `favicon.ico` están en `/public`. Fondo `#3d4a2e`, símbolo en `#f5f0e8`.

---

## CI/CD

Push a rama `main` en GitHub → Vercel detecta el cambio → build automático → deploy.

Tests con **Vitest**. Ejecutar antes de cada commit:

```bash
npm test
```

Los tests cubren la lógica de negocio pura en `src/lib/calculations.ts`. Ver `BUSINESS_RULES.md` para la lista de reglas verificadas.

---

## Decisiones tomadas y por qué

| Decisión | Alternativa descartada | Razón |
|---|---|---|
| Supabase | localStorage | Multi-dispositivo, Auth integrado, sin servidor propio |
| CSS global | Tailwind / CSS Modules | Control total, menos capas, más fácil de leer para una IA |
| Next.js static export | React + Vite | Mismo resultado, mejor integración con Vercel |
| Email/password auth | Sin login | Datos en la nube requieren identificar al usuario |
| Estados simples (4) | Más granularidad | UX más clara, suficiente para el caso de uso actual |
