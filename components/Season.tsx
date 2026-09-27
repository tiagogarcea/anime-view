"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { DIAS, hojeDia, Semanal, SeasonItem } from "@/lib/temporada";
import { fmtDate, hueOf } from "@/lib/format";

const SENHA_KEY = "anime-view-senha";

type Valores = { ep: number | null; sem: Semanal };
type Campo = "episodio" | "semanal";
type Pedido = { numero: number; campo: Campo; novo: Valores; original: Valores };
type Estado = "salvando" | "salvo" | "";

const STATUS: { v: Exclude<Semanal, "">; icon: string; label: string; cls: string }[] = [
  { v: "V", icon: "✓", label: "Em dia", cls: "ok" },
  { v: "X", icon: "✕", label: "Episódio novo não visto", cls: "late" },
  { v: "-", icon: "—", label: "Não estreou", cls: "pre" },
];
const CLS: Record<Semanal, string> = { V: "s-ok", X: "s-late", "-": "s-pre", "": "s-none" };

function lerSenha(): string {
  try { return localStorage.getItem(SENHA_KEY) ?? ""; } catch { return ""; }
}
function guardarSenha(s: string) {
  try { if (s) localStorage.setItem(SENHA_KEY, s); else localStorage.removeItem(SENHA_KEY); } catch { /* sem storage */ }
}

export default function Season({ items }: { items: SeasonItem[] }) {
  const inicial = () => new Map(items.map((i) => [i.numero, { ep: i.ultimoEp, sem: i.semanal }]));
  const [vals, setVals] = useState<Map<number, Valores>>(inicial);
  const [estado, setEstado] = useState<Map<number, Estado>>(new Map());
  const [senha, setSenha] = useState("");
  const [pedirSenha, setPedirSenha] = useState<Pedido | null>(null);
  const [aviso, setAviso] = useState("");
  const [hojeIdx, setHojeIdx] = useState(-1);

  useEffect(() => { setSenha(lerSenha()); setHojeIdx(hojeDia()); }, []);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => setVals(inicial()), [items]);

  const valor = (n: number): Valores => vals.get(n) ?? { ep: null, sem: "" };
  const marcaEstado = (n: number, e: Estado) => setEstado((m) => new Map(m).set(n, e));

  async function salvar(numero: number, campo: Campo, novo: Valores, senhaUsada = senha, original = valor(numero)) {
    setVals((m) => new Map(m).set(numero, novo));
    if (!senhaUsada) { setPedirSenha({ numero, campo, novo, original }); return; }
    marcaEstado(numero, "salvando");
    setAviso("");
    try {
      const r = await fetch("/api/temporada", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(campo === "semanal"
          ? { numero, semanal: novo.sem, episodio: novo.ep ?? "", senha: senhaUsada }
          : { numero, episodio: novo.ep ?? "", senha: senhaUsada }),
      });
      const j = await r.json().catch(() => ({}));
      if (r.status === 401) {
        guardarSenha(""); setSenha("");
        marcaEstado(numero, "");
        setPedirSenha({ numero, campo, novo, original });
        setAviso("Senha incorreta.");
        return;
      }
      if (!r.ok || !j.ok) throw new Error(j.erro ?? "erro");
      if (campo === "semanal" && j.coluna !== "Semanal") {
        // script do Google ainda na versão antiga: gravou só o episódio (igual ao que já estava)
        setVals((m) => new Map(m).set(numero, { ...novo, sem: original.sem }));
        marcaEstado(numero, "");
        setAviso("Para gravar ✓ / ✕ / — atualize o script do Google (Implantar › Gerenciar implantações › Nova versão).");
        return;
      }
      marcaEstado(numero, "salvo");
      setTimeout(() => setEstado((m) => (m.get(numero) === "salvo" ? new Map(m).set(numero, "") : m)), 2500);
    } catch {
      setVals((m) => new Map(m).set(numero, original));
      marcaEstado(numero, "");
      setAviso("Não consegui salvar na planilha. Tente de novo.");
    }
  }

  const lista = useMemo(() => items.map((i) => ({ ...i, ultimoEp: valor(i.numero).ep, semanal: valor(i.numero).sem })),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [items, vals]);
  const contagem = useMemo(() => {
    const c = { V: 0, X: 0, "-": 0, "": 0 };
    for (const i of lista) c[i.semanal]++;
    return c;
  }, [lista]);
  const grupos = useMemo(() => {
    const g = DIAS.map((dia) => ({ dia, itens: lista.filter((i) => i.diaSemana === dia) }));
    const outros = lista.filter((i) => !DIAS.includes(i.diaSemana));
    if (outros.length) g.push({ dia: "Outros", itens: outros });
    return g.filter((x) => x.itens.length);
  }, [lista]);

  if (!items.length) {
    return (
      <section className="empty">
        <div className="empty-code">SEM DADOS</div>
        <div className="empty-title">Não consegui ler a aba Temporada Atual</div>
        <p>Confira se ela existe na planilha e tem as colunas Número, Anime e Dia de inicio.</p>
      </section>
    );
  }

  return (
    <section className="season" aria-label="Temporada atual">
      <div className="bar">
        <h2 className="bar-title">TEMPORADA ATUAL</h2>
        <div className="season-count">
          <span className="st-ok"><i>✓</i> {contagem.V} em dia</span>
          <span className="st-late"><i>✕</i> {contagem.X} com episódio novo</span>
          <span className="st-pre"><i>—</i> {contagem["-"]} não estrearam</span>
          {contagem[""] > 0 && <span className="muted">{contagem[""]} sem marcação</span>}
        </div>
      </div>
      {aviso && <div className="season-aviso" role="status">{aviso}</div>}

      {grupos.map(({ dia, itens }) => (
        <div key={dia} className={DIAS.indexOf(dia) === hojeIdx ? "day today" : "day"}>
          <div className="day-name">{dia.toUpperCase()}{DIAS.indexOf(dia) === hojeIdx && <span> · HOJE</span>}</div>
          {itens.map((i) => (
            <Linha
              key={i.numero}
              item={i}
              estado={estado.get(i.numero) ?? ""}
              onEpisodio={(ep) => salvar(i.numero, "episodio", { ep, sem: valor(i.numero).sem })}
              onSemanal={(sem) => salvar(i.numero, "semanal", { ep: valor(i.numero).ep, sem })}
            />
          ))}
        </div>
      ))}

      <p className="season-nota muted small">Total e episódios lançados vêm do AniList e são atualizados a cada hora.</p>

      {pedirSenha && (
        <SenhaModal
          onCancel={() => {
            setVals((m) => new Map(m).set(pedirSenha.numero, pedirSenha.original));
            setPedirSenha(null);
          }}
          onOk={(s) => {
            guardarSenha(s); setSenha(s);
            const p = pedirSenha;
            setPedirSenha(null);
            salvar(p.numero, p.campo, p.novo, s, p.original);
          }}
        />
      )}
    </section>
  );
}

