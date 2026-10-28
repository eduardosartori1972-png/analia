import { describe, expect, it } from "vitest";

import { analysisResponseSchema, analysisSchema } from "@/lib/analysis/contract";
import { CANONICAL_LIMITS, enforceSafety } from "@/lib/safety/policy";

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

  it("tolera que el modelo omita limits y lo completa el sistema", () => {
    const withoutLimits: Record<string, unknown> = { ...validAnalysis };
    delete withoutLimits["limits"];

    const parsed = analysisSchema.parse(withoutLimits);
    expect(parsed.limits).toBe("");

    const safe = enforceSafety(parsed);
    expect(safe.limits).toBe(CANONICAL_LIMITS[parsed.verdict]);
  });

  it("descarta campos que no son del contrato", () => {
    const parsed = analysisSchema.parse({ ...validAnalysis, confianza: 0.97 });
    expect(parsed).not.toHaveProperty("confianza");
  });

  it("completa hardData y escalation si el modelo los omite", () => {
    const copy: Record<string, unknown> = { ...validAnalysis };
    delete copy["hardData"];
    delete copy["escalation"];

    const parsed = analysisSchema.parse(copy);

    expect(parsed.hardData).toEqual({ urls: [], phones: [], senders: [] });
    expect(parsed.escalation).toBe("none");
  });

  it("no rechaza un texto apenas más largo que la guía del prompt", () => {
    const parsed = analysisSchema.safeParse({ ...validAnalysis, summary: "x".repeat(500) });
    expect(parsed.success).toBe(true);
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
