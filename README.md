# AnalIA

Asistente digital para adultos mayores. El usuario sube una captura de un mensaje,
correo o ventana que le genera duda y AnalIA le responde, en palabras simples, si ve
señales de estafa y qué conviene hacer.

> **Estado: Etapa 1 de 6 — subida de capturas.** Ya se puede elegir o sacar una foto,
> verla y comprimirla en el dispositivo. Todavía no se analiza nada: "Analizar" queda
> deshabilitado hasta la Etapa 2. Ver [`docs/PLAN.md`](docs/PLAN.md).

## Qué hay para revisar en esta etapa

- Un proyecto Next.js 16 con TypeScript estricto, listo para instalar y buildear.
- Flujo de captura: un solo botón primario, vista previa y compresión en el cliente
  (1600 px de lado mayor, JPEG 0,8, sin EXIF).
- Botón primario como ancla visual: verde profundo `#0a4a3c`, 64 px de alto, 22 px de
  etiqueta (ADR-009).
- Design tokens mobile-first: 20 px de cuerpo, contraste AAA, foco visible,
  `prefers-reduced-motion`.
- Dos pantallas reales: `/` y `/privacidad`, con copy que no afirma nada sin confirmar.
- `GET /api/health` como smoke test.
- ADRs 001–009, modelo de amenazas, borrador de privacidad y esqueleto del piloto.
- CI que corre typecheck, lint, formato, tests, build y un chequeo de secretos en el
  bundle del cliente.

### Estado de verificación

Verificado dentro del sandbox:

- `pnpm install --frozen-lockfile` sin cambios pendientes.
- `pnpm typecheck`, `pnpm lint` y `pnpm format:check`.
- `pnpm build` completo: 3 rutas estáticas, 1 dinámica y el icono.
- `pnpm check:client-bundle`: 11 archivos del bundle, 0 coincidencias.
- Marcado y CSS servidos desde el build de producción: botón primario, `input` de
  archivo oculto, aviso de privacidad y tokens del botón.
- Reglas de tamaño y cálculos de redimensionado, con 17 comprobaciones sobre las
  funciones puras.

**Pendiente:** `pnpm test` bajo Vitest (el sandbox bloquea el proceso hijo de esbuild),
la prueba del selector de archivos y de la compresión con una captura real en Android, y
`axe`/TalkBack. Antes de cerrar la etapa, corré `pnpm verify` en tu máquina.

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
components/          CaptureUploader (cliente)
lib/
  analysis/          contrato y proveedores (Etapa 2+)
  safety/            lint de lenguaje, escalado, inyección (Etapa 3+)
  extract/           datos duros: links, teléfonos, remitentes (Etapa 4+)
  image/             compresión, reglas de tamaño y geometría
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
- **ADR-009:** un solo botón sólido por pantalla, verde profundo `#0a4a3c`, 64 px; el
  azul se descartó por su asociación bancaria.

## Reglas de seguridad

1. Ninguna clave con prefijo `NEXT_PUBLIC_`. El chequeo de CI lo verifica.
2. Todo lo que venga de una captura, un modelo o un usuario es **dato**, no instrucción.
3. Nada de `dangerouslySetInnerHTML` con contenido generado.
4. El texto de la captura no se loguea.
5. Las operaciones destructivas requieren autorización explícita.

## Cómo revisar la Etapa 1

1. `pnpm install --frozen-lockfile` en un clon limpio.
2. `pnpm verify` (typecheck, lint, test, build, chequeo de bundle).
3. `pnpm dev` y abrir `/` en un Android a 360 px.
4. Tocar "Subir una captura": debe abrir cámara o galería y volver con la vista previa.
5. Elegir una captura de más de 10 MB: debe rechazarla con un mensaje claro.
6. Probar con el texto del sistema al 200 % y con TalkBack.
7. Leer `docs/DECISIONS.md` (ADR-009) y `docs/PLAN.md`.

Si algo de esto falla, la etapa no está terminada.

## Qué no existe todavía (a propósito)

- Análisis con un modelo real y el botón "Analizar" activo.
- Base de datos, auth y analytics.
- Anotaciones sobre la imagen.
- CSP con nonces (Etapa 6).

## Deploy

Vercel. Configurar la región de funciones en `gru1` y no commitear variables de
entorno. Ver ADR-007.
