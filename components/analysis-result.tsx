"use client";

import { useEffect, useRef } from "react";

import type { Analysis } from "@/lib/analysis/contract";
import { VERDICT_PRESENTATION, type VerdictTone } from "@/lib/analysis/presentation";
import { ESCALATION_COPY } from "@/lib/safety/escalation";

/**
 * El veredicto es lo primero y lo más grande: es la respuesta que la persona
 * vino a buscar. El título del modelo queda como subtítulo, porque varía entre
 * respuestas y no es la parte confiable.
 */

function VerdictIcon({ tone }: { tone: VerdictTone }) {
  if (tone === "neutral") {
    return (
      <svg className="result__icon" viewBox="0 0 24 24" aria-hidden="true" focusable="false">
        <circle cx="12" cy="12" r="9" />
        <path d="M8 12.4l2.6 2.6L16 9.6" />
      </svg>
    );
  }

  if (tone === "suspicious") {
    return (
      <svg className="result__icon" viewBox="0 0 24 24" aria-hidden="true" focusable="false">
        <path d="M12 3.6L21 20H3z" />
        <path d="M12 9.6v4.6" />
        <path d="M12 17.4v.2" />
      </svg>
    );
  }

  if (tone === "danger") {
    return (
      <svg className="result__icon" viewBox="0 0 24 24" aria-hidden="true" focusable="false">
        <circle cx="12" cy="12" r="9" />
        <path d="M8.6 8.6l6.8 6.8M15.4 8.6l-6.8 6.8" />
      </svg>
    );
  }

  return (
    <svg className="result__icon" viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      <circle cx="12" cy="12" r="9" />
      <path d="M9.6 9.6a2.5 2.5 0 1 1 3.3 2.4c-.6.25-.9.7-.9 1.4" />
      <path d="M12 16.8v.2" />
    </svg>
  );
}

export function AnalysisResult({ analysis }: { analysis: Analysis }) {
  const { label, tone } = VERDICT_PRESENTATION[analysis.verdict];
  const escalation = analysis.escalation === "none" ? null : ESCALATION_COPY[analysis.escalation];
  const headingRef = useRef<HTMLHeadingElement>(null);

  // El foco va al veredicto: con lector de pantalla la respuesta se anuncia sin
  // obligar a recorrer la página desde arriba.
  useEffect(() => {
    headingRef.current?.focus();
  }, []);

  return (
    <section className={`result result--${tone}`} aria-labelledby="resultado-titulo">
      <h2 id="resultado-titulo" ref={headingRef} tabIndex={-1} className="result__verdict">
        <VerdictIcon tone={tone} />
        <span>{label}</span>
      </h2>

      <p className="result__title">{analysis.title}</p>
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
