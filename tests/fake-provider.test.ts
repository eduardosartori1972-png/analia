import { describe, expect, it } from "vitest";

import { analysisSchema } from "@/lib/analysis/contract";
import { AnalysisError } from "@/lib/analysis/errors";
import { FakeAnalysisProvider, parseFakeScenario } from "@/lib/analysis/providers/fake";

const input = (size: number) => ({
  image: { bytes: new Uint8Array(size), mimeType: "image/jpeg" },
});

const fast = { latencyMs: 0 };

describe("FakeAnalysisProvider", () => {
  it.each([
    ["legitimo", "sin_señales_visibles"],
    ["sospechoso", "señales_sospechosas"],
    ["ambiguo", "no_pude_analizar"],
  ] as const)(
    "el escenario %s devuelve un contrato válido con veredicto %s",
    async (scenario, verdict) => {
      const provider = new FakeAnalysisProvider(scenario, fast);
      const result = await provider.analyze(input(100));

      expect(analysisSchema.safeParse(result).success).toBe(true);
      expect(result.verdict).toBe(verdict);
    },
  );

  it("en modo auto es determinista para el mismo tamaño", async () => {
    const provider = new FakeAnalysisProvider("auto", fast);
    const first = await provider.analyze(input(300));
    const second = await provider.analyze(input(300));

    expect(first.verdict).toBe(second.verdict);
  });

  it("en modo auto varía con el tamaño del archivo", async () => {
    const provider = new FakeAnalysisProvider("auto", fast);
    const verdicts = new Set<string>();
    for (const size of [100, 101, 102]) {
      verdicts.add((await provider.analyze(input(size))).verdict);
    }

    expect(verdicts.size).toBe(3);
  });

  it("el escenario error lanza un error de proveedor", async () => {
    const provider = new FakeAnalysisProvider("error", fast);

    await expect(provider.analyze(input(10))).rejects.toBeInstanceOf(AnalysisError);
    await expect(provider.analyze(input(10))).rejects.toMatchObject({ code: "provider_error" });
  });

  it("devuelve copias independientes del fixture", async () => {
    const provider = new FakeAnalysisProvider("sospechoso", fast);
    const first = await provider.analyze(input(1));
    first.reasons.push("mutado");

    const second = await provider.analyze(input(1));
    expect(second.reasons).not.toContain("mutado");
  });
});

describe("parseFakeScenario", () => {
  it("cae en auto ante un valor desconocido", () => {
    expect(parseFakeScenario("no-existe")).toBe("auto");
    expect(parseFakeScenario(undefined)).toBe("auto");
    expect(parseFakeScenario("SOSPECHOSO")).toBe("sospechoso");
  });
});
