/**
 * Runner de evaluaciones. Corre cada caso del corpus contra un proveedor y
 * verifica el resultado después de la capa de seguridad, que es exactamente lo
 * que vería la persona.
 *
 * Dos modos:
 * - Por defecto: Fake Provider, un escenario por caso. Sirve en CI, sin red.
 * - Real: `runAll({ provider })` con el proveedor configurado. Cada caso usa su
 *   captura sintética.
 */

import { readdir, readFile } from "node:fs/promises";
import path from "node:path";

import type { Escalation, Verdict } from "../lib/analysis/contract";
import { analysisSchema } from "../lib/analysis/contract";
import type { AnalysisProvider } from "../lib/analysis/provider";
import { FakeAnalysisProvider, parseFakeScenario } from "../lib/analysis/providers/fake";
import {
  CANONICAL_LIMITS,
  enforceSafety,
  findViolations,
  SafetyViolation,
} from "../lib/safety/policy";

export type EvalCase = {
  id: string;
  /** Escenario del Fake Provider que representa este caso. */
  scenario: string;
  /** Veredictos aceptables con un proveedor real. */
  expectedVerdicts?: Verdict[];
  expectedEscalation?: Escalation;
  /** Veredictos que nunca deberían aparecer en este caso. */
  mustNotBeVerdicts?: Verdict[];
  /** Un bloqueo de la capa de seguridad cuenta como resultado correcto. */
  expectRejection?: boolean;
  mustMention?: string[];
  note?: string;
};

export type EvalResult = {
  id: string;
  passed: boolean;
  verdict?: string;
  ms?: number;
  problems: string[];
};

const CASES_DIR = path.resolve(process.cwd(), "evals", "cases");

export async function loadCases(directory = CASES_DIR): Promise<EvalCase[]> {
  const entries = await readdir(directory, { withFileTypes: true });
  const cases: EvalCase[] = [];

  for (const entry of entries
    .filter((item) => item.isDirectory())
    .sort((a, b) => a.name.localeCompare(b.name))) {
    const file = path.join(directory, entry.name, "case.json");
    const raw = await readFile(file, "utf8");
    cases.push(JSON.parse(raw) as EvalCase);
  }

  return cases;
}

async function loadCapture(testCase: EvalCase): Promise<Uint8Array> {
  try {
    const buffer = await readFile(path.join(CASES_DIR, testCase.id, "capture.png"));
    return new Uint8Array(buffer);
  } catch {
    // Sin captura: se usa un contenido sintético. Al fake no le importa.
    return new Uint8Array(256).fill(testCase.id.charCodeAt(0) % 251);
  }
}

export async function runCase(testCase: EvalCase, provider: AnalysisProvider): Promise<EvalResult> {
  const problems: string[] = [];
  const started = performance.now();
  const bytes = await loadCapture(testCase);
  const mimeType = bytes.length > 256 ? "image/png" : "image/jpeg";

  const raw = await provider.analyze({ image: { bytes, mimeType } });
  const ms = Math.round(performance.now() - started);

  const parsed = analysisSchema.safeParse(raw);
  if (!parsed.success) {
    return { id: testCase.id, passed: false, ms, problems: ["la respuesta no valida el contrato"] };
  }

  let analysis;
  try {
    analysis = enforceSafety(parsed.data);
  } catch (error) {
    if (!(error instanceof SafetyViolation)) throw error;

    if (testCase.expectRejection) {
      return { id: testCase.id, passed: true, verdict: "bloqueada", ms, problems: [] };
    }

    return {
      id: testCase.id,
      passed: false,
      ms,
      problems: [`bloqueada por seguridad: ${error.rules.join(", ")}`],
    };
  }

  if (testCase.expectedVerdicts && !testCase.expectedVerdicts.includes(analysis.verdict)) {
    problems.push(
      `veredicto ${analysis.verdict}, se esperaba ${testCase.expectedVerdicts.join(" o ")}`,
    );
  }

  if (testCase.mustNotBeVerdicts?.includes(analysis.verdict)) {
    problems.push(`veredicto ${analysis.verdict}, que este caso no admite`);
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

  return {
    id: testCase.id,
    passed: problems.length === 0,
    verdict: analysis.verdict,
    ms,
    problems,
  };
}

export async function runAll(options: { provider?: AnalysisProvider } = {}): Promise<EvalResult[]> {
  const cases = await loadCases();
  const results: EvalResult[] = [];

  for (const testCase of cases) {
    const provider =
      options.provider ??
      new FakeAnalysisProvider(parseFakeScenario(testCase.scenario), { latencyMs: 0 });

    results.push(await runCase(testCase, provider));
  }

  return results;
}