function Linha({ item, estado, onEpisodio, onSemanal }: {
  item: SeasonItem; estado: Estado; onEpisodio: (ep: number | null) => void; onSemanal: (s: Semanal) => void;
}) {
  const [txt, setTxt] = useState(item.ultimoEp?.toString() ?? "");
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => setTxt(item.ultimoEp?.toString() ?? ""), [item.ultimoEp]);
  const visto = item.ultimoEp ?? 0;

  // salva sozinho meio segundo depois de parar de digitar
  const agendar = (t: string) => {
    setTxt(t);
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => {
      const v = t.trim() === "" ? null : parseInt(t, 10);
      if (v !== null && (!Number.isFinite(v) || v < 0)) return;
      if (v !== item.ultimoEp) onEpisodio(v);
    }, 500);
  };

  const partes: string[] = [];
  partes.push(item.ultimoEp ? `EP ${item.ultimoEp} visto` : "nenhum visto");
  if (item.lancados !== null || item.total !== null) {
    partes.push(`${item.lancados ?? "?"} de ${item.total ?? "?"} lançados`);
  }
  if (item.lancados === 0 && item.inicio) partes.push(`estreia ${fmtDate(item.inicio)}`);

  return (
    <div className={`srow ${CLS[item.semanal]}`}>
      <div className="sstatus" role="group" aria-label={`Status semanal de ${item.nome}`}>
        {STATUS.map((s) => (
          <button
            key={s.v} type="button" className={`sbtn ${s.cls} ${item.semanal === s.v ? "on" : ""}`}
            aria-pressed={item.semanal === s.v} title={s.label}
            onClick={() => onSemanal(item.semanal === s.v ? "" : s.v)}
          >
            {s.icon}
          </button>
        ))}
      </div>
      <span className="sthumb" style={item.img ? undefined : { background: hueOf(item.nome) }}>
        {item.img ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={item.img} alt="" loading="lazy" referrerPolicy="no-referrer" />
        ) : (
          item.nome.charAt(0).toUpperCase()
        )}
      </span>
      <div className="sinfo">
        <div className="sname">{item.nome}</div>
        <div className="smeta">
          {partes.join(" · ")}
          {estado === "salvando" && <span className="saving"> · salvando…</span>}
          {estado === "salvo" && <span className="saved"> · salvo ✓</span>}
        </div>
      </div>
      <div className="sstep">
        <button type="button" onClick={() => onEpisodio(visto > 1 ? visto - 1 : null)} disabled={!item.ultimoEp} aria-label={`Diminuir episódio de ${item.nome}`}>−</button>
        <label>
          <span className="sr-only">Último episódio visto de {item.nome}</span>
          <input
            type="number" min={0} inputMode="numeric" placeholder="—" value={txt}
            onChange={(e) => agendar(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") (e.target as HTMLInputElement).blur(); }}
          />
        </label>
        <button type="button" onClick={() => onEpisodio(visto + 1)} aria-label={`Marcar o próximo episódio de ${item.nome}`}>+</button>
        <span className="stotal" title="Total de episódios (AniList)">/ {item.total ?? "?"}</span>
      </div>
    </div>
  );
}

function SenhaModal({ onOk, onCancel }: { onOk: (s: string) => void; onCancel: () => void }) {
  const [s, setS] = useState("");
  useEffect(() => {
    const k = (e: KeyboardEvent) => e.key === "Escape" && onCancel();
    window.addEventListener("keydown", k);
    return () => window.removeEventListener("keydown", k);
  }, [onCancel]);
  return (
    <div className="modal-wrap" onClick={onCancel}>
      <form
        className="senha" role="dialog" aria-modal="true" aria-label="Senha para marcar episódios"
        onClick={(e) => e.stopPropagation()}
        onSubmit={(e) => { e.preventDefault(); if (s) onOk(s); }}
      >
        <h2>SENHA</h2>
        <p className="muted small">Para gravar na planilha. Fica salva neste navegador.</p>
        <label>
          <span className="sr-only">Senha</span>
          <input type="password" autoFocus value={s} onChange={(e) => setS(e.target.value)} autoComplete="current-password" />
        </label>
        <div className="senha-acoes">
          <button type="button" className="btn line" onClick={onCancel}>CANCELAR</button>
          <button type="submit" className="btn red" disabled={!s}>SALVAR</button>
        </div>
      </form>
    </div>
  );
}
