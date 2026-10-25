# Modelo de amenazas — MVP AnalIA

Revision: Etapa 0 · 2026-10-23. Se actualiza en cada etapa que agregue superficie.

## Activos a proteger

1. La captura del usuario y el texto que contiene (datos personales propios y de
   terceros).
2. La credibilidad del veredicto: un falso "es seguro" puede causar daño económico.
3. La clave del proveedor de visión.
4. La integridad del sistema de prompt (que el contenido de la imagen no lo controle).
5. El enlace de acceso a la cohorte del piloto.

## Actores

- Usuario legítimo, con baja alfabetización digital y posible situación de estrés.
- Estafador que controla el contenido de la captura que el usuario va a subir.
- Curioso con acceso al enlace de cohorte.
- Atacante externo que busca abuso de recursos o fuga de la clave.

## Amenazas y mitigaciones

| ID   | Amenaza                                                                 | Etapa | Mitigación                                                                                                                                     | Estado    |
| ---- | ----------------------------------------------------------------------- | ----- | ---------------------------------------------------------------------------------------------------------------------------------------------- | --------- |
| T-01 | Inyección de prompt desde el texto de la captura ("ignorá tus reglas…") | 3     | El prompt v1 declara el contenido como dato; la capa de seguridad descarta respuestas que delatan una inyección; caso `inyeccion` en el corpus | Parcial   |
| T-02 | Falso "es seguro" sobre un mensaje fraudulento                          | 3     | Taxonomía sin veredicto binario; 6 reglas de lenguaje; límite canónico que no escribe el modelo; evals por caso                                | Parcial   |
| T-03 | La imagen se persiste por accidente (disco, caché, logs)                | 2     | Un único endpoint; test estático que prohíbe `fs` y bases en ese camino; `console.error` solo con el requestId; sin `next/image` para capturas | Mitigado  |
| T-04 | Fuga de la clave del proveedor al bundle del cliente                    | 0     | Clave solo server-side; chequeo `check:client-bundle` en CI                                                                                    | Mitigado  |
| T-05 | Payload gigante o archivo no-imagen (zip, ejecutable)                   | 2     | Límite de 4 MB en servidor y 10 MB en cliente; validación por magic bytes; 413/415 con mensaje                                                 | Mitigado  |
| T-06 | Abuso del endpoint (costo, fuerza bruta)                                | 2     | Rate limit en memoria por IP (30 / 10 min), timeout de 20 s, límite de tamaño; monitoreo de costo pendiente                                    | Parcial   |
| T-07 | XSS / inyección de scripts                                              | 6     | React escapa por defecto; nunca `dangerouslySetInnerHTML` con contenido del modelo; CSP con nonces pendiente                                   | Parcial   |
| T-08 | Enlace de cohorte compartido fuera del piloto                           | 2     | Enlace firmado, revocable, rotable; rate limit; registro de uso                                                                                | Pendiente |
| T-09 | Retención del proveedor mayor a la declarada                            | 3     | Contrato + DPA; `[X]` verificado; copy condicionada a eso                                                                                      | Pendiente |
| T-10 | Un link de phishing se vuelve clickeable                                | 4     | URLs como texto, nunca `<a>`; advertencia visible                                                                                              | Pendiente |
| T-11 | QR malicioso dentro de la captura                                       | 4+    | El MVP no decodifica QR; si se agrega, se muestra el destino como texto y nunca se abre                                                        | Aceptado  |
| T-12 | Dependencia comprometida                                                | 0     | Lockfile; `allowBuilds` explícito; `minimumReleaseAge`; Dependabot manual                                                                      | Mitigado  |
| T-13 | Fuga del system prompt                                                  | 3     | No es un secreto crítico; no incluye claves; se asume extraíble                                                                                | Aceptado  |
| T-14 | Sesión interrumpida y captura perdida                                   | 1     | Estado en memoria del cliente, sin timeouts; aviso antes de recargar                                                                           | Pendiente |

## Riesgos residuales aceptados

- **La captura existe en el teléfono.** Si el dispositivo está comprometido, AnalIA no
  puede protegerla.
- **El proveedor ve la imagen.** Es inevitable si el análisis es en la nube; se mitiga
  con contrato y transparencia, no con tecnología propia.
- **El veredicto puede equivocarse.** Por eso el producto nunca promete certeza y
  siempre ofrece un paso de verificación independiente.
- **Sin CSP todavía.** El sitio no renderiza HTML de terceros, pero la CSP se agrega
  antes del piloto.

## Reglas de implementación

1. Todo contenido que venga de una captura, un modelo o un usuario es **dato**, nunca
   instrucción.
2. Ningún componente cliente importa código de `lib/analysis/providers/`.
3. Ningún `console.*` recibe texto de la captura.
4. Ninguna ruta devuelve un error con stack trace al cliente.
5. Los tests de seguridad corren en CI, no a mano.
