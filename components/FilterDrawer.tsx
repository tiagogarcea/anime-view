"use client";

import { useEffect, useState } from "react";
import { FilterResult, Filters, MULTI, MultiKey, SortKey, SORTS } from "@/lib/filters";
import { fmtInt } from "@/lib/format";

type Props = {
  open: boolean;
  onClose: () => void;
  filters: Filters;
  onChange: (f: Filters) => void;
  result: FilterResult;
  onClear: () => void;
  sortKey: SortKey;
  sortAsc: boolean;
  onSort: (k: SortKey, asc: boolean) => void;
};

const FAV_LABEL: Record<string, string> = { FAV: "♥ Favorito", NO: "Não favorito" };
const BIG = 14; // listas maiores que isso ganham campo de busca

export default function FilterDrawer({ open, onClose, filters, onChange, result, onClear, sortKey, sortAsc, onSort }: Props) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  const toggle = (key: MultiKey, v: string) => {
    const cur = filters[key];
    onChange({ ...filters, [key]: cur.includes(v) ? cur.filter((x) => x !== v) : [...cur, v] });
  };

  const [sMin, sMax] = result.scoreBounds ?? [0, 10];
  const lo = filters.scoreMin ?? sMin;
  const hi = filters.scoreMax ?? sMax;

  return (
    <div className={open ? "drawer-wrap open" : "drawer-wrap"} aria-hidden={!open}>
      <div className="drawer-backdrop" onClick={onClose} />
      <aside className="drawer" role="dialog" aria-modal="true" aria-label="Filtros">
        <div className="drawer-head">
          <h2>FILTROS</h2>
          <span className="muted small">{fmtInt(result.rows.length)} animes</span>
          <button type="button" className="icon-btn" onClick={onClose} aria-label="Fechar filtros">✕</button>
        </div>

        <div className="drawer-body">
          <fieldset className="fgroup">
            <legend>ORDENAR POR</legend>
            <div className="row">
              <select value={sortKey} onChange={(e) => onSort(e.target.value as SortKey, sortAsc)} aria-label="Coluna de ordenação">
                {SORTS.map((s) => <option key={s.key} value={s.key}>{s.label}</option>)}
              </select>
              <button type="button" className="dir" onClick={() => onSort(sortKey, !sortAsc)}>
                {sortAsc ? "↑ CRESCENTE" : "↓ DECRESCENTE"}
              </button>
            </div>
          </fieldset>

          {result.scoreBounds && sMin < sMax && (
            <fieldset className="fgroup">
              <legend>SCORE <span className="cyan">{lo} – {hi}</span></legend>
              <div className="dual">
                <input
                  type="range" min={sMin} max={sMax} step={1} value={lo} aria-label="Score mínimo"
                  onChange={(e) => {
                    const v = Math.min(Number(e.target.value), hi);
                    onChange({ ...filters, scoreMin: v === sMin ? null : v });
                  }}
                />
                <input
                  type="range" min={sMin} max={sMax} step={1} value={hi} aria-label="Score máximo"
                  onChange={(e) => {
                    const v = Math.max(Number(e.target.value), lo);
                    onChange({ ...filters, scoreMax: v === sMax ? null : v });
                  }}
                />
              </div>
            </fieldset>
          )}

          {result.epsValues.length > 1 && (() => {
            // o slider anda pelas contagens que existem (1, 2, … 12, 13, 24 … 500), não de 1 em 1
            const vals = result.epsValues;
            const last = vals.length - 1;
            const idxDe = (v: number | null, fallback: number) => {
              if (v === null) return fallback;
              const i = vals.findIndex((x) => x >= v);
              return i < 0 ? last : i;
            };
            const iLo = idxDe(filters.epsMin, 0);
            const iHi = filters.epsMax === null ? last : Math.max(iLo, vals.findLastIndex((x) => x <= filters.epsMax!));
            return (
              <fieldset className="fgroup">
                <legend>EPISÓDIOS <span className="cyan">{vals[iLo]} – {vals[iHi]}</span></legend>
                <div className="dual">
                  <input
                    type="range" min={0} max={last} step={1} value={iLo} aria-label="Mínimo de episódios"
                    aria-valuetext={`${vals[iLo]} episódios`}
                    onChange={(e) => {
                      const i = Math.min(Number(e.target.value), iHi);
                      onChange({ ...filters, epsMin: i === 0 ? null : vals[i] });
                    }}
                  />
                  <input
                    type="range" min={0} max={last} step={1} value={iHi} aria-label="Máximo de episódios"
                    aria-valuetext={`${vals[iHi]} episódios`}
                    onChange={(e) => {
                      const i = Math.max(Number(e.target.value), iLo);
                      onChange({ ...filters, epsMax: i === last ? null : vals[i] });
                    }}
                  />
                </div>
              </fieldset>
            );
          })()}

          {result.dateBounds && (
            <fieldset className="fgroup">
              <legend>VISTO ENTRE</legend>
              <div className="row">
                <label className="date">
                  <span className="muted small">De</span>
                  <input type="date" min={result.dateBounds[0]} max={filters.to || result.dateBounds[1]} value={filters.from}
                    onChange={(e) => onChange({ ...filters, from: e.target.value })} />
                </label>
                <label className="date">
                  <span className="muted small">Até</span>
                  <input type="date" min={filters.from || result.dateBounds[0]} max={result.dateBounds[1]} value={filters.to}
                    onChange={(e) => onChange({ ...filters, to: e.target.value })} />
                </label>
              </div>
            </fieldset>
          )}

          {MULTI.map(({ key, label }) => (
            <OptionGroup
              key={key}
              label={label}
              options={result.options[key]}
              selected={filters[key]}
              onToggle={(v) => toggle(key, v)}
              render={(v) => (key === "fav" ? FAV_LABEL[v] ?? v : key === "rewatch" ? `${v}×` : v)}
              tone={key === "tier" ? "gold" : undefined}
            />
          ))}
        </div>

        <div className="drawer-foot">
          <button type="button" className="btn line" onClick={onClear}>LIMPAR TUDO</button>
          <button type="button" className="btn red" onClick={onClose}>VER {fmtInt(result.rows.length)} ANIMES</button>
        </div>
      </aside>
    </div>
  );
}

