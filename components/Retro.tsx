"use client";

import { useMemo, useState } from "react";
import type { Anime } from "@/lib/types";
import type { Viewing } from "@/lib/history";
import { anosDoHistorico, Bucket, Retro, retrospectiva } from "@/lib/stats";
import { fmtInt } from "@/lib/format";
import Poster from "./Poster";

const MES = ["jan", "fev", "mar", "abr", "mai", "jun", "jul", "ago", "set", "out", "nov", "dez"];
const MES_LONGO = ["janeiro", "fevereiro", "março", "abril", "maio", "junho", "julho", "agosto", "setembro", "outubro", "novembro", "dezembro"];
const nota = (n: number) => (n ? n.toFixed(2).replace(".", ",") : "—");

/** Métricas da tabela de comparação. */
const METRICAS: { label: string; v: (r: Retro) => number; fmt: (n: number) => string }[] = [
  { label: "Vezes que assistiu", v: (r) => r.vezes, fmt: fmtInt },
  { label: "Animes diferentes", v: (r) => r.animes, fmt: fmtInt },
  { label: "Pela 1ª vez", v: (r) => r.primeiras, fmt: fmtInt },
  { label: "Rewatches", v: (r) => r.rewatches, fmt: fmtInt },
  { label: "Episódios", v: (r) => r.episodios, fmt: fmtInt },
  { label: "Horas", v: (r) => r.horas, fmt: fmtInt },
  { label: "Nota média", v: (r) => r.notaMedia, fmt: nota },
];

/**
 * Retrospectiva por ano e comparação entre dois anos. Usa só a aba Historico (2023 em diante):
 * antes disso não se sabe quantas vezes cada anime foi visto em cada ano.
 */
export default function Retrospectiva({ rows, history, onOpen }: { rows: Anime[]; history: Viewing[]; onOpen: (a: Anime) => void }) {
  const anos = useMemo(() => anosDoHistorico(history), [history]);
  const [ano, setAno] = useState<string | null>(null);
  const [outro, setOutro] = useState("");
  const [mesmoPeriodo, setMesmoPeriodo] = useState(true);
  const a = ano && anos.includes(ano) ? ano : anos[anos.length - 1];
  const b = outro && outro !== a && anos.includes(outro) ? outro : "";
  const ultimo = anos[anos.length - 1];

  // o último ano do Historico normalmente está em andamento: até que mês ele vai
  const ateUltimo = useMemo(() => (ultimo ? retrospectiva(rows, history, ultimo).ateMes : 12), [rows, history, ultimo]);
  const parcial = !!b && [a, b].includes(ultimo) && ateUltimo < 12;
  const corte = parcial && mesmoPeriodo ? ateUltimo : 12;

  const ra = useMemo(() => (a ? retrospectiva(rows, history, a, corte) : null), [rows, history, a, corte]);
  const rb = useMemo(() => (b ? retrospectiva(rows, history, b, corte) : null), [rows, history, b, corte]);

  if (!a || !ra) return null;
  const emAndamento = !b && a === ultimo && ra.ateMes > 0 && ra.ateMes < 12;

  return (
    <section className="panel">
      <div className="panel-row">
        <h3 className="panel-title">
          RETROSPECTIVA{" "}
          <span className="panel-note">// pela aba Historico, desde 2023{emAndamento ? ` · ${a} até ${MES_LONGO[ra.ateMes - 1]}` : ""}</span>
        </h3>
        <div className="retro-ctl">
          <div className="years" role="tablist" aria-label="Ano">
            {anos.map((y) => (
              <button type="button" role="tab" aria-selected={y === a} key={y} className={y === a ? "yr on" : "yr"} onClick={() => setAno(y)}>{y}</button>
            ))}
          </div>
          <label className="retro-cmp-sel">
            comparar com
            <select value={b} onChange={(e) => setOutro(e.target.value)}>
              <option value="">—</option>
              {anos.filter((y) => y !== a).map((y) => <option key={y} value={y}>{y}</option>)}
            </select>
          </label>
        </div>
      </div>

      {rb ? (
        <Comparacao ra={ra} rb={rb} corte={corte} parcial={parcial} mesmoPeriodo={mesmoPeriodo} onMesmoPeriodo={setMesmoPeriodo} ateUltimo={ateUltimo} />
      ) : (
        <Ano r={ra} onOpen={onOpen} />
      )}
    </section>
  );
}

