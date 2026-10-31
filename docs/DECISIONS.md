# Decisiones de arquitectura (ADR)

Registro de las decisiones cerradas del MVP de AnalIA. Una decisión cerrada no se
reabre por conveniencia: se reemplaza con un ADR nuevo que la supersede y explica
por qué.

| #       | Decisión                                                          | Estado                  | Fecha      |
| ------- | ----------------------------------------------------------------- | ----------------------- | ---------- |
| ADR-001 | Las capturas no se persisten en el servidor                       | Aceptada                | 2026-10-23 |
| ADR-002 | Mobile-first (Android) como plataforma base del MVP               | Aceptada                | 2026-10-23 |
| ADR-003 | Datos duros en texto; sin anotaciones gráficas                    | Aceptada                | 2026-10-23 |
| ADR-004 | Proveedor de visión abstracto; Fake Provider en Etapas 0–2        | Aceptada                | 2026-10-23 |
| ADR-005 | Extracción por transcripción + regex; OCR on-device como fallback | Aceptada                | 2026-10-23 |
| ADR-006 | Piloto sin cuentas, acceso por cohorte                            | Aceptada                | 2026-10-23 |
| ADR-007 | Vercel como hosting y presupuesto de imagen                       | Aceptada                | 2026-10-23 |
| ADR-008 | `node_modules` hoisted en Windows                                 | Aceptada                | 2026-10-23 |
| ADR-009 | Botón primario: verde profundo y una sola ancla por pantalla      | Aceptada                | 2026-10-25 |
| ADR-010 | DeepSeek como proveedor primario, con cadena de respaldo          | Reemplazada por ADR-012 | 2026-10-25 |
| ADR-011 | CSP con nonce por request y páginas dinámicas                     | Aceptada                | 2026-10-30 |
| ADR-012 | OpenAI como proveedor de producción; DeepSeek queda en desarrollo | Aceptada                | 2026-10-30 |
| ADR-013 | Código de acceso con cookie firmada; testers sin límite de uso    | Aceptada                | 2026-10-31 |

---

## ADR-001 — Las capturas no se persisten en el servidor

**Estado:** aceptada · 2026-10-23

### Contexto

La promesa de privacidad del producto es que la captura vive en el dispositivo del
usuario y que AnalIA la procesa de forma efímera. Una captura de un mensaje suele
contener datos personales del usuario y de terceros: nombre, teléfono, DNI, CBU o
alias, tokens, códigos. Además, la Ley 25.326 exige finalidad, consentimiento y
seguridad sobre esos datos.

Guardar imágenes "para mejorar el producto" o "para debug" es la forma más común de
romper esa promesa. También es la más difícil de auditar.

### Decisión

1. La imagen vive únicamente en la memoria del proceso que atiende el request.
2. No se escribe a disco, ni a Supabase, ni a object storage, ni a la caché de Next.
3. No se registra en logs la imagen ni la transcripción del texto que contiene.
4. Los únicos datos que se registran son métricas sin contenido: código de estado,
   latencia, clase de veredicto y código de error.
5. El corpus de evaluación y los tests usan capturas sintéticas o anonimizadas, nunca
   capturas reales de usuarios.

### Consecuencias

- La promesa es verificable: se puede auditar el código y demostrar que no hay
  escritura.
- No hay historial de consultas, ni reanálisis de un caso anterior, ni debugging con
  la captura real del usuario.
- No se puede entrenar ni ajustar el modelo con datos de producción.
- El proveedor de visión debe ofrecer procesamiento efímero y un tier de API que no
  entrene con los datos. Eso se exige por contrato, no por confianza.
- El plazo de retención del proveedor (`[X]` en la copy) queda como bloqueante de
  publicación hasta tener la respuesta por escrito.

### Alternativas descartadas

- **Guardar por 30 días para mejorar el producto:** contradice la promesa y agranda
  la superficie de fuga.
- **Guardar cifrado en Supabase:** sigue siendo persistencia, y la clave de descifrado
  vive en el mismo sistema.
- **Guardar solo si el usuario acepta:** agrega una decisión más a una persona que
  viene a resolver un problema, y aumenta el riesgo legal sin beneficio claro en el MVP.

---

## ADR-002 — Mobile-first (Android) como plataforma base

**Estado:** aceptada · 2026-10-23

### Contexto

El público objetivo son adultos mayores argentinos. La mayoría va a usar la app desde
el navegador de un teléfono Android, no desde una computadora. Un MVP "web" diseñado
en escritorio y adaptado después es, en la práctica, un producto para otro público.

