import type { MetadataRoute } from "next";

/** Permite instalar o site no celular (Adicionar à tela inicial): abre em tela cheia, sem barra do navegador. */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Anime View",
    short_name: "Anime View",
    description: "Coleção pessoal de animes: lista, estatísticas e temporada atual.",
    start_url: "/",
    scope: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#07070c",
    theme_color: "#07070c",
    lang: "pt-BR",
    icons: [
      { src: "/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icon-maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
