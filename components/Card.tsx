"use client";

import { memo } from "react";
import { Anime, Tier } from "@/lib/types";
import { fmtScore } from "@/lib/format";
import Poster from "./Poster";

export function TierMark({ tier }: { tier: Tier }) {
  return <span className={`tier-name t-${tier}`}>{tier === "SSR" ? "SSR ★★★" : tier}</span>;
}

function Card({ anime, onOpen }: { anime: Anime; onOpen: (a: Anime) => void }) {
  const year = anime.ano ? ` · ${anime.ano}` : "";
  return (
    <button type="button" className={`card frame-${anime.tier}`} onClick={() => onOpen(anime)}>
      <span className="card-in">
        <span className="card-top">
          <span>#{anime.n}</span>
          <TierMark tier={anime.tier} />
        </span>
        <span className="card-art">
          <Poster anime={anime} />
          {anime.isFav && <span className="badge-fav" title="Favorito">♥</span>}
          {anime.rewatch > 0 && <span className="badge-rw" title={`Reassistido ${anime.rewatch}×`}>↻ {anime.rewatch}</span>}
          <span className="badge-score">{fmtScore(anime.score)}</span>
        </span>
        <span className="card-name">{anime.nome}</span>
        <span className="card-meta">{(anime.studio || "—").toUpperCase()}{year}</span>
      </span>
    </button>
  );
}

export default memo(Card);
