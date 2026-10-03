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
  const res = await fetch(HISTORY_URL, { cache: "no-store" });
  if (!res.ok) throw new Error(`Historico respondeu ${res.status}`);
  const h = parseHistory(await res.text());
  if (!h.length) throw new Error("Historico veio vazio");
  return h;
}

const chave = (s: string) => s.trim().toLowerCase().replace(/\s+/g, " ");

/**
 * Liga cada linha do Historico ao anime da aba principal pelo nome (ignorando maiúsculas e espaços).
 * Se a linha não tiver nome (formato antigo), usa o N°. Linhas sem correspondência são descartadas.
 */
export function resolveHistory(history: Viewing[], animes: { n: number; nome: string }[]): Viewing[] {
  const porNome = new Map(animes.map((a) => [chave(a.nome), a.n]));
  const out: Viewing[] = [];
  for (const v of history) {
    const n = v.nome ? porNome.get(chave(v.nome)) : v.n;
    if (n) out.push({ ...v, n });
  }
  return out;
}
