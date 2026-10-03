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
  /** logo do streaming colado na coluna "Onde assistir?" (vem do script do Google) */
  streamingImg: string;
  /** URL da coluna "Link": onde assistir (vem do script do Google) */
  link: string;
  /** do AniList: total de episódios da temporada e quantos já foram ao ar (null = não sabe) */
  total: number | null;
  lancados: number | null;
};

const SHEET_ID = "1a6Ylv7yKu8yb1DJkYpZynTSedbOzTUC_ti35fufDyWI";

/** App da Web do script em apps-script/Temporada.gs. Sem a SENHA ele só devolve capas, streaming e links. */
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
export function parseGviz(text: string): SeasonItem[] {
  const json = JSON.parse(text.slice(text.indexOf("{"), text.lastIndexOf("}") + 1));
  const cols: string[] = json.table.cols.map((c: { label?: string }) => (c.label ?? "").trim());
  const idx = (name: string) => cols.findIndex((c) => c === name);
  const iNum = idx("Número"), iNome = idx("Anime"), iIni = idx("Dia de inicio"), iDia = idx("Dia da semana");
  const iEp = idx("Último episódio visto"), iSem = idx("Semanal"), iUrl = idx("Url Imagem");
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
    const url = String(cell(r.c, iUrl)?.v ?? "").trim();
    out.push({
      numero, nome, inicio,
      diaSemana: String(cell(r.c, iDia)?.v ?? "").trim(),
      ultimoEp: Number.isFinite(ep) ? ep : null,
      semanal: normSemanal(cell(r.c, iSem)?.v),
      img: url.startsWith("http") ? url : "", streamingImg: "", link: "", total: null, lancados: null,
    });
  }
  return out;
}

// ── AniList: total de episódios e quantos já foram ao ar

export type AlMedia = {
  episodes: number | null;
  status: string;
  startDate: { year: number | null; month: number | null; day: number | null };
  nextAiringEpisode: { episode: number } | null;
};

const dias = (a: string, b: string) => Math.abs(Date.parse(a) - Date.parse(b)) / 86_400_000;

/** Escolhe o resultado cuja estreia fica a até 30 dias do "Dia de inicio" (evita homônimos). */
export function escolher(cands: AlMedia[], inicio: string | null): AlMedia | null {
  for (const m of cands) {
    const { year, month, day } = m.startDate;
    if (!inicio) return m;
    if (year && month && dias(`${year}-${String(month).padStart(2, "0")}-${String(day ?? 1).padStart(2, "0")}`, inicio) <= 30) return m;
  }
  return null;
}

/** "Tensei shitara Ken deshita II" → também tenta "... 2" e "... 2nd Season". */
export function variantes(nome: string): string[] {
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

/** Lê a aba agora; se a planilha falhar, dá erro (lib/dados.ts guarda a última versão boa). */
export async function loadTemporada(): Promise<SeasonItem[]> {
  const res = await fetch(GVIZ, { cache: "no-store" });
  if (!res.ok) throw new Error(`Temporada respondeu ${res.status}`);
  const itens = parseGviz(await res.text());
  await Promise.all([
    // imagens coladas nas células e o link por trás do texto "Link" só saem pelo script do Google.
    // A capa vem da coluna "Url Imagem"; a colada na coluna "Imagem" é só reserva.
    (async () => {
      try {
        const r = await fetch(SCRIPT_URL, { cache: "no-store" });
        const j = await r.json();
        type Extra = { numero: number; imagem?: string; streaming?: string; link?: string };
        const extras = new Map<number, Extra>((j.itens ?? []).map((x: Extra) => [Number(x.numero), x]));
        for (const it of itens) {
          const x = extras.get(it.numero);
          if (!x) continue;
          // o Google devolve as imagens em 2048 px: 360 px basta para a capa, 96 px para o logo
          if (!it.img) it.img = (x.imagem ?? "").replace(/=s\d+(?=[?&]|$)/, "=s360");
          it.streamingImg = (x.streaming ?? "").replace(/=s\d+(?=[?&]|$)/, "=s96");
          it.link = /^https?:\/\//i.test(x.link ?? "") ? x.link! : "";
        }
      } catch { /* sem script: sem streaming/link, e capa sem URL mostra a inicial */ }
    })(),
    completarComAniList(itens).catch(() => { /* sem AniList: total fica "?" */ }),
  ]);
  return itens;
}

/** Segunda-feira da semana de uma data AAAA-MM-DD (a semana começa na segunda). */
export function segundaDa(iso: string): string {
  const [y, m, d] = iso.split("-").map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d));
  dt.setUTCDate(dt.getUTCDate() - ((dt.getUTCDay() + 6) % 7));
  return dt.toISOString().slice(0, 10);
}

/**
 * Status que a tela mostra. Única exceção automática: marcado "-" (não estreou) e já chegou a
 * semana da estreia → vira "X" (episódio não visto). Os outros status são sempre os da planilha.
 */
export function semanalEfetivo(item: Pick<SeasonItem, "semanal" | "inicio">, hoje: string): Semanal {
  if (item.semanal === "-" && item.inicio && hoje && hoje >= segundaDa(item.inicio)) return "X";
  return item.semanal;
}

/** "https://www.crunchyroll.com/..." → "Crunchyroll" (para o texto do botão quando não há logo). */
export function nomeDoSite(url: string): string {
  try {
    const partes = new URL(url).hostname.replace(/^www\./, "").split(".");
    const nome = partes.length > 2 && partes[partes.length - 2].length <= 3 ? partes[partes.length - 3] : partes[partes.length - 2];
    return nome.charAt(0).toUpperCase() + nome.slice(1);
  } catch {
    return "";
  }
}

/**
 * Status depois de marcar o episódio `ep`: se chegou ao último episódio lançado (AniList), vira "V".
 * Nunca vira "X" sozinho: o AniList às vezes conta episódios que atrasaram (ex.: diz 10 lançados e só
 * saíram 8), então nesse caso o status fica como estava e é marcado à mão.
 */
export function semanalAoMarcar(ep: number | null, item: Pick<SeasonItem, "lancados">, atual: Semanal): Semanal {
  if (ep !== null && item.lancados && ep >= item.lancados) return "V";
  return atual;
}

/**
 * Filtro de status da aba Temporada no endereço: ?status=X&status=- (vazio/"sem" = sem marcação).
 * Nenhum selecionado = mostra todos. Usado no servidor (app/page.tsx) e no cliente (Season.tsx).
 */
const STATUS_URL: Record<string, Semanal> = { V: "V", X: "X", "-": "-", sem: "" };
export function lerFiltroStatus(v: string | string[] | undefined | null): Semanal[] {
  const lista = v === undefined || v === null ? [] : Array.isArray(v) ? v : [v];
  return [...new Set(lista.map((x) => STATUS_URL[x.toUpperCase() === "SEM" ? "sem" : x.toUpperCase()]).filter((x) => x !== undefined))];
}
export function escreverFiltroStatus(base: URLSearchParams, sel: Semanal[]): string {
  const q = new URLSearchParams(base);
  q.delete("status");
  for (const s of sel) q.append("status", s === "" ? "sem" : s);
  const s = q.toString();
  return s ? `?${s}` : "";
}

export const DIAS = ["Segunda", "Terça", "Quarta", "Quinta", "Sexta", "Sábado", "Domingo"];
/** Índice em DIAS do dia de hoje (getDay: 0 = domingo). */
export const hojeDia = (now = new Date()) => (now.getDay() + 6) % 7;
