import type { AnalysisProvider } from "../provider";
import { FakeAnalysisProvider, parseFakeScenario } from "./fake";

/**
 * Selecciona el proveedor según el entorno. Hasta la Etapa 3 solo existe el
 * simulado. La clave del proveedor real, cuando exista, se lee acá y nunca
 * lleva prefijo NEXT_PUBLIC_.
 */
export function getAnalysisProvider(): AnalysisProvider {
  const id = (process.env.ANALYZE_PROVIDER ?? "fake").trim().toLowerCase();

  switch (id) {
    case "fake":
      return new FakeAnalysisProvider(parseFakeScenario(process.env.ANALYZE_FAKE_SCENARIO));
    default:
      throw new Error(`Proveedor de análisis no soportado: "${id}".`);
  }
}
