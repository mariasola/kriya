# QA Audit — Kriyā · Pre-lanzamiento comercial

> Auditoría de producto realizada como QA Engineer senior, focalizada en bugs confirmados, flows incompletos, edge cases sin manejar y gaps de onboarding.
>
> Rama auditada: estado actual de `main` (post `audit/comprehensive-review`)
> Fecha: 2026-05-20
> Foco: Fase 0 de `PRODUCTIZATION_CONTEXT.md` — "antes de esta fase no se puede dar acceso a nadie".

---

## TL;DR — Qué bloquea el lanzamiento

Hay **3 issues críticos** que impiden técnicamente abrir el producto a alguien que no seas tú:

1. **No se puede registrar nadie**: `AuthScreen` solo tiene login; no existe `signUp` ni link a registro.
2. **No hay recuperación de contraseña**: ningún flow llama a `supabase.auth.resetPasswordForEmail`.
3. **`HomeScreen` muestra 0€ cobrado/pendiente para clases de grupo**: las clases asociadas a una serie tienen `price = 0` en BBDD y `getRevenue(0, ...) = 0`, así que la métrica de "Esta semana" infraestima ingresos reales.

Adicionalmente hay **inconsistencias en cálculos financieros** que harán que los números no cuadren cuando suban precios o usen `priceOverride`. Detalle abajo.

---

## 1 · Bugs confirmados en código

### 🔴 CRÍTICO

#### B-01 — No existe registro de usuarios nuevos
**Dónde**: `src/components/AuthScreen.tsx` (todo el archivo).
**Qué pasa**: el componente solo expone `supabase.auth.signInWithPassword`. No hay botón "Crear cuenta", ni `supabase.auth.signUp`, ni alternancia login/signup. `grep signUp` devuelve 0 matches en `src/`.
**Impacto**: imposible que un nuevo cliente se registre en producción. Bloquea Fase 2 y Fase 3.
**Severidad**: bloquea el uso.

#### B-02 — No existe recuperación de contraseña
**Dónde**: `src/components/AuthScreen.tsx`.
**Qué pasa**: no hay link "¿Has olvidado tu contraseña?". `grep resetPasswordForEmail` en `src/` → 0 matches. Si una usuaria olvida su clave, no tiene forma de recuperarla desde la app.
**Impacto**: una usuaria queda fuera de su cuenta sin poder volver.
**Severidad**: bloquea el uso.

#### B-08 — `HomeScreen` calcula 0€ para clases de grupo
**Dónde**: `src/components/HomeScreen.tsx:34-35`.
```ts
const cobrado = thisWeek.reduce((s, c) => s + getRevenue(c.price, ...), 0)
const pendiente = thisWeek.reduce((s, c) => s + getPending(c.price, ...), 0)
```
**Qué pasa**: en clases vinculadas a una serie, `c.price` se guarda como `0` (forzado en `handleSave`, línea 59). `getRevenue(0, ...)` devuelve 0 para `paid`, y `getPending(0, [{status:'deposit_paid', deposit:10}])` devuelve **`0 - 10 = -10`** (¡negativo!) por la lógica `classPrice - deposit`. Las suscripciones cobradas y los pagos de puntuales en clases de grupo se ignoran; los depósitos en grupos restan del pendiente total de la semana.
**Impacto**: una profesora con clases de grupo ve "0€ cobrado, 0€ pendiente" en el mejor caso, y métricas negativas en el peor (si hay alguien con depósito en una clase de grupo). En ambos casos, dato visiblemente incorrecto en la pantalla principal.
**Severidad**: dato incorrecto en la pantalla más visible.

