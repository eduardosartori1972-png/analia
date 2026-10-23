import { describe, expect, it } from "vitest";

import { GET } from "@/app/api/health/route";

describe("GET /api/health", () => {
  it("responde 200 con el identificador de la app y la etapa", async () => {
    const response = GET();

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toMatchObject({
      ok: true,
      app: "analia",
      stage: 0,
    });
  });

  it("no se cachea", () => {
    const response = GET();

    expect(response.headers.get("cache-control")).toContain("no-store");
  });

  it("no filtra configuración ni variables de entorno", async () => {
    const body = (await GET().json()) as Record<string, unknown>;

    expect(Object.keys(body).sort()).toEqual(["app", "ok", "stage"]);
  });
});
