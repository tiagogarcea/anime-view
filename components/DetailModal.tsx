"use client";

import { useEffect } from "react";
import { Anime } from "@/lib/types";
import { fmtDate, fmtMonth, fmtScore } from "@/lib/format";
import type { Viewing } from "@/lib/history";
import Poster from "./Poster";
import { TierMark } from "./Card";

const rewatchLabel = (r: number | null) => (r === null ? "" : r === 0 ? "primeira vez" : `${r}º rewatch`);

export default function DetailModal({ anime, history, onClose }: { anime: Anime | null; history: Viewing[]; onClose: () => void }) {
  useEffect(() => {
    if (!anime) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [anime, onClose]);

  if (!anime) return null;
  const views = history.filter((v) => v.n === anime.n).sort((a, b) => a.ym.localeCompare(b.ym));

  const rows: [string, string][] = [
    ["ESTÚDIO", anime.studio || "—"],
    ["GÊNERO", anime.genero || "—"],
    ["TEMA", anime.tema || "—"],
    ["DEMOGRAFIA", anime.demografia || "—"],
    ["TEMPORADA", anime.temporada || "—"],
    ["EPISÓDIOS", `${anime.eps}${anime.minPerEp ? ` × ${anime.minPerEp} min` : ""}`],
    ["VISTO EM", fmtDate(anime.lastSeen)],
    ["STREAMING", anime.streaming || "—"],
    ...(anime.franquia ? [["FRANQUIA", anime.franquia] as [string, string]] : []),
  ];

  return (
    <div className="modal-wrap" onClick={onClose}>
      <div className={`modal frame-${anime.tier}`} role="dialog" aria-modal="true" aria-label={anime.nome} onClick={(e) => e.stopPropagation()}>
        <div className="modal-in">
          <button type="button" className="icon-btn modal-x" onClick={onClose} aria-label="Fechar">✕</button>
          <div className="modal-art">
            <Poster key={anime.id} anime={anime} large />
          </div>
          <div className="modal-body">
            <div className="card-top">
              <span>#{anime.n}</span>
              <TierMark tier={anime.tier} />
            </div>
            <h2 className="modal-title">{anime.nome}</h2>
            {anime.nomeEn && anime.nomeEn !== anime.nome && <div className="hero-en">{anime.nomeEn}</div>}
            <div className="pills">
              <span className="pill gold">★ {fmtScore(anime.score)}</span>
              {anime.isFav && <span className="pill red">♥ FAV</span>}
              {anime.rewatch > 0 && <span className="pill cyan">↻ {anime.rewatch}×</span>}
            </div>
            <dl className="spec-list">
              {rows.map(([k, v]) => (
                <div key={k}><dt>{k}</dt><dd>{v}</dd></div>
              ))}
            </dl>
            {views.length > 0 && (
              <div className="views">
                <div className="views-title">HISTÓRICO <span className="muted">// desde 2023</span></div>
                <ol className="views-list">
                  {views.map((v, i) => (
                    <li key={i} className={v.rewatch ? "rw" : ""}>
                      <b>{fmtMonth(v.ym)}</b> {rewatchLabel(v.rewatch)}
                    </li>
                  ))}
                </ol>
              </div>
            )}
            {anime.comentario && <p className="hero-quote">// “{anime.comentario}”</p>}
            <div className="hero-actions">
              {anime.malUrl && <a className="btn line" href={anime.malUrl} target="_blank" rel="noreferrer">MAL ↗</a>}
              {anime.crUrl && <a className="btn line" href={anime.crUrl} target="_blank" rel="noreferrer">CRUNCHYROLL ↗</a>}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
