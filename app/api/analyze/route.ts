import { NextResponse } from "next/server";

import { createMonthlyBudget, resolveMonthlyLimit } from "@/lib/analysis/budget";
import type { Analysis } from "@/lib/analysis/contract";
import { analysisSchema } from "@/lib/analysis/contract";
import { AnalysisError } from "@/lib/analysis/errors";
import { MAX_SERVER_IMAGE_BYTES, sniffImageType } from "@/lib/analysis/image-guard";
import { getAnalysisProvider } from "@/lib/analysis/providers";
import { createRateLimiter } from "@/lib/analysis/rate-limit";
import { enforceSafety, SafetyViolation } from "@/lib/safety/policy";

/**
 * Único endpoint que toca la imagen. Vive en memoria: no escribe a disco, ni a
 * base, ni a logs (ADR-001).
 *
 * El reintento y el respaldo viven en la cadena de proveedores, no acá: el
 * endpoint no sabe cuántos proveedores hay ni en qué orden se intentan.
 */

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 30;

const RATE_LIMIT_WINDOW_MS = 10 * 60_000;

function readRateLimit(): number {
  const configured = Number(process.env.ANALYZE_RATE_LIMIT ?? 30);
  return Number.isFinite(configured) && configured > 0 ? configured : 30;
}

const limiter = createRateLimiter({
  limit: readRateLimit(),
  windowMs: RATE_LIMIT_WINDOW_MS,
});

const budget = createMonthlyBudget(resolveMonthlyLimit());

function clientIp(request: Request): string {
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) {
    const first = forwarded.split(",")[0]?.trim();
    if (first) return first;
  }
  return request.headers.get("x-real-ip") ?? "desconocida";
}

function errorResponse(error: AnalysisError, requestId: string) {
  const headers: Record<string, string> = { "Cache-Control": "no-store" };
  if (error.retryAfterSeconds) headers["Retry-After"] = String(error.retryAfterSeconds);

  return NextResponse.json(
    { error: { code: error.code, message: error.message }, requestId },
    { status: error.status, headers },
  );
}

export async function POST(request: Request) {
  const requestId = crypto.randomUUID();

  try {
    const decision = limiter(clientIp(request));
    if (!decision.allowed) {
      throw new AnalysisError(
        "rate_limited",
        "Hiciste varias consultas seguidas. Esperá un momento y volvé a intentar.",
        { retryAfterSeconds: decision.retryAfterSeconds },
      );
    }

    const quota = budget();
    if (!quota.allowed) {
      throw new AnalysisError(
        "quota_exhausted",
        "Llegamos al límite de consultas de este mes. Probá de nuevo el mes que viene.",
      );
    }

    const declaredLength = Number(request.headers.get("content-length") ?? "0");
    if (Number.isFinite(declaredLength) && declaredLength > MAX_SERVER_IMAGE_BYTES + 1_000_000) {
      throw new AnalysisError(
        "too_large",
        "La imagen es demasiado grande. Probá con otra captura.",
      );
    }

    let form: FormData;
    try {
      form = await request.formData();
    } catch {
      throw new AnalysisError("invalid_image", "No pudimos leer el archivo. Probá de nuevo.");
    }

    const file = form.get("image");
    if (!(file instanceof File)) {
      throw new AnalysisError("invalid_image", "Falta la imagen para analizar.");
    }
    if (file.size === 0) {
      throw new AnalysisError("invalid_image", "El archivo está vacío. Probá con otra captura.");
    }
    if (file.size > MAX_SERVER_IMAGE_BYTES) {
      throw new AnalysisError(
        "too_large",
        "La imagen es demasiado grande. Probá con otra captura.",
      );
    }

    const bytes = new Uint8Array(await file.arrayBuffer());
    const mimeType = sniffImageType(bytes);
    if (!mimeType) {
      throw new AnalysisError("invalid_image", "Ese archivo no es una imagen que podamos leer.");
    }

    let provider;
    try {
      provider = getAnalysisProvider();
    } catch (error) {
      // Los mensajes de configuración son nuestros y no tienen datos de usuario.
      const detail = error instanceof Error ? error.message : "desconocido";
      console.error(`[analyze] configuración de proveedor inválida (${requestId}): ${detail}`);
      throw new AnalysisError(
        "provider_error",
        "No pudimos analizar la imagen. Probá de nuevo en un rato.",
      );
    }

    const raw = await provider.analyze({ image: { bytes, mimeType } });

    const parsed = analysisSchema.safeParse(raw);
    if (!parsed.success) {
      // Sin contenido de la imagen ni texto del usuario: solo el identificador.
      console.error(`[analyze] respuesta inválida del proveedor "${provider.name}" (${requestId})`);
      throw new AnalysisError(
        "invalid_response",
        "El análisis no salió como esperábamos. Probá de nuevo.",
      );
    }

    let safe: Analysis;
    try {
      safe = enforceSafety(parsed.data);
    } catch (error) {
      if (error instanceof SafetyViolation) {
        // Se registran las reglas, nunca el texto: puede contener datos del usuario.
        console.error(
          `[analyze] respuesta bloqueada por seguridad (${requestId}): ${error.rules.join(",")}`,
        );
        throw new AnalysisError(
          "invalid_response",
          "El análisis no salió como esperábamos. Probá de nuevo.",
        );
      }
      throw error;
    }

    return NextResponse.json(
      { analysis: safe, requestId },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    if (error instanceof AnalysisError) return errorResponse(error, requestId);

    console.error(
      `[analyze] error inesperado (${requestId}): ${error instanceof Error ? error.name : "desconocido"}`,
    );
    return errorResponse(
      new AnalysisError(
        "provider_error",
        "No pudimos analizar la imagen. Probá de nuevo en un rato.",
      ),
      requestId,
    );
  }
}
