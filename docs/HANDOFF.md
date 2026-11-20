# Traspaso — AnalIA (MVP)

> Documento de traspaso para otro agente. Estado al **2026-11-19**. Todo lo que dice acá
> está verificado en el repo; lo que falta está marcado como pendiente. El detalle extenso
> vive en `docs/` (mapa al final).

## 0. Resumen

AnalIA es una web mobile-first para adultos mayores de Argentina: la persona sube una
captura de un mensaje, correo o ventana que le genera duda, y la app le dice si ve señales
de estafa, en lenguaje simple y sin prometer que algo "es seguro".

- **Stack:** Next.js 16.4.3 (App Router, Turbopack) · React 19.3.1 · TypeScript 5.9.3
  estricto · CSS propio con tokens · pnpm 11.28.5 · Node 24.
- **Repositorio:** `github.com/eduardosartori1972-png/analia`, rama `main`. Último commit
  desplegado: `2e76997`. Los commits posteriores son solo documentación y no cambian el
  runtime.
- **Producción:** Vercel (región `gru1`), proveedor de visión **OpenAI `gpt-4o-mini`**.
- **Estado:** piloto cerrado con 20 testers, listo para arrancar. Faltan la revisión legal
  y la revisión del consentimiento.

## 1. Arquitectura

### 1.1 Flujo

```
Navegador (móvil)
  captura → compresión en canvas (lado mayor 1600 px, JPEG q0.8→0.65→0.5, ≤3,5 MB)
  → preview en pantalla (la imagen nunca sale del cliente por otro camino)

POST /api/analyze  (multipart, runtime nodejs, maxDuration 30 s, región gru1)
  1. acceso: cookie HMAC válida, o 401
  2. límites: solo en modo abierto (sin código): rate limit 30/10 min por IP y cuota
  3. validaciones: tamaño ≤4 MB, magic bytes (JPEG/PNG/WebP), no vacío
  4. proveedor: cadena con 2 intentos de 10 s → openai (o fake en desarrollo)
  5. respuesta: JSON del modelo → parser tolerante (jsonrepair) → zod → enforceSafety
  6. devuelve { analysis, requestId } y registra una línea de log sin contenido

Respuesta → tarjeta con veredicto, razones, pasos y límite canónico
```

La imagen vive **solo en memoria**: no se escribe a disco, ni a base, ni a logs (ADR-001;
hay un test que recorre el código y lo verifica).

### 1.2 Piezas clave

| Archivo                    | Rol                                                                      |
| -------------------------- | ------------------------------------------------------------------------ |
| `app/api/analyze/route.ts` | único endpoint que toca la imagen                                        |
| `app/api/access/route.ts`  | valida el código del piloto y emite la cookie firmada                    |
| `lib/access/session.ts`    | HMAC de sesión, comparación en tiempo constante, modo de acceso          |
| `lib/analysis/contract.ts` | esquema zod de la respuesta (los límites de longitud viven acá)          |
| `lib/analysis/json.ts`     | parser de dos pasadas: JSON estricto y `jsonrepair`                      |
| `lib/analysis/providers/`  | `openai-compatible`, `fake`, cadena con reintento                        |
| `lib/safety/policy.ts`     | 6 reglas de frases prohibidas + límite canónico por veredicto            |
| `lib/analysis/messages.ts` | único catálogo de texto de error visible al usuario                      |
| `prompts/system.v4.md`     | system prompt vigente (inmutable; se versiona)                           |
| `middleware.ts`            | CSP con nonce por request                                                |
| `evals/`                   | corpus de 4 casos + runner (fake por defecto, real con `ANALYZE_LIVE=1`) |

### 1.3 Veredictos

`sin_señales_visibles` · `señales_sospechosas` · `altamente_probable_estafa` ·
`no_pude_analizar`.

`escalation`: `none` · `banking` · `already-clicked`. La capa de seguridad fuerza
`banking` cuando el veredicto es estafa y reemplaza siempre `limits` por la frase canónica
del veredicto: el `limits` del modelo nunca se muestra.

