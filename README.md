# AnalIA

Asistente digital para adultos mayores. El usuario sube una captura de un mensaje,
correo o ventana que le genera duda y AnalIA le responde, en palabras simples, si ve
señales de estafa y qué conviene hacer.

> **Estado: Etapa 0 de 6 — esqueleto.** Todavía no se suben capturas ni se analiza
> nada. La pantalla de inicio muestra el shell visual y `/privacidad` el borrador de la
> política. Ver [`docs/PLAN.md`](docs/PLAN.md).

## Qué hay para revisar en esta etapa

- Un proyecto Next.js 16 con TypeScript estricto, listo para instalar y buildear.
- Design tokens mobile-first pensados para el público: 20 px de cuerpo, contraste AA,
  objetivos táctiles de 52 px, foco visible, `prefers-reduced-motion`.
- Dos pantallas reales: `/` y `/privacidad`, con copy que no afirma nada sin confirmar.
- `GET /api/health` como smoke test.
- ADRs 001–008, modelo de amenazas, borrador de privacidad y esqueleto del piloto.
- CI que corre typecheck, lint, formato, tests, build y un chequeo de secretos en el
  bundle del cliente.

### Estado de verificación

Verificado dentro del sandbox:

- `pnpm install --frozen-lockfile` sin cambios pendientes.
- `pnpm typecheck`, `pnpm lint` y `pnpm format:check`.
- `pnpm build` completo: 3 rutas estáticas, 1 dinámica y el icono.
- `pnpm check:client-bundle`: 11 archivos del bundle, 0 coincidencias.
- `/`, `/privacidad`, `/api/health` y un 404, servidos en dev y sobre el build de
  producción, con las cabeceras de seguridad.

**Pendiente:** `pnpm test` bajo Vitest (el sandbox bloquea el proceso hijo de esbuild;
las aserciones del test quedaron cubiertas por la verificación HTTP, pero el runner no
corrió) y la revisión visual en un Android real. Antes de cerrar la etapa, corré
`pnpm verify` en tu máquina.

## Requisitos

- Node.js 24 (ver `.node-version`)
- pnpm 11 (`corepack enable` o `npm i -g pnpm@11`)

## Puesta en marcha

```bash
pnpm install
pnpm dev
```

Abrí `http://localhost:3000` en la vista responsive del navegador (360 × 640) o, mejor,
en un Android real.

## Scripts

| Script                     | Qué hace                                                 |
| -------------------------- | -------------------------------------------------------- |
| `pnpm dev`                 | Servidor de desarrollo                                   |
| `pnpm build`               | Build de producción                                      |
| `pnpm start`               | Sirve el build                                           |
| `pnpm typecheck`           | `tsc --noEmit`                                           |
| `pnpm lint`                | ESLint 9 (flat config)                                   |
| `pnpm format`              | Prettier                                                 |
| `pnpm test`                | Vitest                                                   |
| `pnpm check:client-bundle` | Falla si una clave o su nombre aparece en `.next/static` |
| `pnpm verify`              | Todo lo anterior en orden                                |

## Estructura

```
app/                 rutas (App Router)
  api/health/        healthcheck
  privacidad/        política (borrador)
components/          componentes de UI (Etapa 1+)
lib/
  analysis/          contrato y proveedores (Etapa 2+)
  safety/            lint de lenguaje, escalado, inyección (Etapa 3+)
  extract/           datos duros: links, teléfonos, remitentes (Etapa 4+)
  image/             compresión y EXIF en el cliente (Etapa 1+)
prompts/             system prompt versionado (Etapa 3+)
evals/               corpus sintético y runner (Etapa 3+)
tests/               tests unitarios
docs/                ADRs, plan, privacidad, amenazas, piloto
scripts/             chequeos de CI
```

## Decisiones

Las decisiones cerradas viven en [`docs/DECISIONS.md`](docs/DECISIONS.md). Las que
más condicionan el código:

- **ADR-001:** la captura nunca se persiste. No hay disco, ni base, ni logs con
  contenido.
- **ADR-002:** mobile-first Android; 360 px es el ancho de referencia.
- **ADR-003:** sin círculos ni flechas; datos duros en texto y los links no son
  clickeables.
- **ADR-004:** proveedor abstracto; Etapas 0–2 con Fake Provider.
- **ADR-006:** el piloto no tiene cuentas.
- **ADR-008:** `node_modules` hoisted en Windows, para que Turbopack y Node resuelvan
  sin depender de junctions.

## Reglas de seguridad

1. Ninguna clave con prefijo `NEXT_PUBLIC_`. El chequeo de CI lo verifica.
2. Todo lo que venga de una captura, un modelo o un usuario es **dato**, no instrucción.
3. Nada de `dangerouslySetInnerHTML` con contenido generado.
4. El texto de la captura no se loguea.
5. Las operaciones destructivas requieren autorización explícita.

## Cómo revisar la Etapa 0

1. `pnpm install --frozen-lockfile` en un clon limpio.
2. `pnpm verify` (typecheck, lint, test, build, chequeo de bundle). Acá es donde se
   cierran los tres pasos que la sesión de desarrollo no pudo ejecutar.
3. `pnpm dev` y abrir `/` y `/privacidad` en un Android a 360 px.
4. Probar con el texto del sistema al 200 % y con TalkBack.
5. Leer `docs/DECISIONS.md` y `docs/PLAN.md`.
6. Confirmar que no hay ninguna promesa de seguridad sin verificar.

Si algo de esto falla, la etapa no está terminada.

## Qué no existe todavía (a propósito)

- Subida de capturas y cámara.
- Proveedor de visión y cualquier llamada a un modelo.
- Base de datos, auth y analytics.
- Anotaciones sobre la imagen.
- CSP con nonces (Etapa 6).

## Deploy

Vercel. Configurar la región de funciones en `gru1` y no commitear variables de
entorno. Ver ADR-007.
