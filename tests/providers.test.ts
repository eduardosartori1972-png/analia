import { afterEach, describe, expect, it, vi } from "vitest";

import { getAnalysisProvider } from "@/lib/analysis/providers";

/**
 * La cadena de proveedores se arma en cada request. Un respaldo mal configurado
 * no puede tumbar al primario: se deshabilita con un aviso en los logs.
 */
afterEach(() => {
  vi.unstubAllEnvs();
});

describe("getAnalysisProvider", () => {
  it("sin respaldo, devuelve el primario", () => {
    vi.stubEnv("ANALYZE_PROVIDER", "fake");
    vi.stubEnv("ANALYZE_FALLBACK_PROVIDER", "none");

    expect(getAnalysisProvider().name).toBe("fake");
  });

  it("si el respaldo no tiene clave, sigue con el primario", () => {
    vi.stubEnv("ANALYZE_PROVIDER", "fake");
    vi.stubEnv("ANALYZE_FALLBACK_PROVIDER", "openai");
    vi.stubEnv("ANALYZE_FALLBACK_API_KEY", undefined);

    expect(getAnalysisProvider().name).toBe("fake");
  });

  it("si el respaldo está completo, arma la cadena", () => {
    vi.stubEnv("ANALYZE_PROVIDER", "fake");
    vi.stubEnv("ANALYZE_FALLBACK_PROVIDER", "openai");
    vi.stubEnv("ANALYZE_FALLBACK_API_KEY", "clave-de-prueba");
    vi.stubEnv("ANALYZE_FALLBACK_MODEL", "modelo-de-prueba");

    expect(getAnalysisProvider().name).toBe("fake->openai");
  });

  it("un respaldo desconocido no rompe el primario", () => {
    vi.stubEnv("ANALYZE_PROVIDER", "fake");
    vi.stubEnv("ANALYZE_FALLBACK_PROVIDER", "inexistente");

    expect(getAnalysisProvider().name).toBe("fake");
  });

  it("un primario desconocido sí es un error de configuración", () => {
    vi.stubEnv("ANALYZE_PROVIDER", "inexistente");

    expect(() => getAnalysisProvider()).toThrow(/no soportado/);
  });
});
