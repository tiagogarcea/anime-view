import { Anime, Tier, TIERS } from "./types";
import type { Viewing } from "./history";

export type Kpis = {
  count: number;
  avgScore: number;
  days: number;
  hours: number;
  eps: number;
  epsRewatch: number;
};

export function kpis(rows: Anime[]): Kpis {
  const totalDays = rows.reduce((s, a) => s + (a.eps * a.minPerEp * (a.rewatch + 1)) / 1440, 0);
  return {
    count: rows.length,
    avgScore: rows.length ? rows.reduce((s, a) => s + a.score, 0) / rows.length : 0,
    days: Math.floor(totalDays),
    hours: Math.floor((totalDays % 1) * 24),
    eps: rows.reduce((s, a) => s + a.eps * (a.rewatch + 1), 0),
    epsRewatch: rows.reduce((s, a) => s + a.eps * a.rewatch, 0),
  };
}

export function tierCounts(rows: Anime[]): { tier: Tier; n: number }[] {
  return TIERS.map((tier) => ({ tier, n: rows.filter((a) => a.tier === tier).length }));
}

export type Bucket = { label: string; n: number };

export function countBy(rows: Anime[], get: (a: Anime) => string): Bucket[] {
  const m = new Map<string, number>();
  for (const a of rows) {
    const v = get(a);
    if (v) m.set(v, (m.get(v) ?? 0) + 1);
  }
  return [...m].map(([label, n]) => ({ label, n }));
}

export function top(rows: Anime[], get: (a: Anime) => string, k: number): Bucket[] {
  return countBy(rows, get)
    .sort((a, b) => b.n - a.n || a.label.localeCompare(b.label))
    .slice(0, k);
}

/** Contagem por score inteiro, 1 a 10 (score 0 = sem nota, fica de fora). */
export function scoreDistribution(rows: Anime[]): Bucket[] {
  const m = new Map<number, number>();
  for (const a of rows) if (a.score > 0) m.set(Math.trunc(a.score), (m.get(Math.trunc(a.score)) ?? 0) + 1);
  return Array.from({ length: 10 }, (_, i) => ({ label: String(i + 1), n: m.get(i + 1) ?? 0 }));
}

/** Ano de lançamento, contínuo do menor ao maior (anos sem anime aparecem com 0). */
export function byYear(rows: Anime[]): Bucket[] {
  const m = new Map<number, number>();
  for (const a of rows) {
    const y = Number(a.ano);
    if (y) m.set(y, (m.get(y) ?? 0) + 1);
  }
  if (!m.size) return [];
  const ys = [...m.keys()];
  const out: Bucket[] = [];
  for (let y = Math.min(...ys); y <= Math.max(...ys); y++) out.push({ label: String(y), n: m.get(y) ?? 0 });
  return out;
}

/** Assistidos por mês (AAAA-MM), contínuo do primeiro ao último mês. */
export function byMonth(rows: Anime[]): Bucket[] {
  const m = new Map<string, number>();
  for (const a of rows) if (a.lastSeen) m.set(a.lastSeen.slice(0, 7), (m.get(a.lastSeen.slice(0, 7)) ?? 0) + 1);
  if (!m.size) return [];
  const keys = [...m.keys()].sort();
  let [y, mo] = keys[0].split("-").map(Number);
  const [ey, emo] = keys[keys.length - 1].split("-").map(Number);
  const out: Bucket[] = [];
  while (y < ey || (y === ey && mo <= emo)) {
    const k = `${y}-${String(mo).padStart(2, "0")}`;
    out.push({ label: k, n: m.get(k) ?? 0 });
    mo++;
    if (mo > 12) { mo = 1; y++; }
  }
  return out;
}

/** Mês em que começa a aba Historico; antes disso só existe o Last seen. */
export const HISTORY_START = "2023-01";

/**
 * Assistidos por mês juntando as duas fontes:
 * antes de 2023 conta o Last seen (última vez vista); de 2023 em diante conta cada vez
 * registrada na aba Historico, rewatches incluídos. Só entram animes que passaram nos filtros.
 */
