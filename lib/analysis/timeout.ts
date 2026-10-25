import { AnalysisError } from "./errors";

/**
 * Corta la espera si el proveedor no responde a tiempo. No cancela el trabajo
 * del proveedor (la promesa sigue viva), pero libera al usuario y al request.
 */
export function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => {
      reject(new AnalysisError("timeout", "El análisis tardó demasiado. Probá de nuevo."));
    }, ms);

    promise.then(
      (value) => {
        clearTimeout(timer);
        resolve(value);
      },
      (error: unknown) => {
        clearTimeout(timer);
        reject(error);
      },
    );
  });
}