### Decisión

1. El viewport de referencia es **360 × 640 px**. Todo se diseña ahí primero.
2. Una sola columna, una acción primaria por pantalla.
3. Cuerpo de texto a `1.25rem` (20 px con el tamaño por defecto del navegador), sin
   fijar el `root` en píxeles para no pisar la preferencia del usuario.
4. Objetivos táctiles de **52 px** de alto mínimo.
5. Sin interacciones que dependan de `hover`, sin timeouts de sesión, sin pérdida de
   estado al rotar o al volver de segundo plano.
6. La verificación se hace en un Android real, no en el emulador.
7. Navegadores soportados: Chrome para Android de las últimas dos versiones mayores.

### Consecuencias

- El layout de escritorio es secundario: solo se adapta, no se diseña aparte.
- Nada de tablas densas ni menús flotantes.
- La subida usa `input type="file" accept="image/*"`, que abre cámara o galería sin
  pedir permisos de `getUserMedia`.
- El texto grande y el zoom al 200 % son criterios de aceptación, no un extra.
- Las capturas de pantalla del teléfono suelen ser PNG de 1080 × 2400: hay que
  comprimirlas antes de enviarlas (ver ADR-007).

### Alternativas descartadas

- **Desktop-first:** público equivocado.
- **App nativa Android ahora:** más costo, más fricción de instalación y de permisos;
  se evalúa después de validar el MVP web.

---

## ADR-003 — Datos duros en texto; sin anotaciones gráficas

**Estado:** aceptada · 2026-10-23

### Contexto

La idea original era que el modelo devolviera coordenadas y que una capa de canvas
dibujara círculos y flechas sobre la captura. Ese enfoque es frágil: las coordenadas
de un modelo de visión no son confiables al píxel, y un círculo mal ubicado sobre un
botón puede empujar a la persona a hacer exactamente lo que hay que evitar.

### Decisión

1. En el MVP **no hay anotaciones gráficas**.
2. Se resaltan solo datos duros: URLs, números de teléfono y remitentes.
3. Se muestran como texto seleccionable, con la advertencia de no tocarlos.
4. Una URL detectada **nunca** se renderiza como `<a>`: no convertimos un link de
   phishing en un botón.
5. Todo dato mostrado debe aparecer literalmente en la transcripción de la imagen. Si
   no está en la transcripción, no se muestra.
6. No se indica a la persona que toque nada dentro de la captura.

### Consecuencias

- Desaparece la dependencia de coordenadas y de una librería de canvas.
- La utilidad se concentra en lo que sí es verificable: el dominio del link, el número
  que escribe, el remitente que figura.
- Hay que normalizar antes de mostrar: punycode, homoglifos, mayúsculas, espacios.
- Riesgo residual: resaltar un dominio legítimo puede leerse como acusación. La copy
  presenta los datos como "esto es lo que aparece", no como "esto es malo".

### Alternativas descartadas

- **Coordenadas del modelo + canvas:** poco confiable y con riesgo de daño directo.
- **Anotación manual desde el servidor:** no escala y agrega demora.
- **Resaltar solo cuando el modelo está "seguro":** la confianza del modelo no es una
  medida calibrada.

---

## ADR-004 — Proveedor de visión abstracto; Fake Provider en Etapas 0–2

**Estado:** aceptada · 2026-10-23

### Contexto

Todavía no hay proveedor de visión decidido. El equipo no puede quedar bloqueado por
esa decisión, pero tampoco conviene acoplar la UI y el contrato a un proveedor
específico.

### Decisión

1. Existe una interfaz `AnalysisProvider` con un contrato de entrada y salida propio
   del producto.
2. La Etapa 0–2 se desarrolla contra `FakeAnalysisProvider`, que devuelve respuestas
   válidas y permite simular demoras, errores y las cuatro clases de veredicto.
3. La implementación real se agrega en la Etapa 3 sin tocar la UI ni el contrato.
4. Ningún tipo del proveedor se filtra fuera de `lib/analysis/providers/`.
5. La clave del proveedor se lee solo en el servidor y nunca lleva prefijo `NEXT_PUBLIC_`.

### Consecuencias

- La Etapa 1 y 2 avanzan sin costo de API y sin decidir proveedor.
- Hay una brecha de fidelidad entre el fake y el proveedor real. Se cubre con la suite
  de `evals/`, que corre contra el proveedor real antes de cambiar el flag.