export function byMonthWithHistory(rows: Anime[], history: Viewing[]): Bucket[] {
  if (!history.length) return byMonth(rows);
  const m = new Map<string, number>();
  const add = (k: string) => m.set(k, (m.get(k) ?? 0) + 1);
  const ns = new Set(rows.map((a) => a.n));
  for (const a of rows) if (a.lastSeen && a.lastSeen.slice(0, 7) < HISTORY_START) add(a.lastSeen.slice(0, 7));
  for (const v of history) if (ns.has(v.n) && v.ym >= HISTORY_START) add(v.ym);
  if (!m.size) return [];
  const keys = [...m.keys()].sort();
  let [y, mo] = keys[0].split("-").map(Number);
  const [ey, emo] = keys[keys.length - 1].split("-").map(Number);
  const out: Bucket[] = [];
  while (y < ey || (y === ey && mo <= emo)) {
    const k = `${y}-${String(mo).padStart(2, "0")}`;
    out.push({ label: k, n: m.get(k) ?? 0 });
    mo++;
    if (mo > 12) { mo = 1; y++; }
  }
  return out;
}

/** Animes vistos por dia (chave AAAA-MM-DD). */
export function byDay(rows: Anime[]): Map<string, Anime[]> {
  const m = new Map<string, Anime[]>();
  for (const a of rows) if (a.lastSeen) m.set(a.lastSeen, [...(m.get(a.lastSeen) ?? []), a]);
  return m;
}

export function topRewatch(rows: Anime[], k = 24): Anime[] {
  return rows.filter((a) => a.rewatch > 0).sort((a, b) => b.rewatch - a.rewatch || b.score - a.score).slice(0, k);
}

/** Resumo de um ano a partir da aba Historico (só existe de 2023 em diante). */
export type Retro = {
  ano: string;
  /** vezes que assistiu (cada linha do Historico), rewatches incluídos */
  vezes: number;
  /** animes diferentes */
  animes: number;
  primeiras: number;
  rewatches: number;
  episodios: number;
  horas: number;
  /** média do score dos animes diferentes vistos no ano (0 = sem nota) */
  notaMedia: number;
  /** vezes por mês, jan..dez */
  porMes: number[];
  /** último mês com registro (1-12): no ano corrente, até onde vão os dados */
  ateMes: number;
  estudios: Bucket[];
  generos: Bucket[];
  temas: Bucket[];
  /** top 12 scores entre os animes vistos pela 1ª vez no ano (rewatch 0 ou não informado), maior primeiro */
  melhores: Anime[];
};

/** Anos que têm registro no Historico, em ordem. */
export function anosDoHistorico(history: Viewing[]): string[] {
  return [...new Set(history.filter((v) => v.ym >= HISTORY_START).map((v) => v.ym.slice(0, 4)))].sort();
}

/**
 * Retrospectiva de `ano`. Só entram animes que passaram nos filtros (`rows`).
 * `ateMes` (1-12) corta o ano nesse mês, para comparar o mesmo período de dois anos.
 */
export function retrospectiva(rows: Anime[], history: Viewing[], ano: string, ateMes = 12): Retro {
  const porN = new Map(rows.map((a) => [a.n, a]));
  const vistas = history.filter((v) => v.ym.startsWith(`${ano}-`) && Number(v.ym.slice(5, 7)) <= ateMes && porN.has(v.n));
  const porMes = Array<number>(12).fill(0);
  let episodios = 0;
  let minutos = 0;
  let rewatches = 0;
  for (const v of vistas) {
    const a = porN.get(v.n)!;
    porMes[Number(v.ym.slice(5, 7)) - 1]++;
    episodios += a.eps;
    minutos += a.eps * a.minPerEp;
    if (v.rewatch !== null && v.rewatch >= 1) rewatches++;
  }
  const unicos = [...new Set(vistas.map((v) => v.n))].map((n) => porN.get(n)!);
  const comNota = unicos.filter((a) => a.score > 0);
  return {
    ano,
    vezes: vistas.length,
    animes: unicos.length,
    primeiras: vistas.length - rewatches,
    rewatches,
    episodios,
    horas: Math.round(minutos / 60),
    notaMedia: comNota.length ? comNota.reduce((s, a) => s + a.score, 0) / comNota.length : 0,
    porMes,
    ateMes: porMes.reduce((ult, n, i) => (n ? i + 1 : ult), 0),
    estudios: top(unicos, (a) => a.studio, 5),
    generos: top(unicos, (a) => a.genero, 5),
    temas: top(unicos, (a) => a.tema, 5),
    melhores: [...new Set(vistas.filter((v) => !v.rewatch).map((v) => v.n))]
      .map((n) => porN.get(n)!)
      .filter((a) => a.score > 0)
      .sort((a, b) => b.score - a.score || a.nome.localeCompare(b.nome))
      .slice(0, 12),
  };
}
