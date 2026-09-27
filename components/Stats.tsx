"use client";

import { useMemo, useState } from "react";
import { Anime, Tier } from "@/lib/types";
import { byDay, byMonthWithHistory, byYear, Bucket, countBy, HISTORY_START, scoreDistribution, top, topRewatch } from "@/lib/stats";
import type { Viewing } from "@/lib/history";
import { fmtDate, fmtMonth } from "@/lib/format";
import Poster from "./Poster";

const TIER_OF_SCORE = (s: number): Tier => (s >= 10 ? "SSR" : s >= 9 ? "SR" : s >= 8 ? "R" : "N");
const CAT = ["var(--red)", "var(--cyan)", "var(--gold)", "var(--violet)", "var(--gray)"];

export default function Stats({ rows, history, onOpen }: { rows: Anime[]; history: Viewing[]; onOpen: (a: Anime) => void }) {
  if (!rows.length) {
    return (
      <section className="empty">
        <div className="empty-code">0 RESULTADOS</div>
        <div className="empty-title">Sem dados para os filtros atuais</div>
      </section>
    );
  }

  const demo = countBy(rows, (a) => a.demografia).sort((a, b) => b.n - a.n);
  const demoTotal = demo.reduce((s, d) => s + d.n, 0);
  const rw = topRewatch(rows, 20);

  return (
    <div className="stats">
      <Heatmap rows={rows} />

      <div className="two">
        <Panel title="DISTRIBUIÇÃO POR SCORE">
          <Columns data={scoreDistribution(rows)} colorOf={(b) => `var(--t-${TIER_OF_SCORE(Number(b.label))})`} tip={(b) => `score ${b.label}: ${b.n} animes`} />
          <div className="legend">
            <span><i className="bg-SSR" /> SSR</span><span><i className="bg-SR" /> SR</span><span><i className="bg-R" /> R</span><span><i className="bg-N" /> N</span>
          </div>
        </Panel>
        <Panel title="ANO DE LANÇAMENTO">
          <YearColumns data={byYear(rows)} />
        </Panel>
      </div>

      <Panel title="ASSISTIDOS AO LONGO DO TEMPO" note={history.length ? "// por mês · rewatches contam a partir de 2023" : "// por mês"}>
        <AreaChart data={byMonthWithHistory(rows, history)} splitAt={history.length ? HISTORY_START : undefined} />
      </Panel>

      <div className="three">
        <Panel title="TOP 15 ESTÚDIOS"><Bars data={top(rows, (a) => a.studio, 15)} color="var(--red)" /></Panel>
        <Panel title="TOP 12 TEMAS"><Bars data={top(rows, (a) => a.tema, 12)} color="var(--cyan)" /></Panel>
        <Panel title="GÊNEROS"><Bars data={top(rows, (a) => a.genero, 20)} color="var(--gold)" /></Panel>
      </div>

      <Panel title="DEMOGRAFIA">
        <div className="stack" role="img" aria-label={demo.map((d) => `${d.label} ${d.n}`).join(", ")}>
          {demo.map((d, i) => (
            <span key={d.label} data-tip={`${d.label}: ${d.n} (${Math.round((d.n / demoTotal) * 100)}%)`}
              style={{ width: `${(d.n / demoTotal) * 100}%`, background: CAT[Math.min(i, CAT.length - 1)] }} />
          ))}
        </div>
        <div className="legend big">
          {demo.map((d, i) => (
            <span key={d.label}>
              <i style={{ background: CAT[Math.min(i, CAT.length - 1)] }} /> {d.label}{" "}
              <b>{d.n}</b> <span className="muted">{((d.n / demoTotal) * 100).toFixed(1).replace(".", ",")}%</span>
            </span>
          ))}
        </div>
      </Panel>

      {rw.length > 0 && (
        <Panel title="MAIS REASSISTIDOS" note={`// top ${rw.length}`}>
          <div className="rw-grid">
            {rw.map((a, i) => (
              <button type="button" key={a.id} className="rw-card" onClick={() => onOpen(a)}>
                <span className="rw-art">
                  <Poster anime={a} />
                  <span className="rw-rank">#{i + 1}</span>
                  <span className="rw-n">↻ {a.rewatch}×</span>
                </span>
                <span className="rw-name">{a.nome}</span>
              </button>
            ))}
          </div>
        </Panel>
      )}
    </div>
  );
}

