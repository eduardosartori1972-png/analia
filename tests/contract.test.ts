import { describe, expect, it } from "vitest";

import { analysisResponseSchema, analysisSchema } from "@/lib/analysis/contract";

const validAnalysis = {
  verdict: "señales_sospechosas" as const,
  title: "Hay señales sospechosas",
  summary: "El mensaje pide entrar a un link y apura con una amenaza de bloqueo.",
  reasons: ["Pide entrar a un link.", "Apura con un plazo corto."],
  nextSteps: ["No toques el link.", "Verificá por el canal oficial."],
  limits: "No puedo confirmar que sea una estafa, pero tampoco que sea seguro.",
  escalation: "banking" as const,
  hardData: { urls: [], phones: [], senders: [] },
};

describe("analysisSchema", () => {
  it("acepta un análisis completo", () => {
    const parsed = analysisSchema.safeParse(validAnalysis);
    expect(parsed.success).toBe(true);
  });

  it("rechaza un veredicto fuera de la taxonomía", () => {
    const parsed = analysisSchema.safeParse({ ...validAnalysis, verdict: "es_seguro" });
    expect(parsed.success).toBe(false);
  });

  it("rechaza un análisis sin razones", () => {
    const parsed = analysisSchema.safeParse({ ...validAnalysis, reasons: [] });
    expect(parsed.success).toBe(false);
  });

  it("rechaza más de tres pasos a seguir", () => {
    const parsed = analysisSchema.safeParse({
      ...validAnalysis,
      nextSteps: ["Uno.", "Dos.", "Tres.", "Cuatro."],
    });
    expect(parsed.success).toBe(false);
  });

  it("exige el límite explícito", () => {
    const withoutLimits: Record<string, unknown> = { ...validAnalysis };
    delete withoutLimits["limits"];

    const parsed = analysisSchema.safeParse(withoutLimits);
    expect(parsed.success).toBe(false);
  });

  it("descarta campos que no son del contrato", () => {
    const parsed = analysisSchema.parse({ ...validAnalysis, confianza: 0.97 });
    expect(parsed).not.toHaveProperty("confianza");
  });
});

describe("analysisResponseSchema", () => {
  it("exige un requestId", () => {
    expect(analysisResponseSchema.safeParse({ analysis: validAnalysis }).success).toBe(false);
    expect(
      analysisResponseSchema.safeParse({ analysis: validAnalysis, requestId: "abc" }).success,
    ).toBe(true);
  });
});
