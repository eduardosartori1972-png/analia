import { createHash, createHmac, timingSafeEqual } from "node:crypto";

/**
 * Control de acceso del piloto (ADR-013).
 *
 * El código vive solo en el servidor. El cliente lo manda una vez, el servidor lo
 * compara y devuelve una cookie firmada; sin esa cookie, el endpoint de análisis
 * responde 401. El código nunca viaja al bundle ni se guarda en el navegador.
 */

export const ACCESS_COOKIE = "analia_access";
const TOKEN_VERSION = "v1";
const TOKEN_TTL_MS = 7 * 24 * 60 * 60 * 1000; // 7 días

function configuredCode(): string | null {
  const code = process.env.ANALYZE_ACCESS_CODE?.trim();
  return code && code.length >= 6 ? code : null;
}

/** Clave del HMAC. Si no hay secreto dedicado, se usa el propio código. */
function signingSecret(): string | null {
  const secret = process.env.ANALYZE_ACCESS_SECRET?.trim();
  if (secret && secret.length >= 16) return secret;
  return configuredCode();
}

/** Sin código configurado, el acceso queda abierto (solo desarrollo). */
export function isAccessCodeConfigured(): boolean {
  return configuredCode() !== null;
}

/** Compara sin filtrar el largo ni el contenido por tiempo de respuesta. */
export function isCodeValid(input: string): boolean {
  const expected = configuredCode();
  if (!expected) return false;

  const normalize = (value: string) => value.trim().toUpperCase();
  return safeEqual(normalize(input), normalize(expected));
}

export function issueAccessToken(now = Date.now()): string | null {
  const secret = signingSecret();
  if (!secret) return null;

  const expiresAt = now + TOKEN_TTL_MS;
  return `${TOKEN_VERSION}.${expiresAt}.${signature(expiresAt, secret)}`;
}

export function verifyAccessToken(token: string | undefined, now = Date.now()): boolean {
  const secret = signingSecret();
  if (!secret || !token) return false;

  const [version, expiresRaw, provided] = token.split(".");
  if (version !== TOKEN_VERSION || !expiresRaw || !provided) return false;

  const expiresAt = Number(expiresRaw);
  if (!Number.isFinite(expiresAt) || expiresAt < now) return false;

  return safeEqual(provided, signature(expiresAt, secret));
}

function signature(expiresAt: number, secret: string): string {
  return createHmac("sha256", secret)
    .update(`analia-access:${TOKEN_VERSION}:${expiresAt}`)
    .digest("base64url");
}

function safeEqual(a: string, b: string): boolean {
  const left = createHash("sha256").update(a).digest();
  const right = createHash("sha256").update(b).digest();
  return timingSafeEqual(left, right);
}

export function readCookie(header: string | null, name: string): string | undefined {
  if (!header) return undefined;

  for (const part of header.split(";")) {
    const [key, ...rest] = part.split("=");
    if (key?.trim() === name) return decodeURIComponent(rest.join("=").trim());
  }

  return undefined;
}

export type AccessMode = "tester" | "open" | "denied";

/**
 * - `tester`: trae cookie válida. No se le aplican límites de uso.
 * - `open`: no hay código configurado (desarrollo). Se aplican los límites.
 * - `denied`: hay código configurado y la cookie falta o no es válida.
 */
export function resolveAccess(cookieHeader: string | null, now = Date.now()): AccessMode {
  if (!isAccessCodeConfigured()) return "open";

  const token = readCookie(cookieHeader, ACCESS_COOKIE);
  return verifyAccessToken(token, now) ? "tester" : "denied";
}
