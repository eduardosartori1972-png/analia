import { describe, expect, it } from "vitest";

import { loadCases, runAll } from "@/evals/run";

describe("corpus de evaluación", () => {
  it("tiene los cuatro casos del MVP", async () => {
    const cases = await loadCases();
    const ids = cases.map((testCase) => testCase.id).sort();

    expect(ids).toEqual(["ambiguo", "inyeccion", "legitimo", "sospechoso"]);
  });

  it("todos pasan la capa de seguridad", async () => {
    const results = await runAll();
    const failed = results.filter((result) => !result.passed);

    expect(failed).toEqual([]);
  });
});
