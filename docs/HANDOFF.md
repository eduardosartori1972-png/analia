# Traspaso â€” AnalIA (MVP)

> Documento de traspaso para otro agente. Estado al **2026-11-19**. Todo lo que dice acÃ¡
> estÃ¡ verificado en el repo; lo que falta estÃ¡ marcado como pendiente. El detalle extenso
> vive en `docs/` (mapa al final).

## 0. Resumen

AnalIA es una web mobile-first para adultos mayores de Argentina: la persona sube una
captura de un mensaje, correo o ventana que le genera duda, y la app le dice si ve seÃ±ales
de estafa, en lenguaje simple y sin prometer que algo "es seguro".

- **Stack:** Next.js 16.4.3 (App Router, Turbopack) Â· React 19.3.1 Â· TypeScript 5.9.3
  estricto Â· CSS propio con tokens Â· pnpm 11.28.5 Â· Node 24.
- **Repositorio:** `github.com/eduardosartori1972-png/analia`, rama `main`. Ãšltimo commit
  desplegado: `2e76997`. Los commits posteriores son solo documentaciÃ³n y no cambian el
  runtime.
- **ProducciÃ³n:** Vercel (regiÃ³n `gru1`), proveedor de visiÃ³n **OpenAI `gpt-4o-mini`**.
- **Estado:** piloto cerrado con 20 testers, listo para arrancar. Faltan la revisiÃ³n legal
  y la revisiÃ³n del consentimiento.

## 1. Arquitectura

### 1.1 Flujo

```
Navegador (mÃ³vil)
  captura â†’ compresiÃ³n en canvas (lado mayor 1600 px, JPEG q0.8â†’0.65â†’0.5, â‰¤3,5 MB)
  â†’ preview en pantalla (la imagen nunca sale del cliente por otro camino)

POST /api/analyze  (multipart, runtime nodejs, maxDuration 30 s, regiÃ³n gru1)
  1. acceso: cookie HMAC vÃ¡lida, o 401
  2. lÃ­mites: solo en modo abierto (sin cÃ³digo): rate limit 30/10 min por IP y cuota
  3. validaciones: tamaÃ±o â‰¤4 MB, magic bytes (JPEG/PNG/WebP), no vacÃ­o
  4. proveedor: cadena con 2 intentos de 10 s â†’ openai (o fake en desarrollo)
  5. respuesta: JSON del modelo â†’ parser tolerante (jsonrepair) â†’ zod â†’ enforceSafety
  6. devuelve { analysis, requestId } y registra una lÃ­nea de log sin contenido

Respuesta â†’ tarjeta con veredicto, razones, pasos y lÃ­mite canÃ³nico
```

La imagen vive **solo en memoria**: no se escribe a disco, ni a base, ni a logs (ADR-001;
hay un test que recorre el cÃ³digo y lo verifica).

### 1.2 Piezas clave

| Archivo                    | Rol                                                                      |
| -------------------------- | ------------------------------------------------------------------------ |
| `app/api/analyze/route.ts` | Ãºnico endpoint que toca la imagen                                       |
| `app/api/access/route.ts`  | valida el cÃ³digo del piloto y emite la cookie firmada                   |
| `lib/access/session.ts`    | HMAC de sesiÃ³n, comparaciÃ³n en tiempo constante, modo de acceso        |
| `lib/analysis/contract.ts` | esquema zod de la respuesta (los lÃ­mites de longitud viven acÃ¡)        |
| `lib/analysis/json.ts`     | parser de dos pasadas: JSON estricto y `jsonrepair`                      |
| `lib/analysis/providers/`  | `openai-compatible`, `fake`, cadena con reintento                        |
| `lib/safety/policy.ts`     | 6 reglas de frases prohibidas + lÃ­mite canÃ³nico por veredicto          |
| `lib/analysis/messages.ts` | Ãºnico catÃ¡logo de texto de error visible al usuario                    |
| `prompts/system.v5.md`     | system prompt vigente (inmutable; se versiona)                           |
| `middleware.ts`            | CSP con nonce por request                                                |
| `evals/`                   | corpus de 5 casos + runner (fake por defecto, real con `ANALYZE_LIVE=1`) |

### 1.3 Veredictos

`sin_seÃ±ales_visibles` Â· `seÃ±ales_sospechosas` Â· `altamente_probable_estafa` Â·
`no_pude_analizar`.

`escalation`: `none` Â· `banking` Â· `already-clicked`. La capa de seguridad fuerza
`banking` cuando el veredicto es estafa y reemplaza siempre `limits` por la frase canÃ³nica
del veredicto: el `limits` del modelo nunca se muestra.

