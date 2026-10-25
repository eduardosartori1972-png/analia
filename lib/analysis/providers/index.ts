import type { AnalysisProvider } from "../provider";
import { FailoverProvider } from "./chain";
import { FakeAnalysisProvider, parseFakeScenario } from "./fake";
import { createOpenAiCompatibleProvider } from "./openai-compatible";

/**
 * Fábrica de proveedores. El resto del sistema no sabe cuál está activo.
 *
 * Primario:  ANALYZE_PROVIDER = fake | deepseek | openai
 * Respaldo:  ANALYZE_FALLBACK_PROVIDER = none | deepseek | openai
 *
 * El primario usa ANALYZE_API_KEY / ANALYZE_MODEL / ANALYZE_BASE_URL.
 * El respaldo usa ANALYZE_FALLBACK_API_KEY / _MODEL / _BASE_URL.
 * Ninguna de estas variables se expone al cliente.
 */

const DEFAULT_BASE_URL: Record<string, string> = {
  deepseek: "https://api.deepseek.com",
  openai: "https://api.openai.com/v1",
};

const DEFAULT_MODEL: Record<string, string> = {
  deepseek: "deepseek-flash",
  openai: "",
};

type Source = "primary" | "fallback";

function readEnv(source: Source, suffix: string): string | undefined {
  const prefix = source === "fallback" ? "ANALYZE_FALLBACK_" : "ANALYZE_";
  return process.env[`${prefix}${suffix}`];
}

function buildCloudProvider(id: string, source: Source): AnalysisProvider {
  const apiKey = readEnv(source, "API_KEY");
  if (!apiKey) {
    throw new Error(
      `Falta ${source === "fallback" ? "ANALYZE_FALLBACK_API_KEY" : "ANALYZE_API_KEY"} para el proveedor "${id}".`,
    );
  }

  const model = readEnv(source, "MODEL") ?? DEFAULT_MODEL[id] ?? "";
  if (!model) {
    throw new Error(`Falta el modelo para el proveedor "${id}" (${source}).`);
  }

  const baseUrl = readEnv(source, "BASE_URL") ?? DEFAULT_BASE_URL[id];
  if (!baseUrl) throw new Error(`Falta la URL base para el proveedor "${id}".`);

  return createOpenAiCompatibleProvider({ name: id, baseUrl, apiKey, model });
}

function buildProvider(id: string, source: Source): AnalysisProvider | null {
  switch (id) {
    case "fake":
      return new FakeAnalysisProvider(parseFakeScenario(readEnv(source, "FAKE_SCENARIO")));
    case "deepseek":
    case "openai":
      return buildCloudProvider(id, source);
    default:
      return null;
  }
}

/**
 * Devuelve el proveedor primario, envuelto en la cadena de respaldo si hay uno
 * configurado. Si el primario y el respaldo son el mismo, no se duplica.
 */
export function getAnalysisProvider(): AnalysisProvider {
  const primaryId = (process.env.ANALYZE_PROVIDER ?? "fake").trim().toLowerCase();
  const fallbackId = (process.env.ANALYZE_FALLBACK_PROVIDER ?? "none").trim().toLowerCase();

  const primary = buildProvider(primaryId, "primary");
  if (!primary) throw new Error(`Proveedor de análisis no soportado: "${primaryId}".`);

  const fallback =
    fallbackId !== "none" && fallbackId !== primaryId
      ? buildProvider(fallbackId, "fallback")
      : null;

  return new FailoverProvider(fallback ? [primary, fallback] : [primary]);
}
