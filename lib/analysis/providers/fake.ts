/**
 * Proveedor simulado. Permite construir y probar todo el flujo sin clave, sin
 * costo y sin decidir proveedor (ADR-004).
 *
 * Escenarios:
 * - `auto` (default): elige un caso según el tamaño de la imagen, para que
 *   distintas capturas produzcan respuestas distintas sin azar.
 * - `legitimo`, `sospechoso`, `ambiguo`: fuerzan un caso.
 * - `error`: simula una caída del proveedor.
 */

import type { Analysis } from "../contract";
import { AnalysisError } from "../errors";
import type { AnalysisInput, AnalysisProvider } from "../provider";

export const FAKE_SCENARIOS = ["auto", "legitimo", "sospechoso", "ambiguo", "error"] as const;
export type FakeScenario = (typeof FAKE_SCENARIOS)[number];

export function parseFakeScenario(value: string | undefined): FakeScenario {
  const normalized = value?.trim().toLowerCase();
  return FAKE_SCENARIOS.find((scenario) => scenario === normalized) ?? "auto";
}

const CASES = ["legitimo", "sospechoso", "ambiguo"] as const;
type CaseId = (typeof CASES)[number];

const FIXTURES: Record<CaseId, Analysis> = {
  legitimo: {
    verdict: "sin_señales_visibles",
    title: "No veo señales de estafa",
    summary:
      "Es un mensaje corto, sin links ni pedidos de datos. Aun así, desde una captura no puedo confirmar quién lo envió.",
    reasons: [
      "No pide contraseñas, códigos ni datos de tarjetas.",
      "No hay links ni números a los que llamar.",
      "No mete apuro ni amenaza con bloquear algo.",
    ],
    nextSteps: [
      "Si te quedás con duda, llamá al banco por el número que figura en tu tarjeta, no por el de este mensaje.",
      "No compartas códigos que te lleguen por mensaje, ni siquiera con alguien que diga ser del banco.",
    ],
    limits:
      "Esto es una orientación, no una garantía: no puedo confirmar que el mensaje sea legítimo.",
    escalation: "none",
    hardData: { urls: [], phones: [], senders: [] },
  },
  sospechoso: {
    verdict: "señales_sospechosas",
    title: "Hay señales sospechosas",
    summary:
      "El mensaje pide entrar a un link para “verificar” la cuenta y apura con una amenaza. Así funcionan muchas estafas.",
    reasons: [
      "Pide entrar a un link para verificar datos de la cuenta.",
      "Da un plazo muy corto y amenaza con bloquear el servicio.",
      "El remitente no coincide con el canal oficial del banco.",
    ],
    nextSteps: [
      "No toques el link.",
      "Abrí la app del banco por tu cuenta y fijate si hay algún aviso pendiente.",
      "Si querés confirmar, llamá al número que figura en tu tarjeta.",
    ],
    limits:
      "No puedo confirmar que sea una estafa, pero tampoco que sea seguro. La decisión de verificar por otro canal sigue siendo tuya.",
    escalation: "banking",
    hardData: { urls: [], phones: [], senders: [] },
  },
  ambiguo: {
    verdict: "no_pude_analizar",
    title: "No tengo suficiente información",
    summary:
      "En la captura se lee un mensaje, pero no se ve quién lo envía ni a dónde lleva el link. Con eso no puedo orientarte bien.",
    reasons: [
      "No se ve el número ni la dirección del remitente.",
      "El texto menciona un trámite que no puedo verificar con lo que se ve.",
    ],
    nextSteps: [
      "Antes de hacer nada, verificá por el canal oficial que vos conozcas.",
      "Si podés, mandá una captura donde se vea el remitente completo.",
    ],
    limits: "Con lo que veo no puedo darte una respuesta más precisa.",
    escalation: "none",
    hardData: { urls: [], phones: [], senders: [] },
  },
};

export class FakeAnalysisProvider implements AnalysisProvider {
  readonly name = "fake";

  constructor(
    private readonly scenario: FakeScenario = "auto",
    private readonly options: { latencyMs?: number } = {},
  ) {}

  async analyze(input: AnalysisInput): Promise<Analysis> {
    // Latencia simulada, estable para el mismo tamaño de archivo.
    const latency = this.options.latencyMs ?? 300 + (input.image.bytes.length % 500);
    if (latency > 0) await new Promise((resolve) => setTimeout(resolve, latency));

    if (this.scenario === "error") {
      throw new AnalysisError("provider_error", "El proveedor de análisis no está disponible.");
    }

    const caseId: CaseId =
      this.scenario === "auto"
        ? (CASES[input.image.bytes.length % CASES.length] ?? "sospechoso")
        : this.scenario;

    return structuredClone(FIXTURES[caseId]);
  }
}
