"use client";

import { useMemo, useState } from "react";
import type { Anime } from "@/lib/types";
import { resumoFranquias, ResumoFranquia } from "@/lib/franquias";
import { fmtInt, fmtScore } from "@/lib/format";

type Ordem = "horas" | "nota" | "titulos" | "rewatches" | "evolucao";
const ORDENS: { k: Ordem; label: string; v: (f: ResumoFranquia) => number }[] = [
  { k: "horas", label: "TEMPO", v: (f) => f.horas },
  { k: "nota", label: "NOTA", v: (f) => f.notaMedia },
  { k: "titulos", label: "TÍTULOS", v: (f) => f.titulos.length },
  { k: "evolucao", label: "EVOLUÇÃO", v: (f) => f.ultima - f.primeira },
  { k: "rewatches", label: "REWATCH", v: (f) => f.rewatches },
];
const INICIAL = 15;

/**
 * Franquias (2+ títulos ligados pelo AniList: continuações e histórias paralelas) entre os animes
 * filtrados. Clicar no nome filtra a Anime List por ela.
 */
export default function Franquias({ rows, onFranquia }: { rows: Anime[]; onFranquia: (nome: string) => void }) {
  const [ordem, setOrdem] = useState<Ordem>("horas");
  const [todas, setTodas] = useState(false);
  const lista = useMemo(() => {
    const v = ORDENS.find((o) => o.k === ordem)!.v;
    return resumoFranquias(rows).sort((a, b) => v(b) - v(a) || b.horas - a.horas || a.nome.localeCompare(b.nome));
  }, [rows, ordem]);
  if (!lista.length) return null;
  const visiveis = todas ? lista : lista.slice(0, INICIAL);

  return (
    <section className="panel">
      <div className="panel-row">
        <h3 className="panel-title">
          FRANQUIAS <span className="panel-note">// {lista.length} com 2+ títulos · continuações e OVAs, pelo AniList</span>
        </h3>
        <div className="years" role="group" aria-label="Ordenar franquias">
          {ORDENS.map((o) => (
            <button type="button" key={o.k} aria-pressed={o.k === ordem} className={o.k === ordem ? "yr on" : "yr"} onClick={() => setOrdem(o.k)}>{o.label}</button>
          ))}
        </div>
      </div>
      <div className="fr-scroll">
        <table className="fr-tab">
          <thead>
            <tr>
              <th>#</th><th className="fr-nome">FRANQUIA</th><th>TÍTULOS</th><th>EPISÓDIOS</th><th>TEMPO</th>
              <th>NOTA MÉDIA</th><th title="Nota do primeiro título → do último (ordem de lançamento)">1º → ÚLTIMO</th><th>REWATCH</th>
            </tr>
          </thead>
          <tbody>
            {visiveis.map((f, i) => {
              const d = f.ultima - f.primeira;
              return (
                <tr key={f.nome}>
                  <td className="muted">{i + 1}</td>
                  <td className="fr-nome">
                    <button type="button" className="fr-link" onClick={() => onFranquia(f.nome)} title={`Ver na Anime List: ${f.titulos.map((a) => a.nome).join(" · ")}`}>
                      {f.nome}
                    </button>
                  </td>
                  <td>{f.titulos.length}</td>
                  <td>{fmtInt(f.episodios)}</td>
                  <td>{fmtInt(f.horas)} h</td>
                  <td>{f.notaMedia ? f.notaMedia.toFixed(2).replace(".", ",") : "—"}</td>
                  <td>
                    {f.primeira ? `${fmtScore(f.primeira)} → ${fmtScore(f.ultima)}` : "—"}{" "}
                    {f.primeira > 0 && d !== 0 && <span className={d > 0 ? "up" : "down"}>({d > 0 ? "+" : "−"}{fmtScore(Math.abs(d))})</span>}
                  </td>
                  <td>{f.rewatches || "—"}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      {lista.length > INICIAL && (
        <button type="button" className="fr-mais" onClick={() => setTodas(!todas)}>
          {todas ? "mostrar menos" : `ver todas (${lista.length})`}
        </button>
      )}
      <p className="muted small">Tempo e episódios contam os rewatches. Clique no nome para ver os títulos na Anime List.</p>
    </section>
  );
}
