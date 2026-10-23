# Plan de trabajo — MVP AnalIA

Estado de las etapas. El alcance y los criterios de aceptación de cada una no
cambian sin un ADR.

| Etapa | Alcance                                             | Estado                             |
| ----- | --------------------------------------------------- | ---------------------------------- |
| 0     | Fundaciones: repo, CI, esqueleto, ADRs, docs        | **Verificada** — falta tu revisión |
| 1     | Pantalla de subida mobile-first                     | Pendiente                          |
| 2     | Contrato de análisis, endpoint y Fake Provider      | Pendiente                          |
| 3     | Visión real, respuesta en texto y capa de seguridad | Pendiente                          |
| 4     | Datos duros: links, teléfonos y remitentes          | Pendiente                          |
| 5     | Los 3 casos de prueba y protocolo de piloto         | Pendiente                          |
| 6     | Hardening pre-piloto (legal, CSP, monitoreo)        | Pendiente                          |

---

## Etapa 0 — Fundaciones

**Objetivo:** que el repositorio exista, se pueda instalar, buildear y verificar en
CI, con las decisiones registradas y un esqueleto visual honesto.

**Entregable**

- Proyecto Next.js 16 + TypeScript estricto, sin dependencias de UI externas.
- Design tokens mobile-first en `app/globals.css` (tipografía, contraste, foco,
  objetivos táctiles, reduced motion).
- Dos pantallas: inicio (shell) y `/privacidad` (borrador marcado como tal).
- `GET /api/health` como smoke test.
- ESLint 9 flat config, Prettier, Vitest.
- CI en GitHub Actions: typecheck, lint, format, test, build y chequeo de secretos en
  el bundle del cliente.
- ADRs 001–007, este plan, borrador de privacidad, modelo de amenazas y esqueleto del
  protocolo de piloto.

**Criterios de aceptación**

- [x] `pnpm install --frozen-lockfile` resuelve sin cambios ("Already up to date").
- [x] `pnpm typecheck`, `pnpm lint` y `pnpm format:check` pasan.
- [x] `pnpm build` completo: 3 rutas estáticas, 1 dinámica y el icono, sin errores.
- [x] `pnpm check:client-bundle`: 11 archivos del bundle, 0 coincidencias.
- [x] `/`, `/privacidad`, `/api/health` y un 404 responden como se espera, tanto en
      dev como sobre el build de producción, con las cabeceras de seguridad puestas.
- [ ] `pnpm test` bajo Vitest. El sandbox bloquea el proceso hijo que lanza esbuild;
      las tres aserciones del test (200, forma exacta del JSON, `no-store`) quedaron
      cubiertas por la verificación HTTP, pero el runner no se ejecutó.
- [ ] Revisión visual en un Android real a 360 px (la hace el usuario).

> **Estado:** implementada y verificada en todo lo que se puede verificar dentro del
> sandbox. Queda pendiente `pnpm test` con Vitest y la revisión visual en el teléfono.
> No se declara terminada hasta que `pnpm verify` pase de punta a punta en tu máquina.

**Fuera de alcance:** subida de archivos, proveedor de visión, persistencia, analytics.

---

## Etapa 1 — Pantalla de subida mobile-first

**Objetivo:** que una persona pueda elegir o sacar una foto de su captura y verla
antes de analizarla, sin que nada salga del dispositivo todavía.

**Alcance**

- Pantalla única: título → botón "Subir captura" → preview → "Cambiar" → CTA
  "Analizar" (deshabilitado sin imagen) → estados vacío/cargando/error.
- Compresión y eliminación de EXIF en el cliente (`lib/image/preprocess.ts`).
- Aviso de privacidad corto antes del CTA.
- Sin red: el botón "Analizar" queda inerte en esta etapa.

**Criterios de aceptación**

- [ ] 360 × 640 sin scroll horizontal; una sola columna.
- [ ] Cuerpo ≥ 20 px; objetivos táctiles ≥ 52 px.
- [ ] Acepta JPEG, PNG y HEIC desde cámara y galería en Chrome Android.
- [ ] Rechaza archivos de más de 10 MB con un mensaje que se entiende.
- [ ] La imagen resultante es menor a 3,5 MB y no tiene EXIF (verificado con `exiftool`).
- [ ] El aviso de privacidad aparece antes del CTA.
- [ ] axe sin errores críticos; navegable con TalkBack.
- [ ] Copy en voseo, sin jerga técnica.

---

## Etapa 2 — Contrato, endpoint y Fake Provider

