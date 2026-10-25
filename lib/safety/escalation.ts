import type { Escalation } from "../analysis/contract";

/**
 * Bloques de derivación. No son decorativos: son la parte de la respuesta que
 * dice qué hacer cuando ya hay riesgo. La UI los muestra aparte del veredicto.
 */
export const ESCALATION_COPY: Record<
  Exclude<Escalation, "none">,
  { title: string; body: string }
> = {
  banking: {
    title: "Si es de tu banco, verificá por tu cuenta",
    body: "Abrí la app del banco desde el ícono de tu teléfono, no desde el mensaje. Si no encontrás el aviso ahí, llamá al número que figura en el dorso de tu tarjeta. No uses el número ni el link que aparecen en la captura.",
  },
  "already-clicked": {
    title: "Si ya hiciste clic o diste tus datos",
    body: "Llamá ahora al banco por el número que figura en tu tarjeta y pedí que bloqueen la cuenta. Cambiá la contraseña desde otro dispositivo y no borres el mensaje: sirve para la denuncia.",
  },
};
