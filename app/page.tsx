import Link from "next/link";

import { CaptureUploader } from "@/components/capture-uploader";

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

        <CaptureUploader />

        <p className="privacy-line">
          AnalIA no guarda tus capturas: la copia original queda en tu teléfono.{" "}
          <Link href="/privacidad">Cómo cuidamos tus datos</Link>.
        </p>
      </main>

      <footer className="footer">
        <p>AnalIA · Etapa 2 de 6</p>
        <nav aria-label="Enlaces legales">
          <Link href="/privacidad">Privacidad</Link>
        </nav>
      </footer>
    </>
  );
}
