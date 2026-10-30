# Inventario de datos — insumo para la revisión legal (Ley 25.326)

> Documento técnico, no asesoramiento legal. Su objetivo es que quien revise el
> cumplimiento no tenga que leer código: qué datos tratamos, dónde viven, por cuánto
> tiempo y qué preguntas quedan abiertas.

Actualizado: 2026-10-30 · Versión del producto: MVP, previo al piloto.

## 1. Qué hace el producto

Una persona sube una captura de pantalla de un mensaje, correo o ventana que le genera
duda. Un modelo de visión la analiza y devuelve una explicación en lenguaje simple con
señales de estafa y pasos a seguir. No hay cuentas, no hay historial y no se guardan las
capturas.

## 2. Flujo de datos

```
Dispositivo de la persona
   │  (la captura se comprime en el navegador; queda en el teléfono)
   ▼
Vercel (función serverless, memoria del proceso)
   │  (sin escritura a disco, sin base de datos, sin logs de contenido)
   ▼
Proveedor de visión (OpenAI, API paga, servidores en EE. UU.)
   │
   ▼
Respuesta JSON → validación → pantalla
```

## 3. Datos personales que pueden aparecer

| Origen                              | Ejemplos                                                             | ¿Se persiste en AnalIA?                                                        |
| ----------------------------------- | -------------------------------------------------------------------- | ------------------------------------------------------------------------------ |
| La persona usuaria                  | nombre, DNI, CBU/alias, saldo, movimientos, códigos, dirección       | No                                                                             |
| Terceros que aparecen en la captura | número y nombre del remitente, dominio del link, alias del estafador | No                                                                             |
| Datos técnicos                      | IP de origen, user agent, fecha y hora                               | Solo en logs de la plataforma (Vercel), no en logs de aplicación con contenido |
| Del piloto                          | nombre y contacto, consentimiento firmado                            | Fuera de la app, en poder del responsable                                      |

**Punto crítico:** los datos de terceros (el remitente de la estafa) se tratan sin su
consentimiento. Es inevitable para el caso de uso, pero debe estar justificado y
minimizado: la imagen se procesa y se descarta, no se publica y no se usa para entrenar.

## 4. Dónde vive cada dato y por cuánto tiempo

| Dato                      | Dónde                                               | Plazo                                     | Responsable                |
| ------------------------- | --------------------------------------------------- | ----------------------------------------- | -------------------------- |
| Captura original          | Teléfono de la persona                              | Hasta que la borre                        | La persona                 |
| Imagen en tránsito        | Memoria de la función en Vercel                     | Segundos (duración del request)           | AnalIA (encargado: Vercel) |
| Imagen en el proveedor    | OpenAI                                              | `[X]` según su política                   | OpenAI (encargado)         |
| Texto transcripto         | Memoria del proceso                                 | Segundos, no se registra                  | AnalIA                     |
| Veredicto y errores       | Logs de Vercel                                      | Según la política de Vercel (a confirmar) | AnalIA                     |
| Métricas de producto      | Sin contenido: veredicto, latencia, código de error | 90 días (a confirmar)                     | AnalIA                     |
| Consentimiento del piloto | Formulario firmado, fuera de la app                 | Hasta 1 año después del piloto            | Responsable del piloto     |

## 5. Transferencia internacional

- El proveedor de visión procesa en **Estados Unidos**.
- Argentina no tiene declaración de adecuación general con EE. UU.: la transferencia
  necesita una base legal específica y, en la práctica, cláusulas contractuales (DPA).
- El proveedor ofrece DPA y compromiso de no entrenamiento en el tier pago. Hay que
  archivarlo con la fecha de aceptación.

## 6. Medidas de seguridad implementadas

- TLS en todo el recorrido; la clave del proveedor vive solo en el servidor.
- La imagen no se escribe a disco, ni a base, ni a logs; hay un test que lo verifica.
- Límite de tamaño y validación por _magic bytes_ del archivo.
- Límite de consultas por IP y techo mensual de gasto.
- CSP con nonce por request, cabeceras `nosniff`, `frame-ancestors 'none'`,
  `Referrer-Policy` estricta.
- Sin cuentas: no hay credenciales de usuario que proteger.
- Acceso al despliegue de preview protegido por Vercel.

## 7. Roles

| Actor                             | Rol                         | Qué hace                                |
| --------------------------------- | --------------------------- | --------------------------------------- |
| AnalIA (responsable del proyecto) | Responsable del tratamiento | Define finalidad, responde derechos     |
| Vercel                            | Encargado                   | Hosting y logs de plataforma            |
| OpenAI                            | Encargado / transferido     | Inferencia; no entrena con datos de API |

## 8. Derechos de las personas

Sin cuentas ni historial, el ejercicio es simple: no hay datos que rectificar ni borrar
en AnalIA. Queda el derecho a saber qué se hace con la captura (está en `/privacidad`) y
a reclamar ante la AAIP. El proveedor conserva la imagen según su plazo: la supresión
frente al proveedor se ejerce a través nuestro.

## 9. Preguntas para la revisión legal

1. ¿Cuál es la base legal del tratamiento? (consentimiento del art. 6 vs. interés
   legítimo, que en Argentina es más restrictivo).
2. ¿Corresponde inscribir la base de datos ante la AAIP? ¿Con qué finalidad?
3. ¿Qué cláusulas contractuales exige la transferencia a EE. UU. y alcanza con el DPA
   del proveedor?
4. ¿Cómo se justifica el tratamiento de datos de terceros que aparecen en la captura?
5. ¿El consentimiento del piloto debe ser escrito y firmado, o alcanza con registro
   digital? ¿Por cuánto se conserva?
6. ¿Hay requisitos adicionales por tratarse de personas mayores? ¿Se recomienda que el
   consentimiento se lea en voz alta o con un testigo?
7. ¿El piloto requiere aprobación de un comité de ética, aunque no sea investigación
   académica?
8. ¿Qué plazo de conservación es razonable para los consentimientos y el feedback?

## 10. Lo que falta completar antes de publicar

- `[X]`: plazo de retención del proveedor, tomado de su política y del DPA.
- Confirmación de la política de logs de Vercel.
- Revisión de los puntos de la sección 9.
