# Comparativa de proveedores de visión

> Documento de decisión para la Etapa 3. **Sin precios inventados**: los números
> cambian con frecuencia y dependen del plan, la región y el volumen. Al final está
> cómo calcular el costo real con nuestros propios casos.

## Criterios, en orden de importancia

1. **Salida estructurada confiable.** Queremos JSON validable (schema o _function
   calling_), no texto libre que haya que parsear. Si el modelo inventa campos o
   mezcla formato, la capa de seguridad rechaza la respuesta y la persona ve un error.
2. **Términos de datos.** Que el tier de API permita: no entrenar con las imágenes,
   retención declarada (y corta), y una región de procesamiento conocida. Sin esto no
   se puede publicar la política de privacidad.
3. **Calidad de OCR sobre capturas de Android.** Texto chico, modo oscuro, notificaciones
   superpuestas, fuente comprimida por el reescalado a 1600 px. Es distinto de "leer un
   documento escaneado".
4. **Español rioplatense.** Que no traduzca literalmente del inglés ni use "usted"
   neutro. El tono es parte del producto, no un detalle.
5. **Latencia** p95 menor a 8 s con una imagen de ~1,5 MB, desde Argentina.
6. **Precio por consulta** y estructura de facturación (por imagen, por token de entrada
   y salida, mínimo por request).
7. **Límites técnicos:** tamaño máximo de imagen, formatos aceptados (JPEG/PNG/WebP/
   HEIC), si acepta base64 o multipart.
8. **Operación:** SDK estable, códigos de error claros, status page, soporte.

## Candidatos

| Proveedor                                           | Fortalezas esperables                                                                          | Riesgos a verificar                                                                                           |
| --------------------------------------------------- | ---------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------- |
| **DeepSeek (modelo Flash, visión)**                 | Cuenta y saldo ya disponibles; API compatible con OpenAI; multimodal y salida JSON; costo bajo | Confirmar por escrito no-entrenamiento y retención; validar el nombre exacto del modelo y los límites de tasa |
| **OpenAI (familia con visión)**                     | Salida estructurada madura, buen soporte de español, SDK y documentación sólidos               | Retención por defecto y si el tier de API entrena; costo por imagen alta resolución                           |
| **Google Gemini**                                   | Ventana de contexto grande, buena lectura de imágenes, cuota gratuita para pruebas             | Términos de datos por tier; latencia variable; formato de salida a validar                                    |
| **Anthropic Claude**                                | Buen seguimiento de instrucciones y tono cuidado, salida estructurada                          | Cobertura de idioma/región; precio; retención                                                                 |
| **Mistral (modelos con visión)**                    | Opción europea, buenos términos de datos                                                       | Calidad de OCR en capturas de teléfono a validar                                                              |
| **Modelo local (Qwen-VL / Llama visión en un VPS)** | Privacidad máxima: la imagen no sale de nuestra infraestructura                                | Costo fijo de GPU, mantenimiento, calidad y latencia a cargo nuestro                                          |

No hay un ganador obvio sin medir. La decisión se toma con el corpus de `evals/` y una
planilla de tres columnas: aciertos, latencia y costo por caso.

### Decisión para el MVP: DeepSeek primario

Se usa **DeepSeek (modelo Flash con visión)** como proveedor primario porque la cuenta y
el saldo ya existen y la API es compatible con el formato de OpenAI, así que el adaptador
es el mismo que usaría cualquier otro proveedor de esa familia.

Lo que queda por confirmar con el proveedor antes de publicar la política de privacidad:
no entrenamiento con los datos, plazo de retención y región de procesamiento. Mientras
eso no esté, la página `/privacidad` sigue marcada como borrador.

**Respaldo:** la arquitectura admite un segundo proveedor (`ANALYZE_FALLBACK_PROVIDER`).
Si el primario falla o da timeout, la cadena pasa al respaldo antes de mostrar el error.
Para el piloto se puede usar OpenAI o Gemini con una clave aparte; el adaptador de
OpenAI-compatible ya está implementado y el de Gemini queda como placeholder documentado.

## Cómo lo probaría (y qué miraría)

1. Correr los 4 casos de `evals/cases/` contra el candidato, sin cambiar el prompt.
2. Medir por caso: ¿respetó el schema a la primera?, ¿mencionó el link/remitente
   correcto?, ¿inventó datos?, ¿obedeció una instrucción escondida en la imagen?
3. Medir latencia p50/p95 desde una conexión argentina, no desde un datacenter.
4. Medir tokens de entrada y salida por consulta para calcular el costo real.

## Costo: cómo calcularlo, sin números inventados

Costo por consulta ≈ `precio_entrada × tokens_imagen + precio_salida × tokens_respuesta`.

Dos cosas a tener en cuenta:

- Una captura de 1600 px de lado mayor consume bastantes tokens de imagen. El
  reescalado del cliente (ADR-007) también es una decisión de costo, no solo de peso.
- El prompt del sistema viaja en cada request: conviene medirlo una vez y multiplicarlo.

Con eso, el techo de 3 USD y el límite de 100 consultas por mes se traducen en un costo
por consulta máximo de 0,03 USD. Si el candidato supera ese número, hay que bajar el
límite mensual o reescalar más la imagen antes de enviarla.

## Recomendación preliminar

Elegir **dos** candidatos y correr el corpus con los dos, en ese orden:

1. El que tenga la salida estructurada más estricta y mejores términos de datos.
2. El que tenga mejor relación calidad/precio para validar el segundo puesto.

Con dos mediciones alcanza para decidir. Probar cinco es una forma de no decidir.

## Lo que necesito cuando elijas

- Nombre del modelo y versión exacta (van en `ANALYZE_MODEL`).
- Confirmación por escrito de: no entrenamiento, plazo de retención, región.
- Clave de API y quién la administra.
- Precio vigente de entrada y salida, para fijar `ANALYZE_COST_PER_CALL_USD`.
