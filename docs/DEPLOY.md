# Deploy en Vercel — preview

Guía para publicar la app y confirmar que el system prompt viaja dentro del bundle de la
función. Hasta que eso esté verificado, un deploy de preview es la única forma de saberlo:
en local el archivo `prompts/system.v1.md` siempre está en el disco.

## Antes de empezar

- La raíz del repo **es** la carpeta `analia/` (ahí está `.git`), así que en Vercel el
  _Root Directory_ es `./`.
- No hay remoto de Git configurado todavía.
- La clave de DeepSeek no se pega en ningún archivo del repo: solo en el panel de Vercel
  y en `.env.local`, que está ignorado.

## Paso 1 — subir el repo a GitHub

Crear el repositorio vacío en GitHub (sin README ni `.gitignore`), después:

```powershell
cd analia
git remote add origin https://github.com/<usuario>/analia.git
git push -u origin main
```

## Paso 2 — importar el proyecto

1. [vercel.com/new](https://vercel.com/new) → **Add New → Project**.
2. Importar el repositorio `analia`.
3. Verificar que Vercel detecte:
   - **Framework Preset:** Next.js
   - **Root Directory:** `./`
   - **Install Command:** `pnpm install` (lo detecta por `pnpm-lock.yaml`)
   - **Build Command:** `pnpm build`
4. No desplegar todavía si preferís cargar las variables primero (paso 3). Si ya
   desplegaste, las variables nuevas requieren un redeploy.

## Paso 3 — variables de entorno

En **Settings → Environment Variables**, cargar para **Production** y **Preview**
(marcar también Development si se usa `vercel dev`):

| Nombre                       | Valor            | Notas                                            |
| ---------------------------- | ---------------- | ------------------------------------------------ |
| `ANALYZE_PROVIDER`           | `deepseek`       |                                                  |
| `ANALYZE_API_KEY`            | la clave real    | marcar **Sensitive**: no se puede leer después   |
| `ANALYZE_MODEL`              | `deepseek-flash` | nombre exacto del modelo en tu cuenta            |
| `ANALYZE_COST_PER_CALL_USD`  | `0.0003`         | habilita el tope por presupuesto                 |
| `ANALYZE_MONTHLY_LIMIT`      | `100`            | tope de consultas del piloto                     |
| `ANALYZE_MONTHLY_BUDGET_USD` | `3`              |                                                  |
| `ANALYZE_FALLBACK_PROVIDER`  | `none`           | cambiar a `openai` recién cuando exista su clave |
| `ANALYZE_RATE_LIMIT`         | `30`             | consultas por IP cada 10 minutos                 |

Reglas:

- Ninguna variable lleva el prefijo `NEXT_PUBLIC_`.
- Si `ANALYZE_FALLBACK_PROVIDER` queda en `openai` sin `ANALYZE_FALLBACK_API_KEY`, el
  respaldo se deshabilita solo y queda un aviso en los logs; el primario sigue andando.
- Cambiar una variable **no** reinicia el deployment: hay que redeployar.

## Paso 4 — deploy de preview

**Opción A, la recomendada (rama):**

```powershell
git checkout -b preview/deploy
git push -u origin preview/deploy
```

Vercel crea un _Preview Deployment_ automáticamente si el repo está conectado.

**Opción B, CLI:**

```powershell
npx vercel link      # vincula la carpeta con el proyecto
npx vercel           # deploy de preview
```

La CLI pide login la primera vez. `npx vercel --prod` publica en producción: no lo uses
para esta prueba.

## Paso 5 — verificar

1. Abrir la URL del preview.
2. Subir una captura y tocar "Analizar":
   - **200 con veredicto** → el prompt viajó y el proveedor respondió.
   - **502 "No pudimos analizar"** → ver el paso siguiente.
3. **Logs:** Vercel → Deployment → **Logs** (o _Functions_). Buscar:
   - `[analyze] configuración de proveedor inválida` → falta o está mal una variable.
   - `ENOENT ... system.v1.md` → el prompt no se incluyó en el bundle. Sería un problema
     de `outputFileTracingIncludes`; avisame y lo resolvemos.
   - `[analysis] deepseek respondió 401` → clave incorrecta o revocada.
   - `[analysis] deepseek respondió 400` → `ANALYZE_MODEL` no existe en tu cuenta.
4. Confirmar la región: el deployment debe mostrar `gru1` (São Paulo). Si no, revisar el
   override de región del proyecto.
5. Confirmar que la clave no se filtró: ver el código fuente de la página y buscar
   `sk-` o `ANALYZE_API_KEY`. No debe aparecer nada.

## Paso 6 — proteger el preview

La app no tiene login (ADR-006): cualquiera con la URL puede gastar cuota. Antes de
compartir el link:

- **Settings → Deployment Protection** → activar _Vercel Authentication_ o _Password
  Protection_ para Preview.
- O simplemente no compartir la URL y borrar la rama al terminar.

## Costos y límites a tener en cuenta

- El contador mensual es **en memoria**: en serverless cada instancia cuenta lo suyo, así
  que no es una contabilidad exacta. El tope real de gasto conviene ponerlo también como
  alerta en el panel de DeepSeek.
- Con `ANALYZE_COST_PER_CALL_USD=0.0003` y 3 USD de presupuesto, el tope por plata son
  ~10.000 consultas; **el que manda es el de 100 consultas por mes**. Si querés que el
  presupuesto sea el único límite, subí `ANALYZE_MONTHLY_LIMIT`.
- Si el plan de Vercel limita la duración de las funciones por debajo de 30 s, ajustar
  `maxDuration` en `app/api/analyze/route.ts` y el timeout por intento de la cadena.

## Checklist

- [ ] Deploy en verde.
- [ ] `/` carga y muestra el botón primario.
- [ ] Un análisis devuelve 200 con veredicto y pasos.
- [ ] Los logs no muestran `ENOENT` ni errores de configuración.
- [ ] Región `gru1`.
- [ ] Protección de preview activada o URL no compartida.
- [ ] Borrar la rama de preview al terminar.
