import type { Verdict } from "./contract";

/**
 * Presentación del veredicto. Separado del componente para poder testearlo y
 * para que la etiqueta visible no dependa del texto que escribe el modelo.
 *
 * Regla: ninguna etiqueta puede prometer seguridad.
 */

export type VerdictTone = "neutral" | "suspicious" | "danger" | "unknown";

export type VerdictPresentation = {
  label: string;
  tone: VerdictTone;
};

export const VERDICT_PRESENTATION: Record<Verdict, VerdictPresentation> = {
  sin_señales_visibles: { label: "No veo señales de estafa", tone: "neutral" },
  señales_sospechosas: { label: "Hay señales sospechosas", tone: "suspicious" },
  altamente_probable_estafa: { label: "Parece una estafa", tone: "danger" },
  no_pude_analizar: { label: "No pude analizarla", tone: "unknown" },
};
