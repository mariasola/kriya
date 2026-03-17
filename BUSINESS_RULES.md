# Business Rules — Kriyā

Aplicación de gestión de clases de yoga para uso personal de una profesora freelance.

---

## Entidades

### Room (Sala)
- Tiene nombre y dirección
- Se reutiliza en múltiples clases
- No tiene precio fijo — el precio se define en cada clase (variable por negociación)

### Class (Clase)
- Tiene nombre libre (ej. "Hatha mañana", "Yin yoga")
- Pertenece a una Room
- Tiene fecha, hora, capacidad máxima y coste de sala para esa sesión
- El coste de sala es editable por sesión (puede variar aunque sea la misma sala)
- El estado de pago de la sala (`roomPaid`) es independiente del estado de los alumnos
- Una clase puede tener 0 alumnas inscritas

### Student (Alumna)
- Tiene nombre completo, teléfono (opcional) y notas libres
- Las notas sirven para dolencias, nivel, alergias, observaciones
- El historial de clases se construye a partir de las inscripciones existentes

### Enrollment (Inscripción)
- Une una Student con una Class
- Una alumna no puede estar inscrita dos veces en la misma clase
- Tiene un estado (ver abajo) y campos de pago

---

## Estados de inscripción

| Estado | Significado | Lógica de pago |
|---|---|---|
| `registered` | Se ha apuntado, sin pago | Pendiente = precio clase completo |
| `deposit_paid` | Ha pagado una señal parcial | Pendiente = precio clase − depósito |
| `paid` | Ha pagado el total | Pendiente = 0 |
| `no_show` | Estaba apuntada pero no asistió | No cuenta como ingreso ni pendiente |

**Regla implícita de asistencia:** si la clase ha pasado y la alumna no está marcada como `no_show`, se asume que asistió. No hay campo de asistencia separado.

---

## Precio de clase

- El precio estándar por sesión es **20€** (constante `SESSION_PRICE` en `src/lib/data.ts`)
- Este precio se usa para calcular pendientes cuando el estado es `registered`
- Cuando se implementen bonos o mensualidades, este campo deberá volverse variable por alumna/clase

---

## Cálculos financieros

### Cobrado (por clase)
```
sum(total) para status = 'paid'
+ sum(deposit) para status = 'deposit_paid'
```

### Pendiente (por clase)
```
sum(SESSION_PRICE) para status = 'registered'
+ sum(SESSION_PRICE - deposit) para status = 'deposit_paid'
```

### Balance neto (por mes)
```
sum(cobrado de todas las clases del mes)
- sum(roomCost de todas las clases del mes)
```

---

## Reglas de negocio adicionales

- Al añadir una alumna a una clase buscando por nombre: si existe, se reutiliza. Si no existe, se crea automáticamente.
- Una alumna eliminada no está implementada en MVP (los datos de inscripciones quedarían huérfanos).
- Cada usuario solo ve sus propios datos gracias a Row Level Security (RLS) en Supabase.
- Los datos anteriores en localStorage **no se migran automáticamente** al cambiar a Supabase.

---

## Flujos principales

### Día de clase
1. Home → ver clase del día
2. Tap en clase → ver lista de alumnas y su estado
3. Tap en alumna → cambiar estado (registered → paid, etc.)
4. Tap en toggle de sala → marcar sala como pagada

### Añadir nueva alumna a una clase
1. Detalle de clase → "+ Añadir alumna"
2. Escribir nombre → seleccionar de sugerencias o crear nueva
3. Se añade con estado `registered` por defecto

### Revisar finanzas del mes
1. Tab Finanzas → seleccionar mes
2. Ver balance, ingresos, gastos de sala
3. Tap en "Pendiente de cobrar" → ver qué alumnas deben y cuánto

---

## Futuras funcionalidades previstas (no implementadas)

- **Bonos de sesiones:** N clases prepagadas, se descuentan con cada asistencia
- **Mensualidades:** precio fijo mensual independiente del número de clases
- **Precio variable por alumna:** diferentes precios según tarifa acordada
- **Integración WhatsApp:** generación de mensajes pre-redactados con un tap
- **Acceso de alumnas:** reservas propias sin login (posiblemente via link único)