### 1.4 Variables de entorno

| Variable                    | Producción        | Notas                                  |
| --------------------------- | ----------------- | -------------------------------------- |
| `ANALYZE_PROVIDER`          | `openai`          | `fake` en desarrollo                   |
| `ANALYZE_API_KEY`           | clave de OpenAI   | marcar Sensitive en Vercel             |
| `ANALYZE_MODEL`             | `gpt-4o-mini`     |                                        |
| `ANALYZE_ACCESS_CODE`       | código del piloto | sin esto el acceso queda abierto       |
| `ANALYZE_ACCESS_SECRET`     | 32+ caracteres    | firma la cookie                        |
| `ANALYZE_COST_PER_CALL_USD` | `0.00048`         | solo se usa en modo abierto            |
| `ANALYZE_MAX_TOKENS`        | `4096` (default)  |                                        |
| `ANALYZE_FALLBACK_PROVIDER` | `none`            | nunca DeepSeek en producción (ADR-012) |

## 2. Funcionalidades implementadas y probadas

- **Subida y compresión** en el cliente, con preview, reintentos de decodificación y
  recorte de tamaño. Probado en Android real.
- **Análisis con visión** en 3–5 s por imagen, con reintento y timeout.
- **Cuatro veredictos** con título, resumen, 1–4 razones y 1–3 pasos; el primero siempre
  empieza con una acción segura.
- **Capa de seguridad** que bloquea frases prohibidas ("es seguro", "100 % seguro",
  "garantizado", etc.) y canonicaliza el cierre.
- **Código de acceso** para el piloto: campo en la home, validación en servidor, cookie
  HttpOnly firmada de 7 días, 10 intentos cada 10 min, sin límites de uso para testers.
- **Página de privacidad publicada**: proveedor, retención de 30 días, no entrenamiento,
  responsable, contacto y derechos (incluye reclamo ante la AAIP).
- **CSP con nonce** por request, más `nosniff`, `Referrer-Policy`, `X-Frame-Options`,
  `Permissions-Policy`.
- **Errores amables**: todo mensaje visible sale de `USER_MESSAGES`; nunca se filtran
  mensajes técnicos.
- **Evals**: 4 casos (legítimo, sospechoso, ambiguo, inyección de prompt) que corren en CI
  con el fake y contra el proveedor real con `ANALYZE_LIVE=1`.
- **Suite de tests**: 102 casos declarados en `tests/` (contrato, parser, proveedores,
  acceso, rate limit, timeout, no persistencia, mensajes, evals).
- **Planilla del piloto** en Excel (`docs/planilla-piloto.xlsx`), con resumen automático.

## 3. Problemas que encontramos y cómo se resolvieron

| Síntoma                                                                | Causa                                                                | Solución                                                                       |
| ---------------------------------------------------------------------- | -------------------------------------------------------------------- | ------------------------------------------------------------------------------ |
| `spawn EPERM` al buildear en sandbox                                   | Next usaba procesos hijos para workers                               | `experimental.workerThreads: true`; verificación con `tsc` + server in-process |
| Next no resolvía módulos en Windows                                    | junctions de pnpm                                                    | `nodeLinker: hoisted` + `storeDir` local (ADR-008)                             |
| La segunda subida fallaba                                              | el `File` se vaciaba al limpiar el input                             | snapshot a `Blob` propio antes de limpiar; 3 vías de decodificación            |
| El fake daba siempre el mismo veredicto                                | `hash % 4` usaba bits bajos                                          | `(fingerprint >>> 24) % 4`                                                     |
| El usuario veía "El proveedor no devolvió un JSON válido"              | la ruta repetía `error.message`                                      | catálogo `USER_MESSAGES` por código                                            |
| `invalid_response` sin diagnóstico                                     | solo se logueaba el parser                                           | logs de contenido vacío y de campo inválido (`campos=…`)                       |
| `finish=length` con `llaves=0/0`                                       | el modelo escribía prosa antes del JSON                              | `max_tokens` 4096 + prompt v3 con regla de "empezá con `{`"                    |
| `campos=limits`                                                        | el modelo omitía `limits`                                            | campo opcional con default; el sistema lo escribe siempre                      |
| DeepSeek entrena por defecto, sin plazo y en China                     | verificación de términos                                             | migración a OpenAI (ADR-012); DeepSeek queda solo en desarrollo                |
| La CSP no aplicaba a páginas estáticas                                 | un nonce por request no convive con HTML de build                    | `force-dynamic` en `/` y `/privacidad` (ADR-011)                               |
| El código de acceso no aparecía en producción                          | 10 commits locales nunca pusheados; Vercel construía el commit viejo | `git push` y verificar que el deploy diga el commit nuevo                      |
| El modelo pasó de "parece estafa" a "sospechosas" con la misma captura | prompt v4 más prudente + no determinismo residual                    | se aceptó la banda en las evals; no se tocó el prompt                          |