#### B-09 — `getRevenue` y `getPending` no consideran `priceOverride`
**Dónde**: `src/lib/calculations.ts:3-15`. El tipo `Enrollment` (`types.ts:36`) ya tiene `priceOverride?: number | null` y el mapper (`data.ts:29`) lo lee. Pero ni `getRevenue` ni `getPending` lo usan.
**Qué pasa**: si una alumna tiene `priceOverride = 15` y está `paid`, `getRevenue` suma `classPrice` (p. ej. 20) en lugar de 15. Lo mismo para pendientes. Solo `ClassScreen` aplica el override correctamente para clases de grupo (línea 76); el resto del código lo ignora.
**Impacto**: cuando se empiece a usar `priceOverride` (la feature ya está cableada hasta la BBDD), todos los cálculos en `HomeScreen`, `FinanceScreen.pendMap` y la métrica de pendiente del propio `FinanceScreen` quedarán desincronizados con la realidad.
**Severidad**: cálculos financieros incorrectos. Importante para el lanzamiento porque los números son el principal valor del producto.

#### B-10 — `computeEnrollmentChanges` usa `classPrice` aunque exista `priceOverride`
**Dónde**: `src/lib/calculations.ts:17-27`.
**Qué pasa**: cuando se cambia el estado a `paid`, se setea `changes.total = classPrice`. Si la alumna tiene `priceOverride`, queda mal grabado en BBDD.
**Severidad**: importante (datos incorrectos).

#### B-11 — `getRevenue` discrepa con `BUSINESS_RULES.md`
**Dónde**: `src/lib/calculations.ts:3-6`.
```ts
return enrollments.reduce((s, e) =>
  s + (e.status === 'paid' ? classPrice : e.status === 'deposit_paid' ? e.deposit : 0), 0)
```
**Qué pasa**: `BUSINESS_RULES.md` dice "sum(`total`) para status = 'paid'", pero el código usa `classPrice` en lugar de `e.total`. Sin `priceOverride` y sin cambios de precio retroactivos, `total === classPrice` casi siempre y el bug es invisible. Cuando empiezas a cambiar el `price` de una clase después de haber cobrado, la métrica retroactivamente recalcula el ingreso.
**Severidad**: importante. La regla de negocio promete inmutabilidad de lo cobrado; el código no la respeta.

#### B-12 — `subscription.price` null = retroactividad del precio
**Dónde**: `src/components/FinanceScreen.tsx:35` y `:156`.
```ts
return sum + (sub.price ?? series?.monthlyPrice ?? 0)
```
**Qué pasa**: las suscripciones creadas con `price: null` (que es el camino por defecto en `page.tsx:77`) usan **el precio actual** de la serie, no el precio del momento de la suscripción. Si la profesora sube el precio de "Hatha mensual" de 50€ a 60€ en abril, las suscripciones cobradas de enero retroactivamente se muestran como 60€ en `FinanceScreen`, distorsionando el histórico.
**Impacto**: las finanzas pasadas mienten al cambiar precios.
**Severidad**: importante. Snapshots de precio deberían escribirse al crear la suscripción.

---

### 🟡 IMPORTANTE

#### B-13 — `loadData` solo carga subscriptions de los últimos 6 meses
**Dónde**: `src/lib/data.ts:75-89`.
**Qué pasa**: el filtro `.in('month', monthsToLoad)` limita a los últimos 6 meses (incluyendo el actual). Como `FinanceScreen.monthOrder` muestra meses futuros y `GroupDetailScreen.seriesMonths` deriva de las clases que sí están todas cargadas, hay tres escenarios rotos:
1. Suscripciones creadas para meses futuros en `GroupDetailScreen` desaparecen del estado al recargar (sí se ven hasta que recargas, no después).
2. Si el usuario lleva más de 6 meses, la pestaña de finanzas pierde el histórico.
3. Suscripciones de hace 7+ meses ya no son visibles para auditar.
**Impacto**: bug latente que se manifestará a los 6 meses de uso. Hoy invisible para la autora, futuro problema para una usuaria con un año de datos.
**Severidad**: importante; ahora invisible, futuro inevitable.

