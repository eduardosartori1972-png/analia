import { readFileSync } from "node:fs";
import path from "node:path";

/**
 * Carga el system prompt desde `prompts/`. Se lee una vez y se cachea.
 *
 * El archivo se incluye en el bundle de la función vía
 * `outputFileTracingIncludes` (next.config.ts). Si falta, el análisis falla con
 * un error claro en los logs, no con una respuesta a medias.
 */

let cached: string | null = null;

export const PROMPT_VERSION = "system.v3";

export function loadSystemPrompt(): string {
  if (cached) return cached;

  const file = path.join(process.cwd(), "prompts", `${PROMPT_VERSION}.md`);
  cached = readFileSync(file, "utf8");
  return cached;
}
