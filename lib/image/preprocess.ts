/**
 * Compresión en el cliente. La imagen nunca sale del dispositivo en esta etapa:
 * acá solo se achica y se limpia de metadatos antes de mostrarla.
 *
 * Decisión (ADR-007): lado mayor de 1600 px, JPEG calidad 0,8, objetivo menor a
 * 3,5 MB. Si no alcanza, se prueba con más compresión antes de rendirse.
 */

import { fitWithin } from "./geometry";
import {
  MAX_LONG_EDGE,
  MAX_OUTPUT_BYTES,
  QUALITY_LADDER,
  rejectionMessage,
  validateFile,
  type FileRejection,
} from "./rules";

export type PreparedImage = {
  blob: Blob;
  width: number;
  height: number;
  originalBytes: number;
};

export type ImageErrorCode = FileRejection | "unreadable" | "too-heavy";

export class ImageError extends Error {
  readonly code: ImageErrorCode;

  constructor(code: ImageErrorCode, message: string) {
    super(message);
    this.name = "ImageError";
    this.code = code;
  }
}

export async function prepareImage(file: File): Promise<PreparedImage> {
  const rejection = validateFile(file);
  if (rejection) throw new ImageError(rejection, rejectionMessage(rejection));

  const bitmap = await decode(file);
  try {
    const target = fitWithin(bitmap.width, bitmap.height, MAX_LONG_EDGE);
    const canvas = render(bitmap, target.width, target.height);
    const blob = await encode(canvas);

    return {
      blob,
      width: target.width,
      height: target.height,
      originalBytes: file.size,
    };
  } finally {
    bitmap.close();
  }
}

type Canvas = HTMLCanvasElement | OffscreenCanvas;

/**
 * Decodifica aplicando la orientación EXIF al dibujar, así una foto vertical no
 * aparece acostada. Si el navegador no puede leer el archivo (por ejemplo, un
 * HEIC en un navegador sin soporte), se traduce a un mensaje entendible.
 */
async function decode(file: File): Promise<ImageBitmap> {
  try {
    return await createImageBitmap(file, { imageOrientation: "from-image" });
  } catch {
    try {
      return await createImageBitmap(file);
    } catch {
      throw new ImageError(
        "unreadable",
        "No pudimos leer esta imagen. Probá con una captura en JPG o PNG.",
      );
    }
  }
}

/**
 * Dibuja la imagen ya orientada sobre un canvas del tamaño final. Fondo blanco
 * explícito: al pasar a JPEG, la transparencia se volvería negra.
 */
function render(bitmap: ImageBitmap, width: number, height: number): Canvas {
  if (typeof OffscreenCanvas !== "undefined") {
    const canvas = new OffscreenCanvas(width, height);
    const context = canvas.getContext("2d");
    if (!context)
      throw new ImageError("unreadable", "Este dispositivo no pudo procesar la imagen.");
    context.fillStyle = "#ffffff";
    context.fillRect(0, 0, width, height);
    context.imageSmoothingEnabled = true;
    context.imageSmoothingQuality = "high";
    context.drawImage(bitmap, 0, 0, width, height);
    return canvas;
  }

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext("2d");
  if (!context) throw new ImageError("unreadable", "Este dispositivo no pudo procesar la imagen.");
  context.fillStyle = "#ffffff";
  context.fillRect(0, 0, width, height);
  context.imageSmoothingEnabled = true;
  context.imageSmoothingQuality = "high";
  context.drawImage(bitmap, 0, 0, width, height);
  return canvas;
}

/** Prueba calidades hasta entrar en el presupuesto de tamaño. */
async function encode(canvas: Canvas): Promise<Blob> {
  for (const quality of QUALITY_LADDER) {
    const blob = await toBlob(canvas, quality);
    if (blob.size <= MAX_OUTPUT_BYTES) return blob;
  }

  throw new ImageError(
    "too-heavy",
    "La imagen sigue siendo muy pesada después de achicarla. Probá con otra captura.",
  );
}

function toBlob(canvas: Canvas, quality: number): Promise<Blob> {
  if (typeof OffscreenCanvas !== "undefined" && canvas instanceof OffscreenCanvas) {
    return canvas.convertToBlob({ type: "image/jpeg", quality });
  }

  return new Promise((resolve, reject) => {
    (canvas as HTMLCanvasElement).toBlob(
      (blob) => {
        if (blob) resolve(blob);
        else reject(new ImageError("unreadable", "No pudimos convertir la imagen."));
      },
      "image/jpeg",
      quality,
    );
  });
}
