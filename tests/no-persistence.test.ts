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

/**
 * `lib/analysis/prompt.ts` lee el system prompt de un archivo estático. Es una
 * lectura, no una escritura: se permite explícitamente y solo para ese archivo.
 */
const FS_READ_ALLOWLIST = new Set([path.join("lib", "analysis", "prompt.ts")]);

type Rule = { pattern: RegExp; reason: string; allowRead?: boolean };

const FORBIDDEN: Rule[] = [
  { pattern: /from\s+["']node:fs["']/, reason: "importa node:fs", allowRead: true },
  {
    pattern: /from\s+["']node:fs\/promises["']/,
    reason: "importa node:fs/promises",
    allowRead: true,
  },
  { pattern: /from\s+["']fs["']/, reason: "importa fs", allowRead: true },
  { pattern: /\bwriteFile\b/, reason: "usa writeFile" },
  { pattern: /\bcreateWriteStream\b/, reason: "usa createWriteStream" },
  { pattern: /\bappendFile\b/, reason: "usa appendFile" },
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
      for (const { pattern, reason, allowRead } of FORBIDDEN) {
        if (pattern.test(source) && !(allowRead && FS_READ_ALLOWLIST.has(file))) {
          offenders.push(`${file}: ${reason}`);
        }
      }
    }

    expect(offenders).toEqual([]);
  });
});
