/**
 * Validación del archivo que llega al servidor. No confiamos en el `Content-Type`
 * que manda el navegador: miramos los primeros bytes (magic bytes). Es la
 * mitigación de T-05 del modelo de amenazas.
 */

export const MAX_SERVER_IMAGE_BYTES = 4 * 1024 * 1024;

export type SniffedType = "image/jpeg" | "image/png" | "image/webp" | "image/heic";

const HEIC_BRANDS = new Set(["heic", "heix", "hevc", "heim", "heis", "mif1", "msf1"]);

function ascii(bytes: Uint8Array, start: number, end: number): string {
  let out = "";
  for (let i = start; i < end && i < bytes.length; i += 1) {
    out += String.fromCharCode(bytes[i] ?? 0);
  }
  return out;
}

export function sniffImageType(bytes: Uint8Array): SniffedType | null {
  if (bytes.length < 12) return null;

  if (bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) return "image/jpeg";

  if (
    bytes[0] === 0x89 &&
    bytes[1] === 0x50 &&
    bytes[2] === 0x4e &&
    bytes[3] === 0x47 &&
    bytes[4] === 0x0d &&
    bytes[5] === 0x0a &&
    bytes[6] === 0x1a &&
    bytes[7] === 0x0a
  ) {
    return "image/png";
  }

  if (ascii(bytes, 0, 4) === "RIFF" && ascii(bytes, 8, 12) === "WEBP") return "image/webp";

  if (ascii(bytes, 4, 8) === "ftyp" && HEIC_BRANDS.has(ascii(bytes, 8, 12))) return "image/heic";

  return null;
}
