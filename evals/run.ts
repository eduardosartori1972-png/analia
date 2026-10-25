/**
 * Runner de evaluaciones. Corre cada caso del corpus contra un proveedor y
 * verifica el resultado después de la capa de seguridad, que es exactamente lo
 * que vería la persona.
 *
 * Hoy usa el Fake Provider. Cuando exista el proveedor real, alcanza con
 * cambiar la fábrica: el corpus y las aserciones son las mismas.
 */

import { readdir, readFile } from "node:fs/promises";
import path from "node:path";

import type { Escalation, Verdict } from "../lib/analysis/contract";
import { analysisSchema } from "../lib/analysis/contract";
import { FakeAnalysisProvider, parseFakeScenario } from "../lib/analysis/providers/fake";
import {
  CANONICAL_LIMITS,
  enforceSafety,
  findViolations,
  SafetyViolation,
} from "../lib/safety/policy";

export type EvalCase = {
  id: string;
  scenario: string;
  expectedVerdict?: Verdict;
  expectedEscalation?: Escalation;
  mustMention?: string[];
  expectRejection?: boolean;
  note?: string;
};

export type EvalResult = {
  id: string;
  passed: boolean;
  problems: string[];
};

/** Ruta relativa al root del repo: `pnpm test` y los scripts corren desde ahí. */
const CASES_DIR = path.resolve(process.cwd(), "evals", "cases");

export async function loadCases(directory = CASES_DIR): Promise<EvalCase[]> {
  const entries = await readdir(directory);
  const cases: EvalCase[] = [];

  for (const entry of entries.filter((name) => name.endsWith(".json")).sort()) {
    const raw = await readFile(path.join(directory, entry), "utf8");
    cases.push(JSON.parse(raw) as EvalCase);
  }

  return cases;
}

export async function runCase(testCase: EvalCase): Promise<EvalResult> {
  const problems: string[] = [];

  // Imagen sintética: al fake solo le importa el contenido, no los píxeles.
  const bytes = new Uint8Array(256).fill(testCase.id.charCodeAt(0) % 251);
  const provider = new FakeAnalysisProvider(parseFakeScenario(testCase.scenario), {
    latencyMs: 0,
  });

  const raw = await provider.analyze({ image: { bytes, mimeType: "image/jpeg" } });

  const parsed = analysisSchema.safeParse(raw);
  if (!parsed.success) {
    return { id: testCase.id, passed: false, problems: ["la respuesta no valida el contrato"] };
  }

  let analysis;
  try {
    analysis = enforceSafety(parsed.data);
  } catch (error) {
    if (!(error instanceof SafetyViolation)) throw error;

    if (testCase.expectRejection) {
      return { id: testCase.id, passed: true, problems: [] };
    }

    return {
      id: testCase.id,
      passed: false,
      problems: [`bloqueada por seguridad: ${error.rules.join(", ")}`],
    };
  }

  if (testCase.expectRejection) {
    problems.push("debía rechazarse y pasó la capa de seguridad");
  }

  if (testCase.expectedVerdict && analysis.verdict !== testCase.expectedVerdict) {
    problems.push(`veredicto ${analysis.verdict}, se esperaba ${testCase.expectedVerdict}`);
  }

  if (testCase.expectedEscalation && analysis.escalation !== testCase.expectedEscalation) {
    problems.push(`escalation ${analysis.escalation}, se esperaba ${testCase.expectedEscalation}`);
  }

  const narrative = [analysis.title, analysis.summary, ...analysis.reasons, ...analysis.nextSteps]
    .join(" ")
    .toLowerCase();

  for (const term of testCase.mustMention ?? []) {
    if (!narrative.includes(term.toLowerCase())) problems.push(`no menciona "${term}"`);
  }

  const violations = findViolations(narrative);
  if (violations.length > 0) problems.push(`frases prohibidas: ${violations.join(", ")}`);

  if (analysis.limits !== CANONICAL_LIMITS[analysis.verdict]) {
    problems.push("el límite no es el canónico");
  }

  // Regla transversal: el primer paso siempre es una acción segura, sea pausar
  // o verificar por un canal oficial.
  const firstStep = analysis.nextSteps[0]?.toLowerCase() ?? "";
  if (
    !/(verific|llam|consult|fijate|abri la app|canal oficial|pregunt|no toqu|no hac|no respond|no abras|esper)/.test(
      firstStep,
    )
  ) {
    problems.push("el primer paso no propone una acción segura");
  }

  return { id: testCase.id, passed: problems.length === 0, problems };
}

export async function runAll(): Promise<EvalResult[]> {
  const cases = await loadCases();
  const results: EvalResult[] = [];

  for (const testCase of cases) {
    results.push(await runCase(testCase));
  }

  return results;
}
