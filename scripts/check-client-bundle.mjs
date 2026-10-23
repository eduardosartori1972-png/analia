#!/usr/bin/env node
/**
 * Chequeo de CI: ninguna clave (ni su nombre) puede terminar en el bundle que se
 * sirve al navegador.
 *
 * Qué busca:
 *  - nombres de variables sensibles (API_KEY, SECRET, TOKEN, PASSWORD, …);
 *  - valores de esas variables si están presentes en el entorno del build.
 *
 * Qué NO es: un reemplazo de una revisión de seguridad. Es una red de seguridad
 * barata para el error más común.
 */
import { existsSync } from "node:fs";
import { readFile, readdir } from "node:fs/promises";
import path from "node:path";

const STATIC_DIR = path.resolve(".next/static");
const SENSITIVE_NAME = /(API_?KEY|SECRET|TOKEN|PASSWORD|PRIVATE_KEY|SERVICE_ROLE)/i;
const PUBLIC_PREFIX = "NEXT_PUBLIC_";

/** Nombres que siempre revisamos, aunque no estén en el entorno del build. */
const ALWAYS_CHECK = [
  "ANALYZE_API_KEY",
  "SUPABASE_SERVICE_ROLE_KEY",
  "SUPABASE_JWT_SECRET",
  "PROVIDER_API_KEY",
];

function collectSuspects() {
  const suspects = new Set(ALWAYS_CHECK);

  for (const [name, value] of Object.entries(process.env)) {
    if (name.startsWith(PUBLIC_PREFIX)) continue;
    if (!SENSITIVE_NAME.test(name)) continue;
    // Los valores muy cortos generan falsos positivos en el minificado.
    if (typeof value === "string" && value.length >= 12) suspects.add(value);
  }

  return [...suspects];
}

async function* walk(dir) {
  const entries = await readdir(dir, { withFileTypes: true });
  for (const entry of entries) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      yield* walk(full);
    } else if (entry.isFile() && entry.name.endsWith(".js")) {
      yield full;
    }
  }
}

async function main() {
  if (!existsSync(STATIC_DIR)) {
    console.error(
      `[check:client-bundle] No existe ${path.relative(process.cwd(), STATIC_DIR)}. Corré "pnpm build" primero.`,
    );
    process.exit(1);
  }

  const suspects = collectSuspects();
  const findings = [];
  let scanned = 0;

  for await (const file of walk(STATIC_DIR)) {
    scanned += 1;
    const contents = await readFile(file, "utf8");
    for (const suspect of suspects) {
      if (contents.includes(suspect)) {
        findings.push({ file: path.relative(process.cwd(), file), suspect });
      }
    }
  }

  if (findings.length > 0) {
    console.error("[check:client-bundle] Posible fuga en el bundle del cliente:");
    for (const { file, suspect } of findings) {
      // No se imprime el valor completo: solo lo suficiente para ubicarlo.
      const shown = suspect.length > 40 ? `${suspect.slice(0, 6)}…` : suspect;
      console.error(`  - ${file} contiene "${shown}"`);
    }
    process.exit(1);
  }

  console.log(
    `[check:client-bundle] OK: ${scanned} archivos revisados, ${suspects.length} patrones, 0 coincidencias.`,
  );
}

await main();
