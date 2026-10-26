import { jsonrepair } from "jsonrepair";

import { AnalysisError } from "./errors";

/**
 * Parser tolerante para la salida del modelo.
 *
 * La ruta rápida es `JSON.parse`. Si falla, se intenta reparar el texto con
 * `jsonrepair`, que cubre los defectos que aparecen en la práctica:
 *
 * - bloque markdown alrededor del objeto;
 * - texto antes o después del JSON;
 * - comas finales;
 * - comentarios `//` y `/* *\/`;
 * - saltos de línea sin escapar dentro de un string;
 * - comillas tipográficas;
 * - BOM al principio del archivo.
 *
 * Lo reparado no se confía: el endpoint valida después con zod. Si la
 * reparación tampoco produce JSON parseable, se lanza `invalid_response`, que
 * la cadena de proveedores reintenta una vez.
 */
export function parseModelJson(content: string): unknown {
  const cleaned = clean(content);
  const candidate = extractObject(cleaned);

  if (!candidate) throw invalid();

  try {
    return JSON.parse(candidate);
  } catch {
    // Sigue con la reparación.
  }

  try {
    return JSON.parse(jsonrepair(candidate));
  } catch {
    throw invalid();
  }
}

function invalid(): AnalysisError {
  return new AnalysisError("invalid_response", "El proveedor no devolvió un JSON válido.");
}

function clean(content: string): string {
  return content.replace(/^\uFEFF/, "").trim();
}

/**
 * Quita los cercos de markdown y recorta desde la primera llave hasta la última.
 * Así se tolera el texto que algunos modelos agregan antes o después.
 */
function extractObject(content: string): string | null {
  const withoutFences = content.replace(/```[a-zA-Z]*\s*/g, "").replace(/```/g, "");
  const start = withoutFences.indexOf("{");
  const end = withoutFences.lastIndexOf("}");

  if (start === -1 || end === -1 || end <= start) return null;

  return withoutFences.slice(start, end + 1);
}
