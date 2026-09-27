"use client";

import { Anime } from "@/lib/types";
import { fmtScore } from "@/lib/format";
import Poster from "./Poster";
import { TierMark } from "./Card";

type Props = { anime: Anime | null; onReroll: () => void; onOpen: (a: Anime) => void; poolSize: number };

export default function Hero({ anime, onReroll, onOpen, poolSize }: Props) {
  return (
    <section className="hero" aria-label="Puxada do dia">
      {anime?.img && (
        // eslint-disable-next-line @next/next/no-img-element
        <img className="hero-bg" src={anime.img} alt="" aria-hidden referrerPolicy="no-referrer" />
      )}
      <div className="hero-shade" aria-hidden />
      <div className="hero-scan" aria-hidden />
      <span className="bracket tl" aria-hidden />
      <span className="bracket br" aria-hidden />

      <div className="hero-inner">
        <div className="hero-text">
          <div className="eyebrow gold">
            ✦ PUXADA DO DIA <span className="muted">// peso: score × fav × tempo sem ver</span>
          </div>
          {anime ? (
            <>
              <h1 className="hero-title">{anime.nome}</h1>
              {anime.nomeEn && anime.nomeEn !== anime.nome && <div className="hero-en">{anime.nomeEn}</div>}
              <dl className="hero-specs">
                <div><dt>STUDIO</dt><dd>{anime.studio || "—"}</dd></div>
                <div><dt>SEASON</dt><dd>{anime.temporada || "—"}</dd></div>
                <div><dt>EPS</dt><dd>{anime.eps}{anime.minPerEp ? ` × ${anime.minPerEp}min` : ""}</dd></div>
                <div><dt>GÊNERO</dt><dd>{anime.genero || "—"}</dd></div>
              </dl>
              {anime.comentario && <p className="hero-quote">// “{anime.comentario}”</p>}
              <div className="hero-actions">
                <button type="button" className="btn gold" onClick={onReroll} disabled={poolSize === 0}>
                  ✦ PUXAR DE NOVO
                </button>
                {anime.malUrl && <a className="btn line" href={anime.malUrl} target="_blank" rel="noreferrer">MAL ↗</a>}
                {anime.crUrl && <a className="btn line" href={anime.crUrl} target="_blank" rel="noreferrer">CRUNCHYROLL ↗</a>}
              </div>
              {poolSize === 0 && <div className="muted small">Nenhum anime nos filtros atuais para sortear.</div>}
            </>
          ) : (
            <h1 className="hero-title">Embaralhando…</h1>
          )}
        </div>

        {anime && (
          <button type="button" className={`hero-card frame-${anime.tier}`} onClick={() => onOpen(anime)} aria-label={`Ver detalhes de ${anime.nome}`}>
            <span className="card-in">
              <span className="card-top">
                <span>#{anime.n}</span>
                <TierMark tier={anime.tier} />
              </span>
              <Poster key={anime.id} anime={anime} className="hero-poster" large />
              <span className="hero-card-name">{anime.nome}</span>
              <span className="hero-card-stats">
                <span><small>SCORE</small><b className="gold">{fmtScore(anime.score)}</b></span>
                <span><small>RW</small><b>{anime.rewatch}×</b></span>
                <span><small>FAV</small><b className={anime.isFav ? "red" : "muted"}>{anime.isFav ? "♥" : "—"}</b></span>
              </span>
            </span>
          </button>
        )}
      </div>
    </section>
  );
}