function OptionGroup({
  label, options, selected, onToggle, render, tone,
}: {
  label: string;
  options: { value: string; count: number }[];
  selected: string[];
  onToggle: (v: string) => void;
  render: (v: string) => string;
  tone?: string;
}) {
  const [q, setQ] = useState("");
  // Selecionados que sumiram das opções (por causa de outro filtro) continuam visíveis para poder desmarcar.
  const missing = selected.filter((s) => !options.some((o) => o.value === s)).map((value) => ({ value, count: 0 }));
  const all = [...missing, ...options];
  const shown = q ? all.filter((o) => o.value.toLowerCase().includes(q.toLowerCase())) : all;
  if (!all.length) return null;

  return (
    <fieldset className="fgroup">
      <legend>{label.toUpperCase()} {selected.length > 0 && <span className="cyan">({selected.length})</span>}</legend>
      {all.length > BIG && (
        <input className="mini-search" type="search" placeholder={`filtrar ${label.toLowerCase()}…`} value={q} onChange={(e) => setQ(e.target.value)} />
      )}
      <div className={all.length > BIG ? "opts scroll" : "opts"}>
        {shown.map((o) => {
          const on = selected.includes(o.value);
          return (
            <button type="button" key={o.value} className={`opt ${on ? "on" : ""} ${tone ?? ""}`} aria-pressed={on} onClick={() => onToggle(o.value)}>
              {render(o.value)} <span className="opt-n">{o.count}</span>
            </button>
          );
        })}
      </div>
    </fieldset>
  );
}
