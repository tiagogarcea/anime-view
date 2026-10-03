import { DEFAULT_SORT, EMPTY_FILTERS, Filters, MultiKey, SORTS, SortKey } from "./filters";

/**
 * Filtros, busca e ordenação guardados no endereço, para o F5 não perdê-los e para dar para salvar ou
 * compartilhar uma busca. Ex.: ?busca=frieren&raridade=SSR&raridade=SR&score=8-10&ordem=score&crescente=1
 * Usado no servidor (app/page.tsx) e no cliente (components/App.tsx). Só entra na URL o que difere do padrão.
 */

/** Nome do parâmetro na URL para cada filtro de lista (repete o parâmetro para vários valores). */
const MULTI_PARAM: Record<MultiKey, string> = {
  season: "season",
  ano: "ano",
  studio: "estudio",
  genero: "genero",
  tema: "tema",
  demografia: "demografia",
  fav: "fav",
  rewatch: "rewatch",
  tier: "raridade",
};

export type Busca = { filters: Filters; sortKey: SortKey; sortAsc: boolean };

type Params = URLSearchParams | Record<string, string | string[] | undefined>;

function todos(p: Params, k: string): string[] {
  if (p instanceof URLSearchParams) return p.getAll(k);
  const v = p[k];
  return v === undefined ? [] : Array.isArray(v) ? v : [v];
}
const um = (p: Params, k: string) => todos(p, k)[0] ?? "";

/** "8-10" → [8, 10]; "8-" → [8, null]; "-10" → [null, 10]; inválido → [null, null]. */
function faixa(v: string): [number | null, number | null] {
  const m = v.match(/^(\d+(?:\.\d+)?)?-(\d+(?:\.\d+)?)?$/);
  if (!m) return [null, null];
  return [m[1] !== undefined ? Number(m[1]) : null, m[2] !== undefined ? Number(m[2]) : null];
}
const dataOk = (v: string) => (/^\d{4}-\d{2}-\d{2}$/.test(v) ? v : "");

export function lerBusca(p: Params): Busca {
  const [scoreMin, scoreMax] = faixa(um(p, "score"));
  const [epsMin, epsMax] = faixa(um(p, "eps"));
  const filters: Filters = {
    ...EMPTY_FILTERS,
    q: um(p, "busca"),
    scoreMin, scoreMax, epsMin, epsMax,
    from: dataOk(um(p, "de")),
    to: dataOk(um(p, "ate")),
  };
  for (const [k, nome] of Object.entries(MULTI_PARAM) as [MultiKey, string][]) {
    filters[k] = todos(p, nome).filter(Boolean);
  }
  const ordem = um(p, "ordem") as SortKey;
  const sortKey = SORTS.some((s) => s.key === ordem) ? ordem : DEFAULT_SORT.key;
  const sortAsc = um(p, "crescente") === "" ? (ordem ? false : DEFAULT_SORT.asc) : um(p, "crescente") === "1";
  return { filters, sortKey, sortAsc };
}

/**
 * Escreve filtros e ordenação em `base` (mantém outros parâmetros, como ?aba=) e devolve a busca pronta,
 * com "?" na frente, ou "" se não sobrou nada.
 */
export function escreverBusca(base: URLSearchParams, { filters: f, sortKey, sortAsc }: Busca): string {
  const q = new URLSearchParams(base);
  for (const k of ["busca", "score", "eps", "de", "ate", "ordem", "crescente", ...Object.values(MULTI_PARAM)]) q.delete(k);
  if (f.q.trim()) q.set("busca", f.q);
  if (f.scoreMin !== null || f.scoreMax !== null) q.set("score", `${f.scoreMin ?? ""}-${f.scoreMax ?? ""}`);
  if (f.epsMin !== null || f.epsMax !== null) q.set("eps", `${f.epsMin ?? ""}-${f.epsMax ?? ""}`);
  if (f.from) q.set("de", f.from);
  if (f.to) q.set("ate", f.to);
  for (const [k, nome] of Object.entries(MULTI_PARAM) as [MultiKey, string][]) {
    for (const v of f[k]) q.append(nome, v);
  }
  if (sortKey !== DEFAULT_SORT.key || sortAsc !== DEFAULT_SORT.asc) {
    q.set("ordem", sortKey);
    q.set("crescente", sortAsc ? "1" : "0");
  }
  const s = q.toString();
  return s ? `?${s}` : "";
}
