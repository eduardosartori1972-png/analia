import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Privacidad",
  description: "Qué hace AnalIA con tus capturas y qué no hace.",
};

export default function PrivacidadPage() {
  return (
    <>
      <header className="topbar">
        <Link className="wordmark" href="/">
          AnalIA
        </Link>
        <span className="tag">Borrador</span>
      </header>

      <main id="contenido" className="shell">
        <h1>Privacidad</h1>

        <div className="notice" role="status">
          <strong>Este texto todavía es un borrador.</strong>
          Falta confirmar el plazo exacto de retención del proveedor de visión. Hasta tenerlo por
          escrito, no publicamos un número.
        </div>

        <div className="prose">
          <p>
            AnalIA está pensada para que puedas consultar sin entregar más de lo necesario. Esto es
            lo que hacemos y lo que no.
          </p>

          <h2>Qué pasa con tu captura</h2>
          <ul>
            <li>La captura original queda en tu teléfono. AnalIA no la mueve de ahí.</li>
            <li>
              No la guardamos en ningún servidor, ni en una base de datos, ni en registros de
              actividad.
            </li>
            <li>
              Para analizarla, la imagen se envía cifrada al proveedor de visión y se descarta al
              terminar la respuesta.
            </li>
            <li>El texto que aparece en la imagen tampoco se guarda en nuestros registros.</li>
          </ul>

          <h2>Qué no hacemos</h2>
          <ul>
            <li>No pedimos contraseñas, códigos de seguridad ni datos de tarjetas.</li>
            <li>No miramos tu pantalla sin que vos subas una captura.</li>
            <li>No vendemos ni compartimos datos con terceros con fines publicitarios.</li>
            <li>No prometemos que algo sea 100 % seguro: no existe esa garantía.</li>
          </ul>

          <h2>Qué falta definir</h2>
          <ul>
            <li>
              El plazo de retención del proveedor de visión (se publica acá cuando esté confirmado).
            </li>
            <li>Los requisitos de la Ley 25.326 aplicables al piloto, con asesoría legal.</li>
            <li>Qué datos de contacto se guardan para el piloto y por cuánto tiempo.</li>
          </ul>

          <p>
            <Link href="/">Volver al inicio</Link>
          </p>
        </div>
      </main>

      <footer className="footer">
        <p>AnalIA · Etapa 0 de 6</p>
        <p>Última actualización: 23 de octubre de 2026</p>
      </footer>
    </>
  );
}