### 1.4 Variables de entorno

| Variable                    | ProducciÃ³n        | Notas                                   |
| --------------------------- | ------------------ | --------------------------------------- |
| `ANALYZE_PROVIDER`          | `openai`           | `fake` en desarrollo                    |
| `ANALYZE_API_KEY`           | clave de OpenAI    | marcar Sensitive en Vercel              |
| `ANALYZE_MODEL`             | `gpt-4o-mini`      |                                         |
| `ANALYZE_ACCESS_CODE`       | cÃ³digo del piloto | sin esto el acceso queda abierto        |
| `ANALYZE_ACCESS_SECRET`     | 32+ caracteres     | firma la cookie                         |
| `ANALYZE_COST_PER_CALL_USD` | `0.00048`          | solo se usa en modo abierto             |
| `ANALYZE_MAX_TOKENS`        | `4096` (default)   |                                         |
| `ANALYZE_FALLBACK_PROVIDER` | `none`             | nunca DeepSeek en producciÃ³n (ADR-012) |

## 2. Funcionalidades implementadas y probadas

- **Subida y compresiÃ³n** en el cliente, con preview, reintentos de decodificaciÃ³n y
  recorte de tamaÃ±o. Probado en Android real.
- **AnÃ¡lisis con visiÃ³n** en 3â€“5 s por imagen, con reintento y timeout.
- **Cuatro veredictos** con tÃ­tulo, resumen, 1â€“4 razones y 1â€“3 pasos; el primero siempre
  empieza con una acciÃ³n segura.
- **Capa de seguridad** que bloquea frases prohibidas ("es seguro", "100 % seguro",
  "garantizado", etc.) y canonicaliza el cierre.
- **CÃ³digo de acceso** para el piloto: campo en la home, validaciÃ³n en servidor, cookie
  HttpOnly firmada de 7 dÃ­as, 10 intentos cada 10 min, sin lÃ­mites de uso para testers.
- **PÃ¡gina de privacidad publicada**: proveedor, retenciÃ³n de 30 dÃ­as, no entrenamiento,
  responsable, contacto y derechos (incluye reclamo ante la AAIP).
- **CSP con nonce** por request, mÃ¡s `nosniff`, `Referrer-Policy`, `X-Frame-Options`,
  `Permissions-Policy`.
- **Errores amables**: todo mensaje visible sale de `USER_MESSAGES`; nunca se filtran
  mensajes tÃ©cnicos.
- **Evals**: 5 casos (legÃ­timo, sospechoso, ambiguo, inyecciÃ³n de prompt y phishing claro)
  que corren en CI con el fake y contra el proveedor real con `ANALYZE_LIVE=1`.
- **Suite de tests**: 114 casos declarados en `tests/` (contrato, parser, proveedores,
  acceso, rate limit, timeout, no persistencia, mensajes, evals).
- **Planilla del piloto** en Excel (`docs/planilla-piloto.xlsx`), con resumen automÃ¡tico.

## 3. Problemas que encontramos y cÃ³mo se resolvieron

| SÃ­ntoma                                                                | Causa                                                                 | SoluciÃ³n                                                                       |
| ----------------------------------------------------------------------- | --------------------------------------------------------------------- | ------------------------------------------------------------------------------- |
| `spawn EPERM` al buildear en sandbox                                    | Next usaba procesos hijos para workers                                | `experimental.workerThreads: true`; verificaciÃ³n con `tsc` + server in-process |
| Next no resolvÃ­a mÃ³dulos en Windows                                   | junctions de pnpm                                                     | `nodeLinker: hoisted` + `storeDir` local (ADR-008)                              |
| La segunda subida fallaba                                               | el `File` se vaciaba al limpiar el input                              | snapshot a `Blob` propio antes de limpiar; 3 vÃ­as de decodificaciÃ³n           |
| El fake daba siempre el mismo veredicto                                 | `hash % 4` usaba bits bajos                                           | `(fingerprint >>> 24) % 4`                                                      |
| El usuario veÃ­a "El proveedor no devolviÃ³ un JSON vÃ¡lido"            | la ruta repetÃ­a `error.message`                                      | catÃ¡logo `USER_MESSAGES` por cÃ³digo                                           |
| `invalid_response` sin diagnÃ³stico                                     | solo se logueaba el parser                                            | logs de contenido vacÃ­o y de campo invÃ¡lido (`campos=â€¦`)                    |
| `finish=length` con `llaves=0/0`                                        | el modelo escribÃ­a prosa antes del JSON                              | `max_tokens` 4096 + prompt v3 con regla de "empezÃ¡ con `{`"                    |
| `campos=limits`                                                         | el modelo omitÃ­a `limits`                                            | campo opcional con default; el sistema lo escribe siempre                       |
| DeepSeek entrena por defecto, sin plazo y en China                      | verificaciÃ³n de tÃ©rminos                                            | migraciÃ³n a OpenAI (ADR-012); DeepSeek queda solo en desarrollo                |
| La CSP no aplicaba a pÃ¡ginas estÃ¡ticas                                | un nonce por request no convive con HTML de build                     | `force-dynamic` en `/` y `/privacidad` (ADR-011)                                |
| El cÃ³digo de acceso no aparecÃ­a en producciÃ³n                        | 10 commits locales nunca pusheados; Vercel construÃ­a el commit viejo | `git push` y verificar que el deploy diga el commit nuevo                       |
| El modelo pasÃ³ de "parece estafa" a "sospechosas" con la misma captura | prompt v4 mÃ¡s prudente + no determinismo residual                    | se aceptÃ³ la banda en las evals; no se tocÃ³ el prompt                         |

