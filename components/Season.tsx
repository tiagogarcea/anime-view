"use client";

import { useEffect, useMemo, useState } from "react";
import { DIAS, hojeDia, releasedEpisodes, SeasonItem, SeasonStatus, seasonStatus, todayIso } from "@/lib/temporada";
import { fmtDate, hueOf } from "@/lib/format";

const SENHA_KEY = "anime-view-senha";
const ICON: Record<SeasonStatus, string> = { ok: "✓", late: "✕", pre: "—", unknown: "?" };
const ICON_LABEL: Record<SeasonStatus, string> = { ok: "Em dia", late: "Episódio novo não visto", pre: "Ainda não estreou", unknown: "Sem data de início" };

type Pending = { numero: number; episodio: number | null; anterior: number | null };

function lerSenha(): string {
  try { return localStorage.getItem(SENHA_KEY) ?? ""; } catch { return ""; }
}
function guardarSenha(s: string) {
  try { if (s) localStorage.setItem(SENHA_KEY, s); else localStorage.removeItem(SENHA_KEY); } catch { /* navegador sem storage */ }
}

export default function Season({ items }: { items: SeasonItem[] }) {
  const [eps, setEps] = useState<Map<number, number | null>>(() => new Map(items.map((i) => [i.numero, i.ultimoEp])));
  // a data de hoje só existe no navegador (no servidor a página é gerada em cache)
  const [hoje, setHoje] = useState<string | null>(null);
  const [senha, setSenha] = useState("");
  const [pedirSenha, setPedirSenha] = useState<Pending | null>(null);
  const [salvando, setSalvando] = useState<Set<number>>(new Set());
  const [aviso, setAviso] = useState("");

  useEffect(() => { setHoje(todayIso()); setSenha(lerSenha()); }, []);
  useEffect(() => setEps(new Map(items.map((i) => [i.numero, i.ultimoEp]))), [items]);

  const lista = useMemo(() => items.map((i) => ({ ...i, ultimoEp: eps.get(i.numero) ?? null })), [items, eps]);
  const status = (i: SeasonItem): SeasonStatus => (hoje ? seasonStatus(i, hoje) : "unknown");
  const contagem = useMemo(() => {
    const c = { ok: 0, late: 0, pre: 0, unknown: 0 };
    if (hoje) for (const i of lista) c[seasonStatus(i, hoje)]++;
    return c;
  }, [lista, hoje]);

  const grupos = useMemo(() => {
    const g = DIAS.map((dia) => ({ dia, itens: lista.filter((i) => i.diaSemana === dia) }));
    const outros = lista.filter((i) => !DIAS.includes(i.diaSemana));
    if (outros.length) g.push({ dia: "Outros", itens: outros });
    return g.filter((x) => x.itens.length);
  }, [lista]);

  // `original` = valor antes da primeira tentativa; se a senha falhar e for cancelada, volta para ele
  async function salvar(numero: number, episodio: number | null, senhaUsada = senha, original?: number | null) {
    const anterior = original !== undefined ? original : eps.get(numero) ?? null;
    setEps((m) => new Map(m).set(numero, episodio));
    if (!senhaUsada) {
      setPedirSenha({ numero, episodio, anterior });
      return;
    }
    setSalvando((s) => new Set(s).add(numero));
    setAviso("");
    try {
      const r = await fetch("/api/temporada", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ numero, episodio: episodio ?? "", senha: senhaUsada }),
      });
      const j = await r.json().catch(() => ({}));
      if (r.status === 401) {
        guardarSenha("");
        setSenha("");
        setPedirSenha({ numero, episodio, anterior });
        setAviso("Senha incorreta.");
        return;
      }
      if (!r.ok || !j.ok) {
        setEps((m) => new Map(m).set(numero, anterior));
        setAviso(j.erro === "nao-configurado" ? "A gravação na planilha ainda não foi configurada (falta o script do Google)." : "Não consegui salvar na planilha. Tente de novo.");
      }
    } catch {
      setEps((m) => new Map(m).set(numero, anterior));
      setAviso("Sem conexão para salvar na planilha.");
    } finally {
      setSalvando((s) => { const n = new Set(s); n.delete(numero); return n; });
    }
  }

  const hojeIdx = hoje ? hojeDia() : -1;

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
          <span className="st-ok"><i>✓</i> {contagem.ok} em dia</span>
          <span className="st-late"><i>✕</i> {contagem.late} com episódio novo</span>
          <span className="st-pre"><i>—</i> {contagem.pre} não estrearam</span>
        </div>
      </div>
      {aviso && <div className="season-aviso" role="status">{aviso}</div>}

      {grupos.map(({ dia, itens }) => (
        <div key={dia} className={DIAS.indexOf(dia) === hojeIdx ? "day today" : "day"}>
          <div className="day-name">{dia.toUpperCase()}{DIAS.indexOf(dia) === hojeIdx && <span> · HOJE</span>}</div>
          {itens.map((i) => {
            const st = status(i);
            const saiu = hoje ? releasedEpisodes(i.inicio, hoje) : null;
            return (
              <Linha key={i.numero} item={i} st={st} saiu={saiu} salvando={salvando.has(i.numero)} onSalvar={(ep) => salvar(i.numero, ep)} />
            );
          })}
        </div>
      ))}

      <p className="season-nota muted small">
        Os episódios lançados são estimados a partir do &quot;Dia de inicio&quot; (um por semana). Pausas e fim de temporada não entram na conta.
      </p>

      {pedirSenha && (
        <SenhaModal
          onCancel={() => {
            setEps((m) => new Map(m).set(pedirSenha.numero, pedirSenha.anterior));
            setPedirSenha(null);
          }}
          onOk={(s) => {
            guardarSenha(s);
            setSenha(s);
            const p = pedirSenha;
            setPedirSenha(null);
            salvar(p.numero, p.episodio, s, p.anterior);
          }}
        />
      )}
    </section>
  );
}

