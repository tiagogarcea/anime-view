import Papa from "papaparse";

/** Uma vez que um anime foi assistido, vinda da aba "Historico" da planilha (desde jan/2023). */
export type Viewing = {
  /** AAAA-MM do mês em que foi assistido */
  ym: string;
  /** N° do anime na aba "Animes Completos" (resolvido pelo nome em resolveHistory) */
  n: number;
  /** nome como está na aba Historico — é a chave que liga à aba "Animes Completos" */
  nome: string;
  /** 0 = primeira vez, 1 = primeiro rewatch, ... */
  rewatch: number | null;
};

export const HISTORY_URL =
  process.env.HISTORY_CSV_URL ||
  "https://docs.google.com/spreadsheets/d/1a6Ylv7yKu8yb1DJkYpZynTSedbOzTUC_ti35fufDyWI/export?format=csv&gid=1281634781";

const MESES = ["janeiro", "fevereiro", "março", "abril", "maio", "junho", "julho", "agosto", "setembro", "outubro", "novembro", "dezembro"];

/** "01/03/2023", "2023-03" ou "Março 2023" → "2023-03" (vazio se não reconhecer). */
function mesDe(v: string): string {
  const d = v.trim();
  let m = d.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})/);
  if (m) return `${m[3]}-${m[2].padStart(2, "0")}`;
  m = d.match(/^(\d{4})-(\d{2})/);
  if (m) return `${m[1]}-${m[2]}`;
  m = d.toLowerCase().match(/^([a-zç]+)\s+(?:de\s+)?(\d{4})$/);
  if (m) {
    const i = MESES.indexOf(m[1].replace("marco", "março"));
    if (i >= 0) return `${m[2]}-${String(i + 1).padStart(2, "0")}`;
  }
  return "";
}

export function parseHistory(csv: string): Viewing[] {
  const rows = Papa.parse<string[]>(csv, { skipEmptyLines: true }).data;
  if (!rows.length) return [];
  const header = rows[0].map((h) => h.trim().toLowerCase());
  // pode haver mais de uma coluna "Data" (ex.: "Janeiro 2023" e "01/01/2023"): tenta todas
  const iDatas = header.map((h, i) => (h === "data" || h === "mês" || h === "mes" ? i : -1)).filter((i) => i >= 0);
  const iN = header.findIndex((h) => ["n°", "n", "no", "#"].includes(h));
  const iR = header.indexOf("rewatch");
  const iNome = header.findIndex((h) => ["nome", "anime"].includes(h));
  const out: Viewing[] = [];
  for (const r of rows.slice(1)) {
    const ym = iDatas.map((i) => mesDe(r[i] ?? "")).find(Boolean);
    const n = iN >= 0 ? parseInt(r[iN] ?? "", 10) || 0 : 0;
    const nome = iNome >= 0 ? (r[iNome] ?? "").trim() : "";
    if (!ym || (!n && !nome)) continue;
    const rw = parseInt(r[iR] ?? "", 10);
    out.push({ ym, n, nome, rewatch: Number.isFinite(rw) ? rw : null });
  }
  return out;
}

/** Lê a aba agora; falha → erro (lib/dados.ts guarda a última versão boa). */
export async function loadHistory(): Promise<Viewing[]> {
  const res = await fetch(HISTORY_URL, { cache: "no-store", signal: AbortSignal.timeout(15000) });
  if (!res.ok) throw new Error(`Historico respondeu ${res.status}`);
  const h = parseHistory(await res.text());
  if (!h.length) throw new Error("Historico veio vazio");
  return h;
}

const chave = (s: string) => s.trim().toLowerCase().replace(/\s+/g, " ");

/**
 * Liga cada linha do Historico ao anime da aba principal pelo nome (ignorando maiúsculas e espaços).
 * Se a linha não tiver nome (formato antigo), usa o N°. Linhas sem correspondência ficam de fora
 * (e aparecem no aviso do Stats, ver historicoSemPar).
 */
export function resolveHistory(history: Viewing[], animes: { n: number; nome: string }[]): Viewing[] {
  const porNome = new Map(animes.map((a) => [chave(a.nome), a.n]));
  const ns = new Set(animes.map((a) => a.n));
  const out: Viewing[] = [];
  for (const v of history) {
    const n = v.nome ? porNome.get(chave(v.nome)) : ns.has(v.n) ? v.n : undefined;
    if (n) out.push({ ...v, n });
  }
  return out;
}

/** Linha do Historico que não achou o anime na aba principal, com o nome mais parecido (se houver). */
export type SemPar = { ym: string; nome: string; sugestao: string };

/**
 * As linhas que resolveHistory descarta: nome que não existe na aba "Animes Completos" (erro de
 * digitação, anime renomeado) ou, no formato antigo, N° que não existe. O Stats mostra um aviso com
 * elas, para não sumirem da retrospectiva sem ninguém perceber.
 */
export function historicoSemPar(history: Viewing[], animes: { n: number; nome: string }[]): SemPar[] {
  const nomes = new Map(animes.map((a) => [chave(a.nome), a.nome]));
  const ns = new Set(animes.map((a) => a.n));
  return history
    .filter((v) => (v.nome ? !nomes.has(chave(v.nome)) : !ns.has(v.n)))
    .map((v) => ({ ym: v.ym, nome: v.nome || `N° ${v.n}`, sugestao: v.nome ? parecido(chave(v.nome), nomes) : "" }));
}

/** Nome da lista mais próximo (distância de edição até ~20% do tamanho), para sugerir a correção. */
function parecido(alvo: string, nomes: Map<string, string>): string {
  let melhor = "";
  let menor = Math.max(2, Math.floor(alvo.length * 0.2)) + 1;
  for (const [k, original] of nomes) {
    if (Math.abs(k.length - alvo.length) >= menor) continue;
    const d = distancia(alvo, k, menor);
    if (d < menor) { menor = d; melhor = original; }
  }
  return melhor;
}

/** Distância de Levenshtein; para de contar quando passa de `teto`. */
function distancia(a: string, b: string, teto: number): number {
  let ant = Array.from({ length: b.length + 1 }, (_, j) => j);
  for (let i = 1; i <= a.length; i++) {
    const cur = [i];
    let minLinha = i;
    for (let j = 1; j <= b.length; j++) {
      cur[j] = Math.min(ant[j] + 1, cur[j - 1] + 1, ant[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
      minLinha = Math.min(minLinha, cur[j]);
    }
    if (minLinha >= teto) return teto;
    ant = cur;
  }
  return ant[b.length];
}