- El contrato se diseña primero y el proveedor se adapta a él, no al revés.

### Pendiente

- Elección del proveedor.
- Confirmación por escrito de: no entrenamiento con los datos, plazo de retención,
  región de procesamiento.

---

## ADR-005 — Extracción por transcripción + regex; OCR on-device como fallback

**Estado:** aceptada · 2026-10-23

### Contexto

Para mostrar "datos duros" hace falta leer el texto de la imagen. Hay dos caminos:
un OCR adicional (que implicaría un segundo procesamiento de la imagen) o usar la
transcripción que ya devuelve el modelo de visión.

### Decisión

1. La extracción de URLs, teléfonos y remitentes se hace sobre la transcripción que
   devuelve el modelo de visión, con reglas determinísticas (regex + normalización).
2. No se envía la imagen a un segundo servicio.
3. Si la transcripción no alcanza el criterio de recuperación definido en las evals
   (menos del 90 % de los datos duros esperados en el corpus), se evalúa OCR
   on-device como fallback, con `tesseract.js` u equivalente, sin salir del dispositivo.
4. Toda coincidencia se valida contra la transcripción antes de mostrarse.

### Consecuencias

- No hay egreso adicional de datos.
- La calidad depende del OCR del proveedor; hay que medirla con capturas reales de
  Android (texto chico, modo oscuro, notificaciones superpuestas).
- El fallback on-device agrega peso (≈ 10–15 MB de wasm) y consumo de CPU en teléfonos
  de gama baja: solo se activa si los números lo justifican.

---

## ADR-006 — Piloto sin cuentas, acceso por cohorte

**Estado:** aceptada · 2026-10-23

### Contexto

El piloto es de 10 personas. Pedirles crear una cuenta y gestionar otra contraseña es
fricción directa en un público al que le decimos, al mismo tiempo, que no comparta
contraseñas. Supabase está en el stack, pero su rol en el MVP no tiene por qué ser el
de autenticación de usuarios.

### Decisión

1. El MVP no tiene login.
2. El acceso al piloto se hace con un enlace de cohorte firmado (o código de acceso),
   revocable y rotable.
3. Supabase no se usa para imágenes ni para transcripciones. Si se usa, es para
   registrar consentimiento y feedback del piloto.
4. El consentimiento informado se firma fuera de la app; la app muestra un aviso claro
   antes de la primera subida.
5. No hay historial por usuario.

### Consecuencias

- Menos fricción y menos datos personales en el sistema.
- El enlace de cohorte es un secreto compartido: hay que rotarlo al terminar el piloto
  y limitar su abuso con rate limit.
- No hay métricas longitudinales por persona; el piloto se mide con observación y
  encuesta, no con analítica de usuario.
- Si más adelante hace falta cuenta, se agrega con un ADR nuevo.

---

## ADR-007 — Vercel como hosting y presupuesto de imagen

**Estado:** aceptada · 2026-10-23

### Contexto

Vercel impone un límite de 4,5 MB por request a las funciones serverless. Una captura
de Android puede pesar entre 2 y 8 MB. Enviarla tal cual falla antes de llegar al
proveedor.

### Decisión

1. Hosting: Vercel. Región de funciones: `gru1` (São Paulo) por latencia desde
   Argentina.
2. La compresión ocurre **en el cliente**, antes de cualquier envío:
   - lado mayor máximo: 1600 px;
   - JPEG, calidad 0,8;
   - objetivo: menos de 3,5 MB;
   - se eliminan los metadatos EXIF (incluida la geolocalización).
3. El route handler lee el archivo en memoria, valida tipo real (magic bytes) y tamaño,
   y lo reenvía al proveedor.
4. `maxDuration` de la función: 30 s, por debajo del timeout del proveedor y con margen
   para reintentos.
5. No se usa el optimizador de imágenes de Next para las capturas del usuario: sería
   una segunda copia persistida en el CDN.

### Consecuencias

- La compresión puede afectar el OCR de textos chicos: hay que verificarla con capturas
  reales, no solo sintéticas.
- El límite de 3,5 MB es un supuesto que se revisa si cambia el plan de Vercel.
- La región `gru1` mejora la latencia pero no cambia el costo del proveedor.
- Sin CDN para imágenes de usuario, se refuerza la promesa de no persistencia.

---

## ADR-008 — `node_modules` hoisted en Windows

**Estado:** aceptada · 2026-10-23

### Contexto

