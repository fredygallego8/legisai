import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "LegisAI Colombia | Inteligencia Jurídica",
  description:
    "Plataforma de investigación jurídica para procesar regulaciones, normas y sentencias colombianas mediante IA y RAG.",
  // No indexar: la plataforma contiene expedientes y datos de clientes.
  robots: { index: false, follow: false, nocache: true },
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="es">
      <body className="bg-slate-50 text-slate-900 antialiased">{children}</body>
    </html>
  );
}
