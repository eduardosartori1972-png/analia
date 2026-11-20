import { describe, expect, it, vi } from "vitest";

import { AnalysisClientError, isSessionExpired, requestAnalysis } from "@/lib/analysis/client";

const IMAGE = new Blob([new Uint8Array([1, 2, 3])], { type: "image/jpeg" });

function respondWith(body: string, status: number) {
  vi.stubGlobal(
    "fetch",
    vi.fn(
      async () => new Response(body, { status, headers: { "content-type": "application/json" } }),
    ),
  );
}

describe("cliente del análisis", () => {
  it("propaga el código de sesión vencida para que la puerta se cierre", async () => {
    respondWith(
      JSON.stringify({ error: { code: "unauthorized", message: "Necesitás el código" } }),
      401,
    );

    await expect(requestAnalysis(IMAGE)).rejects.toMatchObject({
      code: "unauthorized",
      message: "Necesitás el código",
    });
  });

  it("usa el mensaje del servidor cuando viene", async () => {
    respondWith(
      JSON.stringify({ error: { code: "quota_exhausted", message: "Límite del mes" } }),
      429,
    );

    await expect(requestAnalysis(IMAGE)).rejects.toMatchObject({ code: "quota_exhausted" });
  });

  it("cae al mensaje por código de estado si el cuerpo no trae texto", async () => {
    respondWith("", 413);

    await expect(requestAnalysis(IMAGE)).rejects.toBeInstanceOf(AnalysisClientError);
    await expect(requestAnalysis(IMAGE)).rejects.toMatchObject({
      message: expect.stringContaining("demasiado"),
    });
  });

  it("avisa cuando no hay conexión", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => {
        throw new TypeError("failed to fetch");
      }),
    );

    await expect(requestAnalysis(IMAGE)).rejects.toMatchObject({
      message: expect.stringContaining("conectarnos"),
    });
  });
});

describe("sesión vencida", () => {
  it("reconoce el 401 y no otros errores", () => {
    expect(isSessionExpired(new AnalysisClientError("venció", "unauthorized"))).toBe(true);
    expect(isSessionExpired(new AnalysisClientError("otra cosa", "provider_error"))).toBe(false);
    expect(isSessionExpired(new AnalysisClientError("sin código"))).toBe(false);
    expect(isSessionExpired(new Error("genérico"))).toBe(false);
    expect(isSessionExpired(null)).toBe(false);
  });

  it("el 401 que devuelve la API se reconoce como sesión vencida", async () => {
    respondWith(
      JSON.stringify({ error: { code: "unauthorized", message: "Necesitás el código" } }),
      401,
    );

    const error = await requestAnalysis(IMAGE).catch((caught: unknown) => caught);
    expect(isSessionExpired(error)).toBe(true);
  });
});