function Linha({ item, st, saiu, salvando, onSalvar }: { item: SeasonItem; st: SeasonStatus; saiu: number | null; salvando: boolean; onSalvar: (ep: number | null) => void }) {
  const [txt, setTxt] = useState(item.ultimoEp?.toString() ?? "");
  useEffect(() => setTxt(item.ultimoEp?.toString() ?? ""), [item.ultimoEp]);
  const visto = item.ultimoEp ?? 0;

  const commit = () => {
    const v = txt.trim() === "" ? null : parseInt(txt, 10);
    if (v !== null && (!Number.isFinite(v) || v < 0)) { setTxt(item.ultimoEp?.toString() ?? ""); return; }
    if (v !== item.ultimoEp) onSalvar(v);
  };

  let meta = "";
  if (st === "pre") meta = `estreia ${fmtDate(item.inicio)}`;
  else if (st === "unknown") meta = item.inicio ? "" : "sem data de início na planilha";
  else if (st === "ok") meta = `EP ${visto} visto · em dia`;
  else meta = `EP ${visto} visto · já saiu o EP ${saiu}${saiu && saiu - visto > 1 ? ` (${saiu - visto} atrás)` : ""}`;

  return (
    <div className={`srow s-${st}`}>
      <span className="sicon" role="img" aria-label={ICON_LABEL[st]} title={ICON_LABEL[st]}>{ICON[st]}</span>
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
        <div className="smeta">{meta}{salvando && <span className="saving"> · salvando…</span>}</div>
      </div>
      <div className="sstep">
        <button type="button" onClick={() => onSalvar(visto > 1 ? visto - 1 : null)} disabled={!item.ultimoEp} aria-label={`Diminuir episódio de ${item.nome}`}>−</button>
        <label>
          <span className="sr-only">Último episódio visto de {item.nome}</span>
          <input
            type="number" min={0} inputMode="numeric" placeholder="—" value={txt}
            onChange={(e) => setTxt(e.target.value)}
            onBlur={commit}
            onKeyDown={(e) => { if (e.key === "Enter") (e.target as HTMLInputElement).blur(); }}
          />
        </label>
        <button type="button" onClick={() => onSalvar(visto + 1)} aria-label={`Marcar o próximo episódio de ${item.nome}`}>+</button>
      </div>
      {st === "late" && saiu !== null && (
        <button type="button" className="scatch" onClick={() => onSalvar(saiu)}>✓ EP {saiu}</button>
      )}
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
