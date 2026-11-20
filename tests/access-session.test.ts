import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
  isAccessCodeConfigured,
  isAccessCodeMisconfigured,
  isCodeValid,
  issueAccessToken,
  readCookie,
  resolveAccess,
  verifyAccessToken,
} from "@/lib/access/session";

/**
 * El token es un HMAC del vencimiento. Estas pruebas fijan las propiedades que
 * importan: caduca, no se puede falsificar y no depende de estado en memoria.
 */
beforeEach(() => {
  vi.stubEnv("ANALYZE_ACCESS_CODE", "ANALIA-TEST");
  vi.stubEnv("ANALYZE_ACCESS_SECRET", "secreto-de-prueba-para-hmac");
});

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("token de acceso", () => {
  it("emite y verifica un token vigente", () => {
    const token = issueAccessToken();
    expect(token).not.toBeNull();
    expect(verifyAccessToken(token ?? undefined)).toBe(true);
  });

  it("rechaza un token vencido", () => {
    const past = Date.now() - 8 * 24 * 60 * 60 * 1000;
    const token = issueAccessToken(past) ?? "";
    expect(verifyAccessToken(token)).toBe(false);
  });

  it("rechaza un token con la firma cambiada", () => {
    const token = issueAccessToken() ?? "";
    const [version, expiry, signature] = token.split(".");
    const tampered = `${version}.${expiry}.${signature?.slice(0, -2)}xx`;

    expect(verifyAccessToken(tampered)).toBe(false);
  });

  it("rechaza un token con otro vencimiento", () => {
    const token = issueAccessToken() ?? "";
    const [version, , signature] = token.split(".");
    const extended = Number(Date.now() + 30 * 24 * 60 * 60 * 1000);

    expect(verifyAccessToken(`${version}.${extended}.${signature}`)).toBe(false);
  });

  it("rechaza basura", () => {
    expect(verifyAccessToken(undefined)).toBe(false);
    expect(verifyAccessToken("")).toBe(false);
    expect(verifyAccessToken("v1.abc.def")).toBe(false);
    expect(verifyAccessToken("otra.cosa")).toBe(false);
  });
});

describe("código", () => {
  it("acepta el código sin importar mayúsculas ni espacios", () => {
    expect(isCodeValid("  analia-test ")).toBe(true);
    expect(isCodeValid("ANALIA-TEST")).toBe(true);
  });

  it("rechaza un código distinto o vacío", () => {
    expect(isCodeValid("ANALIA-TEST2")).toBe(false);
    expect(isCodeValid("")).toBe(false);
    expect(isCodeValid("otra cosa")).toBe(false);
  });
});

describe("resolveAccess", () => {
  it("sin cookie, deniega cuando hay código configurado", () => {
    expect(resolveAccess(null)).toBe("denied");
  });

  it("con cookie válida, habilita", () => {
    const cookie = `otra=1; analia_access=${issueAccessToken() ?? ""}`;
    expect(resolveAccess(cookie)).toBe("tester");
  });

  it("con cookie vencida, deniega", () => {
    const past = Date.now() - 8 * 24 * 60 * 60 * 1000;
    const cookie = `analia_access=${issueAccessToken(past) ?? ""}`;
    expect(resolveAccess(cookie)).toBe("denied");
  });

  it("sin código configurado, el acceso queda abierto", () => {
    vi.stubEnv("ANALYZE_ACCESS_CODE", undefined);
    expect(resolveAccess(null)).toBe("open");
  });

  it("con un código demasiado corto, falla cerrado", () => {
    vi.stubEnv("ANALYZE_ACCESS_CODE", "12345");
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});

    expect(isAccessCodeConfigured()).toBe(true);
    expect(isAccessCodeMisconfigured()).toBe(true);
    expect(isCodeValid("12345")).toBe(false);
    expect(resolveAccess(null)).toBe("denied");

    // Un token viejo tampoco sirve con la configuración rota.
    const cookie = `analia_access=${issueAccessToken() ?? ""}`;
    expect(resolveAccess(cookie)).toBe("denied");

    spy.mockRestore();
  });

  it("no se rompe con una cookie malformada", () => {
    expect(() => resolveAccess("analia_access=%ZZ")).not.toThrow();
    expect(resolveAccess("analia_access=%ZZ")).toBe("denied");
  });
});

describe("readCookie", () => {
  it("lee una cookie entre varias", () => {
    expect(readCookie("a=1; analia_access=xyz; b=2", "analia_access")).toBe("xyz");
  });

  it("devuelve undefined si no está", () => {
    expect(readCookie("a=1; b=2", "analia_access")).toBeUndefined();
    expect(readCookie(null, "analia_access")).toBeUndefined();
  });
});
