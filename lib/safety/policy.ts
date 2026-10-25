import type { Analysis, Escalation, Verdict } from "../analysis/contract";

/**
 * Capa de seguridad posterior al modelo (ADR-004). El proveedor propone; acá se
 * decide qué se muestra.
 *
 * Dos garantías:
 * 1. El texto del límite no lo escribe el modelo: se reemplaza por una frase
 *    canónica según el veredicto. Así ninguna respuesta puede quedar sin el
 *    "esto no es una garantía".
 * 2. Si el texto narrativo contiene una promesa absoluta o una instrucción de
 *    clic, la respuesta se descarta entera. No reescribimos: preferimos no
 *    mostrar nada antes que mostrar algo que empuja a la persona a un riesgo.
 */

export class SafetyViolation extends Error {
  readonly rules: string[];

  constructor(rules: string[]) {
    super(`Respuesta bloqueada por seguridad: ${rules.join(", ")}`);
    this.name = "SafetyViolation";
    this.rules = rules;
  }
}

/** Frase de cierre obligatoria, una por veredicto. */
export const CANONICAL_LIMITS: Record<Verdict, string> = {
  sin_señales_visibles:
    "No veo señales de estafa en esta captura, pero eso no confirma que el mensaje sea legítimo. Es una orientación, no una garantía.",
  señales_sospechosas:
    "No puedo confirmar que sea una estafa, pero tampoco que sea seguro. Verificá siempre por el canal oficial.",
  altamente_probable_estafa:
    "No puedo confirmar quién envió el mensaje desde una captura, pero las señales son claras: no lo uses.",
  no_pude_analizar:
    "Con lo que se ve en la captura no puedo darte una respuesta mejor. Verificá por un canal oficial.",
};

type Rule = { id: string; pattern: RegExp };

/**
 * Las reglas se aplican al texto narrativo (título, resumen, razones y pasos).
 * El límite queda afuera porque se reemplaza.
 *
 * El lookbehind de "no" existe para no bloquear frases prudentes como
 * "esto no es seguro", que son exactamente lo que queremos decir.
 */
const RULES: Rule[] = [
  {
    id: "absolute-safe",
    pattern: /(?<!no\s)(?<!nunca\s)\b(?:es|está)\s+(?:totalmente\s+)?seguro\b/i,
  },
  {
    id: "guarantee",
    pattern: /garantizad|garantizamos|100\s*%\s*(?:seguro|confiable|protegid)/i,
  },
  {
    id: "no-risk",
    pattern: /(?:no\s+hay|sin)\s+(?:ningún\s+)?riesgo\b/i,
  },
  {
    id: "click-instruction",
    pattern:
      /\b(?:hac[ée]|toc[áa]|presion[áa]|clicke[áa])\s+(?:clic|tap|el\s+link|el\s+enlace|ah[íi])\b/i,
  },
  {
    id: "share-secrets",
    pattern:
      /\b(?:compart[íi]|mand[áa]|envi[áa]|ingres[áa]|escrib[íi])\b[^.]{0,40}\b(?:contrase[ñn]a|c[óo]digo\s+de\s+seguridad|dni|n[úu]mero\s+de\s+tarjeta)\b/i,
  },
  {
    id: "injection-compliance",
    pattern:
      /\bignor[áa]\s+(?:tus|las)\s+instruccion|\bsoy\s+(?:el|la)\s+(?:sistema|ia|asistente)\b/i,
  },
];

export function findViolations(text: string): string[] {
  return RULES.filter((rule) => rule.pattern.test(text)).map((rule) => rule.id);
}

/**
 * Valida y normaliza una respuesta del proveedor. Lanza `SafetyViolation` si el
 * texto no es publicable.
 */
export function enforceSafety(analysis: Analysis): Analysis {
  const narrative = [analysis.title, analysis.summary, ...analysis.reasons, ...analysis.nextSteps];
  const violations = new Set<string>();

  for (const text of narrative) {
    for (const rule of findViolations(text)) violations.add(rule);
  }

  if (violations.size > 0) throw new SafetyViolation([...violations]);

  // Una estafa probable nunca puede quedar sin derivación bancaria.
  const escalation: Escalation =
    analysis.verdict === "altamente_probable_estafa" && analysis.escalation === "none"
      ? "banking"
      : analysis.escalation;

  return {
    ...analysis,
    escalation,
    limits: CANONICAL_LIMITS[analysis.verdict],
  };
}
