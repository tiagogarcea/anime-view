/** Aba "Temporada Atual": animes em exibição que estou acompanhando semana a semana. */

/** Coluna "Semanal", marcada à mão: V = em dia, X = episódio novo não visto, - = não estreou. */
export type Semanal = "V" | "X" | "-" | "";

export type SeasonItem = {
  numero: number;
  nome: string;
  /** AAAA-MM-DD do primeiro episódio (coluna "Dia de inicio") */
  inicio: string | null;
  /** "Segunda", "Terça"... (coluna "Dia da semana") */
  diaSemana: string;
  /** coluna "Último episódio visto"; null = nenhum ainda */
  ultimoEp: number | null;
  semanal: Semanal;
  img: string;
  /** do AniList: total de episódios da temporada e quantos já foram ao ar (null = não sabe) */
  total: number | null;
  lancados: number | null;
};

const SHEET_ID = "1a6Ylv7yKu8yb1DJkYpZynTSedbOzTUC_ti35fufDyWI";

/** App da Web do script em apps-script/Temporada.gs. Sem a SENHA ele só devolve as capas. */
export const SCRIPT_URL =
  process.env.TEMPORADA_SCRIPT_URL ||
  "https://script.google.com/macros/s/AKfycbw80HhY59_3apd7ovE2_9_weZYq1JX1hXOk4ZSHdz9zWzHEjxh6MabjraoX3MoPRcVVHQ/exec";

