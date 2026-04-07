# Auditoría integral — Kriyā
> Rama: `audit/comprehensive-review` · Fecha: 2026-04-01

---

## 1. Arquitectura y calidad de código

### ✅ Lo que está bien

- **Separación de capas** respetada en general: `data.ts` solo hace I/O, `calculations.ts` es lógica pura, `useStore.ts` orquesta, componentes son presentacionales.
- **`calculations.ts`** perfectamente aislado y testeable. La extracción ya realizada es exactamente lo que pide el principio de separación.
- **`useStore.ts`** limpio (~170 líneas), con interfaces por pantalla (`HomeScreenStore`, `ClassScreenStore`, etc.) que evitan que los componentes reciban más de lo que necesitan. Buen diseño.
- **Tipos bien definidos** en `types.ts`. Interfaces cohesivas y sin redundancias.
- **`data.ts` mappers** correctos y consistentes. El patrón `unwrap()` evita repetición de manejo de errores.

---

### Hallazgos con severidad

#### 🔴 CRÍTICO

**C1 — Error state sin consumir**
- **Dónde**: `useStore.ts:54` — `const [error, setError] = useState<string | null>(null)`
- **Problema**: El estado `error` se actualiza cuando falla cualquier operación (addRoom, addClass, etc.) pero ningún componente lo lee ni lo muestra. Si falla una escritura en Supabase, la UI no informa al usuario de nada.
- **Fix**: Consumir `error` en los componentes, o bien lanzar el error hasta la UI con un toast/banner. Lo más sencillo: mostrar el mensaje de error debajo del botón en el Sheet activo.

---

#### 🟡 MEJORA

**M1 — Loading state duplicado 5 veces**
- **Dónde**: `HomeScreen.tsx:31`, `ClassScreen.tsx:44`, `StudentsScreen.tsx:22`, `StudentDetail.tsx:31`, `FinanceScreen.tsx:20`
- **Patrón exacto** repetido en los 5 archivos:
  ```tsx
  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', flex: 1, background: '#f5f0e8' }}>
    <p style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 22, color: '#8a7a6a', fontStyle: 'italic' }}>Cargando...</p>
  </div>
  ```
- **Fix**: Extraer a `components/LoadingScreen.tsx` (3 líneas). Sería el primer componente genuinamente reutilizable.

**M2 — `statusBadge` duplicado**
- **Dónde**: `ClassScreen.tsx:17` y `StudentDetail.tsx:10` — función idéntica, línea a línea.
- **Fix**: Mover a `components/ui/StatusBadge.tsx` o a `lib/utils.ts` como función pura que devuelve `{ className, label }`.

**M3 — `isValidSpanishPhone` duplicada**
- **Dónde**: `StudentsScreen.tsx:9` y `StudentDetail.tsx:16` — copia exacta.
- **Fix**: Mover a `lib/utils.ts`.

**M4 — Inline room form duplicado (~30 líneas de JSX)**
- **Dónde**: `HomeScreen.tsx:150-175` y `ClassScreen.tsx:181-206` — estructura y lógica idénticas.
- **Estado**: Más complejo de extraer porque requiere callbacks distintos (`setForm(f => ({ ...f, roomId: newRoom.id }))` con distintas setters). Candidato para el paso de refactoring como `<InlineRoomForm onSaved={(room) => ...} onCancel={() => ...} />`.

**M5 — Imports de cálculos desde `data.ts`**
- **Dónde**: `HomeScreen.tsx:4`, `ClassScreen.tsx:4`, `FinanceScreen.tsx:4`, `StudentsScreen.tsx:4`, `StudentDetail.tsx:4`
- **Problema**: Los componentes importan `getRevenue`, `getPending`, `getInitials`, `formatEur` desde `@/lib/data`, que a su vez los re-exporta desde `calculations.ts`. Esto significa que los componentes tienen una dependencia indirecta de `data.ts` (que importa el cliente de Supabase) solo para usar funciones puramente matemáticas.
- **Fix**: Importar directamente desde `@/lib/calculations`. Eliminar el re-export de `data.ts`.

**M6 — `any` en los mappers de `data.ts`**
- **Dónde**: `data.ts:8,12,16,25` — `function mapRoom(r: any)`, `mapStudent(s: any)`, etc.
- **Fix menor**: Tipar con un tipo intermedio o con `unknown` y castear con `as`. Alternativa: usar los tipos de `@supabase/supabase-js` para las respuestas de DB.

**M7 — `update: any` en updateClass / updateEnrollment**
- **Dónde**: `data.ts:115`, `data.ts:145`
- **Fix**: Tipar el objeto de update con un tipo mapeado explícito.

---

#### 🔵 NICE-TO-HAVE

