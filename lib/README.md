# `lib/` — módulos del producto

Cada carpeta tiene un límite claro. Si un módulo necesita algo de otra carpeta, se
importa por su archivo público, no por un archivo interno.

| Carpeta     | Responsabilidad                                                    | Etapa |
| ----------- | ------------------------------------------------------------------ | ----- |
| `analysis/` | Contrato del veredicto y proveedores de visión. Nada de UI.        | 2     |
| `safety/`   | Reglas de lenguaje, escalado y defensas de inyección.              | 3     |
| `extract/`  | Detección y normalización de datos duros. Sin dependencias de red. | 4     |
| `image/`    | Compresión y limpieza de metadatos en el cliente.                  | 1     |

Reglas:

- `analysis/providers/` es server-only. Ningún componente cliente lo importa.
- `extract/` es puro y testeable: recibe texto, devuelve datos. Sin `fetch`.
- `safety/` no depende del proveedor: recibe el JSON del contrato y lo valida.
