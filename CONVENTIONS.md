# Convenciones técnicas — Kriyā

Estándares de implementación que complementan las reglas de negocio (`BUSINESS_RULES.md`).

---

## Accesibilidad (WCAG 2.1)

### Controles interactivos con estilo custom

**Nunca usar `<div onClick>` o `<span onClick>` para checkboxes, radios ni toggles.**

Seguimos el patrón **visually-hidden input + label**: el `<input>` nativo gestiona estado, foco, teclado y screen readers; el elemento visual es puramente decorativo y lleva `aria-hidden="true"`.

```tsx
<label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
  <input
    type="checkbox"
    checked={value}
    onChange={handler}
    style={{ position: 'absolute', opacity: 0, width: 0, height: 0 }}
  />
  <span className={`cb-label${value ? ' checked' : ''}`}>Etiqueta</span>
  <span className={`cb-box${value ? ' checked' : ''}`} aria-hidden="true" />
</label>
```

**Por qué:** un `<div>` clickable no es focusable por teclado, no responde a Enter/Space, y los lectores de pantalla no lo anuncian como control interactivo.

---

## Estilos

### Inputs y formularios

- Todos los `<input>`, `<textarea>` y `<select>` usan la clase `.field-input` definida en `globals.css`.
- No usar estilos inline en campos de formulario.
- Placeholder: color `#c8c0b4` + `font-style: italic` para distinguirlo claramente del valor real.