#### B-14 — `addEnrollment` solo se protege contra duplicados con cache local
**Dónde**: `src/hooks/useStore.ts:140-150`.
```ts
const exists = data.enrollments.find(e => e.classId === classId && e.studentId === studentId)
if (exists) return
```
**Qué pasa**: la protección anti-duplicado vive solo en el cliente. Si la usuaria abre la app en dos dispositivos (algo explícitamente soportado, ver `CONTEXT.md` "Multi-dispositivo") y añade a la misma alumna a la misma clase en ambos antes de sincronizar, se crean dos enrollments. No hay UNIQUE constraint visible en el código.
**Impacto**: enrollments duplicadas, métricas dobladas.
**Severidad**: importante. Requiere `UNIQUE (class_id, student_id)` en Supabase.

#### B-15 — `addSubscription` no protege contra duplicados de ningún tipo
**Dónde**: `src/components/GroupDetailScreen.tsx:131-134`, `src/hooks/useStore.ts:197-206`.
**Qué pasa**: cero verificación cliente/servidor. La usuaria puede crear varias suscripciones para `(studentId, seriesId, month)` y todas se cuentan en finanzas. Mismo problema multi-dispositivo que B-14.
**Severidad**: importante. Requiere `UNIQUE (student_id, series_id, month)` en Supabase.

#### B-16 — `deleteClassSeries` deja clases huérfanas con `seriesId` apuntando a la nada
**Dónde**: `src/lib/data.ts:224-228`, `src/hooks/useStore.ts:187-195`.
**Qué pasa**: al borrar una serie no se hace nada con las clases que la referencian. Tras borrar:
- `data.classes.find(c => c.seriesId === ...)` sigue devolviendo clases con `seriesId` muerto.
- En `ClassScreen` el `series = data.classSeries.find(...)` evalúa `null` y se cae al cálculo "no group", pero `c.price` se guardó como `0` en el momento de creación. Resultado: la clase muestra 0€ siempre.
- `HomeScreen` mantiene la barra verde de "recurrente" porque `c.seriesId` es truthy.
**Impacto**: clases zombi con precio 0 y barra verde de grupo fantasma.
**Severidad**: importante. Necesita o bien CASCADE en SQL, o limpiar `seriesId` y restaurar `price` al borrar el grupo.

#### B-17 — `deleteClassSeries` deja suscripciones huérfanas
**Dónde**: mismo punto que B-16.
**Qué pasa**: las suscripciones referenciando la serie eliminada permanecen en BBDD; `FinanceScreen` las recoge y muestra "—" como nombre de grupo (línea 162), pero las sigue sumando al revenue mensual.
**Severidad**: importante. Mismos cálculos contaminados.

#### B-18 — `deleteClass` puede dejar enrollments huérfanas
**Dónde**: `src/lib/data.ts:169-173`.
**Qué pasa**: depende totalmente de tener `ON DELETE CASCADE` configurado en BBDD. Si no, las enrollments de la clase borrada siguen ahí: `StudentDetail` filtraría enrollments cuya `cls = data.classes.find(c => c.id === e.classId)` da `undefined` y caería al `return null` (línea 68), de modo que la usuaria pierde silenciosamente parte del historial. No hay test que verifique esto.
**Severidad**: importante. Validar CASCADE en el dashboard de Supabase y/o limpiar en código.

#### B-19 — Validación de teléfono no bloquea guardar
**Dónde**: `src/components/StudentsScreen.tsx:92` y `src/components/StudentDetail.tsx:89`.
**Qué pasa**: `isValidSpanishPhone` se ejecuta en `onBlur` y muestra un mensaje rojo, pero `handleSave` no comprueba el flag. Si la usuaria pulsa "Guardar" con un teléfono inválido, se guarda igualmente.
**Severidad**: importante (datos sucios + UX engañosa: el mensaje da por hecho que no se va a guardar).

#### B-20 — `ClassScreen` queda en "Cargando..." si el `classId` no existe
**Dónde**: `src/components/ClassScreen.tsx:50,114`.
```ts
const cls = data.classes.find(c => c.id === classId)!
...
if (loading || !cls) return <LoadingScreen />
```
**Qué pasa**: si la usuaria abre una clase y otro dispositivo la borra, al recargar `cls` es `undefined` y la pantalla se queda en "Cargando..." indefinidamente. No hay vuelta atrás automática.
**Severidad**: importante. Requiere `if (!loading && !cls) return <EmptyState>...</EmptyState>` con botón a `onBack`.