**N1 — Bug de año en FinanceScreen**
- **Dónde**: `FinanceScreen.tsx:15,31`
- **Problema**: `selYear` es siempre `today.getFullYear()`. El selector de meses muestra meses futuros (e.g., enero del año que viene si estamos en abril), pero el filtro de clases siempre usa `f.getFullYear() === selYear`. Las clases en esos meses "del año siguiente" no aparecerán.
- **Gravedad actual**: Baja — el bug solo se manifiesta si hay clases ya creadas con fecha en el año siguiente, lo cual es poco probable hoy. Pero al escalar se volverá un bug real.
- **Fix**: Reemplazar `selMonth: number` por `sel: { month: number; year: number }` como estado del selector. La lógica del `monthOrder` ya calcula el año correcto por pill (`yr = m < currentMonth ? selYear + 1 : selYear`); bastará con guardar ese año al hacer click en cada píldora. La lógica simple `selMonth < currentMonth ? año+1 : año` NO funciona correctamente — si estás en diciembre y seleccionas enero sería año+1, pero si estás en enero y seleccionas diciembre sería año-1.

**N2 — Los mappers no son testeables**
- Los mappers (`mapRoom`, `mapClass`, etc.) son funciones privadas en `data.ts`. Si hubiera un error de mapping (e.g., `room_cost` mal mapeado a `roomCost`), no hay test que lo detecte.
- **Fix en refactoring**: Exportarlos desde `data.ts` o extraerlos a un módulo separado.

---

### Arquitectura propuesta para el paso 3 (refactoring)

La estructura actual es casi correcta. Los cambios son quirúrgicos:

```
src/
├── components/
│   ├── ui/
│   │   ├── LoadingScreen.tsx     ← NUEVO (extraer loading state)
│   │   └── StatusBadge.tsx       ← NUEVO (extraer statusBadge duplicado)
│   ├── HomeScreen.tsx
│   ├── ClassScreen.tsx
│   ├── FinanceScreen.tsx
│   ├── StudentsScreen.tsx
│   └── StudentDetail.tsx
├── lib/
│   ├── calculations.ts           ← sin cambios
│   ├── data.ts                   ← quitar re-exports de calculations
│   ├── supabase.ts               ← sin cambios
│   ├── types.ts                  ← sin cambios
│   └── utils.ts                  ← NUEVO (isValidSpanishPhone, mover desde componentes)
```

No se propone `domain.ts` separado porque `calculations.ts` ya cumple esa función perfectamente.

---

## 2. Seguridad

### ✅ Lo que está bien

- **Clave anon expuesta intencionalmente**: `NEXT_PUBLIC_SUPABASE_ANON_KEY` es la clave pública de Supabase, diseñada para estar en el cliente. La seguridad real recae sobre RLS. Correcto.
- **Sin service role key en frontend**: Verificado — solo se usan las variables `NEXT_PUBLIC_*`.
- **Sin SQL injection**: El SDK de Supabase usa queries parametrizadas. No hay interpolación de strings en queries.
- **Sin XSS**: React escapa todo por defecto. No hay `dangerouslySetInnerHTML`.
- **Auth robusta**: Se usa Supabase Auth estándar. No hay lógica de autenticación propia.
- **`user_id` en todas las escrituras**: `createRoom`, `createClass`, `createStudent`, `createEnrollment` — todas llaman a `getUserId()` y envían `user_id`. Correcto.

---

### Hallazgos con severidad

#### 🔴 CRÍTICO

**S1 — Las operaciones de lectura dependen 100% de RLS sin verificación desde el código**
- **Dónde**: `data.ts:51-63` — `loadData()`
- **Problema**: `supabase.from('rooms').select('*')` sin ningún filtro `.eq('user_id', ...)`. Si una política RLS no está configurada o tiene un error (ej. política de INSERT sin política de SELECT), cualquier usuario autenticado puede leer datos de todos los demás.
- **Impacto**: Alta si se hace pública la app. Los datos de alumnas, clases y finanzas de un usuario serían visibles para cualquier otro usuario registrado.
- **Fix recomendado**: Dos capas de protección:
  1. Verificar en Supabase Dashboard que todas las tablas tienen políticas RLS activas para SELECT, INSERT, UPDATE y DELETE.
  2. Añadir filtro explícito en `loadData()` como defensa en profundidad:
     ```ts
     const userId = await getUserId()
     supabase.from('rooms').select('*').eq('user_id', userId)
     ```
  Esta redundancia hace el código autodocumentado y más seguro ante errores de configuración de RLS.

