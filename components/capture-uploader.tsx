"use client";

import { useCallback, useEffect, useRef, useState, type ChangeEvent } from "react";

import { formatBytes } from "@/lib/image/geometry";
import { ImageError, prepareImage, type PreparedImage } from "@/lib/image/preprocess";

type UploadState =
  | { status: "idle" }
  | { status: "preparing" }
  | { status: "ready"; image: PreparedImage; previewUrl: string }
  | { status: "error"; message: string };

/**
 * Punto de entrada de la captura. Un solo botón primario: Android decide si
 * abre la cámara o la galería, sin obligar a elegir entre dos caminos.
 */
export function CaptureUploader() {
  const [state, setState] = useState<UploadState>({ status: "idle" });
  const inputRef = useRef<HTMLInputElement>(null);
  const objectUrlRef = useRef<string | null>(null);
  const requestRef = useRef(0);

  const releaseUrl = useCallback(() => {
    if (objectUrlRef.current) {
      URL.revokeObjectURL(objectUrlRef.current);
      objectUrlRef.current = null;
    }
  }, []);

  // Libera el blob al desmontar: la imagen no debe quedar retenida en memoria.
  useEffect(() => releaseUrl, [releaseUrl]);

  const openPicker = useCallback(() => {
    inputRef.current?.click();
  }, []);

  async function handleChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    // Permite volver a elegir el mismo archivo después de quitarlo.
    event.target.value = "";
    if (!file) return;

    const request = ++requestRef.current;
    setState({ status: "preparing" });

    try {
      const image = await prepareImage(file);
      if (request !== requestRef.current) return;

      releaseUrl();
      const previewUrl = URL.createObjectURL(image.blob);
      objectUrlRef.current = previewUrl;
      setState({ status: "ready", image, previewUrl });
    } catch (error) {
      if (request !== requestRef.current) return;
      setState({
        status: "error",
        message:
          error instanceof ImageError
            ? error.message
            : "No pudimos preparar la imagen. Probá de nuevo.",
      });
    }
  }

  function reset() {
    requestRef.current += 1; // descarta cualquier preparación en curso
    releaseUrl();
    setState({ status: "idle" });
  }

  return (
    <section className="uploader" aria-label="Subir una captura">
      <input ref={inputRef} type="file" accept="image/*" onChange={handleChange} hidden />

      {/* Región viva permanente: el botón desaparece al cambiar de estado y el
          foco vuelve al body, así que el cambio se anuncia acá. */}
      <p className="sr-only" role="status">
        {state.status === "preparing" && "Preparando la imagen."}
        {state.status === "ready" && "Imagen lista para analizar."}
        {state.status === "error" && "No pudimos preparar la imagen."}
      </p>

      {state.status === "idle" && (
        <>
          <button type="button" className="button" onClick={openPicker}>
            Subir una captura
          </button>
          <p className="hint">
            Podés sacar una foto en el momento o elegir una que ya tengas guardada.
          </p>
        </>
      )}

      {state.status === "preparing" && (
        <>
          <button type="button" className="button" disabled aria-busy="true">
            <span className="spinner" aria-hidden="true" />
            Preparando la imagen…
          </button>
          <p className="hint">Estamos achicando la imagen para que ocupe menos espacio.</p>
        </>
      )}

      {state.status === "ready" && (
        <>
          <figure className="preview">
            {/* Blob local: no pasa por el optimizador ni por un CDN (ADR-007). */}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              className="preview__image"
              src={state.previewUrl}
              alt="Vista previa de la captura que elegiste"
            />
            <figcaption className="preview__meta">
              {state.image.width} × {state.image.height} px · {formatBytes(state.image.blob.size)}
            </figcaption>
          </figure>

          <div className="uploader__actions">
            <button type="button" className="button" disabled aria-describedby="analizar-aviso">
              Analizar
            </button>
            <p className="hint" id="analizar-aviso">
              El análisis se activa en la próxima etapa.
            </p>
            <button type="button" className="button button--secondary" onClick={openPicker}>
              Cambiar la captura
            </button>
            <button type="button" className="button-text" onClick={reset}>
              Quitar
            </button>
          </div>
        </>
      )}

      {state.status === "error" && (
        <>
          <p className="uploader__error" role="alert">
            {state.message}
          </p>
          <button type="button" className="button" onClick={openPicker}>
            Elegir otra imagen
          </button>
        </>
      )}
    </section>
  );
}