#### B-21 — `StudentDetail` mismo bug que B-20
**Dónde**: `src/components/StudentDetail.tsx:15,22`.
**Qué pasa**: idéntico. Si la alumna fue borrada (cuando exista la funcionalidad) o el id es inválido, loader infinito.
**Severidad**: importante.

#### B-22 — `formatEur` no redondea decimales
**Dónde**: `src/lib/calculations.ts:33`.
```ts
export function formatEur(n: number): string { return `${n}€` }
```
**Qué pasa**: `calculateClassPrice(60, 7)` = `8.571428571428571`. `ClassScreen` muestra "Cobrado: 8.571428571428571€" cuando una alumna paga una clase de grupo con precio mensual no divisible. Las matemáticas no son del usuario; la UI sí.
**Severidad**: importante. Cualquier capacidad mensual / nº de clases no entera revienta visualmente la app.

#### B-23 — `getInitials` falla con nombres con espacios al principio
**Dónde**: `src/lib/calculations.ts:29-31`.
```ts
return name.split(' ').slice(0, 2).map(x => x[0]).join('').toUpperCase()
```
**Qué pasa**: `getInitials(' María Pérez')` = `'undefinedM'`. `x[0]` es undefined en el primer elemento (string vacío del split). Stringificado, queda "UNDEFINEDM" o similar en mayúsculas.
**Severidad**: importante (avatares rotos visualmente). El AUDIT.md anterior lo marcó como edge case pendiente de cubrir en tests.

#### B-24 — Errores de Supabase se muestran crudos al usuario
**Dónde**: `src/lib/data.ts:66` (`unwrap`), banner en `src/app/page.tsx:47`.
**Qué pasa**: cualquier error de Supabase (en inglés, con detalles de columnas/constraints) se muestra tal cual en el banner rojo: `duplicate key value violates unique constraint "students_user_name_key"`. Mala UX y filtra esquema interno.
**Severidad**: importante. Mapear a mensajes en español sanitizados.

#### B-25 — `AuthScreen` no submite con Enter
**Dónde**: `src/components/AuthScreen.tsx` (no hay form, solo inputs sueltos).
**Qué pasa**: el `<button>` "Entrar" requiere click. No hay `<form onSubmit>` ni `onKeyDown="Enter"` en los inputs. En móvil PWA es esperable poder pulsar "Ir" en el teclado virtual.
**Severidad**: importante (UX básica). Encapsular en `<form>` con `onSubmit`.

#### B-26 — `confirmDelete` de clase usa Sheet, pero al hacer "back" desde el navegador pierde el contexto
**Dónde**: `src/components/ClassScreen.tsx:383-391`.
**Qué pasa**: el Sheet de confirmación no escucha la tecla Escape ni el botón Atrás del navegador. En PWA Android, el botón hardware "back" cierra toda la app, no el sheet. Bug menor de PWA, pero presente.
**Severidad**: importante en Android (mencionado como concern en `PRODUCTIZATION_CONTEXT.md`).

---

### 🔵 MENOR

#### B-27 — Clases del mismo día se ordenan por fecha pero no por hora
**Dónde**: `src/components/HomeScreen.tsx:37`.
```ts
const sorted = [...data.classes].sort((a, b) => a.date.localeCompare(b.date))
```
**Qué pasa**: dos clases el mismo día con horas 18:00 y 10:00 pueden aparecer en cualquier orden. Comparar `${date}T${time}`.
**Severidad**: menor (UX).

#### B-28 — `pendMap` lista alumnas con pendiente = 0€
**Dónde**: `src/components/FinanceScreen.tsx:71-75`.
**Qué pasa**: si `deposit === price`, `imp = 0`, pero la entrada se crea igualmente. Una alumna que dejó depósito exacto del precio (poco común pero posible) aparece en "Pendiente de cobrar" con `0€`.
**Severidad**: menor.

