/** Aba "Temporada Atual": animes em exibição que estou acompanhando semana a semana. */
export type SeasonItem = {
  numero: number;
  nome: string;
  /** AAAA-MM-DD do primeiro episódio (coluna "Dia de inicio") */
  inicio: string | null;
  /** "Segunda", "Terça"... (coluna "Dia da semana") */
  diaSemana: string;
  /** coluna "Último episódio visto"; null = nenhum ainda */
  ultimoEp: number | null;
  img: string;
};

const SHEET_ID = "1a6Ylv7yKu8yb1DJkYpZynTSedbOzTUC_ti35fufDyWI";

/** App da Web do script em apps-script/Temporada.gs. Sem a SENHA ele só devolve as capas. */
export const SCRIPT_URL =
  process.env.TEMPORADA_SCRIPT_URL ||
  "https://script.google.com/macros/s/AKfycbw80HhY59_3apd7ovE2_9_weZYq1JX1hXOk4ZSHdz9zWzHEjxh6MabjraoX3MoPRcVVHQ/exec";
const GVIZ = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/gviz/tq?tqx=out:json&sheet=${encodeURIComponent("Temporada Atual")}`;

type GvizCell = { v?: unknown; f?: string } | null;

/** O JSON do Google vem embrulhado: google.visualization.Query.setResponse({...}); */
function parseGviz(text: string): SeasonItem[] {
  const json = JSON.parse(text.slice(text.indexOf("{"), text.lastIndexOf("}") + 1));
  const cols: string[] = json.table.cols.map((c: { label?: string }) => (c.label ?? "").trim());
  const idx = (name: string) => cols.findIndex((c) => c === name);
  const iNum = idx("Número"), iNome = idx("Anime"), iIni = idx("Dia de inicio"), iDia = idx("Dia da semana"), iEp = idx("Último episódio visto");
  const cell = (row: GvizCell[], i: number) => (i >= 0 ? row[i] : null);
  const out: SeasonItem[] = [];
  for (const r of json.table.rows as { c: GvizCell[] }[]) {
    const numero = Number(cell(r.c, iNum)?.v);
    const nome = String(cell(r.c, iNome)?.v ?? "").trim();
    if (!numero || !nome) continue;
    // datas chegam como "Date(2026,9,5)" — mês começa em 0
    const d = String(cell(r.c, iIni)?.v ?? "").match(/Date\((\d+),(\d+),(\d+)/);
    const inicio = d ? `${d[1]}-${String(+d[2] + 1).padStart(2, "0")}-${d[3].padStart(2, "0")}` : null;
    const epRaw = cell(r.c, iEp)?.v;
    const ep = epRaw === null || epRaw === undefined || epRaw === "" ? null : parseInt(String(epRaw), 10);
    out.push({ numero, nome, inicio, diaSemana: String(cell(r.c, iDia)?.v ?? "").trim(), ultimoEp: Number.isFinite(ep) ? ep : null, img: "" });
  }
  return out;
}

export async function loadTemporada(): Promise<SeasonItem[]> {
  try {
    const res = await fetch(GVIZ, { next: { revalidate: 60, tags: ["temporada"] } });
    if (!res.ok) return [];
    const itens = parseGviz(await res.text());
    // capas coladas nas células só saem pelo script do Google (opcional)
    const script = SCRIPT_URL;
    if (script) {
      try {
        const r = await fetch(script, { next: { revalidate: 3600 } });
        const j = await r.json();
        const imgs = new Map<number, string>((j.itens ?? []).map((x: { numero: number; imagem: string }) => [Number(x.numero), x.imagem]));
        // o Google devolve a capa em 2048 px; 240 px sobra para a miniatura
        for (const it of itens) it.img = (imgs.get(it.numero) ?? "").replace(/=s\d+(?=[?&]|$)/, "=s240");
      } catch {
        /* sem capas: o site mostra a inicial */
      }
    }
    return itens;
  } catch {
    return [];
  }
}

// ── Regras dos ícones (rodam no navegador, com a data de hoje)

export type SeasonStatus = "pre" | "ok" | "late" | "unknown";

const DIA_MS = 86_400_000;
const toDay = (iso: string) => { const [y, m, d] = iso.split("-").map(Number); return Date.UTC(y, m - 1, d); };
export const todayIso = (now = new Date()) =>
  `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;

/** Episódios já lançados supondo 1 por semana desde o "Dia de inicio" (0 = não estreou). */
export function releasedEpisodes(inicio: string | null, hoje: string): number | null {
  if (!inicio) return null;
  const dias = Math.floor((toDay(hoje) - toDay(inicio)) / DIA_MS);
  return dias < 0 ? 0 : Math.floor(dias / 7) + 1;
}

export function seasonStatus(item: Pick<SeasonItem, "inicio" | "ultimoEp">, hoje: string): SeasonStatus {
  const saiu = releasedEpisodes(item.inicio, hoje);
  if (saiu === null) return "unknown";
  if (saiu === 0) return "pre";
  return (item.ultimoEp ?? 0) >= saiu ? "ok" : "late";
}

export const DIAS = ["Segunda", "Terça", "Quarta", "Quinta", "Sexta", "Sábado", "Domingo"];
/** Índice em DIAS do dia de hoje (getDay: 0 = domingo). */
export const hojeDia = (now = new Date()) => (now.getDay() + 6) % 7;
