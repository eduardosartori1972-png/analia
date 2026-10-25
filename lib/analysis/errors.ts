/**
 * Errores del análisis con su código HTTP. El mensaje es el que ve el usuario:
 * tiene que ser corto, claro y no filtrar detalles internos.
 */

export type AnalysisErrorCode =
  | "invalid_image"
  | "too_large"
  | "rate_limited"
  | "timeout"
  | "provider_error"
  | "invalid_response";

const HTTP_STATUS: Record<AnalysisErrorCode, number> = {
  invalid_image: 415,
  too_large: 413,
  rate_limited: 429,
  timeout: 504,
  provider_error: 502,
  invalid_response: 502,
};

type Options = { retryAfterSeconds?: number };

export class AnalysisError extends Error {
  readonly code: AnalysisErrorCode;
  readonly status: number;
  readonly retryAfterSeconds?: number;

  constructor(code: AnalysisErrorCode, message: string, options: Options = {}) {
    super(message);
    this.name = "AnalysisError";
    this.code = code;
    this.status = HTTP_STATUS[code];
    this.retryAfterSeconds = options.retryAfterSeconds;
  }
}