#### B-29 — Selector "Crear alumna" solo aparece si `addInput.length > 2`
**Dónde**: `src/components/ClassScreen.tsx:403`.
**Qué pasa**: si el nombre real tiene 1–2 letras (un mote, un apodo), no aparece el bloque para crearla.
**Severidad**: menor.

#### B-30 — Defaults silenciosos sobrescriben input del usuario
**Dónde**: `src/components/HomeScreen.tsx:58-61` y `ClassScreen.tsx:128-130`.
```ts
capacity: parseInt(form.capacity) || 8,
price: parseInt(form.price) || 20,
roomCost: parseInt(form.roomCost) || 0,
```
**Qué pasa**: si el usuario teclea `0` o deja vacío, el sistema usa 8/20 en silencio. Si el usuario quiere una clase de capacidad 1 (caso real: clase privada), no puede; queda 8. Mismo problema para precio 0.
**Severidad**: menor (datos incorrectos, ocultos al usuario).

#### B-31 — `GroupFormScreen` permite precio mensual 0
**Dónde**: `src/components/GroupFormScreen.tsx:22-23,30`.
**Qué pasa**: `if (!form.name.trim() || !form.monthlyPrice) return` evita guardar con string vacío, pero `parseInt('0') || 0` = 0 → grupo gratis. Probable error del usuario; no se valida.
**Severidad**: menor.

#### B-32 — `parseInt` pierde decimales en precios
**Dónde**: `HomeScreen.tsx`, `ClassScreen.tsx`, `GroupFormScreen.tsx`.
**Qué pasa**: `parseInt('25.50')` = 25. Si la usuaria quiere cobrar 25,50€, la app lo redondea sin avisar.
**Severidad**: menor a importante según la cultura de pricing del nicho.

#### B-33 — `BottomNav` y otros usan `<div onClick>` para acciones
**Dónde**: `BottomNav.tsx`, `HomeScreen.tsx` (cards de clase), `ClassScreen.tsx` (rows de alumnas), `GroupsScreen.tsx`, `GroupDetailScreen.tsx`.
**Qué pasa**: violan `CONVENTIONS.md` para accesibilidad (no son `<button>` y no son navegables por teclado ni leídos como botones por screen readers).
**Severidad**: menor para el lanzamiento, importante si quieres cumplir WCAG en una landing pública.

#### B-34 — Service Worker (`/sw.js`) caché agresiva sin estrategia de invalidación
**Dónde**: `src/app/layout.tsx:31-33`. Contenido de `/public/sw.js` no inspeccionado.
**Qué pasa**: registrar un SW sin estrategia documentada de cache busting es un foot-gun clásico de PWA. Cualquier deploy puede dejar a usuarias bloqueadas en una versión vieja. Particularmente delicado en iOS Safari.
**Severidad**: importante de cara a producción; menor mientras solo seas tú la usuaria.

#### B-35 — `dismissError` cierra el banner pero la operación falló silenciosamente
**Dónde**: `src/hooks/useStore.ts:68-138`, banner en `src/app/page.tsx:46-51`.
**Qué pasa**: tras un fallo de escritura, el banner desaparece al pulsar `×` pero la UI puede haber asumido que el guardado fue exitoso (sheets ya cerrados, forms limpiados). Estado UI desincronizado con BBDD.
**Severidad**: menor a importante según fluidez de red de la usuaria.

---

## 2 · Flows incompletos

Acciones que el usuario *intentaría* hacer pero el código no soporta:

### F-04 · Registro
Ningún input para crear cuenta. (Bug B-01.)

### F-05 · Recuperar contraseña
Ningún link "¿Olvidaste tu contraseña?". (Bug B-02.)

### F-06 · Verificar email
Aun si añades signup vía `signUp`, la app no maneja el caso "email no confirmado". `CONTEXT.md` dice "Signup requiere confirmación de email antes de poder entrar" pero no hay pantalla intermedia que lo explique.

