import type { NextConfig } from "next";

/**
 * Cabeceras de seguridad base. La CSP no está acá: se genera por request con un
 * nonce en `middleware.ts` (ADR-011), porque Next inyecta scripts inline.
 */
const securityHeaders = [
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Cross-Origin-Opener-Policy", value: "same-origin" },
  {
    key: "Permissions-Policy",
    value: "camera=(self), microphone=(), geolocation=(), payment=()",
  },
];

const nextConfig: NextConfig = {
  poweredByHeader: false,
  reactStrictMode: true,
  // Solo desarrollo. El celular entra por la IP de la LAN y Next bloquea los
  // recursos de dev (HMR incluido) si el origen no está en esta lista.
  allowedDevOrigins: ["192.168.1.103"],
  // Turbopack y la recolección de datos de páginas usan workers. Con
  // `workerThreads` corren como hilos del mismo proceso en lugar de forks:
  // el resultado es el mismo y funciona también en entornos donde abrir
  // procesos hijos está restringido. Verificado con Next 16.4.3.
  experimental: { workerThreads: true },
  // El system prompt se lee del disco en tiempo de ejecución. Hay que decirle a
  // Next que lo incluya en el bundle de la función.
  outputFileTracingIncludes: {
    "/api/analyze": ["./prompts/**/*.md"],
  },
  // El chequeo de tipos corre en CI como paso propio (`pnpm typecheck`) y en el
  // script `verify`. Acá se desactiva para no duplicarlo en cada build.
  typescript: { ignoreBuildErrors: true },
  async headers() {
    return [{ source: "/(.*)", headers: securityHeaders }];
  },
};

export default nextConfig;
