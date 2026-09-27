"use client";

import { useState } from "react";
import { Anime } from "@/lib/types";
import { hdImg, hueOf, largeImg } from "@/lib/format";

/**
 * Capa da planilha; se faltar ou quebrar, um bloco com a inicial no lugar.
 * `large` pede a melhor versão disponível (modal e sugestão do dia) e,
 * se ela falhar, desce para a próxima antes de desistir.
 */
export default function Poster({ anime, className, large }: { anime: Anime; className?: string; large?: boolean }) {
  // Ordem de tentativa (sempre a mesma arte da planilha):
  // capa ampliada do projeto → versão grande do MyAnimeList → capa original.
  const chain = large ? [...new Set([hdImg(anime.img), largeImg(anime.img), anime.img].filter(Boolean))] : [anime.img].filter(Boolean);
  const [step, setStep] = useState(0);
  const src = chain[step] ?? "";

  if (!src) {
    return (
      <div className={`poster poster-fallback ${className ?? ""}`} style={{ background: hueOf(anime.nome) }} aria-hidden>
        <span>{anime.nome.replace(/^[^\p{L}\p{N}]+/u, "").charAt(0).toUpperCase()}</span>
      </div>
    );
  }
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      key={src}
      className={`poster ${className ?? ""}`}
      src={src}
      alt=""
      loading={large ? "eager" : "lazy"}
      decoding="async"
      referrerPolicy="no-referrer"
      onError={() => setStep((s) => s + 1)}
    />
  );
}
