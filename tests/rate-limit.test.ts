import { describe, expect, it } from "vitest";

import { createRateLimiter } from "@/lib/analysis/rate-limit";

describe("createRateLimiter", () => {
  const options = { limit: 2, windowMs: 60_000 };

  it("permite hasta el límite", () => {
    const check = createRateLimiter(options);
    const now = 1_000_000;

    expect(check("ip", now).allowed).toBe(true);
    expect(check("ip", now + 1).allowed).toBe(true);
    const blocked = check("ip", now + 2);

    expect(blocked.allowed).toBe(false);
    if (!blocked.allowed) expect(blocked.retryAfterSeconds).toBeGreaterThan(0);
  });

  it("vuelve a permitir cuando pasa la ventana", () => {
    const check = createRateLimiter(options);
    const now = 1_000_000;

    check("ip", now);
    check("ip", now);
    expect(check("ip", now + 30_000).allowed).toBe(false);
    expect(check("ip", now + 61_000).allowed).toBe(true);
  });

  it("separa los contadores por clave", () => {
    const check = createRateLimiter(options);
    const now = 1_000_000;

    check("a", now);
    check("a", now);
    expect(check("a", now).allowed).toBe(false);
    expect(check("b", now).allowed).toBe(true);
  });

  it("informa los intentos restantes", () => {
    const check = createRateLimiter({ limit: 3, windowMs: 60_000 });
    const first = check("ip", 1);

    expect(first).toEqual({ allowed: true, remaining: 2 });
  });
});
