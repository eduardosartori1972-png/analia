import { NextResponse } from "next/server";

import {
  ACCESS_COOKIE,
  isAccessCodeConfigured,
  isCodeValid,
  issueAccessToken,
  resolveAccess,
} from "@/lib/access/session";
import { createRateLimiter } from "@/lib/analysis/rate-limit";
import { clientIp } from "@/lib/request/ip";

/**
 * Puerta de acceso del piloto. Valida el código contra la variable de entorno y
 * devuelve una cookie firmada (HttpOnly). El código no se guarda en el cliente.
 */

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const ATTEMPT_WINDOW_MS = 10 * 60_000;
const COOKIE_MAX_AGE_SECONDS = 7 * 24 * 60 * 60;
const NO_STORE = { "Cache-Control": "no-store" };

const attempts = createRateLimiter({ limit: 10, windowMs: ATTEMPT_WINDOW_MS });

export async function GET(request: Request) {
  const mode = resolveAccess(request.headers.get("cookie"));

  return NextResponse.json(
    { granted: mode !== "denied", open: mode === "open" },
    { headers: NO_STORE },
  );
}

export async function POST(request: Request) {
  const decision = attempts(clientIp(request));
  if (!decision.allowed) {
    return NextResponse.json(
      {
        error: { message: "Hubo varios intentos seguidos. Esperá unos minutos y volvé a probar." },
      },
      {
        status: 429,
        headers: { ...NO_STORE, "Retry-After": String(decision.retryAfterSeconds) },
      },
    );
  }

  // Sin código configurado (desarrollo) el acceso queda abierto.
  if (!isAccessCodeConfigured()) {
    return NextResponse.json({ granted: true, open: true }, { headers: NO_STORE });
  }

  let payload: unknown = null;
  try {
    payload = await request.json();
  } catch {
    payload = null;
  }

  const code =
    typeof (payload as { code?: unknown } | null)?.code === "string"
      ? (payload as { code: string }).code
      : "";

  if (!isCodeValid(code)) {
    // Mismo mensaje para código vacío, corto o incorrecto: no se filtra nada.
    return NextResponse.json(
      {
        error: { message: "Ese código no es válido. Revisalo o pedile el tuyo a quien te invitó." },
      },
      { status: 401, headers: NO_STORE },
    );
  }

  const token = issueAccessToken();
  if (!token) {
    console.error("[access] no se pudo firmar la sesión: falta configuración");
    return NextResponse.json(
      { error: { message: "No pudimos habilitar el acceso. Probá de nuevo en un rato." } },
      { status: 500, headers: NO_STORE },
    );
  }

  const response = NextResponse.json({ granted: true }, { headers: NO_STORE });
  response.cookies.set({
    name: ACCESS_COOKIE,
    value: token,
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: COOKIE_MAX_AGE_SECONDS,
  });

  return response;
}