const GVIZ = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/gviz/tq?tqx=out:json&sheet=${encodeURIComponent("Temporada Atual")}`;

type GvizCell = { v?: unknown; f?: string } | null;

export function normSemanal(v: unknown): Semanal {
  const s = String(v ?? "").trim().toUpperCase();
  if (s === "V" || s === "X") return s;
  if (s === "-" || s === "—" || s === "–") return "-";
  return "";
}

/** O JSON do Google vem embrulhado: google.visualization.Query.setResponse({...}); */
function parseGviz(text: string): SeasonItem[] {
  const json = JSON.parse(text.slice(text.indexOf("{"), text.lastIndexOf("}") + 1));
  const cols: string[] = json.table.cols.map((c: { label?: string }) => (c.label ?? "").trim());
  const idx = (name: string) => cols.findIndex((c) => c === name);
  const iNum = idx("Número"), iNome = idx("Anime"), iIni = idx("Dia de inicio"), iDia = idx("Dia da semana");
  const iEp = idx("Último episódio visto"), iSem = idx("Semanal");
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
    out.push({
      numero, nome, inicio,
      diaSemana: String(cell(r.c, iDia)?.v ?? "").trim(),
      ultimoEp: Number.isFinite(ep) ? ep : null,
      semanal: normSemanal(cell(r.c, iSem)?.v),
      img: "", total: null, lancados: null,
    });
  }
  return out;
}

// ── AniList: total de episódios e quantos já foram ao ar

type AlMedia = {
  episodes: number | null;
  status: string;
  startDate: { year: number | null; month: number | null; day: number | null };
  nextAiringEpisode: { episode: number } | null;
};

const dias = (a: string, b: string) => Math.abs(Date.parse(a) - Date.parse(b)) / 86_400_000;

/** Escolhe o resultado cuja estreia fica a até 30 dias do "Dia de inicio" (evita homônimos). */
function escolher(cands: AlMedia[], inicio: string | null): AlMedia | null {
  for (const m of cands) {
    const { year, month, day } = m.startDate;
    if (!inicio) return m;
    if (year && month && dias(`${year}-${String(month).padStart(2, "0")}-${String(day ?? 1).padStart(2, "0")}`, inicio) <= 30) return m;
  }
  return null;
}

/** "Tensei shitara Ken deshita II" → também tenta "... 2" e "... 2nd Season". */
function variantes(nome: string): string[] {
  const out = new Set<string>();
  const rom: Record<string, string> = { II: "2", III: "3", IV: "4" };
  const ord: Record<string, string> = { "2": "2nd Season", "3": "3rd Season", "4": "4th Season" };
  const m = nome.match(/^(.*?)\s+(II|III|IV)$/);
  if (m) { out.add(`${m[1]} ${rom[m[2]]}`); out.add(`${m[1]} ${ord[rom[m[2]]]}`); }
  const p = nome.split(":")[0].trim();
  if (p && p !== nome) out.add(p);
  return [...out];
}

async function buscarAniList(buscas: string[]): Promise<AlMedia[][]> {
  if (!buscas.length) return [];
  const campos = "episodes status startDate{year month day} nextAiringEpisode{episode}";
  const query = `query(${buscas.map((_, i) => `$s${i}:String`).join(",")}){${buscas
    .map((_, i) => `q${i}:Page(perPage:5){media(search:$s${i},type:ANIME,sort:SEARCH_MATCH){${campos}}}`)
    .join(" ")}}`;
  const variables = Object.fromEntries(buscas.map((s, i) => [`s${i}`, s]));
  const r = await fetch("https://graphql.anilist.co", {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify({ query, variables }),
    next: { revalidate: 3600 },
  });
  if (!r.ok) return buscas.map(() => []);
  const j = await r.json();
  return buscas.map((_, i) => j?.data?.[`q${i}`]?.media ?? []);
}

async function completarComAniList(itens: SeasonItem[]) {
  const achado = new Map<number, AlMedia>();
  const primeira = await buscarAniList(itens.map((i) => i.nome));
  itens.forEach((it, k) => { const m = escolher(primeira[k] ?? [], it.inicio); if (m) achado.set(it.numero, m); });
  const falta = itens.filter((i) => !achado.has(i.numero)).flatMap((i) => variantes(i.nome).map((v) => ({ it: i, v })));
  if (falta.length) {
    const segunda = await buscarAniList(falta.map((f) => f.v));
    falta.forEach((f, k) => { if (!achado.has(f.it.numero)) { const m = escolher(segunda[k] ?? [], f.it.inicio); if (m) achado.set(f.it.numero, m); } });
  }
  for (const it of itens) {
    const m = achado.get(it.numero);
    if (!m) continue;
    it.total = m.episodes;
    if (m.status === "FINISHED") it.lancados = m.episodes;
    else if (m.status === "NOT_YET_RELEASED") it.lancados = 0;
    else if (m.nextAiringEpisode) it.lancados = m.nextAiringEpisode.episode - 1;
  }
}

export async function loadTemporada(): Promise<SeasonItem[]> {
  try {
    const res = await fetch(GVIZ, { next: { revalidate: 60, tags: ["temporada"] } });
    if (!res.ok) return [];
    const itens = parseGviz(await res.text());
    await Promise.all([
      // capas coladas nas células só saem pelo script do Google
      (async () => {
        try {
          const r = await fetch(SCRIPT_URL, { next: { revalidate: 3600 } });
          const j = await r.json();
          const imgs = new Map<number, string>((j.itens ?? []).map((x: { numero: number; imagem: string }) => [Number(x.numero), x.imagem]));
          // o Google devolve a capa em 2048 px; 240 px sobra para a miniatura
          for (const it of itens) it.img = (imgs.get(it.numero) ?? "").replace(/=s\d+(?=[?&]|$)/, "=s240");
        } catch { /* sem capas: o site mostra a inicial */ }
      })(),
      completarComAniList(itens).catch(() => { /* sem AniList: total fica "?" */ }),
    ]);
    return itens;
  } catch {
    return [];
  }
}

export const DIAS = ["Segunda", "Terça", "Quarta", "Quinta", "Sexta", "Sábado", "Domingo"];
/** Índice em DIAS do dia de hoje (getDay: 0 = domingo). */
export const hojeDia = (now = new Date()) => (now.getDay() + 6) % 7;
