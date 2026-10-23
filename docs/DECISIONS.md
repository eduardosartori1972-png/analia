# Decisiones de arquitectura (ADR)

Registro de las decisiones cerradas del MVP de AnalIA. Una decisión cerrada no se
reabre por conveniencia: se reemplaza con un ADR nuevo que la supersede y explica
por qué.

| #       | Decisión                                                          | Estado   | Fecha      |
| ------- | ----------------------------------------------------------------- | -------- | ---------- |
| ADR-001 | Las capturas no se persisten en el servidor                       | Aceptada | 2026-10-23 |
| ADR-002 | Mobile-first (Android) como plataforma base del MVP               | Aceptada | 2026-10-23 |
| ADR-003 | Datos duros en texto; sin anotaciones gráficas                    | Aceptada | 2026-10-23 |
| ADR-004 | Proveedor de visión abstracto; Fake Provider en Etapas 0–2        | Aceptada | 2026-10-23 |
| ADR-005 | Extracción por transcripción + regex; OCR on-device como fallback | Aceptada | 2026-10-23 |
| ADR-006 | Piloto sin cuentas, acceso por cohorte                            | Aceptada | 2026-10-23 |
| ADR-007 | Vercel como hosting y presupuesto de imagen                       | Aceptada | 2026-10-23 |
| ADR-008 | `node_modules` hoisted en Windows                                 | Aceptada | 2026-10-23 |

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
