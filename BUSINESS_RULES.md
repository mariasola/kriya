# Business Rules — Kriyā

Aplicación de gestión de clases de yoga para uso personal de una profesora freelance.

---

## Entidades

### Sala
- Tiene nombre y dirección
- Se reutiliza en múltiples clases
- No tiene precio fijo — el precio se define en cada clase (variable por negociación)

### Clase
- Tiene nombre libre (ej. "Hatha mañana", "Yin yoga")
- Pertenece a una Sala
- Tiene fecha, hora, capacidad máxima y coste de sala para esa sesión
- El coste de sala es editable por sesión (puede variar aunque sea la misma sala)
- El estado de pago de la sala (`salaPagada`) es independiente del estado de los alumnos
- Una clase puede tener 0 alumnas inscritas

### Alumna
- Tiene nombre completo, teléfono (opcional) y notas libres
- Las notas sirven para dolencias, nivel, alergias, observaciones
- El historial de clases se construye a partir de las inscripciones existentes

### Inscripción
- Une una Alumna con una Clase
- Una alumna no puede estar inscrita dos veces en la misma clase
- Tiene un estado (ver abajo) y campos de pago

---

## Estados de inscripción

| Estado | Significado | Lógica de pago |
|---|---|---|
| `apuntada` | Se ha apuntado, sin pago | Pendiente = precio clase completo |
| `reserva_pagada` | Ha pagado una señal parcial | Pendiente = precio clase − reserva |
| `pagada` | Ha pagado el total | Pendiente = 0 |
| `no_vino` | Estaba apuntada pero no asistió | No cuenta como ingreso ni pendiente |

**Regla implícita de asistencia:** si la clase ha pasado y la alumna no está marcada como `no_vino`, se asume que asistió. No hay campo de asistencia separado.

---

## Precio de clase

- El precio estándar por sesión es **20€** (constante `PRECIO_SESION` en `src/lib/data.ts`)
- Este precio se usa para calcular pendientes cuando el estado es `apuntada`
- Cuando se implementen bonos o mensualidades, este campo deberá volverse variable por alumna/clase

---

## Cálculos financieros

### Cobrado (por clase)
```
sum(total) para estado = 'pagada'
+ sum(reserva) para estado = 'reserva_pagada'
```

### Pendiente (por clase)
```
sum(PRECIO_SESION) para estado = 'apuntada'
+ sum(PRECIO_SESION - reserva) para estado = 'reserva_pagada'
```

### Balance neto (por mes)
```
sum(cobrado de todas las clases del mes)
- sum(costeSala de todas las clases del mes)
```

---

## Reglas de negocio adicionales

- Al añadir una alumna a una clase buscando por nombre: si existe, se reutiliza. Si no existe, se crea automáticamente.
- Una alumna eliminada no está implementada en MVP (los datos de inscripciones quedarían huérfanos).
- Los datos persisten en `localStorage` bajo la clave `kriya_data`.
- Si no hay datos en localStorage, se cargan datos de seed (datos de ejemplo para onboarding).

---

## Flujos principales

### Día de clase
1. Home → ver clase del día
2. Tap en clase → ver lista de alumnas y su estado
3. Tap en alumna → cambiar estado (apuntada → pagada, etc.)
4. Tap en "Sin pagar" de sala → marcar sala como pagada

### Añadir nueva alumna a una clase
1. Detalle de clase → "+ Añadir alumna"
2. Escribir nombre → seleccionar de sugerencias o crear nueva
3. Se añade con estado `apuntada` por defecto

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
- **Multi-dispositivo:** migración de localStorage a Supabase para sincronización
- **Acceso de alumnas:** reservas propias sin login (posiblemente via link único)
