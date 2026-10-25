import type { AnalysisResponse } from "./contract";

/**
 * Cliente HTTP del análisis. Vive separado del componente para poder probarlo
 * con un `fetch` de prueba y para que el componente no sepa nada de códigos
 * de estado.
 */

export class AnalysisClientError extends Error {
  readonly code?: string;

  constructor(message: string, code?: string) {
    super(message);
    this.name = "AnalysisClientError";
    this.code = code;
  }
}

type ErrorPayload = { error?: { code?: string; message?: string } };

function fallbackMessage(status: number): string {
  if (status === 413) return "La imagen es demasiado grande. Probá con otra captura.";
  if (status === 415) return "Ese archivo no es una imagen que podamos leer.";
  if (status === 429) return "Hiciste varias consultas seguidas. Esperá un momento.";
  if (status === 504) return "El análisis tardó demasiado. Probá de nuevo.";
  return "No pudimos analizar la imagen. Probá de nuevo en un rato.";
}

export async function requestAnalysis(image: Blob): Promise<AnalysisResponse> {
  const body = new FormData();
  body.append("image", image, "captura.jpg");

  let response: Response;
  try {
    response = await fetch("/api/analyze", { method: "POST", body });
  } catch {
    throw new AnalysisClientError("No pudimos conectarnos. Revisá tu conexión y probá de nuevo.");
  }

  const payload: unknown = await response.json().catch(() => null);

  if (!response.ok) {
    const errorPayload = payload as ErrorPayload | null;
    throw new AnalysisClientError(
      errorPayload?.error?.message ?? fallbackMessage(response.status),
      errorPayload?.error?.code,
    );
  }

  return payload as AnalysisResponse;
}
