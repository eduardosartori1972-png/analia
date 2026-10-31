import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Privacidad",
  description: "Qué hace AnalIA con tus capturas y qué no hace.",
};

// La CSP usa un nonce por request (ADR-011): la página tiene que renderizarse en
// cada request para que sus scripts lleven el nonce de esta respuesta.
export const dynamic = "force-dynamic";

const CONTACT_EMAIL = "analia.soporte@gmail.com";

export default function PrivacidadPage() {
  return (
    <>
      <header className="topbar">
        <Link className="wordmark" href="/">
          AnalIA
        </Link>
        <span className="tag">Piloto</span>
      </header>

      <main id="contenido" className="shell">
        <h1>Privacidad</h1>

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
              Para analizarla, la imagen se envía cifrada a OpenAI, el proveedor de visión que hace
              el análisis. Ese envío sale de nuestro servidor y va a servidores en Estados Unidos.
            </li>
            <li>
              OpenAI no usa tu imagen para entrenar modelos. La conserva hasta 30 días en registros
              de prevención de abuso, y puede conservarla más si la ley lo exige.
            </li>
            <li>El texto que aparece en la imagen tampoco se guarda en nuestros registros.</li>
          </ul>

          <h2>Quién procesa la imagen</h2>
          <p>
            El análisis lo hace OpenAI a través de su API. No se usa para entrenar modelos y se
            conserva como máximo 30 días para prevenir abuso. Podés leer su política en{" "}
            <a
              href="https://developers.openai.com/api/docs/guides/your-data"
              rel="noreferrer noopener"
              target="_blank"
            >
              Data controls in the OpenAI platform
            </a>
            .
          </p>

          <h2>Qué no hacemos</h2>
          <ul>
            <li>No pedimos contraseñas, códigos de seguridad ni datos de tarjetas.</li>
            <li>No miramos tu pantalla sin que vos subas una captura.</li>
            <li>No vendemos ni compartimos datos con terceros con fines publicitarios.</li>
            <li>No prometemos que algo sea 100 % seguro: no existe esa garantía.</li>
          </ul>

          <h2>Tus derechos</h2>
          <p>
            Como AnalIA no tiene cuentas, no hay historial que borrar. Podés escribirnos para
            preguntar qué datos hay sobre vos, pedir que se corrijan o pedir que se eliminen.
            Mientras la imagen esté dentro del plazo de 30 días en el proveedor, también podemos
            pedir que se borre.
          </p>
          <p>
            Si no quedás conforme con la respuesta, podés presentar un reclamo ante la Agencia de
            Acceso a la Información Pública (AAIP).
          </p>

          <h2>Contacto</h2>
          <p>
            El responsable del tratamiento es Eduardo Sartori. Escribinos a{" "}
            <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>. Contestamos las consultas sobre
            datos personales y las dudas sobre el piloto.
          </p>

          <h2>Cambios en esta política</h2>
          <p>
            Si cambia algo —por ejemplo, el proveedor de visión o el plazo de conservación— se
            actualiza esta página con la fecha nueva. La versión vigente es siempre la que está
            publicada acá.
          </p>

          <p>
            <Link href="/">Volver al inicio</Link>
          </p>
        </div>
      </main>

      <footer className="footer">
        <p>AnalIA · Piloto</p>
        <p>Última actualización: 31 de octubre de 2026</p>
      </footer>
    </>
  );
}
