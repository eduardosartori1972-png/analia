# AnalIA

Asistente digital para adultos mayores. El usuario sube una captura de un mensaje,
correo o ventana que le genera duda y AnalIA le responde, en palabras simples, si ve
señales de estafa y qué conviene hacer.

> **Estado: Etapa 3 cerrada y validada con DeepSeek Flash.** Los cuatro casos del corpus
> pasaron contra el modelo real (3–4 s por imagen) y la suite completa está en verde:
> 60/60 tests. Siguen el prompt v1, la capa de seguridad, la derivación bancaria, la
> cadena de respaldo y el corpus con capturas sintéticas. Ver
> [`docs/PLAN.md`](docs/PLAN.md), [`docs/PROVIDERS.md`](docs/PROVIDERS.md) y
> [`docs/KEY-ROTATION.md`](docs/KEY-ROTATION.md).

## Activación del proveedor real

1. Crear `analia/.env.local` (está en `.gitignore`).
2. Pegar la clave y el modelo:

   ```bash
   ANALYZE_PROVIDER=deepseek
   ANALYZE_API_KEY=sk-...
   ANALYZE_MODEL=deepseek-flash
   ```

3. Reiniciar `pnpm dev`.
4. Correr el corpus contra el proveedor real (PowerShell):

   ```powershell
   $env:ANALYZE_LIVE="1"; pnpm test
   ```

   Solo los cuatro casos, sin el resto de la suite:

   ```powershell
   $env:ANALYZE_LIVE="1"; pnpm exec vitest run tests/evals.live.test.ts
   ```

   `vitest.config.ts` carga las variables de `.env.local`, igual que Next. Si
   `ANALYZE_PROVIDER` quedara en `fake`, la corrida live falla con un mensaje claro en
   lugar de probar el simulador sin darse cuenta.

Nunca se usa el prefijo `NEXT_PUBLIC_` ni se commitea el archivo. El paso a paso completo,
incluida la rotación, está en [`docs/KEY-ROTATION.md`](docs/KEY-ROTATION.md).

## Qué hay para revisar en esta etapa

- Un proyecto Next.js 16 con TypeScript estricto, listo para instalar y buildear.
- Flujo de captura: un solo botón primario, vista previa y compresión en el cliente
  (1600 px de lado mayor, JPEG 0,8, sin EXIF).
- Análisis: contrato validado con zod, taxonomía de cuatro veredictos, adaptador de
  DeepSeek (API compatible con OpenAI) y cadena de respaldo con reintento.
- Endpoint con validación por magic bytes, timeout por intento, rate limit y techo
  mensual.
- Capa de seguridad: el límite final lo escribe el sistema, no el modelo; seis reglas
  descartan respuestas con promesas absolutas o instrucciones de clic.
- Resultado en pantalla: veredicto, "qué veo", "qué conviene hacer", bloque de
  derivación cuando hay riesgo bancario y límite explícito.
- Corpus de evaluación con cuatro capturas sintéticas: legítimo, sospechoso, ambiguo e
  inyección.
- Botón primario como ancla visual: verde profundo `#0a4a3c`, 64 px de alto, 22 px de
  etiqueta (ADR-009).
- Design tokens mobile-first: 20 px de cuerpo, contraste AAA, foco visible,
  `prefers-reduced-motion`.
- Dos pantallas reales: `/` y `/privacidad`, con copy que no afirma nada sin confirmar.
- ADRs 001–010, modelo de amenazas, borrador de privacidad y esqueleto del piloto.
- CI que corre typecheck, lint, formato, tests, build y un chequeo de secretos en el
  bundle del cliente.

### Estado de verificación

Verificado en esta máquina (Windows, con el `.env.local` real):

- **`pnpm test`: 60/60 tests en verde.**
- **Evals contra DeepSeek Flash: 4/4**, con los veredictos esperados y **3–4 s por
  imagen** (objetivo: p95 < 8 s). El caso de inyección se comportó como se esperaba: la
  instrucción escondida en la captura se trató como dato.
- `pnpm typecheck`, `pnpm lint` y `pnpm format:check`.
- `pnpm build` completo: 3 rutas estáticas, 2 dinámicas y el icono.
- `pnpm check:client-bundle`: 12 archivos del bundle, 0 coincidencias, con la clave real
  presente en `.env.local`.

Verificado además dentro del sandbox de desarrollo:

- Corpus con el Fake Provider: 4/4.
- Adaptador de DeepSeek contra un servidor local que imita la API: request, header,
  data URL, JSON envuelto en markdown, error 500, JSON inválido y timeout.
- Endpoint sobre el build de producción: presupuesto, inyección y caída del proveedor.

**Pendiente para el piloto:** la confirmación escrita de retención y no-entrenamiento del
proveedor (para publicar `/privacidad` sin el aviso de borrador) y la revisión legal.

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
  api/analyze/       único endpoint que toca la imagen
  api/health/        healthcheck
  privacidad/        política (borrador)
components/          CaptureUploader y AnalysisResult (cliente)
lib/
  analysis/          contrato, proveedores, endpoint helpers, rate limit
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

## Cómo revisar la Etapa 2

1. `pnpm install --frozen-lockfile` en un clon limpio.
2. `pnpm verify` (typecheck, lint, test, build, chequeo de bundle).
3. `pnpm dev` y abrir `/` en un Android a 360 px.
4. Subir una captura y tocar "Analizar": debe aparecer el veredicto con "qué veo",
   "qué conviene hacer" y el límite.
5. Probar los cuatro estados del fake:
   `ANALYZE_FAKE_SCENARIO=legitimo|sospechoso|ambiguo|error pnpm dev`.
6. Probar con el texto del sistema al 200 % y con TalkBack.
7. Leer `docs/DECISIONS.md` (ADR-004 y ADR-009) y `docs/PLAN.md`.

Si algo de esto falla, la etapa no está terminada.

## Qué no existe todavía (a propósito)

- Proveedor de visión real: el análisis es simulado.
- Datos duros (links, teléfonos, remitentes) y sus resaltados.
- Base de datos, auth y analytics.
- Anotaciones sobre la imagen.
- CSP con nonces (Etapa 6).

## Deploy

Vercel. Configurar la región de funciones en `gru1` y no commitear variables de
entorno. Ver ADR-007.
