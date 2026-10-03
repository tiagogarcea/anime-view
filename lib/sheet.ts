import Papa from "papaparse";
import { Anime, tierOf } from "./types";

export const SHEET_URL =
  process.env.SHEET_CSV_URL ||
  "https://docs.google.com/spreadsheets/d/1a6Ylv7yKu8yb1DJkYpZynTSedbOzTUC_ti35fufDyWI/export?format=csv&gid=1713940120";

/** Nomes de coluna aceitos para cada campo (o primeiro que existir vence). */
const COLS = {
  n: ["N°", "N", "No", "#"],
  nome: ["Nome", "Name"],
  nomeEn: ["Nome_Ingles", "Nome Ingles", "English"],
  score: ["Score", "Nota"],
  eps: ["Episodes", "Episódios", "Episodios"],
  minPerEp: ["Time/episode", "Time per episode", "Duracao"],
  rewatch: ["Rewatched", "Rewatch"],
  studio: ["Studio", "Estúdio", "Estudio"],
  genero: ["Gênero", "Genero", "Genre"],
  tema: ["Tema", "Theme"],
  demografia: ["Demografia", "Demographic"],
  temporada: ["Temporada", "Season"],
  comentario: ["Coments", "Comments", "Comentário"],
  favorite: ["Favorite", "Favorito"],
  lastSeen: ["Last seen", "Visto em"],
  link: ["Link"],
  imagem: ["Imagem", "Image"],
  mal: ["URL_Pagina", "URL Pagina", "MAL"],
  cr: ["Link do Anime", "Crunchyroll"],
  streaming: ["Streaming"],
} as const;

function clean(v: unknown): string {
  const s = String(v ?? "").trim();
  return ["nan", "none"].includes(s.toLowerCase()) ? "" : s;
}

function num(v: string): number {
  const x = parseFloat(v.replace(",", "."));
  return Number.isFinite(x) ? x : 0;
}

/** Aceita DD/MM/AAAA (padrão da planilha) e AAAA-MM-DD. */
function parseDate(v: string): string | null {
  let m = v.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})/);
  if (m) {
    const [, d, mo, y] = m;
    return `${y}-${mo.padStart(2, "0")}-${d.padStart(2, "0")}`;
  }
  m = v.match(/^(\d{4})-(\d{2})-(\d{2})/);
  return m ? `${m[1]}-${m[2]}-${m[3]}` : null;
}

function url(v: string): string {
  return v.startsWith("http") ? v : "";
}

export function parseSheet(csv: string): Anime[] {
  const rows = Papa.parse<string[]>(csv, { skipEmptyLines: true }).data;

  // Pode haver linhas de título antes do cabeçalho: procura nas 10 primeiras.
  let headerIdx = rows.slice(0, 10).findIndex((r) => r.some((c) => ["Nome", "Episodes"].includes(c.trim())));
  if (headerIdx < 0) headerIdx = 0;
  const header = rows[headerIdx].map((h) => h.trim());

  const idx = Object.fromEntries(
    Object.entries(COLS).map(([k, names]) => [k, names.map((n) => header.indexOf(n)).find((i) => i >= 0) ?? -1]),
  ) as Record<keyof typeof COLS, number>;
  const get = (r: string[], k: keyof typeof COLS) => (idx[k] >= 0 ? clean(r[idx[k]]) : "");

  const out: Anime[] = [];
  rows.slice(headerIdx + 1).forEach((r, i) => {
    const nome = get(r, "nome");
    if (!nome) return;
    const temporada = get(r, "temporada");
    const [season = "", ano = ""] = temporada.split(/\s+/, 2);
    const score = num(get(r, "score"));
    const favorite = get(r, "favorite");
    out.push({
      id: i,
      n: num(get(r, "n")),
      nome,
      nomeEn: get(r, "nomeEn"),
      score,
      eps: num(get(r, "eps")),
      minPerEp: num(get(r, "minPerEp")),
      rewatch: Math.trunc(num(get(r, "rewatch"))),
      studio: get(r, "studio"),
      genero: get(r, "genero"),
      tema: get(r, "tema"),
      demografia: get(r, "demografia"),
      temporada,
      season,
      ano,
      comentario: get(r, "comentario"),
      favorite,
      isFav: favorite.toUpperCase().includes("FAV"),
      lastSeen: parseDate(get(r, "lastSeen")),
      img: url(get(r, "link")) || url(get(r, "imagem")),
      malUrl: url(get(r, "mal")),
      crUrl: url(get(r, "cr")),
      streaming: get(r, "streaming"),
      tier: tierOf(score),
    });
  });

  unifyCase(out, ["genero", "tema", "studio", "demografia"]);
  return out;
}

/** "Sci-Fi" e "Sci-fi" viram um só valor: fica a grafia mais frequente. */
function unifyCase(list: Anime[], keys: ("genero" | "tema" | "studio" | "demografia")[]) {
  for (const k of keys) {
    const counts = new Map<string, Map<string, number>>();
    for (const a of list) {
      const low = a[k].toLowerCase();
      const m = counts.get(low) ?? new Map<string, number>();
      m.set(a[k], (m.get(a[k]) ?? 0) + 1);
      counts.set(low, m);
    }
    const canon = new Map([...counts].map(([low, m]) => [low, [...m].sort((x, y) => y[1] - x[1])[0][0]]));
    for (const a of list) a[k] = canon.get(a[k].toLowerCase()) ?? a[k];
  }
}

/** Lê a aba agora (o cache e o "último que funcionou" ficam em lib/dados.ts). Falha → erro. */
export async function loadAnimes(): Promise<Anime[]> {
  const res = await fetch(SHEET_URL, { cache: "no-store" });
  if (!res.ok) throw new Error(`Planilha respondeu ${res.status}`);
  const animes = parseSheet(await res.text());
  // o Google às vezes responde 200 com uma página de erro: sem nenhum anime, não serve
  if (!animes.length) throw new Error("Planilha veio vazia");
  return animes;
}
