import { z } from "zod";

/**
 * Contrato del análisis. Es la frontera entre el proveedor de visión y el resto
 * del producto: ningún proveedor puede devolver algo que no valide este schema,
 * y la UI solo consume este tipo.
 *
 * La taxonomía es deliberadamente no binaria (ADR-001 y principio rector): no
 * existe "es seguro", existe "no veo señales" con un límite explícito.
 */

export const VERDICTS = [
  "sin_señales_visibles",
  "señales_sospechosas",
  "altamente_probable_estafa",
  "no_pude_analizar",
] as const;

export const ESCALATIONS = ["none", "banking", "already-clicked"] as const;

/**
 * Los máximos son topes de cordura, no de tipografía: el prompt pide textos más
 * cortos, pero una respuesta buena no se rechaza porque el resumen tenga veinte
 * caracteres de más. La UI sabe envolver.
 */
export const analysisSchema = z.object({
  verdict: z.enum(VERDICTS),
  /** Titular corto, en segunda persona y sin jerga. */
  title: z.string().min(4).max(100),
  /** Una o dos frases que resumen qué se ve. */
  summary: z.string().min(10).max(600),
  /** Qué veo: 1 a 4 observaciones concretas. */
  reasons: z.array(z.string().min(4).max(240)).min(1).max(4),
  /** Qué conviene hacer: 1 a 3 pasos, el primero siempre es verificar. */
  nextSteps: z.array(z.string().min(4).max(240)).min(1).max(3),
  /**
   * Frase de cierre. El modelo puede omitirla: la escribe el sistema con
   * `CANONICAL_LIMITS` y nunca se muestra la del modelo. Si viene, se descarta.
   */
  limits: z.string().max(400).default(""),
  // Si el modelo omite estos dos, se completan con el valor seguro. La capa de
  // seguridad vuelve a forzar `banking` en una estafa probable.
  escalation: z.enum(ESCALATIONS).default("none"),
  /** Datos duros detectados. Se completa en la Etapa 4. */
  hardData: z
    .object({
      urls: z.array(z.string().max(300)).max(5),
      phones: z.array(z.string().max(40)).max(5),
      senders: z.array(z.string().max(120)).max(5),
    })
    .default({ urls: [], phones: [], senders: [] }),
});

export type Analysis = z.infer<typeof analysisSchema>;
export type Verdict = (typeof VERDICTS)[number];
export type Escalation = (typeof ESCALATIONS)[number];

export const analysisResponseSchema = z.object({
  analysis: analysisSchema,
  requestId: z.string().min(1),
});

export type AnalysisResponse = z.infer<typeof analysisResponseSchema>;