**Objetivo:** cerrar el contrato de análisis y el camino completo de la imagen, con un
proveedor simulado y sin ninguna persistencia.

**Alcance**

- `lib/analysis/contract.ts` con el schema del veredicto.
- `AnalysisProvider` + `FakeAnalysisProvider` (demoras, errores, cuatro clases).
- `POST /api/analyze`: multipart → validación → proveedor → JSON validado.
- Rate limit por IP, timeouts, errores tipados.
- La UI muestra el resultado del fake.

**Criterios de aceptación**

- [ ] Un test verifica que no se escribe la imagen a disco ni a logs.
- [ ] El contrato rechaza respuestas incompletas o fuera de la taxonomía.
- [ ] 413, timeout y proveedor caído muestran un mensaje humano con reintento.
- [ ] `ANALYZE_PROVIDER=fake` permite todo el flujo sin clave ni costo.
- [ ] Rate limit probado.

---

## Etapa 3 — Visión real, respuesta en texto y seguridad

**Objetivo:** que el veredicto sea útil y prudente con un proveedor real, sin que el
modelo controle la redacción final.

**Alcance**

- Implementación del proveedor elegido, clave solo en servidor.
- `prompts/system.v1.md` + post-procesamiento que arma el texto final.
- Safety lint: prohibidas las promesas absolutas y las instrucciones de "hacé clic".
- Escalado bancario y "ya hice clic".
- Defensas contra inyección desde el contenido de la imagen.
- Runner de `evals/`.

**Criterios de aceptación**

- [ ] Nunca aparece "es seguro", "está garantizado" ni "hacé clic".
- [ ] Toda respuesta tiene: veredicto de la taxonomía, "cómo verificar" y un límite
      explícito.
- [ ] Banco, tarjeta o contraseña ⇒ pausa + canal oficial.
- [ ] "Ya hice clic" ⇒ bloque de derivación.
- [ ] Un intento de inyección dentro de la captura no altera veredicto ni formato.
- [ ] p95 < 8 s en 4G, con estado de progreso.
- [ ] 100 % de las evals pasan el safety lint.

---

## Etapa 4 — Datos duros

**Objetivo:** mostrar links, teléfonos y remitentes de forma confiable y en texto.

**Alcance**

- `lib/extract/hardData.ts`: detección y validación contra la transcripción.
- `lib/extract/normalize.ts`: punycode, homoglifos, mayúsculas, espacios.
- Tarjeta "Datos detectados" con texto seleccionable, sin `<a>`.

**Criterios de aceptación**

- [ ] Cada dato mostrado aparece literalmente en la transcripción.
- [ ] Los links nunca son clickeables y llevan la advertencia.
- [ ] Si no hay datos duros, la tarjeta no aparece.
- [ ] Probado con 3 capturas sintéticas y 2 reales anonimizadas.

---

## Etapa 5 — Los 3 casos y el protocolo de piloto

**Objetivo:** demostrar que el producto funciona en los tres escenarios que definen el
MVP y dejar listo el protocolo para las 10 personas.

**Casos**

1. **Legítimo:** un aviso real del banco. No debe decir "es seguro"; no debe alarmar;
   debe recomendar verificar por canal oficial.
2. **Sospechoso:** un SMS con link a un dominio parecido al del banco. Debe identificar
   el dominio y el remitente, y recomendar no tocarlo.
3. **Ambiguo:** un mensaje con datos incompletos. Debe declarar la incertidumbre y
   proponer un paso concreto de verificación.

**Criterios de aceptación**

- [ ] Los tres casos tienen captura sintética y `expected.json` en `evals/`.
- [ ] Corren en CI y fallan si cambia el comportamiento esperado.
- [ ] El protocolo define "acción correcta" por escenario y una medición pre/post.
- [ ] El consentimiento está en lenguaje claro y revisado.

---

## Etapa 6 — Hardening pre-piloto

- CSP con nonces.
- Revisión legal (Ley 25.326): consentimiento, registro de base, transferencia
  internacional, datos de terceros.
- Publicación de `/privacidad` con el plazo `[X]` confirmado.
- Monitoreo de abuso y límites del enlace de cohorte.

---

## Definición de terminado (todas las etapas)

Tarea chica con alcance escrito · PR revisado · tests que pasan · verificado en Android
real · sin secretos en el cliente · chequeo de accesibilidad · docs y ADR actualizados ·
commit en Git con mensaje claro · nada se declara terminado sin verificarlo.