Con el linker aislado (el default de pnpm), las dependencias se enlazan con
junctions de Windows. En este proyecto, con la ruta del repo dentro de
`C:\Users\…\Documents\deepseek-harness\…`, eso produjo fallas reproducibles:

- `next build` con Turbopack: "Could not find the Next.js package (next/package.json)".
- `require('@swc/helpers/…')` desde `next/dist/…`: `MODULE_NOT_FOUND`, porque
  `realpath` no resolvía el junction y la búsqueda terminaba en el `node_modules`
  del proyecto, donde el paquete no estaba.
- El CLI de Next fallaba antes de arrancar, incluso con webpack.

No es un problema del código de la app: es la combinación Windows + ruta larga +
junctions.

### Decisión

1. `nodeLinker: hoisted` en `pnpm-workspace.yaml`.
2. Store local al repo (`storeDir: .pnpm-store`), para que la instalación sea
   reproducible y no dependa del store global del usuario.

### Consecuencias

- `node_modules` queda plano y con directorios reales: Node, Turbopack y esbuild
  resuelven sin depender de junctions.
- Se pierde el aislamiento estricto entre dependencias (una dependencia puede
  importar algo que no declaró). Se acepta en el MVP a cambio de que el proyecto
  funcione en la máquina de desarrollo real.
- `node_modules` pesa más y la instalación tarda un poco más.
- En Linux/macOS el linker hoisted también funciona; CI no cambia.

### Alternativas descartadas

- **Mantener isolated y agregar `turbopack.root`:** resolvía solo el error de
  Turbopack, no el de `@swc/helpers` en el CLI.
- **Mover el repo a una ruta corta (`C:\dev\analia`):** parchea el síntoma en una
  máquina y deja el problema latente para cualquier otra persona.
- **`--preserve-symlinks`:** cambia la semántica de resolución de Node y rompe
  otros paquetes.

---

## ADR-009 — Botón primario: verde profundo y una sola ancla por pantalla

**Estado:** aceptada · 2026-10-25

### Contexto

El público del MVP necesita un ancla visual inequívoca: a los 70 años, un botón que se
distinga del resto es la diferencia entre empezar el trámite y quedarse mirando la
pantalla. El botón anterior era una píldora de 52 px con el mismo peso que una tarjeta
de texto, y la tarjeta de privacidad competía por la atención arriba del CTA.

El rojo queda descartado: el producto trabaja con miedo y no queremos agregar alarma.
El azul profundo se evaluó y se descartó por una razón de producto: el usuario está
juzgando si un mensaje _del banco_ es real, y una interfaz azul lo confunde con la app
bancaria que intenta imitar el estafador.

### Decisión

1. **Un solo elemento sólido por pantalla.** El botón primario es ancho completo, 64 px
   de alto, etiqueta de 22 px seminegrita y radio de 16 px. Todo lo demás es outline,
   texto o directamente no existe.
2. **Verde profundo `#0a4a3c`.** 9,30:1 contra el fondo `#f7f4ee` y 10,21:1 con texto
   blanco encima: AAA en ambos sentidos.
3. **El CTA va antes del aviso de privacidad.** El aviso pasa a una línea debajo, sin
   tarjeta ni sombra, con el enlace a `/privacidad`.
4. **El estado deshabilitado no tiene relleno.** Borde y texto apagados: un botón
   inactivo nunca debe parecer la acción principal.
5. **El rojo no se usa; el ámbar queda solo para advertencias.**

### Consecuencias

- El aviso de privacidad pierde protagonismo visual. Sigue presente, en la misma
  pantalla y a un toque de la política completa; el riesgo se acepta a cambio de una
  acción principal clara.
- Cualquier acción secundaria futura ("Cambiar", "Quitar") tiene que ser outline o
  texto, nunca otra superficie sólida.
- El ancla depende del contraste y del tamaño, no del color solo: sigue funcionando en
  escala de grises.

### Alternativas descartadas

- **Azul profundo `#0b3d6b`:** mismo contraste, pero lee como app bancaria.
- **Rojo:** alarma.
- **Píldora de 52 px:** se perdía entre los textos.

---

## ADR-010 — DeepSeek como proveedor primario, con cadena de respaldo

**Estado:** aceptada · 2026-10-25

### Contexto

La cuenta de DeepSeek ya existe y tiene saldo. El modelo Flash es multimodal y acepta
salida JSON. Su API es compatible con el formato de chat completions de OpenAI, así que
el adaptador es el mismo que usaría cualquier proveedor de esa familia.

