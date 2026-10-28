import { jsonrepair } from "jsonrepair";

import { AnalysisError } from "./errors";

/**
 * Parser tolerante para la salida del modelo.
 *
 * Estrategia, de lo más limpio a lo más sucio:
 *
 * 1. Bloques ```json ... ``` (si el modelo los usó).
 * 2. Objetos balanceados dentro del texto, respetando strings y escapes.
 * 3. El texto completo.
 *
 * Para cada candidato se intenta `JSON.parse` y, si falla, `jsonrepair`, que
 * cubre comas finales, comentarios, saltos sin escapar, comillas tipográficas y
 * BOM. También se desenvuelve un JSON que vino como string (doble codificación).
 *
 * Reparar no es aprobar: el endpoint valida después con zod.
 */
export function parseModelJson(content: string): unknown {
  const raw = clean(content);
  if (!raw) throw invalid();

  const list = candidates(raw);

  // Primera pasada: solo JSON estricto. Evita que un fragmento reparado
  // (por ejemplo "{nota}") gane sobre el objeto bueno que aparece después.
  for (const candidate of list) {
    const value = strictParse(candidate);
    if (value !== undefined) {
      const accepted = accept(value);
      if (accepted !== undefined) return accepted;
    }
  }

  // Segunda pasada: reparación.
  for (const candidate of list) {
    const value = repairedParse(candidate);
    if (value !== undefined) {
      const accepted = accept(value);
      if (accepted !== undefined) return accepted;
    }
  }

  throw invalid();
}

/**
 * El contrato es un objeto. Una frase suelta que `jsonrepair` convirtió en
 * string no es una respuesta válida, aunque sea JSON parseable.
 */
function accept(value: unknown): Record<string, unknown> | undefined {
  const unwrapped = unwrapString(value);
  return isObject(unwrapped) ? unwrapped : undefined;
}

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function invalid(): AnalysisError {
  return new AnalysisError("invalid_response", "El proveedor no devolvió un JSON válido.");
}

function clean(content: string): string {
  return content.replace(/^\uFEFF/, "").trim();
}

function candidates(text: string): string[] {
  const found: string[] = [];

  // 1. Bloques de código, en orden de aparición.
  for (const match of text.matchAll(/```(?:json|JSON)?\s*([\s\S]*?)```/g)) {
    const block = match[1]?.trim();
    if (block) found.push(block);
  }

  // 2. Objetos balanceados en el texto.
  found.push(...balancedObjects(text));

  // 3. El texto completo, como último recurso.
  found.push(text);

  return [...new Set(found)].filter((candidate) => candidate.length > 0);
}

/**
 * Recorre el texto buscando objetos `{...}` completos. El escaneo respeta los
 * strings y los escapes, así una llave dentro de un texto no corta el objeto.
 */
function balancedObjects(text: string, limit = 4): string[] {
  const objects: string[] = [];

  for (let start = 0; start < text.length && objects.length < limit; start += 1) {
    if (text[start] !== "{") continue;

    const end = matchBrace(text, start);
    if (end === -1) continue;

    objects.push(text.slice(start, end + 1));
    start = end; // evita devolver objetos anidados
  }

  return objects;
}

function matchBrace(text: string, start: number): number {
  let depth = 0;
  let inString = false;
  let escaped = false;

  for (let index = start; index < text.length; index += 1) {
    const char = text[index];

    if (inString) {
      if (escaped) escaped = false;
      else if (char === "\\") escaped = true;
      else if (char === '"') inString = false;
      continue;
    }

    if (char === '"') inString = true;
    else if (char === "{") depth += 1;
    else if (char === "}") {
      depth -= 1;
      if (depth === 0) return index;
    }
  }

  return -1;
}

function strictParse(candidate: string): unknown {
  try {
    return JSON.parse(candidate);
  } catch {
    return undefined;
  }
}

function repairedParse(candidate: string): unknown {
  try {
    return JSON.parse(jsonrepair(candidate));
  } catch {
    return undefined;
  }
}

/** Un JSON que vino como string: `"{\"verdict\":...}"`. */
function unwrapString(value: unknown): unknown {
  if (typeof value !== "string") return value;

  const trimmed = value.trim();
  if (!trimmed.startsWith("{")) return value;

  try {
    return JSON.parse(trimmed);
  } catch {
    try {
      return JSON.parse(jsonrepair(trimmed));
    } catch {
      return value;
    }
  }
}

/** Diagnóstico sin contenido: sirve para los logs cuando falla el parseo. */
export function describeShape(content: string): string {
  const braces = (content.match(/{/g) ?? []).length;
  const closes = (content.match(/}/g) ?? []).length;
  const fences = (content.match(/```/g) ?? []).length;

  return `largo=${content.length} llaves=${braces}/${closes} cercos=${fences} empieza=${JSON.stringify(
    content.trim().slice(0, 1),
  )}`;
}