### F-07 · Cerrar sesión sin confirmación
`BottomNav` llama `supabase.auth.signOut()` sin confirmar. Un tap accidental cierra sesión y vuelve a `AuthScreen` sin avisar. Importante en uso real para evitar fricción.

### F-08 · Editar suscripción (cambiar precio puntual de un mes)
`Subscription` tiene `price: number | null` precisamente para overrides, pero la UI nunca expone editar ese campo. Solo se cambia status `pending ↔ paid`. Por tanto, B-12 (retroactividad de precios) es ineludible en la UI actual.

### F-09 · `priceOverride` en una alumna individual
El campo `priceOverride` existe en types, en `mapEnrollment`, y `updateEnrollment` lo persiste — pero **ningún componente lo expone al usuario**. La feature está medio cableada pero sin UI. Resultado: si se intentara usar vía dev tools, los cálculos en `HomeScreen`/`FinanceScreen` no la respetarían (B-09).

### F-10 · Notas / tags en una clase concreta
Hay notas por alumna pero no por clase. Caso real: la profesora quiere apuntar "hoy se cayó la luz" en una clase concreta. No existe.

### F-11 · Reordenar / archivar grupos
Solo crear/editar/borrar. Sin "archivar" para un grupo terminado. Borrar es destructivo (afecta clases, B-16).

### F-12 · Indicador de carga al hacer mutaciones de larga duración
El error state se muestra (banner rojo), pero no hay spinner global ni "guardando...". La usuaria pulsa "Guardar", el sheet se cierra inmediatamente (B-35) y luego puede aparecer un error sin contexto.

---

## 3 · Edge cases no manejados

### E-01 · Alumna sin teléfono
Manejado en mostrar (`—` o "Sin teléfono"). Pero validación bloquea solo en `onBlur`; al guardar no se chequea (B-19).

### E-02 · Alumna sin notas
Manejado (no se muestra la `notas-card`).

### E-03 · Clase sin sala (`roomId = null`)
`ClassScreen` muestra `cls.name` sin la subtítulo (`{room && <small>...</small>}`). OK.
`HomeScreen` muestra `{room?.name}` que se renderiza como nada. Sin texto, ni "Sin sala". UX ambigua.
`FinanceScreen.pendMap` no falla (gracias al `?.`). `gastos`/`roomsUsed` tampoco. Bien.
**Edge**: si la sala se borra (cuando exista B-05), las clases siguen apuntando a un `roomId` muerto. Hoy `data.rooms.some(r => r.id === c.roomId)` filtra correctamente. OK.

### E-04 · Clase con 0 alumnas
HomeScreen muestra `0/8`. ClassScreen muestra "Sin alumnas apuntadas aún". OK.

### E-05 · Clase con capacidad 0 o negativa
`parseInt(form.capacity) || 8` aplica default. Si vía dev tools se pone 0, se muestra `5/0` en HomeScreen.
La app **no impide pasar de capacidad**: con cap=8 puedes inscribir 12. No hay validación.

### E-06 · Capacidad superada
Sin validación. No hay aviso. La usuaria puede meter 50 alumnas en una sala de 8.

### E-07 · Misma alumna inscrita en la misma clase
Bloqueado solo en cliente (B-14). Race condition posible.

### E-08 · Múltiples suscripciones para misma `(student, series, month)`
No bloqueado (B-15).

### E-09 · Cambio de estado a `paid` con `deposit > 0`
`computeEnrollmentChanges` setea `total = classPrice` pero no resetea `deposit`. Quedan 10€ de depósito + 20€ total. `getRevenue` con `paid` solo cuenta `classPrice`, así que no se duplica, pero `deposit` queda flotando. Si se vuelve a `deposit_paid`, sigue ahí.

### E-10 · Cambio `deposit_paid → registered`
`changes.total = 0` pero `deposit` no se resetea. La siguiente vez que vuelva a `deposit_paid`, `enrollment.deposit !== 0` así que NO se asignan los 10€ por defecto (línea 24). Bug sutil: una alumna que pasó por `deposit_paid` y vuelve a `registered` mantiene su depósito viejo si vuelve a `deposit_paid`.

