# Privacidad — documento de trabajo

> **Estado: BORRADOR.** No publicar hasta cerrar el plazo de retención del proveedor
> de visión (`[X]`) y la revisión legal de la Etapa 6.

Este documento es la fuente de verdad interna. La página `/privacidad` del sitio toma
de acá su contenido y debe versionarse junto con este archivo.

## 1. La promesa, en una frase

AnalIA no guarda tus capturas. Para analizarlas, se envían de forma cifrada a un
proveedor de visión que no las usa para entrenar modelos y las elimina en `[X]`. La
copia original queda en tu dispositivo.

## 2. Versiones de la copy

### Versión A — la que está hoy en la app (Etapa 0)

Se usa mientras `[X]` no esté confirmado. No afirma nada que no podamos sostener:

> AnalIA no guarda tus capturas en ningún servidor. Cuando el análisis esté activo, tu
> imagen se enviará cifrada al proveedor de visión y se descartará al terminar. La copia
> original queda en tu dispositivo.

Además, `/privacidad` muestra un aviso de borrador con lo que falta definir.

### Versión B — definitiva, requiere `[X]` y contrato firmado

> AnalIA no guarda tus capturas. Para analizarla, tu imagen se envía cifrada a
> `[Proveedor]`, que no la usa para entrenar modelos y la elimina en `[X]` según su
> política. La copia original queda en tu teléfono. Tampoco guardamos el texto que
> aparece en la imagen.

Reglas de redacción:

- "cifrada en tránsito" en lugar de "de forma segura": lo segundo no se puede verificar.
- "no la usa para entrenar" solo se afirma si está en el contrato del tier de API.
- El número `[X]` sale de la política del proveedor, no de una estimación nuestra.
- Nunca decir "tus datos están seguros" ni "100 % privado".

## 3. Flujo de datos

| Dato                             | Dónde vive                           | Cuánto tiempo                   | Quién accede           |
| -------------------------------- | ------------------------------------ | ------------------------------- | ---------------------- |
| Captura original                 | Dispositivo del usuario              | Hasta que la borre              | El usuario             |
| Imagen en tránsito               | Memoria del proceso en Vercel        | Duración del request (segundos) | El proceso             |
| Imagen en el proveedor de visión | Servidores del proveedor             | `[X]` — pendiente               | El proveedor           |
| Transcripción del texto          | Memoria del proceso                  | Duración del request            | El proceso             |
| Veredicto y métricas             | Logs de Vercel                       | 90 días (a confirmar)           | Equipo técnico         |
| Consentimiento del piloto        | Fuera de la app (formulario firmado) | Hasta 1 año después del piloto  | Responsable del piloto |

Lo que **nunca** se registra: imagen, transcripción, datos de contacto que aparezcan en
la captura, contenido del mensaje.

## 4. Datos de terceros

Una captura de un mensaje puede contener datos de otra persona (remitente, número,
alias, CBU). No tenemos consentimiento de esa persona. Por eso:

- la imagen no se persiste (ADR-001);
- el piloto no publica capturas reales;
- el corpus de evaluación es sintético o está anonimizado de forma irreversible.

## 5. Derechos y control

El MVP no tiene cuentas, así que no hay historial que borrar. Lo que el usuario puede
hacer:

- no subir la captura;
- borrar la captura de su teléfono;
- pedir información sobre el piloto al responsable.

## 6. Pendientes antes de publicar

- [ ] Proveedor elegido y contrato con cláusula de no entrenamiento y retención `[X]`.
- [ ] Revisión legal de la Ley 25.326: base legal, registro de base de datos,
      transferencia internacional, datos de terceros.
- [ ] Definir si el aviso de la Etapa 1 se acepta por sesión o por dispositivo.
- [ ] Revisar el texto con una persona del público objetivo (lectura fácil).
- [ ] Confirmar el plazo de retención de logs de Vercel.
