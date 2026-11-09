import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = { title: "Prontuário RH | Concessionária", description: "Sistema interno de registros de funcionários." };

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="pt-BR"><body>{children}</body></html>;
}
