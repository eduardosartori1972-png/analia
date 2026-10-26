import type { Analysis } from "../contract";
import { AnalysisError } from "../errors";
import { parseModelJson } from "../json";
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
              text: "Analizá la captura y devolvé solo el objeto JSON del contrato, sin texto adicional.",
            },
            {
              type: "image_url",
              image_url: { url: toDataUrl(input.image.bytes, input.image.mimeType) },
            },
          ],
        },
      ],
      response_format: { type: "json_object" },
      temperature: 0.2,
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
    const content = extractContent(payload);
    if (content === null) {
      throw new AnalysisError("invalid_response", "El proveedor devolvió una respuesta vacía.");
    }

    return parseModelJson(content) as Analysis;
  }
}

function toDataUrl(bytes: Uint8Array, mimeType: string): string {
  return `data:${mimeType};base64,${Buffer.from(bytes).toString("base64")}`;
}

type ChatPayload = {
  choices?: Array<{ message?: { content?: unknown } }>;
};

function extractContent(payload: unknown): string | null {
  const choices = (payload as ChatPayload | null)?.choices;
  const content = choices?.[0]?.message?.content;
  return typeof content === "string" && content.trim().length > 0 ? content : null;
}
