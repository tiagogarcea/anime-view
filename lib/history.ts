import Papa from "papaparse";

/** Uma vez que um anime foi assistido, vinda da aba "Historico" da planilha (desde jan/2023). */
export type Viewing = {
  /** AAAA-MM do mês em que foi assistido */
  ym: string;
  /** N° do anime na aba "Animes Completos" */
  n: number;
  /** 0 = primeira vez, 1 = primeiro rewatch, ... */
  rewatch: number | null;
};

export const HISTORY_URL =
  process.env.HISTORY_CSV_URL ||
  "https://docs.google.com/spreadsheets/d/1a6Ylv7yKu8yb1DJkYpZynTSedbOzTUC_ti35fufDyWI/export?format=csv&gid=1281634781";

export function parseHistory(csv: string): Viewing[] {
  const rows = Papa.parse<string[]>(csv, { skipEmptyLines: true }).data;
  if (!rows.length) return [];
  const header = rows[0].map((h) => h.trim().toLowerCase());
  const iData = header.indexOf("data");
  const iN = header.findIndex((h) => ["n°", "n", "no", "#"].includes(h));
  const iR = header.indexOf("rewatch");
  const out: Viewing[] = [];
  for (const r of rows.slice(1)) {
    const d = (r[iData] ?? "").trim();
    const m = d.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})/) ?? d.match(/^(\d{4})-(\d{2})/);
    const n = parseInt(r[iN] ?? "", 10);
    if (!m || !n) continue;
    const ym = m[0].includes("/") ? `${m[3]}-${m[2].padStart(2, "0")}` : `${m[1]}-${m[2]}`;
    const rw = parseInt(r[iR] ?? "", 10);
    out.push({ ym, n, rewatch: Number.isFinite(rw) ? rw : null });
  }
  return out;
}

/** Se a aba não carregar, o site segue funcionando só com o Last seen. */
export async function loadHistory(): Promise<Viewing[]> {
  try {
    const res = await fetch(HISTORY_URL, { next: { revalidate: 60 } });
    if (!res.ok) return [];
    return parseHistory(await res.text());
  } catch {
    return [];
  }
}
