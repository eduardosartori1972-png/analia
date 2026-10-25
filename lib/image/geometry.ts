/**
 * Cálculos de redimensionado y formateo. Sin DOM, testeables en Node.
 */

export type Size = { width: number; height: number };

/**
 * Encaja una imagen dentro de un cuadrado de `maxEdge` sin deformarla y sin
 * agrandarla. Devuelve enteros, con mínimo de 1 px para no generar canvas
 * inválidos con imágenes extremas.
 */
export function fitWithin(width: number, height: number, maxEdge: number): Size {
  if (!Number.isFinite(width) || !Number.isFinite(height) || width <= 0 || height <= 0) {
    throw new RangeError("Las dimensiones de la imagen no son válidas.");
  }
  if (!Number.isFinite(maxEdge) || maxEdge <= 0) {
    throw new RangeError("El lado máximo no es válido.");
  }

  const longest = Math.max(width, height);
  if (longest <= maxEdge) {
    return { width: Math.round(width), height: Math.round(height) };
  }

  const scale = maxEdge / longest;
  return {
    width: Math.max(1, Math.round(width * scale)),
    height: Math.max(1, Math.round(height * scale)),
  };
}

/** Tamaño legible en español: "850 B", "412 KB", "3,4 MB". */
export function formatBytes(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes < 0) {
    throw new RangeError("El tamaño no es válido.");
  }
  if (bytes < 1024) return `${Math.round(bytes)} B`;

  const kb = bytes / 1024;
  if (kb < 1024) return `${Math.round(kb)} KB`;

  const mb = kb / 1024;
  return `${mb.toFixed(1).replace(".", ",")} MB`;
}
