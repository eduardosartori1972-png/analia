# Rotación de la clave del proveedor

> Runbook operativo. Aplica a cualquier proveedor de visión: el nombre de la variable
> es siempre `ANALYZE_API_KEY` y nunca lleva prefijo `NEXT_PUBLIC_`.

## Dónde vive la clave

| Entorno          | Lugar                                           | Se commitea               |
| ---------------- | ----------------------------------------------- | ------------------------- |
| Desarrollo local | `analia/.env.local`                             | No (está en `.gitignore`) |
| Producción       | Variables de entorno del proyecto en Vercel     | No                        |
| CI               | No la necesita: los tests usan el Fake Provider | —                         |

`.env.local` no se versiona nunca. `.env.example` documenta los nombres, jamás los
valores.

## Cuándo rotar

- Sospecha de filtración (clave en un log, en una captura, en un repo).
- Salida de una persona con acceso.
- Cambio de proveedor o de plan.
- Cada 90 días, como higiene.

## Pasos

### 1. Generar la nueva clave en el proveedor

1. Entrar al panel del proveedor con la cuenta administradora.
2. Crear una clave nueva con el mismo alcance que la anterior (idealmente, solo el
   permiso de inferencia; nada de administración).
3. Anotar el **identificador** de la clave (los últimos 4 caracteres), no la clave.

### 2. Probarla en local antes de tocar producción

1. Copiar `analia/.env.example` a `analia/.env.local` si no existe.
2. Reemplazar `ANALYZE_API_KEY` por la nueva.
3. Correr `pnpm dev` y analizar una captura de prueba.
4. Verificar que responde 200 y que el veredicto es razonable.

Nunca se prueba contra producción con datos de personas reales.

### 3. Actualizar producción

1. Vercel → proyecto → Settings → Environment Variables.
2. Editar `ANALYZE_API_KEY`: pegar la nueva y guardar para Production (y Preview, si
   aplica).
3. Hacer un redeploy. Las variables se leen en el arranque: sin redeploy, la instancia
   vieja sigue con la clave anterior.

### 4. Revocar la clave anterior

1. Confirmar que el análisis funciona con la nueva (una consulta real de prueba).
2. Recién ahí, revocar la clave vieja en el panel del proveedor.

El orden importa: revocar primero deja la app caída hasta el redeploy.

### 5. Verificar

- `GET /api/health` responde 200.
- Un análisis de prueba responde 200 y no 502.
- En los logs de Vercel no aparece `[analyze] error inesperado` en los últimos minutos.

## Si algo falla

| Síntoma                       | Causa probable                  | Qué hacer                                        |
| ----------------------------- | ------------------------------- | ------------------------------------------------ |
| 502 con "No pudimos analizar" | Clave inválida o revocada       | Revisar la variable y el redeploy                |
| 502 inmediato y repetido      | Falta la variable en el entorno | Cargarla y redeployar                            |
| 504                           | Proveedor lento o caído         | Revisar status page; el reintento ya está activo |
| 429 `quota_exhausted`         | Se alcanzó el techo mensual     | Revisar `ANALYZE_MONTHLY_LIMIT`                  |

## Reglas que no se rompen

1. La clave no se pega en un chat, un issue ni una captura.
2. No se usa la clave del proveedor desde el cliente: el bundle no la ve nunca.
3. `pnpm check:client-bundle` corre en CI y falla si aparece.
4. Si una clave se filtró, se revoca; no se "rota por las dudas" dejándola viva.
