/**
 * Mensajes que ve la persona. Son la única fuente de texto para el cliente:
 * el mensaje de un `AnalysisError` sirve para los logs, nunca para la pantalla.
 *
 * Reglas:
 * - Sin jerga técnica: nada de "JSON", "proveedor", "timeout", "token".
 * - En voseo, cálidos y concretos.
 * - Siempre con una salida: qué hacer ahora.
 */
import type { AnalysisErrorCode } from "./errors";

export const USER_MESSAGES: Record<AnalysisErrorCode, string> = {
  invalid_image: "No pudimos leer ese archivo. Probá con otra captura.",
  too_large: "La imagen es muy pesada. Probá con otra captura.",
  rate_limited: "Hiciste varias consultas seguidas. Esperá un momento y volvé a intentar.",
  quota_exhausted: "Llegamos al límite de consultas de este mes. Probá de nuevo el mes que viene.",
  timeout: "Esto está tardando más de lo normal. Probá de nuevo en un ratito.",
  provider_error: "No pude analizar la imagen esta vez. Probá de nuevo en un ratito.",
  invalid_response: "Estoy teniendo problemas para leer la imagen. ¿Probás de nuevo en un ratito?",
};
