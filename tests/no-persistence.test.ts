import { readFile, readdir } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

/**
 * Guarda de regresión de ADR-001: el camino por el que pasa la imagen no puede
 * importar herramientas de persistencia. No prueba que no haya escrituras en
 * tiempo de ejecución (eso lo cubre la revisión), pero sí que nadie agregue un
 * `writeFile` o un cliente de base sin que este test lo note.
 */

const ROOT = fileURLToPath(new URL("../", import.meta.url));

const FORBIDDEN: Array<{ pattern: RegExp; reason: string }> = [
  { pattern: /from\s+["']node:fs["']/, reason: "importa node:fs" },
  { pattern: /from\s+["']node:fs\/promises["']/, reason: "importa node:fs/promises" },
  { pattern: /from\s+["']fs["']/, reason: "importa fs" },
  { pattern: /\bwriteFile\b/, reason: "usa writeFile" },
  { pattern: /\bcreateWriteStream\b/, reason: "usa createWriteStream" },
  { pattern: /@supabase\//, reason: "importa Supabase" },
  { pattern: /better-sqlite3|from\s+["']pg["']|@prisma\//, reason: "importa una base de datos" },
];

async function collect(directory: string): Promise<string[]> {
  const absolute = path.join(ROOT, directory);
  const entries = await readdir(absolute, { withFileTypes: true });
  const files: string[] = [];

  for (const entry of entries) {
    const relative = path.join(directory, entry.name);
    if (entry.isDirectory()) files.push(...(await collect(relative)));
    else if (entry.name.endsWith(".ts") || entry.name.endsWith(".tsx")) files.push(relative);
  }

  return files;
}

describe("camino de la imagen", () => {
  it("no importa herramientas de persistencia", async () => {
    const files = [...(await collect("app/api/analyze")), ...(await collect("lib/analysis"))];
    const offenders: string[] = [];

    expect(files.length).toBeGreaterThan(5);

    for (const file of files) {
      const source = await readFile(path.join(ROOT, file), "utf8");
      for (const { pattern, reason } of FORBIDDEN) {
        if (pattern.test(source)) offenders.push(`${file}: ${reason}`);
      }
    }

    expect(offenders).toEqual([]);
  });
});
