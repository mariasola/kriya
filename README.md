# Kriyā — Gestión de clases de yoga

App personal para gestionar clases, alumnas y finanzas como profesora de yoga freelance.

## Requisitos

- Node.js 18+
- npm

## Instalación

```bash
npm install
npm run dev
```

Abre [http://localhost:3000](http://localhost:3000) en el navegador.

## Scripts

| Comando | Descripción |
|---|---|
| `npm run dev` | Servidor de desarrollo |
| `npm run build` | Build de producción |
| `npm run start` | Servidor de producción local |

## Documentación

- [`BUSINESS_RULES.md`](./BUSINESS_RULES.md) — lógica de negocio, flujos y reglas
- [`CONTEXT.md`](./CONTEXT.md) — arquitectura técnica y guía para continuar el desarrollo

## Deploy

El proyecto se despliega automáticamente en Vercel con cada push a `main`.

## PWA

Para instalar en el móvil: abre la URL en Safari → compartir → "Añadir a pantalla de inicio".

Antes de publicar, añade los iconos en `/public`:
- `icon-192.png` (192×192 px)
- `icon-512.png` (512×512 px)
