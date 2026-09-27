"use client";

import { activeCount, Filters, MULTI, SortKey, SORTS } from "@/lib/filters";
import { fmtDate, fmtInt } from "@/lib/format";
import type { Tab } from "./App";

type Props = {
  tab: Tab;
  filters: Filters;
  onChange: (f: Filters) => void;
  onOpenDrawer: () => void;
  onClear: () => void;
  count: number;
  sortKey: SortKey;
  sortAsc: boolean;
  onSort: (k: SortKey, asc: boolean) => void;
};

const FAV_LABEL: Record<string, string> = { FAV: "♥ favorito", NO: "não favorito" };

/** Barra acima da grade: título, chips dos filtros ativos (clique remove) e ordenação. */
export default function FilterBar({ tab, filters, onChange, onOpenDrawer, onClear, count, sortKey, sortAsc, onSort }: Props) {
  const chips: { label: string; remove: () => void; tone?: string }[] = [];

  if (filters.scoreMin !== null || filters.scoreMax !== null) {
    chips.push({
      label: `score ${filters.scoreMin ?? "…"}–${filters.scoreMax ?? "…"}`,
      remove: () => onChange({ ...filters, scoreMin: null, scoreMax: null }),
    });
  }
  if (filters.from || filters.to) {
    chips.push({
      label: `visto ${filters.from ? fmtDate(filters.from) : "…"} → ${filters.to ? fmtDate(filters.to) : "…"}`,
      remove: () => onChange({ ...filters, from: "", to: "" }),
    });
  }
  for (const { key, label } of MULTI) {
    for (const v of filters[key]) {
      chips.push({
        label: `${label.split(" ")[0].toLowerCase()}=${key === "fav" ? FAV_LABEL[v] ?? v : v}`,
        remove: () => onChange({ ...filters, [key]: filters[key].filter((x) => x !== v) }),
        tone: key === "tier" ? "gold" : undefined,
      });
    }
  }

  const n = activeCount(filters);

  return (
    <section className="bar">
      <h2 className="bar-title">{tab === "deck" ? "O DECK" : "ESTATÍSTICAS"}</h2>
      {tab === "stats" && <span className="muted small">baseado em {fmtInt(count)} cartas filtradas ›</span>}
      <div className="chips">
        {chips.map((c) => (
          <button type="button" key={c.label} className={`chip ${c.tone ?? ""}`} onClick={c.remove} aria-label={`Remover filtro ${c.label}`}>
            {c.label} <span aria-hidden>✕</span>
          </button>
        ))}
        <button type="button" className="chip add" onClick={onOpenDrawer}>
          + filtros{n ? ` (${n})` : ""}
        </button>
        {n > 0 && (
          <button type="button" className="chip ghost" onClick={onClear}>
            limpar tudo
          </button>
        )}
      </div>
      {tab === "deck" && (
        <div className="sort">
          <label>
            <span className="muted">SORT ›</span>
            <select value={sortKey} onChange={(e) => onSort(e.target.value as SortKey, sortAsc)}>
              {SORTS.map((s) => (
                <option key={s.key} value={s.key}>{s.label}</option>
              ))}
            </select>
          </label>
          <button type="button" className="dir" onClick={() => onSort(sortKey, !sortAsc)} aria-label={sortAsc ? "Crescente; trocar para decrescente" : "Decrescente; trocar para crescente"}>
            {sortAsc ? "↑ CRESC." : "↓ DECRESC."}
          </button>
          <span className="muted">{fmtInt(count)} CARTAS</span>
        </div>
      )}
    </section>
  );
}