function Ano({ r, onOpen }: { r: Retro; onOpen: (a: Anime) => void }) {
  if (!r.vezes) return <p className="muted">Nenhum registro em {r.ano} para os filtros atuais.</p>;
  const pico = r.porMes.indexOf(Math.max(...r.porMes));
  const max = Math.max(...r.porMes, 1);
  return (
    <>
      <div className="retro-nums">
        <Num v={fmtInt(r.vezes)} label="vezes que assistiu" sub={`${fmtInt(r.primeiras)} pela 1ª vez · ${fmtInt(r.rewatches)} rewatches`} />
        <Num v={fmtInt(r.animes)} label="animes diferentes" />
        <Num v={fmtInt(r.episodios)} label="episódios" />
        <Num v={fmtInt(r.horas)} label="horas" sub={`≈ ${fmtInt(Math.round(r.horas / 24))} dias`} />
        <Num v={nota(r.notaMedia)} label="nota média" />
        <Num v={MES_LONGO[pico]} label="mês mais ativo" sub={`${r.porMes[pico]} vezes`} />
      </div>

      <div className="retro-meses" role="img" aria-label={r.porMes.map((n, i) => `${MES[i]} ${n}`).join(", ")}>
        {r.porMes.map((n, i) => (
          <div key={i} className="retro-mes" data-tip={`${MES_LONGO[i]}: ${n}`}>
            <span className="retro-mes-n">{n || ""}</span>
            <span className="retro-col">
              <span className="retro-bar" style={{ height: `${(n / max) * 100}%`, background: i === pico ? "var(--red)" : undefined }} />
            </span>
            <span className="retro-mes-l">{MES[i]}</span>
          </div>
        ))}
      </div>

      <div className="retro-dest">
        <Destaque titulo="ESTÚDIOS" lista={r.estudios} />
        <Destaque titulo="GÊNEROS" lista={r.generos} />
        <Destaque titulo="TEMAS" lista={r.temas} />
      </div>

      {r.melhores.length > 0 && (
        <div>
          <h4 className="retro-sub">MAIORES NOTAS DE {r.ano}</h4>
          <div className="retro-best">
            {r.melhores.map((a) => (
              <button type="button" key={a.id} className="rw-card" onClick={() => onOpen(a)}>
                <span className="rw-art"><Poster anime={a} /><span className="rw-n">★ {a.score}</span></span>
                <span className="rw-name">{a.nome}</span>
              </button>
            ))}
          </div>
        </div>
      )}
    </>
  );
}

function Comparacao({ ra, rb, corte, parcial, mesmoPeriodo, onMesmoPeriodo, ateUltimo }: {
  ra: Retro; rb: Retro; corte: number; parcial: boolean; mesmoPeriodo: boolean; onMesmoPeriodo: (v: boolean) => void; ateUltimo: number;
}) {
  const max = Math.max(...ra.porMes, ...rb.porMes, 1);
  const meses = Array.from({ length: corte }, (_, i) => i);
  return (
    <>
      {parcial && (
        <label className="retro-periodo">
          <input type="checkbox" checked={mesmoPeriodo} onChange={(e) => onMesmoPeriodo(e.target.checked)} />
          comparar só jan–{MES[ateUltimo - 1]} nos dois anos (um deles ainda está em andamento)
        </label>
      )}
      <table className="retro-tab">
        <thead>
          <tr><th /><th className="ca">{ra.ano}</th><th className="cb">{rb.ano}</th><th>diferença</th></tr>
        </thead>
        <tbody>
          {METRICAS.map((m) => {
            const d = m.v(ra) - m.v(rb);
            return (
              <tr key={m.label}>
                <th scope="row">{m.label}</th>
                <td>{m.fmt(m.v(ra))}</td>
                <td>{m.fmt(m.v(rb))}</td>
                <td className={d > 0 ? "up" : d < 0 ? "down" : "muted"}>{d === 0 ? "=" : `${d > 0 ? "+" : "−"}${m.fmt(Math.abs(d))}`}</td>
              </tr>
            );
          })}
        </tbody>
      </table>

      <div className="legend">
        <span><i style={{ background: "var(--red)" }} /> {ra.ano}</span>
        <span><i style={{ background: "var(--cyan)" }} /> {rb.ano}</span>
      </div>
      <div className="retro-meses dois" style={{ gridTemplateColumns: `repeat(${corte}, minmax(0, 1fr))` }}
        role="img" aria-label={meses.map((i) => `${MES[i]}: ${ra.ano} ${ra.porMes[i]}, ${rb.ano} ${rb.porMes[i]}`).join("; ")}>
        {meses.map((i) => (
          <div key={i} className="retro-mes" data-tip={`${MES_LONGO[i]}: ${ra.ano} ${ra.porMes[i]} · ${rb.ano} ${rb.porMes[i]}`}>
            <span className="retro-col par">
              <span className="retro-bar" style={{ height: `${(ra.porMes[i] / max) * 100}%`, background: "var(--red)" }} />
              <span className="retro-bar" style={{ height: `${(rb.porMes[i] / max) * 100}%`, background: "var(--cyan)" }} />
            </span>
            <span className="retro-mes-l">{MES[i]}</span>
          </div>
        ))}
      </div>

      <div className="retro-dest">
        <Destaque titulo={`GÊNEROS ${ra.ano}`} lista={ra.generos} />
        <Destaque titulo={`GÊNEROS ${rb.ano}`} lista={rb.generos} />
        <Destaque titulo={`ESTÚDIOS ${ra.ano}`} lista={ra.estudios} />
        <Destaque titulo={`ESTÚDIOS ${rb.ano}`} lista={rb.estudios} />
      </div>
    </>
  );
}

function Num({ v, label, sub }: { v: string; label: string; sub?: string }) {
  return (
    <div className="retro-num">
      <b>{v}</b>
      <span>{label}</span>
      {sub && <small>{sub}</small>}
    </div>
  );
}

function Destaque({ titulo, lista }: { titulo: string; lista: Bucket[] }) {
  return (
    <div>
      <h4 className="retro-sub">{titulo}</h4>
      {lista.length ? (
        <ol className="retro-top">
          {lista.map((x) => <li key={x.label}><span>{x.label}</span><b>{x.n}</b></li>)}
        </ol>
      ) : <p className="muted small">—</p>}
    </div>
  );
}