## 4. Estado del deploy

- **Plataforma:** Vercel Hobby, regiÃ³n `gru1`, Node 24, `maxDuration` 30 s.
- **Commit en producciÃ³n:** `2e76997` (el que estaba en `main` al hacer el deploy).
- **Proveedor:** OpenAI `gpt-4o-mini`, con DPA firmado el **31/10/2026** y saldo de 5 USD.
- **Acceso:** activo con `ANALYZE_ACCESS_CODE`; sin cookie, `/api/analyze` responde 401.
- **Salud:** `GET /api/health` responde 200 (se usa para readiness).
- **Logs:** una lÃ­nea por consulta: `[analyze] ok (id) source=tester verdict=â€¦ ms instancia=N`.
  Los errores agregan `type`, `code` y `param` del proveedor, nunca el contenido.
- **Costo:** ~0.0005â€“0.0007 USD por consulta (prompt de ~2.500 tokens + imagen + salida).
- **Pendiente operativo:** lÃ­mite de facturaciÃ³n en el panel de OpenAI (el tope de la app
  no aplica a testers).

## 5. Decisiones de diseÃ±o

**Paleta.** Verde profundo `#0a4a3c` (marca) sobre fondo cÃ¡lido `#f7f4ee`, texto
`#07382d`. Se descartÃ³ el azul por asociaciÃ³n bancaria y el rojo como color primario
porque alarma. El rojo se reserva para el veredicto de estafa. Contraste alto, sin
gradientes ni sombras fuertes.

**TipografÃ­a.** Stack del sistema (`system-ui`, Segoe UI, Roboto), cuerpo de 18â€“20 px y
tÃ­tulos de 28â€“32 px, con `line-height` amplio. Nada de fuentes decorativas ni texto fino.

**UX.**

