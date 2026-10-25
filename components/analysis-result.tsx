import type { Analysis, Verdict } from "@/lib/analysis/contract";
import { ESCALATION_COPY } from "@/lib/safety/escalation";

/**
 * Etiqueta visible por veredicto. Nunca dice "es seguro": el veredicto más
 * tranquilizador habla de lo que no se ve y el límite lo aclara.
 */
const VERDICT_LABEL: Record<Verdict, { label: string; tone: string }> = {
  sin_señales_visibles: { label: "No veo señales de estafa", tone: "neutral" },
  señales_sospechosas: { label: "Hay señales sospechosas", tone: "suspicious" },
  altamente_probable_estafa: { label: "Parece una estafa", tone: "danger" },
  no_pude_analizar: { label: "No pude analizarla", tone: "unknown" },
};

export function AnalysisResult({ analysis }: { analysis: Analysis }) {
  const { label, tone } = VERDICT_LABEL[analysis.verdict];
  const escalation = analysis.escalation === "none" ? null : ESCALATION_COPY[analysis.escalation];

  return (
    <section className={`result result--${tone}`} aria-labelledby="resultado-titulo">
      <p className="result__verdict">{label}</p>

      <h2 id="resultado-titulo">{analysis.title}</h2>
      <p className="result__summary">{analysis.summary}</p>

      <h3>Qué veo</h3>
      <ul className="result__list">
        {analysis.reasons.map((reason, index) => (
          <li key={index}>{reason}</li>
        ))}
      </ul>

      <h3>Qué conviene hacer</h3>
      <ol className="result__list result__list--steps">
        {analysis.nextSteps.map((step, index) => (
          <li key={index}>{step}</li>
        ))}
      </ol>

      {escalation && (
        <div className="result__escalation">
          <h3>{escalation.title}</h3>
          <p>{escalation.body}</p>
        </div>
      )}

      <p className="result__limits">{analysis.limits}</p>
    </section>
  );
}