Al mismo tiempo, el producto no puede quedarse sin respuesta porque un proveedor se cae
o tarda: para una persona mayor que está decidiendo si un mensaje es una estafa, un
error genérico es peor que una respuesta de un segundo proveedor.

### Decisión

1. **Primario: DeepSeek.** Se configura con `ANALYZE_PROVIDER=deepseek`,
   `ANALYZE_API_KEY`, `ANALYZE_MODEL` y, opcionalmente, `ANALYZE_BASE_URL`.
2. **Adaptador único para APIs compatibles con OpenAI** en
   `lib/analysis/providers/openai-compatible.ts`. DeepSeek y OpenAI comparten código.
3. **Cadena de respaldo** (`FailoverProvider`): intenta el primario y, si falla o pasa
   el techo de tiempo, pasa al secundario. Sin respaldo configurado, reintenta el
   primario una vez.
4. **Un techo de 10 s por intento y dos intentos en total**, para que la suma entre en
   los 30 s de `maxDuration`.
5. **El endpoint no sabe cuántos proveedores hay.** La cadena vive detrás de la interfaz
   `AnalysisProvider`.
6. **El system prompt es un archivo versionado** (`prompts/system.v1.md`) que se lee en
   tiempo de ejecución y se incluye en el bundle con `outputFileTracingIncludes`.

### Consecuencias

- Cambiar de proveedor o agregar uno nuevo es un archivo y una variable de entorno.
- El respaldo duplica el costo cuando se activa y puede dar un veredicto distinto al del
  primario: el corpus de `evals/` se corre contra cada proveedor por separado.
- La calidad del producto queda atada a los términos de DeepSeek. Hasta que no estén
  confirmados por escrito (no entrenamiento, retención, región), `/privacidad` sigue
  marcada como borrador y no se publica la promesa con el plazo `[X]`.
- Leer el prompt del disco agrega una dependencia de empaquetado: si el archivo no se
  incluye en el bundle, el endpoint falla con 502. Se mitiga con
  `outputFileTracingIncludes` y con un error claro en los logs.

### Alternativas descartadas

- **Cambiar de proveedor cuando haya que decidir:** bloquea el avance por una decisión
  que ya está tomada por disponibilidad de cuenta.
- **Reintentar solo el mismo proveedor:** no cubre una caída del proveedor.
- **Cadena de tres proveedores:** más costo y más latencia; dos alcanza para el piloto.

---

## ADR-011 — CSP con nonce por request y páginas dinámicas

**Estado:** aceptada · 2026-10-30

### Contexto

T-07 del modelo de amenazas quedaba abierto: el sitio no tenía Content-Security-Policy
porque Next inyecta scripts inline y una política estricta necesita un nonce por
respuesta. Un nonce, a su vez, solo se puede inyectar en HTML generado en cada request:
las páginas estáticas se generan en el build, sin nonce.

### Decisión

1. `middleware.ts` genera un nonce por request y arma la CSP con
   `script-src 'self' 'nonce-…' 'strict-dynamic'`.
2. `style-src` queda con `'unsafe-inline'` **sin nonce**: si se agrega un nonce al
   `style-src`, el navegador ignora `'unsafe-inline'` y Next no puede inyectar estilos.
3. En desarrollo se agregan `'unsafe-eval'` y `ws:` para Turbopack y HMR. En producción
   no aparecen.
4. `/` y `/privacidad` pasan a `force-dynamic` para poder llevar el nonce.
5. El matcher excluye `_next/static`, `_next/image` y el icono: los assets no necesitan
   nonce y sí caché.

### Consecuencias

- Las dos páginas pierden la generación estática y la caché de CDN. A la escala del
  piloto (decenas de usuarios) el costo es despreciable; si crece, se puede volver a
  estático con una CSP por hash.
- Un script de terceros que se agregue en el futuro tiene que ir con nonce o quedar
  explícitamente permitido, o la página deja de hidratar.
- La política se verifica sobre el HTML servido: todos los `<script>` deben llevar el
  mismo nonce del header (11 de 11 al momento de la verificación).

### Alternativas descartadas

- **`script-src 'unsafe-inline'`:** deja la CSP sin valor real.
- **CSP con hashes:** Next no expone los hashes de sus scripts inline de forma estable.
- **Report-only sin endpoint de reportes:** genera ruido sin proteger nada.

---

## ADR-012 — OpenAI como proveedor de producción; DeepSeek queda en desarrollo

**Estado:** aceptada · 2026-10-30 · reemplaza ADR-010