- Una sola acciÃ³n primaria por pantalla; botones de al menos 48 px de alto.
- Voseo rioplatense, frases de hasta 20 palabras, sin jerga ni diminutivos.
- Nunca "es seguro" ni "100 % privado": como mÃ¡ximo "no veo seÃ±ales de estafa".
- El primer paso siempre es una acciÃ³n segura ("No toques el link", "VerificÃ¡ por el
  canal oficial", "LlamÃ¡ al nÃºmero del dorso de la tarjeta").
- Sin anotaciones grÃ¡ficas sobre la captura; los datos duros, si se muestran, van como
  texto (Etapa 4 diferida).
- El resultado se anuncia con `aria-live` y el foco se mantiene; todo funciona con
  teclado y con lector de pantalla.

**Privacidad como decisiÃ³n de producto.** La promesa ("no guardamos tu captura; el
proveedor no entrena y conserva 30 dÃ­as") estÃ¡ sostenida por la documentaciÃ³n de OpenAI y
el DPA, no por una estimaciÃ³n. Si se cambia de proveedor o de modelo, hay que rehacer esa
verificaciÃ³n antes de publicar.

## 6. PrÃ³ximos pasos

| Pendiente                                                           | QuiÃ©n         | Bloquea el piloto            |
| ------------------------------------------------------------------- | -------------- | ---------------------------- |
| Revisar `CONSENT.md` con una persona del pÃºblico objetivo          | usuario        | sÃ­                          |
| RevisiÃ³n legal de la Ley 25.326 (`DATA-INVENTORY.md` es el insumo) | abogado        | no para 20; sÃ­ para escalar |
| LÃ­mite de facturaciÃ³n en OpenAI                                   | usuario        | no, pero urgente             |
| Confirmar retenciÃ³n de logs de Vercel                              | usuario/agente | no                           |
| Rutina de revisiÃ³n de logs y costo                                 | agente         | no                           |
| Etapa 4: datos duros como texto                                     | agente         | no (diferida)                |
| Formulario de Google y guion del video                              | asesor externo | no                           |
| Facilitador, fechas y lugar de las sesiones                         | usuario        | sÃ­                          |

Comandos Ãºtiles:

```powershell
pnpm dev                 # desarrollo
pnpm verify              # typecheck + lint + tests + build + bundle
pnpm test                # solo tests
$env:ANALYZE_LIVE="1"; pnpm exec vitest run tests/evals.live.test.ts   # evals reales
```

Nota: en algunos sandboxes `vitest` y `next build` no pueden abrir procesos hijos
(`spawn EPERM`); la verificaciÃ³n se hizo compilando con `tsc` y sirviendo el build
in-process. En CI (GitHub Actions, `.github/workflows/ci.yml`) corre normal.

## 7. Mapa de documentos

| Documento                   | Contenido                                                  |
| --------------------------- | ---------------------------------------------------------- |
| `docs/DECISIONS.md`         | 13 ADR: privacidad, proveedores, CSP, acceso, preprocesado |
| `docs/PLAN.md`              | etapas y estado real de cada una                           |
| `docs/PRIVACY.md`           | polÃ­tica publicada, fuente de cada dato, pendientes       |
| `docs/DATA-INVENTORY.md`    | insumo para el abogado (flujo, retenciÃ³n, preguntas)      |
| `docs/CONSENT.md`           | consentimiento informado, una carilla                      |
| `docs/PILOT.md`             | protocolo de las 20 sesiones y formulario                  |
| `docs/planilla-piloto.xlsx` | registro P01â€“P20, encuesta y resumen                     |
| `docs/THREAT-MODEL.md`      | amenazas y mitigaciones                                    |
| `docs/PROVIDERS.md`         | por quÃ© OpenAI y quÃ© pasÃ³ con DeepSeek                  |
| `docs/DEPLOY.md`            | variables, pasos y verificaciÃ³n                           |
| `docs/KEY-ROTATION.md`      | rotaciÃ³n de claves y del cÃ³digo de acceso                |

## 8. Reglas que no se rompen

1. La imagen no se persiste ni se loguea; solo se registra la forma de la respuesta.
2. NingÃºn mensaje de error tÃ©cnico llega a la pantalla.
3. Nunca se afirma que algo "es seguro".
4. El prompt no se edita: se crea `system.vN.md` y se mueve `PROMPT_VERSION`.
5. Ninguna clave del proveedor llega al cliente (`pnpm check:client-bundle` lo verifica).
6. Antes de cambiar de modelo o proveedor, correr las evals y reverificar la promesa de
   privacidad.
7. DeepSeek no se usa en producciÃ³n ni como respaldo.

## 9. AuditorÃ­a previa al piloto (2026-11-20)

| Hallazgo                                                     | Estado                                                        |
| ------------------------------------------------------------ | ------------------------------------------------------------- |
| Next 16.4.3 con 7 advisories moderados                       | **Corregido:** 16.4.6, `pnpm audit` sin hallazgos             |
| El cÃ³digo de acceso fallaba abierto si tenÃ­a <6 caracteres | **Corregido:** fail closed + log                              |
| Un 401 dejaba al tester sin salida                           | **Corregido:** la puerta se vuelve a mostrar con aviso y foco |
| El veredicto era el texto mÃ¡s chico (15 px)                 | **Corregido:** es el h2 con Ã­cono y color (ADR-014)          |
| Una cookie malformada podÃ­a dar 500                         | **Corregido:** `readCookie` no lanza                          |
| Tope de facturaciÃ³n en OpenAI                               | **Pendiente (responsable del proyecto)**                      |
| HSTS sin verificar en producciÃ³n                            | Pendiente                                                     |
| Tests HTTP de `/api/access` y `/api/analyze`                 | Pendiente                                                     |
| Monitoreo y alertas de errores/costo                         | Pendiente                                                     |
| CÃ³digo del piloto con guion (difÃ­cil en teclado mÃ³vil)    | Recomendado: alfanumÃ©rico                                    |