**S2 — UPDATE y DELETE no filtran por user_id**
- **Dónde**: `data.ts:75-131` — `updateRoom`, `updateClass`, `deleteClass`, `updateStudent`, `updateEnrollment`
- **Problema**: `.eq('id', id)` sin `.eq('user_id', userId)`. Si RLS no tiene política UPDATE/DELETE, un usuario malicioso podría modificar o eliminar recursos de otro usuario pasando un UUID conocido.
- **Fix**: Añadir `.eq('user_id', userId)` a todas las operaciones de mutación, además de (no en lugar de) RLS.

---

#### 🟡 MEJORA

**S3 — Mensajes de error de Supabase expuestos directamente**
- **Dónde**: `data.ts:43` — `throw new Error(result.error.message)`
- **Problema**: Los errores de Supabase pueden contener información de esquema (nombres de tablas, columnas, constraints). Para uso personal actual es irrelevante, pero antes de hacerla pública conviene sanitizar.
- **Fix**: Mapear errores a mensajes genéricos en `unwrap()`, con logging interno separado.

**S4 — `window.confirm` para eliminar clase**
- **Dónde**: `ClassScreen.tsx:211`
- **Problema**: `window.confirm` no funciona en iOS WKWebView (que es lo que usa Safari en móvil). En iPhone, este diálogo puede ser bloqueado silenciosamente.
- **Fix**: Reemplazar con un Sheet de confirmación (patrón ya existente en el proyecto).

---

#### 🔵 NICE-TO-HAVE

**S5 — Sin rate limiting en operaciones de escritura**
- No hay throttling client-side en las funciones de guardado más allá del flag `saving`. Supabase tiene rate limiting propio, pero para uso público conviene añadir debounce o throttle a las acciones de usuario rápidas.

**S6 — Validación de teléfono solo en cliente**
- El regex de validación de teléfono vive solo en el frontend. No es un riesgo de seguridad grave (es un campo de texto personal), pero para consistencia de datos conviene añadir una constraint en la base de datos o una función de validación en Supabase.

---

## 3. Tests

### Estado actual de cobertura

| Módulo | Cobertura | Estado |
|---|---|---|
| `calculations.ts` | Todas las funciones exportadas | ✅ Bien cubierto |
| `data.ts` mappers | No exportados → sin tests | ❌ Sin cobertura |
| `useStore.ts` | Sin tests | ❌ Sin cobertura |
| Flujos de integración | Sin tests | ❌ Sin cobertura |
| Componentes | Sin tests | — (aceptable por ahora) |

### Gaps encontrados en `calculations.test.ts`

Las funciones están bien cubiertas para el happy path. Faltan:

1. `getInitials('')` — nombre vacío (edge case real si la alumna se crea sin nombre)
2. `formatEur` con decimales (ej. `20.5€`) — la función actualmente no redondea
3. `computeEnrollmentChanges`: `paid → paid` (mismo estado) — ¿se sobreescribe `total`?
4. `getPending`: `deposit_paid` donde `deposit === price` — pendiente debe ser 0
5. `getRevenue`: clase con precio 0 — no debería romper

### Plan de tests (por prioridad)

#### Prioridad 1 — Implementar ahora (en `calculations.test.ts`)
Cubrir los edge cases de las funciones ya testeadas. Bajo coste, alto valor.

#### Prioridad 2 — Antes del refactoring
Exportar los mappers de `data.ts` y añadir tests unitarios:
- `mapClass`: verifica que `room_cost → roomCost`, `room_paid → roomPaid`, `price ?? 20`
- `mapEnrollment`: verifica que `class_id → classId`, `student_id → studentId`
- `mapStudent`: verifica que campos opcionales `phone`/`notes` devuelven `''` si son null

#### Prioridad 3 — Antes de ir a producción pública
Tests de integración con Supabase local (usando `supabase start`):
- Crear clase → verificar que aparece en `loadData()`
- Cambiar estado de inscripción → verificar cálculos en `FinanceScreen`
- Intentar leer datos de otro usuario → verificar que RLS bloquea

#### Prioridad 4 — Nice to have
- Tests de componentes con React Testing Library para los flujos críticos (añadir alumna, cambiar estado)

---

## Resumen ejecutivo

| Dimensión | Estado | Prioridad |
|---|---|---|
| Arquitectura general | Sólida, con deuda técnica menor | Refactorizar antes de escalar |
| Duplicación de código | 4 patrones duplicados identificados | Resolver en paso 3 |
| Error handling en UI | El error del store no se muestra | **Resolver pronto** |
| Seguridad (RLS) | Arquitectura correcta pero sin defensa en profundidad | **Verificar y añadir filtros** |
| `window.confirm` en iOS | Bug real en producción móvil | Resolver antes de publicar |
| Tests de cálculos | Buenos, con gaps menores en edge cases | Resolver ahora |
| Tests de mappers y store | Sin cobertura | Resolver antes del refactoring |
