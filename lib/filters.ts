import { Anime, TIERS } from "./types";

export type MultiKey = "season" | "ano" | "studio" | "genero" | "tema" | "demografia" | "fav" | "rewatch" | "tier";

export type Filters = {
  q: string;
  scoreMin: number | null;
  scoreMax: number | null;
  from: string;
  to: string;
} & Record<MultiKey, string[]>;

export const EMPTY_FILTERS: Filters = {
  q: "",
  scoreMin: null,
  scoreMax: null,
  from: "",
  to: "",
  season: [],
  ano: [],
  studio: [],
  genero: [],
  tema: [],
  demografia: [],
  fav: [],
  rewatch: [],
  tier: [],
};

/** Ordem igual à sidebar do Streamlit: cada filtro só oferece opções que sobraram dos anteriores. */
export const MULTI: { key: MultiKey; label: string; get: (a: Anime) => string }[] = [
  { key: "season", label: "Season", get: (a) => a.season },
  { key: "ano", label: "Ano", get: (a) => a.ano },
  { key: "studio", label: "Estúdio", get: (a) => a.studio },
  { key: "genero", label: "Gênero", get: (a) => a.genero },
  { key: "tema", label: "Tema", get: (a) => a.tema },
  { key: "demografia", label: "Demografia", get: (a) => a.demografia },
  { key: "fav", label: "Favorito", get: (a) => a.favorite },
  { key: "rewatch", label: "Rewatched (nº vezes)", get: (a) => String(a.rewatch) },
  { key: "tier", label: "Raridade", get: (a) => a.tier },
];

export type Option = { value: string; count: number };

export type FilterResult = {
  rows: Anime[];
  scoreBounds: [number, number] | null;
  dateBounds: [string, string] | null;
  options: Record<MultiKey, Option[]>;
};

function optionsOf(pool: Anime[], get: (a: Anime) => string, key: MultiKey): Option[] {
  const m = new Map<string, number>();
  for (const a of pool) {
    const v = get(a);
    if (v) m.set(v, (m.get(v) ?? 0) + 1);
  }
  const opts = [...m].map(([value, count]) => ({ value, count }));
  if (key === "rewatch") return opts.sort((a, b) => Number(a.value) - Number(b.value));
  if (key === "tier") return opts.sort((a, b) => TIERS.indexOf(a.value as never) - TIERS.indexOf(b.value as never));
  return opts.sort((a, b) => a.value.localeCompare(b.value, "pt-BR"));
}

export function applyFilters(all: Anime[], f: Filters): FilterResult {
  let pool = all;

  const q = f.q.trim().toLowerCase();
  if (q) pool = pool.filter((a) => a.nome.toLowerCase().includes(q) || a.nomeEn.toLowerCase().includes(q));

  const scores = pool.map((a) => a.score).filter((s) => s > 0);
  const scoreBounds: [number, number] | null = scores.length
    ? [Math.floor(Math.min(...scores)), Math.ceil(Math.max(...scores))]
    : null;
  if (f.scoreMin !== null) pool = pool.filter((a) => a.score >= f.scoreMin!);
  if (f.scoreMax !== null) pool = pool.filter((a) => a.score <= f.scoreMax!);

  const dates = pool.map((a) => a.lastSeen).filter((d): d is string => !!d).sort();
  const dateBounds: [string, string] | null = dates.length ? [dates[0], dates[dates.length - 1]] : null;
  // Só filtra por data quando o usuário mexeu no intervalo; animes sem data continuam na lista.
  if (f.from) pool = pool.filter((a) => a.lastSeen !== null && a.lastSeen >= f.from);
  if (f.to) pool = pool.filter((a) => a.lastSeen !== null && a.lastSeen <= f.to);

  const options = {} as Record<MultiKey, Option[]>;
  for (const { key, get } of MULTI) {
    options[key] = optionsOf(pool, get, key);
    const sel = f[key];
    if (sel.length) pool = pool.filter((a) => sel.includes(get(a)));
  }

  return { rows: pool, scoreBounds, dateBounds, options };
}

export function activeCount(f: Filters): number {
  let n = MULTI.reduce((acc, { key }) => acc + (f[key].length ? 1 : 0), 0);
  if (f.q.trim()) n++;
  if (f.scoreMin !== null || f.scoreMax !== null) n++;
  if (f.from || f.to) n++;
  return n;
}

export type SortKey = "n" | "nome" | "score" | "eps" | "lastSeen" | "ano" | "studio";

export const SORTS: { key: SortKey; label: string }[] = [
  { key: "n", label: "N°" },
  { key: "nome", label: "Nome" },
  { key: "score", label: "Score" },
  { key: "eps", label: "Episódios" },
  { key: "lastSeen", label: "Visto em (padrão)" },
  { key: "ano", label: "Ano" },
  { key: "studio", label: "Estúdio" },
];

export function sortRows(rows: Anime[], key: SortKey, asc: boolean): Anime[] {
  const val = (a: Anime): string | number | null => {
    switch (key) {
      case "n": return a.n;
      case "nome": return a.nome.toLowerCase();
      case "score": return a.score;
      case "eps": return a.eps;
      case "lastSeen": return a.lastSeen;
      case "ano": return a.ano ? Number(a.ano) : null;
      case "studio": return a.studio ? a.studio.toLowerCase() : null;
    }
  };
  return [...rows].sort((a, b) => {
    const x = val(a);
    const y = val(b);
    // Vazios sempre no fim, qualquer que seja a direção.
    if (x === null && y === null) return a.n - b.n;
    if (x === null) return 1;
    if (y === null) return -1;
    const c = typeof x === "number" && typeof y === "number" ? x - y : String(x).localeCompare(String(y), "pt-BR");
    return (asc ? c : -c) || a.n - b.n;
  });
}

/** Ordem ao abrir o site e ao limpar os filtros: vistos mais recentemente primeiro. */
export const DEFAULT_SORT: { key: SortKey; asc: boolean } = { key: "lastSeen", asc: false };
