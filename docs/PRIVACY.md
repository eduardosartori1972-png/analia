# Privacidad — documento de trabajo

> **Estado: publicada (31/10/2026).** El plazo de retención está confirmado en la
> documentación de OpenAI y hay correo de contacto. La revisión legal de la Ley 25.326
> sigue pendiente y debe completarse antes de ampliar el piloto.

Este documento es la fuente de verdad interna. La página `/privacidad` del sitio toma de
acá su contenido y debe versionarse junto con este archivo.

**Responsable del tratamiento:** Eduardo Sartori (Founder).
**Contacto para derechos:** `analia.soporte@gmail.com`.
**DPA de OpenAI:** firmado el 31/10/2026, archivado en la carpeta segura del responsable.

## 1. La promesa, en una frase

> AnalIA no guarda tus capturas. Para analizarla, tu imagen se envía cifrada a OpenAI
> (Estados Unidos), que **no la usa para entrenar modelos** y la conserva **hasta 30 días**
> en registros de prevención de abuso. La copia original queda en tu teléfono.

## 2. Fuente de los datos del proveedor

| Dato                             | Valor                                                                                                                                | Fuente                                                                                          |
| -------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------ | ----------------------------------------------------------------------------------------------- |
| Uso para entrenamiento           | **No** (desde el 1 de marzo de 2023, salvo opt-in explícito)                                                                         | [Data controls in the OpenAI platform](https://developers.openai.com/api/docs/guides/your-data) |
| Retención por monitoreo de abuso | **Hasta 30 días**                                                                                                                    | misma página, sección _Data retention controls for abuse monitoring_                            |
| Endpoint usado                   | `/v1/chat/completions`: entrenamiento **No**, retención **30 días**, estado de aplicación **None**                                   | misma página, tabla por endpoint                                                                |
| Procesamiento                    | Estados Unidos (sin _data residency_ configurado)                                                                                    | misma página, sección _Data residency controls_                                                 |
| Excepción de imágenes            | Las imágenes se escanean por CSAM; si el clasificador detecta contenido, se retienen para revisión manual **aun con retención cero** | misma página, _Image and file inputs_                                                           |

Consulta: 2026-10-31. Guardar también el PDF de la página y el DPA aceptado en la cuenta,
con fecha, como respaldo de esta cita.

**Matiz de redacción:** la política dice "hasta 30 días" y admite retención mayor si la ley
lo exige o si es necesario para proteger a un tercero. La copy dice "hasta 30 días" y no
"se borra a los 30 días".

## 3. Versión vigente de la copy

> AnalIA no guarda tus capturas. Para analizarla, tu imagen se envía cifrada a OpenAI
> (Estados Unidos), que no la usa para entrenar modelos y la conserva hasta 30 días en
> registros de prevención de abuso. La copia original queda en tu teléfono. Tampoco
> guardamos el texto que aparece en la imagen.

Reglas de redacción:

- "cifrada en tránsito" en lugar de "de forma segura": lo segundo no se puede verificar.
- "no la usa para entrenar" se sostiene con la cita de la sección 2. Si OpenAI cambia la
  política, se revisa antes de publicar de nuevo.
- El número sale de la política del proveedor, no de una estimación nuestra.
- Nunca decir "tus datos están seguros" ni "100 % privado".
- Mencionar la excepción legal: "puede conservarse más tiempo si la ley lo exige".

## 4. Flujo de datos

| Dato                             | Dónde vive                           | Cuánto tiempo                   | Quién accede           |
| -------------------------------- | ------------------------------------ | ------------------------------- | ---------------------- |
| Captura original                 | Dispositivo del usuario              | Hasta que la borre              | El usuario             |
| Imagen en tránsito               | Memoria del proceso en Vercel        | Duración del request (segundos) | El proceso             |
| Imagen en el proveedor de visión | Servidores de OpenAI (EE. UU.)       | Hasta 30 días (abuso)           | OpenAI                 |
| Transcripción del texto          | Memoria del proceso                  | Duración del request            | El proceso             |
| Veredicto y métricas             | Logs de Vercel                       | 90 días (a confirmar)           | Equipo técnico         |
| Consentimiento del piloto        | Fuera de la app (formulario firmado) | Hasta 1 año después del piloto  | Responsable del piloto |

Lo que **nunca** se registra: imagen, transcripción, datos de contacto que aparezcan en
la captura, contenido del mensaje.

## 5. Datos de terceros

Una captura de un mensaje puede contener datos de otra persona (remitente, número,
alias, CBU). No tenemos consentimiento de esa persona. Por eso:

- la imagen no se persiste en nuestra infraestructura (ADR-001);
- el proveedor no la usa para entrenar y la conserva como máximo 30 días;
- el piloto no publica capturas reales;
- el corpus de evaluación es sintético o está anonimizado de forma irreversible.

## 6. Derechos y control

El MVP no tiene cuentas, así que no hay historial que borrar. Lo que el usuario puede
hacer:

- no subir la captura;
- borrar la captura de su teléfono;
- escribir a `analia.soporte@gmail.com` para preguntar, rectificar o pedir la supresión;
- pedir la supresión de la imagen frente al proveedor, a través nuestro, mientras esté
  dentro del plazo de 30 días;
- reclamar ante la AAIP si no queda conforme con la respuesta.

Plazo de respuesta comprometido: 5 días hábiles para consultas de derechos.

## 7. Pendientes (no bloquean la publicación)

- [x] Proveedor elegido y plazo de retención confirmado en su documentación (sección 2).
- [x] Correo de contacto publicado y en el consentimiento.
- [x] DPA de OpenAI firmado el 2026-10-31 y archivado en la carpeta segura del responsable.
- [ ] Revisión legal de la Ley 25.326: base legal, registro de base de datos,
      transferencia internacional, datos de terceros. Ver `DATA-INVENTORY.md`.
- [ ] Definir si el aviso de la Etapa 1 se acepta por sesión o por dispositivo.
- [ ] Revisar el texto con una persona del público objetivo (lectura fácil).
- [ ] Confirmar el plazo de retención de logs de Vercel.
