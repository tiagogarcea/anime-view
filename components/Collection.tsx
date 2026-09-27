"use client";

import { useEffect, useRef, useState } from "react";
import { Anime } from "@/lib/types";
import Card from "./Card";

const PAGE = 60;

export default function Collection({ rows, onOpen, onClear }: { rows: Anime[]; onOpen: (a: Anime) => void; onClear: () => void }) {
  const [shown, setShown] = useState(PAGE);
  const sentinel = useRef<HTMLDivElement>(null);

  // Nova filtragem/ordenação volta para o começo.
  useEffect(() => setShown(PAGE), [rows]);

  // Carrega mais cartas quando o fim da grade aparece na tela.
  useEffect(() => {
    const el = sentinel.current;
    if (!el) return;
    const io = new IntersectionObserver((es) => es[0].isIntersecting && setShown((s) => s + PAGE), { rootMargin: "800px" });
    io.observe(el);
    return () => io.disconnect();
  }, [rows]);

  if (!rows.length) {
    return (
      <section className="empty">
        <div className="empty-code">0 RESULTADOS</div>
        <div className="empty-title">Nenhum anime encontrado</div>
        <p>Tente ajustar ou limpar os filtros.</p>
        <button type="button" className="btn line" onClick={onClear}>LIMPAR FILTROS</button>
      </section>
    );
  }

  return (
    <section aria-label="Coleção">
      <div className="sprockets" aria-hidden />
      <div className="grid">
        {rows.slice(0, shown).map((a) => (
          <Card key={a.id} anime={a} onOpen={onOpen} />
        ))}
      </div>
      {shown < rows.length && <div ref={sentinel} className="more">carregando mais animes…</div>}
    </section>
  );
}