### E-11 · Clase de grupo con 0 clases en el mes
`calculateClassPrice(monthlyPrice, 0) = 0`. `ClassScreen` mostrará 0€ pendiente y cobrado para clase individual de grupo si esa fue la única clase del mes y se borró. Edge sin manejo claro.

### E-12 · Subscriptions para un mes futuro
La UI permite crear `Subscription` para `selectedMonth` que puede ser un mes futuro de `seriesMonths`. Pero `loadData` solo carga últimos 6 meses (B-13), así que las suscripciones a futuro pueden aparecer/desaparecer según orden de creación vs recarga.

### E-13 · Usuario en otra zona horaria
`new Date(c.date + 'T12:00:00')` está bien (mediodía UTC≈local). Pero `today` se usa en `toISO(d)` que llama a `d.toISOString().split('T')[0]`. Eso devuelve fecha **en UTC**, no local. Un usuario en zona UTC-8 que cree una clase a las 23:00 hora local sufre offset: el `date` por defecto en el form puede ser un día anterior. Bug latente, hoy invisible si solo se usa en España.

### E-14 · Nombre de alumna con caracteres especiales / emoji
`getInitials("👩‍🦰")` o nombres con diacríticos. El `.toUpperCase()` + `.split(' ')` debería sobrevivir, pero no hay tests. Edge sin cobertura.

### E-15 · Email vacío o malformado al hacer login
Supabase responde con error en inglés; se muestra crudo. (B-24.)

### E-16 · Contraseña corta al hacer login
Supabase responde con "Password should be at least 6 characters" en inglés. (B-24.)

### E-17 · Sin conexión a internet
La app no lo detecta. `loadData` espera infinitamente, `useStore.loading` queda `true`, todas las pantallas mostrarían `<LoadingScreen />` indefinidamente. No hay timeout ni retry.

### E-18 · Servicio worker sirve versión vieja tras deploy
`/public/sw.js` no inspeccionado. Sin estrategia de versionado, el usuario móvil puede ver UI vieja indefinidamente. (B-34.)

### E-19 · Más de 6 meses de datos
`loadData` limita subs a 6 meses. (B-13.)

### E-20 · Cambio de precio de grupo
Las suscripciones pasadas se reevalúan con el precio nuevo. (B-12.)

### E-21 · Series eliminada con suscripciones/clases activas
Datos huérfanos. (B-16, B-17.)

### E-22 · Reloj del dispositivo desincronizado
Toda la lógica de "Hoy / Mañana / Esta semana / mes actual" depende del reloj local. Un dispositivo con fecha errónea muestra clases en posiciones equivocadas. Edge no manejable, pero a documentar.

### E-23 · Banner de error tapa la UI
El banner ocupa hasta 430px de ancho y `top: 0`. En `HomeScreen` el `hdr` tiene un `hdr-lbl` que queda tapado mientras el banner está presente. UX menor.

---

## 4 · Gaps de onboarding (usuaria nueva, BBDD vacía)

Lo que ve una usuaria que se acaba de registrar (cuando exista signup, B-01):

### O-01 · No hay pantalla de bienvenida
Tras login, va directo a `HomeScreen` que muestra "No hay clases próximas. Pulsa + para añadir una." Mensaje correcto pero estéril. No hay un mini-tour, ni una checklist de "antes de tu primera clase, crea una sala".

### O-02 · La primera clase es un callejón
Pulsa `+`, abre Nueva clase, pero **necesita una sala**. El `InlineRoomForm` aparece al no haber salas, pero sin "Cancelar" disponible (`hasExistingRooms = false` oculta el botón). Si la usuaria quiere abortar, su única salida es el "Cancelar" del Sheet padre o tocar fuera del sheet. No es obvio.

### O-03 · No hay onboarding sobre grupos vs clases sueltas
El concepto "grupo / serie" es central pero solo se descubre tocando el chip "Grupos ›" en `HomeScreen`. Para una profesora nueva, no es obvio si debe modelar su "Yoga matinal de los lunes" como un grupo o como clases sueltas semanales.

