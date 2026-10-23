import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";
export const revalidate = 0;

/**
 * Healthcheck público. No expone configuración ni datos del entorno:
 * solo confirma que la app está arriba y en qué etapa va.
 */
export function GET() {
  return NextResponse.json(
    { ok: true, app: "analia", stage: 0 },
    { headers: { "Cache-Control": "no-store" } },
  );
}