### Contexto

La verificación de términos de DeepSeek (ver `docs/PROVIDERS.md`) encontró tres
problemas: entrena con los datos por defecto, no publica plazo de retención para la API y
procesa en China. Con eso no se puede sostener la promesa del producto ni responder a una
supresión, y la transferencia internacional queda sin base defendible.

El producto trata datos de terceros que aparecen en la captura (número del estafador,
alias, nombre). Esos terceros no consintieron nada: cuanto menos se retenga y menos se
use, mejor.

### Decisión

1. **Producción y piloto usan OpenAI** (API paga), con el adaptador compatible ya
   existente.
2. **DeepSeek queda para desarrollo**, con capturas sintéticas. No se configura como
   primario ni como respaldo de producción.
3. El proveedor de producción debe cumplir, por escrito: no entrenamiento con datos de
   API y retención con un número. Sin esas dos cláusulas no se publica `/privacidad`.
4. La configuración es solo por entorno (`ANALYZE_PROVIDER`, `ANALYZE_API_KEY`,
   `ANALYZE_MODEL`); no hay cambios de código.

### Consecuencias

- El costo por consulta sube respecto de DeepSeek. A 100 consultas por mes es
  irrelevante frente al riesgo de privacidad; hay que recalcular
  `ANALYZE_COST_PER_CALL_USD` con el precio del modelo elegido.
- El modelo debe validarse con el mismo corpus de `evals/` antes del piloto: la calidad
  de lectura de capturas no es transferible entre proveedores.
- La transferencia a EE. UU. sigue existiendo y requiere base legal y DPA; deja de ser
  indefendible, no desaparece.

### Alternativas descartadas

- **Seguir con DeepSeek y debilitar la promesa:** el consentimiento de la persona no
  cubre los datos de terceros que aparecen en la captura.
- **Modelo local:** la mejor privacidad, pero el costo de infraestructura y la calidad
  de OCR no están validados para el piloto.

---

## ADR-013 — Código de acceso con cookie firmada; testers sin límite de uso

**Estado:** aceptada · 2026-10-31

### Contexto

El piloto es cerrado, pero la URL de producción es pública. Sin cuentas (ADR-006),
cualquiera que la encuentre puede gastar la cuota del proveedor. A la vez, los límites
pensados para el público general (30 consultas cada 10 minutos, 100 por mes) molestan a
un tester que repite pruebas seguidas.

Validar el código en el navegador no sirve: quedaría dentro del bundle y sería público.

### Decisión

1. El código se define en `ANALYZE_ACCESS_CODE` y se valida **en el servidor**, con
   comparación de tiempo constante y sin distinguir mayúsculas ni espacios.
2. Una validación correcta devuelve una cookie `analia_access` **HttpOnly, SameSite=Lax,
   Secure en producción, 7 días**, firmada con HMAC (`ANALYZE_ACCESS_SECRET`, o el propio
   código si no hay secreto). Sin estado en memoria: funciona con varias instancias.
3. Sin cookie válida, `POST /api/analyze` responde 401 con un mensaje amable. La puerta
   de la UI es solo comodidad: la barrera real es el endpoint.
4. **Sin código configurado el acceso queda abierto**, para desarrollo. En ese modo sí se
   aplican rate limit y cuota mensual.
5. **Con código válido no se aplican límites de uso.** Se registra una línea por consulta
   (`[analyze] ok ... source=tester`) para poder contar volumen y vigilar gasto.
6. Los intentos de código están limitados a 10 cada 10 minutos por IP.

### Consecuencias

- El control del gasto deja de estar en la app y pasa a estar en dos lugares: la rotación
  del código y el **límite de facturación del panel de OpenAI**. Hay que configurarlo.
- El contador del log (`instancia=N`) es por instancia, no un total global: el total real
  de consumo está en el panel del proveedor.
- Rotar el código invalida todas las sesiones (cambia la clave del HMAC). Es la forma de
  cortar el acceso si el código se filtra.
- Cualquiera con el código puede usar la app sin tope. Es el costo de no tener cuentas.

### Alternativas descartadas

- **Validar el código en el cliente:** el código queda en el bundle.
- **Basic Auth:** más fricción para el público objetivo y sin control de mensajes.
- **Lista de IPs:** frágil con redes móviles y NAT compartido.
- **Cuentas reales:** contradice ADR-006 y agrega gestión de contraseñas a personas que
  justamente tienen que cuidar sus contraseñas.
