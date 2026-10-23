import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";

import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: "AnalIA — una segunda mirada antes de tocar",
    template: "%s · AnalIA",
  },
  description:
    "AnalIA te ayuda a entender qué aparece en tu pantalla y si hay señales de estafa. En palabras simples y con prudencia.",
  applicationName: "AnalIA",
  // MVP cerrado: no queremos que las páginas se indexen.
  robots: { index: false, follow: false },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#f7f4ee",
  colorScheme: "light",
};

export default function RootLayout({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <html lang="es-AR">
      <body>
        <a className="skip-link" href="#contenido">
          Saltar al contenido
        </a>
        {children}
      </body>
    </html>
  );
}
