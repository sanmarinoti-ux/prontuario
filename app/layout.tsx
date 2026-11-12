import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = { title: "Prontuário San Marino", description: "Sistema interno de registros de funcionários da San Marino." };

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="pt-BR"><body>{children}</body></html>;
}
