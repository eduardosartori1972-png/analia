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

type Canvas = HTMLCanvasElement | OffscreenCanvas;

export async function prepareImage(source: Blob): Promise<PreparedImage> {
  const rejection = validateFile({ size: source.size, type: source.type });
  if (rejection) throw new ImageError(rejection, rejectionMessage(rejection));

  const decoded = await decode(source);
  try {
    const target = fitWithin(decoded.width, decoded.height, MAX_LONG_EDGE);
    const canvas = render(decoded.image, target.width, target.height);
    const blob = await encode(canvas);

    return {
      blob,
      width: target.width,
      height: target.height,
      originalBytes: source.size,
    };
  } finally {
    decoded.release();
  }
}

type DecodedImage = {
  image: ImageBitmap | HTMLImageElement;
  width: number;
  height: number;
  release: () => void;
};

/**
 * Tres intentos, de más a menos específico:
 *
 * 1. `createImageBitmap` con orientación EXIF.
 * 2. `createImageBitmap` sin opciones (navegadores viejos).
 * 3. `<img>` + object URL: el decodificador del navegador es más tolerante con
 *    algunos archivos de Android (HEIC, fotos de cámara con metadatos raros).
 *
 * La tercera vía no es decorativa: `createImageBitmap` puede fallar de forma
 * intermitente en Android con la misma imagen que un `<img>` decodifica sin
 * problema. Antes de decirle a la persona que su captura es ilegible, probamos
 * con el decodificador del navegador.
 */
async function decode(blob: Blob): Promise<DecodedImage> {
  const bitmap = await tryBitmap(blob);
  if (bitmap) {
    return {
      image: bitmap,
      width: bitmap.width,
      height: bitmap.height,
      release: () => bitmap.close(),
    };
  }

  const element = await tryImageElement(blob);
  if (element) {
    return {
      image: element,
      width: element.naturalWidth,
      height: element.naturalHeight,
      release: () => URL.revokeObjectURL(element.src),
    };
  }

  throw new ImageError(
    "unreadable",
    "No pudimos leer esta imagen. Probá con una captura en JPG o PNG.",
  );
}

async function tryBitmap(blob: Blob): Promise<ImageBitmap | null> {
  try {
    return await createImageBitmap(blob, { imageOrientation: "from-image" });
  } catch {
    // Seguimos con el siguiente intento.
  }

  try {
    return await createImageBitmap(blob);
  } catch {
    return null;
  }
}

function tryImageElement(blob: Blob): Promise<HTMLImageElement | null> {
  return new Promise((resolve) => {
    const url = URL.createObjectURL(blob);
    const image = new Image();
    image.decoding = "async";

    image.onload = () => resolve(image);
    image.onerror = () => {
      URL.revokeObjectURL(url);
      resolve(null);
    };

    image.src = url;
  });
}

/**
 * Dibuja la imagen ya orientada sobre un canvas del tamaño final. Fondo blanco
 * explícito: al pasar a JPEG, la transparencia se volvería negra.
 */
function render(source: CanvasImageSource, width: number, height: number): Canvas {
  if (typeof OffscreenCanvas !== "undefined") {
    const canvas = new OffscreenCanvas(width, height);
    const context = canvas.getContext("2d");
    if (!context)
      throw new ImageError("unreadable", "Este dispositivo no pudo procesar la imagen.");
    context.fillStyle = "#ffffff";
    context.fillRect(0, 0, width, height);
    context.imageSmoothingEnabled = true;
    context.imageSmoothingQuality = "high";
    context.drawImage(source, 0, 0, width, height);
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
  context.drawImage(source, 0, 0, width, height);
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
