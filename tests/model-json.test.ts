import { describe, expect, it } from "vitest";

import { AnalysisError } from "@/lib/analysis/errors";
import { parseModelJson } from "@/lib/analysis/json";

/**
 * Formatos que aparecen en la práctica cuando el modelo no respeta el "solo
 * JSON". Cada caso viene de una salida real o de una variante documentada.
 */
describe("parseModelJson", () => {
  it("parsea JSON limpio", () => {
    expect(parseModelJson('{"verdict":"x"}')).toEqual({ verdict: "x" });
  });

  it("tolera un bloque markdown", () => {
    expect(parseModelJson('```json\n{"verdict":"x"}\n```')).toEqual({ verdict: "x" });
  });

  it("tolera texto antes y después del objeto", () => {
    const raw = 'Claro, acá va el análisis:\n{"verdict":"x"}\nEspero que te sirva.';
    expect(parseModelJson(raw)).toEqual({ verdict: "x" });
  });

  it("tolera comas finales", () => {
    expect(parseModelJson('{"a":1,"b":[1,2,],}')).toEqual({ a: 1, b: [1, 2] });
  });

  it("tolera comentarios", () => {
    const raw = '{\n  "a": 1, // nota\n  /* bloque */ "b": 2\n}';
    expect(parseModelJson(raw)).toEqual({ a: 1, b: 2 });
  });

  it("tolera saltos de línea sin escapar dentro de un string", () => {
    const raw = '{"reason":"primera linea\nsegunda linea"}';
    expect(parseModelJson(raw)).toEqual({ reason: "primera linea\nsegunda linea" });
  });

  it("tolera comillas tipográficas", () => {
    expect(parseModelJson("{“a”: “b”}")).toEqual({ a: "b" });
  });

  it("tolera un BOM al principio", () => {
    expect(parseModelJson('\uFEFF{"a":1}')).toEqual({ a: 1 });
  });

  it("conserva acentos y comillas dentro del texto", () => {
    const parsed = parseModelJson('{"summary":"Dice “verificá” y no usa link."}');
    expect(parsed).toEqual({ summary: "Dice “verificá” y no usa link." });
  });

  it("rechaza texto sin objeto", () => {
    expect(() => parseModelJson("No puedo analizar esta imagen.")).toThrow(AnalysisError);
  });

  it("rechaza un objeto que no se puede reparar", () => {
    expect(() => parseModelJson("{ esto no es json en absoluto }")).toThrow(AnalysisError);
  });

  it("marca el error como invalid_response", () => {
    try {
      parseModelJson("nada");
    } catch (error) {
      expect(error).toMatchObject({ code: "invalid_response" });
    }
  });
});