## 4. Estado del deploy

- **Plataforma:** Vercel Hobby, región `gru1`, Node 24, `maxDuration` 30 s.
- **Commit en producción:** `2e76997` (el que estaba en `main` al hacer el deploy).
- **Proveedor:** OpenAI `gpt-4o-mini`, con DPA firmado el **31/10/2026** y saldo de 5 USD.
- **Acceso:** activo con `ANALYZE_ACCESS_CODE`; sin cookie, `/api/analyze` responde 401.
- **Salud:** `GET /api/health` responde 200 (se usa para readiness).
- **Logs:** una línea por consulta: `[analyze] ok (id) source=tester verdict=… ms instancia=N`.
  Los errores agregan `type`, `code` y `param` del proveedor, nunca el contenido.
- **Costo:** ~0.0005–0.0007 USD por consulta (prompt de ~2.500 tokens + imagen + salida).
- **Pendiente operativo:** límite de facturación en el panel de OpenAI (el tope de la app
  no aplica a testers).

## 5. Decisiones de diseño

**Paleta.** Verde profundo `#0a4a3c` (marca) sobre fondo cálido `#f7f4ee`, texto
`#07382d`. Se descartó el azul por asociación bancaria y el rojo como color primario
porque alarma. El rojo se reserva para el veredicto de estafa. Contraste alto, sin
gradientes ni sombras fuertes.

**Tipografía.** Stack del sistema (`system-ui`, Segoe UI, Roboto), cuerpo de 18–20 px y
títulos de 28–32 px, con `line-height` amplio. Nada de fuentes decorativas ni texto fino.

**UX.**