function Panel({ title, note, children }: { title: string; note?: string; children: React.ReactNode }) {
  return (
    <section className="panel">
      <h3 className="panel-title">
        {title} {note && <span className="panel-note">{note}</span>}
      </h3>
      {children}
    </section>
  );
}

function Columns({ data, colorOf, tip }: { data: Bucket[]; colorOf: (b: Bucket) => string; tip: (b: Bucket) => string }) {
  const max = Math.max(1, ...data.map((d) => d.n));
  return (
    <>
      <div className="cols">
        {data.map((d) => (
          <div className="col" key={d.label} data-tip={tip(d)}>
            <span className="col-n">{d.n || ""}</span>
            <span className="col-bar" style={{ height: `${Math.max(d.n ? 2 : 0, (d.n / max) * 100)}%`, background: colorOf(d) }} />
          </div>
        ))}
      </div>
      <div className="cols-axis">
        {data.map((d) => <span key={d.label}>{d.label}</span>)}
      </div>
    </>
  );
}

function YearColumns({ data }: { data: Bucket[] }) {
  if (!data.length) return <p className="muted small">Sem temporadas preenchidas.</p>;
  const max = Math.max(...data.map((d) => d.n));
  const peak = data.find((d) => d.n === max)!;
  const step = Math.ceil(data.length / 6);
  return (
    <>
      <div className="cols dense">
        {data.map((d) => (
          <div className="col" key={d.label} data-tip={`${d.label}: ${d.n} animes`}>
            <span className="col-bar" style={{ height: `${(d.n / max) * 100}%`, background: "var(--red)", opacity: d === peak ? 1 : 0.55 }} />
          </div>
        ))}
      </div>
      <div className="axis-spread">
        {data.filter((_, i) => i % step === 0 || i === data.length - 1).map((d) => <span key={d.label}>{d.label}</span>)}
      </div>
      <div className="muted small">pico › <span className="text">{peak.label} · {peak.n} animes</span></div>
    </>
  );
}

function Bars({ data, color }: { data: Bucket[]; color: string }) {
  const max = Math.max(1, ...data.map((d) => d.n));
  return (
    <div className="hbars">
      {data.map((d) => (
        <div className="hbar" key={d.label}>
          <div className="hbar-head"><span>{d.label}</span><span className="soft">{d.n}</span></div>
          <div className="meter thin"><span style={{ width: `${(d.n / max) * 100}%`, background: color }} /></div>
        </div>
      ))}
    </div>
  );
}

function AreaChart({ data, splitAt }: { data: Bucket[]; splitAt?: string }) {
  const [hover, setHover] = useState<number | null>(null);
  if (data.length < 2) return <p className="muted small">Poucos meses com data para desenhar a linha.</p>;
  const W = 1000, H = 200, P = 6;
  const max = Math.max(...data.map((d) => d.n));
  const x = (i: number) => (i / (data.length - 1)) * W;
  const y = (n: number) => H - P - (n / max) * (H - P * 2);
  const line = data.map((d, i) => `${i ? "L" : "M"}${x(i).toFixed(1)},${y(d.n).toFixed(1)}`).join(" ");
  const years = data.map((d, i) => ({ i, y: d.label.slice(0, 4), m: d.label.slice(5) })).filter((d) => d.m === "01" || d.i === 0);
  const h = hover !== null ? data[hover] : null;
  // onde começa a aba Historico: antes dela só existe a última vez vista (Last seen)
  const split = splitAt ? data.findIndex((d) => d.label >= splitAt) : -1;
  const fonte = (label: string) => (split > 0 ? (label < splitAt! ? " · só a última vez vista" : " · todas as vezes, com rewatches") : "");

  return (
    <div className="area">
      <div className="area-readout">
        {h ? <><b>{fmtMonth(h.label)}</b> · {h.n} anime{h.n === 1 ? "" : "s"}<span className="muted">{fonte(h.label)}</span></> : <span className="muted">passe o mouse no gráfico</span>}
      </div>
      <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" className="area-svg"
        onMouseLeave={() => setHover(null)}
        onMouseMove={(e) => {
          const r = e.currentTarget.getBoundingClientRect();
          setHover(Math.round(((e.clientX - r.left) / r.width) * (data.length - 1)));
        }}>
        {[0.25, 0.5, 0.75].map((f) => <line key={f} x1={0} x2={W} y1={H * f} y2={H * f} className="gridline" />)}
        {split > 0 && <rect x={0} y={0} width={x(split)} height={H} className="area-before" />}
        {split > 0 && <line x1={x(split)} x2={x(split)} y1={0} y2={H} className="area-split" vectorEffect="non-scaling-stroke" />}
        <path d={`${line} L${W},${H} L0,${H} Z`} className="area-fill" />
        <path d={line} className="area-line" vectorEffect="non-scaling-stroke" />
        {hover !== null && (
          <line x1={x(hover)} x2={x(hover)} y1={0} y2={H} className="crosshair" vectorEffect="non-scaling-stroke" />
        )}
      </svg>
      {split > 0 && (
        <div className="area-legend">
          <span><i className="lg-before" /> até dez/2022: última vez vista (Last seen)</span>
          <span><i className="lg-after" /> desde jan/2023: cada vez que assistiu, pela aba Historico</span>
        </div>
      )}
      <div className="area-axis">
        {years.map((d) => (
          <span key={d.i} style={{ left: `${(d.i / (data.length - 1)) * 100}%` }}>{d.y}</span>
        ))}
      </div>
    </div>
  );
}

