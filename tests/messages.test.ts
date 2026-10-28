import { describe, expect, it } from "vitest";

import type { AnalysisErrorCode } from "@/lib/analysis/errors";
import { USER_MESSAGES } from "@/lib/analysis/messages";

const CODES: AnalysisErrorCode[] = [
  "invalid_image",
  "too_large",
  "rate_limited",
  "quota_exhausted",
  "timeout",
  "provider_error",
  "invalid_response",
];

describe("USER_MESSAGES", () => {
  it("tiene un mensaje para cada código", () => {
    for (const code of CODES) {
      expect(USER_MESSAGES[code], `falta el mensaje de ${code}`).toBeTruthy();
    }
  });

  it("no usa jerga técnica", () => {
    const forbidden = /json|proveedor|timeout|token|http|error|api|parseo|parse/i;

    for (const code of CODES) {
      expect(USER_MESSAGES[code], code).not.toMatch(forbidden);
    }
  });

  it("no deja al usuario sin salida", () => {
    for (const code of CODES) {
      expect(USER_MESSAGES[code].length).toBeGreaterThan(20);
      expect(USER_MESSAGES[code].length).toBeLessThan(120);
    }
  });

  it("el mensaje de JSON inválido es el acordado", () => {
    expect(USER_MESSAGES.invalid_response).toBe(
      "Estoy teniendo problemas para leer la imagen. ¿Probás de nuevo en un ratito?",
    );
  });
});
