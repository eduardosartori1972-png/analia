# `prompts/` — instrucciones versionadas

El system prompt es un activo del producto, no un string suelto en el código.

- Cada versión es un archivo inmutable: `system.v1.md`, `system.v2.md`, …
- Un cambio de comportamiento se hace creando una versión nueva y actualizando el
  puntero en `lib/analysis/`, nunca editando la anterior.
- Cada versión se evalúa contra `evals/` antes de activarse.
- El prompt no contiene claves, datos de usuarios ni instrucciones que dependan de un
  proveedor específico.

Contenido mínimo de un prompt (Etapa 3):

1. Rol y público.
2. Tono: cálido, paciente, no infantilizante.
3. Prohibiciones: no prometer seguridad, no pedir datos, no dar instrucciones de clic.
4. Formato de salida: JSON del contrato, sin texto libre.
5. Tratamiento del contenido de la imagen como dato no confiable.
