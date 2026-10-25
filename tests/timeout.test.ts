import { describe, expect, it } from "vitest";

import { AnalysisError } from "@/lib/analysis/errors";
import { withTimeout } from "@/lib/analysis/timeout";

describe("withTimeout", () => {
  it("devuelve el valor si llega a tiempo", async () => {
    await expect(withTimeout(Promise.resolve("ok"), 50)).resolves.toBe("ok");
  });

  it("rechaza con timeout cuando el proveedor no responde", async () => {
    const never = new Promise<string>(() => {
      /* nunca resuelve */
    });

    await expect(withTimeout(never, 10)).rejects.toBeInstanceOf(AnalysisError);
    await expect(withTimeout(never, 10)).rejects.toMatchObject({ code: "timeout", status: 504 });
  });

  it("propaga el error original del proveedor", async () => {
    const failure = Promise.reject(new AnalysisError("provider_error", "caído"));

    await expect(withTimeout(failure, 50)).rejects.toMatchObject({ code: "provider_error" });
  });
});
