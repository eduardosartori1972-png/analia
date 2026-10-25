import { describe, expect, it } from "vitest";

import { runAll } from "@/evals/run";
import { getAnalysisProvider } from "@/lib/analysis/providers";

/**
 * Evals contra el proveedor real. No corren en CI ni con `pnpm test` a secas:
 * hay que habilitarlas explícitamente y tener la clave en el entorno o en
 * `.env.local`.
 *
 *   $env:ANALYZE_LIVE="1"; pnpm test
 *
 * Las variables de `.env.local` las carga `vitest.config.ts`, igual que Next.
 *
 * Un caso que falla es un hallazgo para revisar el prompt, no un bug del test.
 */
const enabled = process.env.ANALYZE_LIVE === "1";
const providerId = (process.env.ANALYZE_PROVIDER ?? "fake").trim().toLowerCase();

describe.skipIf(!enabled)("evals contra el proveedor real", () => {
  it("tiene un proveedor real configurado, no el fake", () => {
    expect(
      providerId,
      "ANALYZE_PROVIDER sigue en fake: ponelo en deepseek en .env.local o exportalo en la terminal",
    ).not.toBe("fake");

    expect(
      Boolean(process.env.ANALYZE_API_KEY),
      "Falta ANALYZE_API_KEY: cargala en .env.local o exportala en la terminal",
    ).toBe(true);
  });

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