### O-04 · Las métricas vacías son grises pero no explicativas
`HomeScreen` muestra `0 clases`, `0€ cobrado`, `0€ pendiente`. `StudentsScreen` muestra `0 alumnas`, `0 suscritas`, `0 puntuales`. Sin texto que explique la diferencia entre suscritas y puntuales.

### O-05 · `FinanceScreen` con cero datos
Muestra `Balance neto +0€` y "Sin ingresos este mes". Aceptable pero podría empujar a "Añade tu primera clase para ver tus finanzas".

### O-06 · No hay ejemplo / demo data
Cero forma de "previsualizar" cómo se ve la app cargada de datos. Para una usuaria que paga por probar, ver una app vacía no transmite el valor.

### O-07 · Términos de uso / privacidad inexistentes
PRODUCTIZATION_CONTEXT.md marca legal como Fase 4 (post-cobro), pero **antes de cobrar** la usuaria tiene que aceptar TyC y política de privacidad — y la app maneja datos personales de alumnas (RGPD aplica desde el primer registro).

### O-08 · No hay link a soporte/contacto
Si algo no funciona (y va a fallar), no hay forma desde la app de pedir ayuda. Cero "feedback" o "contacto".

### O-09 · Botón "Salir" en bottom nav
Una usuaria nueva, explorando, puede tocar "Salir" pensando que es "Atrás". Sin confirmación (F-07). Vuelve al login sin entender por qué.

### O-10 · `manifest.json` y favicon
No verificados; CONTEXT.md dice que existen. Asumir que sí, pero validar antes de Fase 2.

### O-11 · Multi-idioma
Solo español hardcodeado. PRODUCTIZATION_CONTEXT.md cita el idioma como decisión pendiente. Hoy el código tiene 200+ strings literales en español. Adaptarlo más tarde será trabajo no trivial.

### O-12 · Confirmación tras signup ("revisa tu email")
Asumiendo que se cablee `signUp`: la app no maneja el estado "registrada pero sin email confirmado". El usuario que se acaba de registrar y va a intentar entrar volverá a ver el login con error críptico de Supabase.

---

## Recomendaciones de prioridad (mínimo viable para Fase 3 — beta privada)

Antes de dar acceso a la primera profesora externa:

**Imprescindible (no se puede lanzar sin esto)**: B-01, B-02, B-08.

**Muy recomendado (causa datos incorrectos visibles en la primera semana)**: B-09, B-10, B-11, B-12, B-13, B-14, B-15, B-16, B-17, B-19, B-20.

**Antes de Fase 2 (registro abierto)**: B-18, B-24, B-25, B-26, B-34, O-07, O-12.

**Polish después del lanzamiento**: el resto.

---

## Cobertura de tests pendiente

`calculations.test.ts` cubre el happy path pero **no cubre**:
- `formatEur` con decimales (B-22).
- `getInitials` con strings con espacios al principio o vacíos (B-23).
- `getRevenue` / `getPending` con `priceOverride` (B-09).
- `computeEnrollmentChanges` con `priceOverride` (B-10).
- Comportamiento de `getRevenue` cuando se cambia `classPrice` después de marcar paid (B-11).
- Snapshot vs cálculo dinámico de `subscription.price` (B-12).

`data.test.ts` no cubre los mappers (siguen como funciones internas hasta que se exporten).

Sin tests de integración. Imprescindible al menos uno antes de Fase 3: "crear clase → inscribir alumna → marcar paid → ver en finanzas".

---

## Sources

- `CONTEXT.md`
- `BUSINESS_RULES.md`
- `CONVENTIONS.md`
- `AUDIT.md` previo
- `PRODUCTIZATION_CONTEXT.md` (uploaded)
- Código auditado: `src/app/page.tsx`, `src/hooks/useStore.ts`, `src/lib/{data,types,calculations,supabase,utils}.ts`, `src/components/*.tsx`, `src/components/ui/*.tsx`, `src/app/layout.tsx`.