const DOW = ["SEG", "", "QUA", "", "SEX", "", "DOM"];
const MES = ["JAN", "FEV", "MAR", "ABR", "MAI", "JUN", "JUL", "AGO", "SET", "OUT", "NOV", "DEZ"];

function Heatmap({ rows }: { rows: Anime[] }) {
  const days = useMemo(() => byDay(rows), [rows]);
  const years = useMemo(() => [...new Set([...days.keys()].map((d) => d.slice(0, 4)))].sort(), [days]);
  const [year, setYear] = useState<string | null>(null);
  const cur = year && years.includes(year) ? year : years[years.length - 1];
  if (!cur) return null;

  // Grade de semanas começando na segunda-feira anterior a 1º de janeiro.
  const start = new Date(Number(cur), 0, 1);
  start.setDate(start.getDate() - ((start.getDay() + 6) % 7));
  const end = new Date(Number(cur), 11, 31);
  const cells: { key: string; list: Anime[]; inYear: boolean }[] = [];
  const monthCols: { col: number; label: string }[] = [];
  for (let d = new Date(start), i = 0; d <= end || (i % 7 !== 0); d.setDate(d.getDate() + 1), i++) {
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
    if (d.getDate() === 1 && d.getFullYear() === Number(cur)) monthCols.push({ col: Math.floor(i / 7), label: MES[d.getMonth()] });
    cells.push({ key, list: days.get(key) ?? [], inYear: d.getFullYear() === Number(cur) });
  }
  const weeks = Math.ceil(cells.length / 7);
  const total = cells.reduce((s, c) => s + (c.inYear ? c.list.length : 0), 0);
  const level = (n: number) => (n === 0 ? 0 : n === 1 ? 1 : n <= 3 ? 2 : 3);

  return (
    <section className="panel">
      <div className="panel-row">
        <h3 className="panel-title">ATIVIDADE <span className="panel-note">// {total} animes vistos em {cur}</span></h3>
        <div className="years" role="tablist" aria-label="Ano">
          {years.map((y) => (
            <button type="button" role="tab" aria-selected={y === cur} key={y} className={y === cur ? "yr on" : "yr"} onClick={() => setYear(y)}>{y}</button>
          ))}
        </div>
      </div>
      <div className="heat-scroll">
        <div className="heat">
          <div className="heat-months" style={{ gridTemplateColumns: `repeat(${weeks}, minmax(10px, 1fr))` }}>
            {monthCols.map((m) => <span key={m.label} style={{ gridColumn: m.col + 1 }}>{m.label}</span>)}
          </div>
          <div className="heat-dow">{DOW.map((d, i) => <span key={i}>{d}</span>)}</div>
          <div className="heat-cells" style={{ gridTemplateColumns: `repeat(${weeks}, minmax(10px, 1fr))` }}>
            {cells.map((c) => (
              <span key={c.key}
                className={c.inYear ? `hc l${level(c.list.length)}` : "hc out"}
                data-tip={c.inYear ? `${fmtDate(c.key)} · ${c.list.length ? c.list.map((a) => a.nome).slice(0, 3).join(", ") + (c.list.length > 3 ? ` +${c.list.length - 3}` : "") : "nada"}` : undefined} />
            ))}
          </div>
        </div>
      </div>
      <div className="legend right">
        menos <i className="hc l0" /><i className="hc l1" /><i className="hc l2" /><i className="hc l3" /> mais
      </div>
    </section>
  );
}
