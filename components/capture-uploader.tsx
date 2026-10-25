"use client";

import { useCallback, useEffect, useRef, useState, type ChangeEvent } from "react";

import { AnalysisResult } from "@/components/analysis-result";
import { AnalysisClientError, requestAnalysis } from "@/lib/analysis/client";
import type { Analysis } from "@/lib/analysis/contract";
import { formatBytes } from "@/lib/image/geometry";
import { ImageError, prepareImage, type PreparedImage } from "@/lib/image/preprocess";

type Capture = { prepared: PreparedImage; previewUrl: string };

type AnalysisState =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "done"; analysis: Analysis }
  | { status: "error"; message: string };

/**
 * Flujo completo de la captura: elegir, comprimir, previsualizar y analizar.
 * Un solo botón primario en cada paso; el resto es secundario.
 */
export function CaptureUploader() {
  const [preparing, setPreparing] = useState(false);
  const [capture, setCapture] = useState<Capture | null>(null);
  const [captureError, setCaptureError] = useState<string | null>(null);
  const [analysis, setAnalysis] = useState<AnalysisState>({ status: "idle" });

  const inputRef = useRef<HTMLInputElement>(null);
  const objectUrlRef = useRef<string | null>(null);
  const captureRequestRef = useRef(0);
  const analysisRequestRef = useRef(0);

  const releaseUrl = useCallback(() => {
    if (objectUrlRef.current) {
      URL.revokeObjectURL(objectUrlRef.current);
      objectUrlRef.current = null;
    }
  }, []);

  useEffect(() => releaseUrl, [releaseUrl]);

  const openPicker = useCallback(() => {
    inputRef.current?.click();
  }, []);

  async function handleChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;

    const request = ++captureRequestRef.current;
    setPreparing(true);
    setCaptureError(null);

    try {
      const prepared = await prepareImage(file);
      if (request !== captureRequestRef.current) return;

      analysisRequestRef.current += 1; // descarta un análisis en curso
      releaseUrl();
      const previewUrl = URL.createObjectURL(prepared.blob);
      objectUrlRef.current = previewUrl;

      setCapture({ prepared, previewUrl });
      setAnalysis({ status: "idle" });
    } catch (error) {
      if (request !== captureRequestRef.current) return;
      setCapture(null);
      setCaptureError(
        error instanceof ImageError
          ? error.message
          : "No pudimos preparar la imagen. Probá de nuevo.",
      );
    } finally {
      if (request === captureRequestRef.current) setPreparing(false);
    }
  }

  async function analyze() {
    if (!capture) return;

    const request = ++analysisRequestRef.current;
    setAnalysis({ status: "loading" });

    try {
      const { analysis: result } = await requestAnalysis(capture.prepared.blob);
      if (request !== analysisRequestRef.current) return;
      setAnalysis({ status: "done", analysis: result });
    } catch (error) {
      if (request !== analysisRequestRef.current) return;
      setAnalysis({
        status: "error",
        message:
          error instanceof AnalysisClientError
            ? error.message
            : "No pudimos analizar la imagen. Probá de nuevo en un rato.",
      });
    }
  }

  function remove() {
    captureRequestRef.current += 1;
    analysisRequestRef.current += 1;
    releaseUrl();
    setCapture(null);
    setCaptureError(null);
    setPreparing(false);
    setAnalysis({ status: "idle" });
  }

  const liveMessage = preparing
    ? "Preparando la imagen."
    : analysis.status === "loading"
      ? "Analizando la imagen."
      : analysis.status === "done"
        ? "Análisis listo."
        : analysis.status === "error"
          ? "No pudimos analizar la imagen."
          : capture
            ? "Imagen lista para analizar."
            : "";

  return (
    <section className="uploader" aria-label="Subir una captura">
      <input ref={inputRef} type="file" accept="image/*" onChange={handleChange} hidden />

      {/* Región viva permanente: el botón cambia de estado y el foco vuelve al
          body, así que el cambio se anuncia acá. */}
      <p className="sr-only" role="status">
        {liveMessage}
      </p>

      {preparing && (
        <>
          <button type="button" className="button" disabled aria-busy="true">
            <span className="spinner" aria-hidden="true" />
            Preparando la imagen…
          </button>
          <p className="hint">Estamos achicando la imagen para que ocupe menos espacio.</p>
        </>
      )}

      {!preparing && !capture && (
        <>
          {captureError && (
            <p className="uploader__error" role="alert">
              {captureError}
            </p>
          )}
          <button type="button" className="button" onClick={openPicker}>
            {captureError ? "Elegir otra imagen" : "Subir una captura"}
          </button>
          <p className="hint">
            Podés sacar una foto en el momento o elegir una que ya tengas guardada.
          </p>
        </>
      )}

      {!preparing && capture && (
        <>
          <figure className="preview">
            {/* Blob local: no pasa por el optimizador ni por un CDN (ADR-007). */}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              className="preview__image"
              src={capture.previewUrl}
              alt="Vista previa de la captura que elegiste"
            />
            <figcaption className="preview__meta">
              {capture.prepared.width} × {capture.prepared.height} px ·{" "}
              {formatBytes(capture.prepared.blob.size)}
            </figcaption>
          </figure>

          {analysis.status === "idle" && (
            <div className="uploader__actions">
              <button type="button" className="button" onClick={analyze}>
                Analizar
              </button>
            </div>
          )}

          {analysis.status === "loading" && (
            <div className="uploader__actions">
              <button type="button" className="button" disabled aria-busy="true">
                <span className="spinner" aria-hidden="true" />
                Analizando…
              </button>
              <p className="hint">Esto puede tardar unos segundos.</p>
            </div>
          )}

          {analysis.status === "error" && (
            <div className="uploader__actions">
              <p className="uploader__error" role="alert">
                {analysis.message}
              </p>
              <button type="button" className="button" onClick={analyze}>
                Probar de nuevo
              </button>
            </div>
          )}

          {analysis.status === "done" && <AnalysisResult analysis={analysis.analysis} />}

          <div className="uploader__secondary">
            <button type="button" className="button button--secondary" onClick={openPicker}>
              Cambiar la captura
            </button>
            <button type="button" className="button-text" onClick={remove}>
              Quitar
            </button>
          </div>
        </>
      )}
    </section>
  );
}
