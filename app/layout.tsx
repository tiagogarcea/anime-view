import type { Metadata, Viewport } from "next";
import { Chakra_Petch, JetBrains_Mono } from "next/font/google";
import "./globals.css";

const display = Chakra_Petch({ subsets: ["latin"], weight: ["500", "600", "700"], variable: "--font-display" });
const mono = JetBrains_Mono({ subsets: ["latin"], weight: ["400", "500", "700"], variable: "--font-mono" });

export const metadata: Metadata = {
  title: "Anime View",
  description: "Coleção pessoal de animes: lista, sorteio do dia e estatísticas.",
  // instalado no iPhone (Compartilhar › Adicionar à Tela de Início): abre em tela cheia
  appleWebApp: { capable: true, title: "Anime View", statusBarStyle: "black" },
};

export const viewport: Viewport = { themeColor: "#07070c" };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR" className={`${display.variable} ${mono.variable}`}>
      <body>{children}</body>
    </html>
  );
}
