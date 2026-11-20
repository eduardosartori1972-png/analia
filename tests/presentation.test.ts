import { describe, expect, it } from "vitest";

import type { Verdict } from "@/lib/analysis/contract";
import { VERDICT_PRESENTATION } from "@/lib/analysis/presentation";

const VERDICTS: Verdict[] = [
  "sin_señales_visibles",
  "señales_sospechosas",
  "altamente_probable_estafa",
  "no_pude_analizar",
];

describe("presentación del veredicto", () => {
  it("cubre los cuatro veredictos", () => {
    for (const verdict of VERDICTS) {
      expect(VERDICT_PRESENTATION[verdict]).toBeDefined();
      expect(VERDICT_PRESENTATION[verdict].label.length).toBeGreaterThan(3);
    }
  });

  it("ninguna etiqueta promete seguridad", () => {
    for (const verdict of VERDICTS) {
      expect(VERDICT_PRESENTATION[verdict].label).not.toMatch(/\bseguro\b|\bsegura\b/i);
    }
  });

  it("cada veredicto tiene un tono propio", () => {
    const tones = VERDICTS.map((verdict) => VERDICT_PRESENTATION[verdict].tone);
    expect(new Set(tones).size).toBe(VERDICTS.length);
  });

  it("el veredicto más grave es el único con tono de peligro", () => {
    const dangerous = VERDICTS.filter((verdict) => VERDICT_PRESENTATION[verdict].tone === "danger");
    expect(dangerous).toEqual(["altamente_probable_estafa"]);
  });
});
