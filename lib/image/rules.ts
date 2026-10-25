/**
 * Reglas de tamaño y tipo para la captura. Funciones puras, sin DOM: se pueden
 * testear en Node y se comparten entre el cliente y los tests.
 *
 * Los números salen de ADR-007: Vercel corta los requests a 4,5 MB, así que
 * apuntamos a 3,5 MB de salida con margen para el multipart.
 */

/** Tamaño máximo del archivo original que aceptamos. */
export const MAX_INPUT_BYTES = 10 * 1024 * 1024;

/** Tamaño objetivo después de comprimir. */
export const MAX_OUTPUT_BYTES = 3.5 * 1024 * 1024;

/** Lado mayor máximo de la imagen comprimida. */
export const MAX_LONG_EDGE = 1600;

/** Calidades que probamos, de mejor a más agresiva. */
export const QUALITY_LADDER = [0.8, 0.65, 0.5] as const;

export type FileRejection = "too-large" | "not-an-image" | "empty";

/**
 * Valida el archivo antes de decodificarlo. No miramos la extensión: miramos
 * el tamaño y, si el navegador informa un tipo, que sea de imagen.
 * Algunos Android devuelven `type` vacío: en ese caso dejamos pasar y que falle
 * el decodificado, que es la única prueba real.
 */
export function validateFile(file: { size: number; type: string }): FileRejection | null {
  if (file.size === 0) return "empty";
  if (file.size > MAX_INPUT_BYTES) return "too-large";
  if (file.type !== "" && !file.type.startsWith("image/")) return "not-an-image";
  return null;
}

export function rejectionMessage(reason: FileRejection): string {
  switch (reason) {
    case "empty":
      return "El archivo está vacío. Probá con otra captura.";
    case "too-large":
      return "La imagen pesa más de 10 MB. Probá con otra captura.";
    case "not-an-image":
      return "Ese archivo no parece una imagen. Elegí una captura o una foto.";
  }
}
