import Link from "next/link";

export default function HomePage() {
  return (
    <>
      <header className="topbar">
        <span className="wordmark">AnalIA</span>
        <span className="tag">MVP</span>
      </header>

      <main id="contenido" className="shell">
        <p className="eyebrow">Asistente para adultos mayores</p>

        <h1>¿Esto es seguro?</h1>

        <p className="lead">
          Subí una captura de ese mensaje, correo o ventana que te hizo dudar. Te explico qué veo,
          en palabras simples, y qué conviene hacer.
        </p>

        <section className="card" aria-labelledby="privacidad-titulo">
          <h2 id="privacidad-titulo">La captura queda en tu teléfono</h2>
          <p>
            AnalIA no guarda tus capturas en ningún servidor. Cuando el análisis esté activo, tu
            imagen se enviará cifrada al proveedor de visión y se descartará al terminar. La copia
            original queda en tu dispositivo.
          </p>
          <p>
            <Link href="/privacidad">Leer la política de privacidad (borrador)</Link>
          </p>
        </section>

        <div className="cta-block">
          <button type="button" className="button" disabled aria-describedby="proximo-paso">
            Subir una captura
          </button>
          <p className="hint" id="proximo-paso">
            Todavía no está activo: esta es la Etapa 0 del MVP. La subida de capturas llega en la
            próxima etapa.
          </p>
        </div>
      </main>

      <footer className="footer">
        <p>AnalIA · Etapa 0 de 6</p>
        <nav aria-label="Enlaces legales">
          <Link href="/privacidad">Privacidad</Link>
        </nav>
      </footer>
    </>
  );
}
