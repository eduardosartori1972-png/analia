import { describe, expect, it } from "vitest";

import { runAll } from "@/evals/run";
import { getAnalysisProvider } from "@/lib/analysis/providers";

/**
 * Evals contra el proveedor real. No corren en CI ni con `pnpm test`: hay que
 * habilitarlas explícitamente y tener la clave en el entorno.
 *
 *   ANALYZE_LIVE=1 ANALYZE_PROVIDER=deepseek ANALYZE_API_KEY=... pnpm test
 *
 * Un caso que falla es un hallazgo para revisar el prompt, no un bug del test.
 */
const enabled = process.env.ANALYZE_LIVE === "1";

describe.skipIf(!enabled)("evals contra el proveedor real", () => {
  it("corre los cuatro casos del corpus", async () => {
    const results = await runAll({ provider: getAnalysisProvider() });

    for (const result of results) {
      const estado = result.passed ? "PASS" : "FAIL";
      console.log(
        `${estado}  ${result.id.padEnd(10)} ${result.verdict ?? "-"} ${result.ms ?? 0}ms` +
          (result.problems.length ? ` — ${result.problems.join("; ")}` : ""),
      );
    }

    expect(results.filter((result) => !result.passed)).toEqual([]);
  }, 300_000);
});
