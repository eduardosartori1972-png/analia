# Componentes de UI

Se crean en la Etapa 1. Reglas que ya aplican:

- Server Components por defecto; `"use client"` solo cuando hace falta estado o evento.
- Ningún componente cliente importa `lib/analysis/providers/`.
- Todo control interactivo tiene etiqueta accesible y foco visible.
- Nada de `dangerouslySetInnerHTML`.
