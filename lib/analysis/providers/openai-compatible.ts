import type { Analysis } from "../contract";
import { AnalysisError } from "../errors";
import { describeShape, parseModelJson } from "../json";
import type { AnalysisInput, AnalysisProvider } from "../provider";
import { loadSystemPrompt } from "../prompt";

/**
 * Adaptador para APIs compatibles con el formato de chat completions de OpenAI
 * (DeepSeek lo es). Habla HTTP directo, sin SDK: menos dependencias, menos
 * superficie y un solo lugar donde se arma el request.
 *
 * Reglas:
 * - La clave solo viaja en el header. Nunca se loguea.
 * - El cuerpo del error del proveedor no se propaga: puede traer detalles
 *   internos y no lo escribimos nosotros.
 * - La respuesta se devuelve sin validar: el endpoint la valida con zod.
 */

export type OpenAiCompatibleConfig = {
  name: string;
  baseUrl: string;
  apiKey: string;
  model: string;
  timeoutMs?: number;
  maxTokens?: number;
};

export function createOpenAiCompatibleProvider(config: OpenAiCompatibleConfig): AnalysisProvider {
  return new OpenAiCompatibleProvider(config);
}

class OpenAiCompatibleProvider implements AnalysisProvider {
  readonly name: string;

  constructor(private readonly config: OpenAiCompatibleConfig) {
    this.name = config.name;
  }

  async analyze(input: AnalysisInput): Promise<Analysis> {
    const url = `${this.config.baseUrl.replace(/\/$/, "")}/chat/completions`;
    const timeoutMs = this.config.timeoutMs ?? 10_000;

    const body = {
      model: this.config.model,
      messages: [
        { role: "system", content: loadSystemPrompt() },
        {
          role: "user",
          content: [
            {
              type: "text",
              text:
                "Analizá la captura. Respondé únicamente con el objeto JSON del contrato: " +
                "sin saludos, sin explicaciones y sin bloques de código. Empezá en { y terminá en }.",
            },
            {
              type: "image_url",
              image_url: { url: toDataUrl(input.image.bytes, input.image.mimeType) },
            },
          ],
        },
      ],
      response_format: { type: "json_object" },
      // Temperatura 0: es una tarea de extracción, no de redacción libre. Menos
      // variación, menos formato raro.
      temperature: 0,
      max_tokens: this.config.maxTokens ?? 900,
      stream: false,
    };

    let response: Response;
    try {
      response = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${this.config.apiKey}`,
        },
        body: JSON.stringify(body),
        signal: AbortSignal.timeout(timeoutMs),
      });
    } catch (error) {
      const aborted =
        error instanceof Error && (error.name === "TimeoutError" || error.name === "AbortError");
      if (aborted) {
        throw new AnalysisError("timeout", "El análisis tardó demasiado. Probá de nuevo.");
      }
      throw new AnalysisError("provider_error", "El proveedor de análisis no está disponible.");
    }

    if (!response.ok) {
      // Solo el código HTTP queda en el log, nunca el cuerpo.
      console.error(`[analysis] ${this.name} respondió ${response.status}`);
      throw new AnalysisError("provider_error", "El proveedor de análisis no está disponible.");
    }

    const payload: unknown = await response.json().catch(() => null);
    const extracted = extractContent(payload);

    if (extracted.content === null) {
      // Sin contenido no hay nada que parsear: hay que registrar por qué.
      console.error(
        `[analysis] ${this.name} sin contenido (finish=${extracted.finish ?? "-"}, claves=${
          extracted.keys.join("|") || "-"
        })`,
      );
      throw new AnalysisError("invalid_response", "El proveedor devolvió una respuesta vacía.");
    }

    try {
      return parseModelJson(extracted.content) as Analysis;
    } catch (error) {
      // Diagnóstico sin contenido: ni texto del modelo ni datos de la imagen.
      console.error(
        `[analysis] ${this.name} devolvió JSON inválido (${describeShape(extracted.content)}, finish=${
          extracted.finish ?? "-"
        })`,
      );
      throw error;
    }
  }
}

function toDataUrl(bytes: Uint8Array, mimeType: string): string {
  return `data:${mimeType};base64,${Buffer.from(bytes).toString("base64")}`;
}

type ChatMessage = {
  content?: unknown;
  /** Algunos modelos de razonamiento ponen el texto acá cuando `content` viene vacío. */
  reasoning_content?: unknown;
};

type ChatPayload = {
  choices?: Array<{ message?: ChatMessage; finish_reason?: unknown }>;
};

/** `length` acá significa que la respuesta se cortó por max_tokens. */
function finishReason(payload: unknown): string | null {
  const reason = (payload as ChatPayload | null)?.choices?.[0]?.finish_reason;
  return typeof reason === "string" ? reason : null;
}

function extractContent(payload: unknown): {
  content: string | null;
  keys: string[];
  finish: string | null;
} {
  const message = (payload as ChatPayload | null)?.choices?.[0]?.message ?? {};
  const keys = Object.keys(message);
  const content = toText(message.content) ?? toText(message.reasoning_content);

  return { content, keys, finish: finishReason(payload) };
}

/** Acepta string o una lista de partes (algunos proveedores devuelven eso). */
function toText(value: unknown): string | null {
  if (typeof value === "string") {
    const trimmed = value.trim();
    return trimmed.length > 0 ? value : null;
  }

  if (Array.isArray(value)) {
    const parts: string[] = [];
    for (const part of value) {
      if (typeof part === "string") parts.push(part);
      else if (part && typeof part === "object" && "text" in part) {
        const text = (part as { text?: unknown }).text;
        if (typeof text === "string") parts.push(text);
      }
    }
    const joined = parts.join("").trim();
    return joined.length > 0 ? joined : null;
  }

  return null;
}