- Una sola acción primaria por pantalla; botones de al menos 48 px de alto.
- Voseo rioplatense, frases de hasta 20 palabras, sin jerga ni diminutivos.
- Nunca "es seguro" ni "100 % privado": como máximo "no veo señales de estafa".
- El primer paso siempre es una acción segura ("No toques el link", "Verificá por el
  canal oficial", "Llamá al número del dorso de la tarjeta").
- Sin anotaciones gráficas sobre la captura; los datos duros, si se muestran, van como
  texto (Etapa 4 diferida).
- El resultado se anuncia con `aria-live` y el foco se mantiene; todo funciona con
  teclado y con lector de pantalla.

**Privacidad como decisión de producto.** La promesa ("no guardamos tu captura; el
proveedor no entrena y conserva 30 días") está sostenida por la documentación de OpenAI y
el DPA, no por una estimación. Si se cambia de proveedor o de modelo, hay que rehacer esa
verificación antes de publicar.

## 6. Próximos pasos

| Pendiente                                                          | Quién          | Bloquea el piloto           |
| ------------------------------------------------------------------ | -------------- | --------------------------- |
| Revisar `CONSENT.md` con una persona del público objetivo          | usuario        | sí                          |
| Revisión legal de la Ley 25.326 (`DATA-INVENTORY.md` es el insumo) | abogado        | no para 20; sí para escalar |
| Límite de facturación en OpenAI                                    | usuario        | no, pero urgente            |
| Confirmar retención de logs de Vercel                              | usuario/agente | no                          |
| Rutina de revisión de logs y costo                                 | agente         | no                          |
| Etapa 4: datos duros como texto                                    | agente         | no (diferida)               |
| Formulario de Google y guion del video                             | asesor externo | no                          |
| Facilitador, fechas y lugar de las sesiones                        | usuario        | sí                          |

Comandos útiles:

```powershell
pnpm dev                 # desarrollo
pnpm verify              # typecheck + lint + tests + build + bundle
pnpm test                # solo tests
$env:ANALYZE_LIVE="1"; pnpm exec vitest run tests/evals.live.test.ts   # evals reales
```

Nota: en algunos sandboxes `vitest` y `next build` no pueden abrir procesos hijos
(`spawn EPERM`); la verificación se hizo compilando con `tsc` y sirviendo el build
in-process. En CI (GitHub Actions, `.github/workflows/ci.yml`) corre normal.

## 7. Mapa de documentos

| Documento                   | Contenido                                                  |
| --------------------------- | ---------------------------------------------------------- |
| `docs/DECISIONS.md`         | 13 ADR: privacidad, proveedores, CSP, acceso, preprocesado |
| `docs/PLAN.md`              | etapas y estado real de cada una                           |
| `docs/PRIVACY.md`           | política publicada, fuente de cada dato, pendientes        |
| `docs/DATA-INVENTORY.md`    | insumo para el abogado (flujo, retención, preguntas)       |
| `docs/CONSENT.md`           | consentimiento informado, una carilla                      |
| `docs/PILOT.md`             | protocolo de las 20 sesiones y formulario                  |
| `docs/planilla-piloto.xlsx` | registro P01–P20, encuesta y resumen                       |
| `docs/THREAT-MODEL.md`      | amenazas y mitigaciones                                    |
| `docs/PROVIDERS.md`         | por qué OpenAI y qué pasó con DeepSeek                     |
| `docs/DEPLOY.md`            | variables, pasos y verificación                            |
| `docs/KEY-ROTATION.md`      | rotación de claves y del código de acceso                  |

## 8. Reglas que no se rompen

1. La imagen no se persiste ni se loguea; solo se registra la forma de la respuesta.
2. Ningún mensaje de error técnico llega a la pantalla.
3. Nunca se afirma que algo "es seguro".
4. El prompt no se edita: se crea `system.vN.md` y se mueve `PROMPT_VERSION`.
5. Ninguna clave del proveedor llega al cliente (`pnpm check:client-bundle` lo verifica).
6. Antes de cambiar de modelo o proveedor, correr las evals y reverificar la promesa de
   privacidad.
7. DeepSeek no se usa en producción ni como respaldo.

## 9. Auditoría previa al piloto (2026-11-20)

| Hallazgo                                                   | Estado                                                        |
| ---------------------------------------------------------- | ------------------------------------------------------------- |
| Next 16.4.3 con 7 advisories moderados                     | **Corregido:** 16.4.6, `pnpm audit` sin hallazgos             |
| El código de acceso fallaba abierto si tenía <6 caracteres | **Corregido:** fail closed + log                              |
| Un 401 dejaba al tester sin salida                         | **Corregido:** la puerta se vuelve a mostrar con aviso y foco |
| El veredicto era el texto más chico (15 px)                | **Corregido:** es el h2 con ícono y color (ADR-014)           |
| Una cookie malformada podía dar 500                        | **Corregido:** `readCookie` no lanza                          |
| Tope de facturación en OpenAI                              | **Pendiente (responsable del proyecto)**                      |
| HSTS sin verificar en producción                           | Pendiente                                                     |
| Tests HTTP de `/api/access` y `/api/analyze`               | Pendiente                                                     |
| Monitoreo y alertas de errores/costo                       | Pendiente                                                     |
| Código del piloto con guion (difícil en teclado móvil)     | Recomendado: alfanumérico                                     |
