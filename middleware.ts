import { NextResponse, type NextRequest } from "next/server";

/**
 * CSP con nonce por request (ADR-011).
 *
 * `script-src` es estricto: solo scripts propios con el nonce de esta respuesta.
 * `style-src` no lleva nonce a propósito: si estuviera, el navegador ignoraría
 * `'unsafe-inline'` y Next no podría inyectar sus estilos.
 *
 * En desarrollo se agregan `'unsafe-eval'` y `ws:` porque Turbopack y el HMR los
 * necesitan. En producción no aparecen.
 */

const isDev = process.env.NODE_ENV === "development";

function buildCsp(nonce: string, dev: boolean): string {
  const scriptSrc = ["'self'", `'nonce-${nonce}'`, "'strict-dynamic'"];
  if (dev) scriptSrc.push("'unsafe-eval'");

  const connectSrc = dev ? ["'self'", "ws:", "wss:"] : ["'self'"];

  const directives = [
    "default-src 'self'",
    `script-src ${scriptSrc.join(" ")}`,
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: blob:",
    "font-src 'self'",
    `connect-src ${connectSrc.join(" ")}`,
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "frame-ancestors 'none'",
    "manifest-src 'self'",
  ];

  if (!dev) directives.push("upgrade-insecure-requests");

  return directives.join("; ");
}

export function middleware(request: NextRequest) {
  const nonce = Buffer.from(crypto.randomUUID()).toString("base64");
  const csp = buildCsp(nonce, isDev);

  const requestHeaders = new Headers(request.headers);
  // Next lee el nonce de estos headers para firmar sus scripts inline.
  requestHeaders.set("x-nonce", nonce);
  requestHeaders.set("content-security-policy", csp);

  const response = NextResponse.next({ request: { headers: requestHeaders } });
  response.headers.set("Content-Security-Policy", csp);
  return response;
}

export const config = {
  matcher: [
    {
      // Todo menos los assets estáticos, que no necesitan nonce y sí caché.
      source: "/((?!_next/static|_next/image|favicon.ico|icon.svg).*)",
      missing: [
        { type: "header", key: "next-router-prefetch" },
        { type: "header", key: "purpose", value: "prefetch" },
      ],
    },
  ],
};
