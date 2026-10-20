import "./globals.css";
import { Space_Grotesk, Inter, IBM_Plex_Mono } from "next/font/google";

const display = Space_Grotesk({
  subsets: ["latin"],
  variable: "--font-display",
  display: "swap",
});

const body = Inter({
  subsets: ["latin"],
  variable: "--font-body",
  display: "swap",
});

const mono = IBM_Plex_Mono({
  subsets: ["latin"],
  variable: "--font-mono",
  weight: ["400", "500", "600"],
  display: "swap",
});

export const metadata = {
  title: "Laço — Fotos do seu casamento, de todos os ângulos",
  description: "Crie uma galeria para o seu casamento e reúna as fotos dos convidados com um QR code, sem precisar instalar aplicativo.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR" suppressHydrationWarning>
      <body className={`${display.variable} ${body.variable} ${mono.variable}`}>
        {children}
      </body>
    </html>
  );
}
