import type { Anime } from "./types";

/**
 * Franquias: animes da planilha ligados pelo AniList. Entram continuações (SEQUEL/PREQUEL), histórias
 * paralelas (SIDE_STORY: OVAs, especiais e filmes da mesma história) e versões alternativas da mesma
 * história (ALTERNATIVE: remakes e recontagens — Kenpuu Denki Berserk, FMA 2003 × Brotherhood,
 * Trigun × Stampede). Spin-offs (ex.: Vigilante de Boku no Hero) e crossovers (Isekai Quartet) ficam de fora. PARENT não entra de propósito: é o caminho
 * de volta dos spin-offs para a série principal (Vigilante → Boku no Hero aparece como PARENT); as
 * histórias paralelas já se ligam pelo SIDE_STORY que sai da série principal.
 * A coluna opcional "Franquia" da planilha manda: o que estiver escrito nela vale mais que o AniList.
 */
export const LIGACOES = ["SEQUEL", "PREQUEL", "SIDE_STORY", "ALTERNATIVE"];

/** Por ID do MyAnimeList: o ID do anime no AniList e os IDs (AniList) dos títulos ligados a ele. */
export type Relacoes = Record<number, { id: number; ligados: number[] }>;

type AlMedia = { id: number; idMal: number | null; relations: { edges: { relationType: string; node: { id: number; type: string } }[] } };

const QUERY = `query($ids:[Int]){Page(perPage:50){media(idMal_in:$ids,type:ANIME){id idMal relations{edges{relationType node{id type}}}}}}`;
const espera = (ms: number) => new Promise((r) => setTimeout(r, ms));

/** Busca no AniList, 50 IDs por consulta (~12 para a planilha toda). Qualquer falha → erro (o cache guarda a última boa). */
export async function buscarRelacoes(malIds: number[]): Promise<Relacoes> {
  const ids = [...new Set(malIds.filter((x) => x > 0))];
  const out: Relacoes = {};
  for (let i = 0; i < ids.length; i += 50) {
    if (i) await espera(700); // o AniList limita a quantidade de consultas por minuto
    const r = await fetch("https://graphql.anilist.co", {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify({ query: QUERY, variables: { ids: ids.slice(i, i + 50) } }),
      cache: "no-store",
      signal: AbortSignal.timeout(10000),
    });
    if (!r.ok) throw new Error(`AniList respondeu ${r.status}`);
    const j = await r.json();
    for (const m of (j?.data?.Page?.media ?? []) as AlMedia[]) {
      if (!m.idMal) continue;
      out[m.idMal] = {
        id: m.id,
        ligados: m.relations.edges.filter((e) => e.node.type === "ANIME" && LIGACOES.includes(e.relationType)).map((e) => e.node.id),
      };
    }
  }
  return out;
}

/**
 * Agrupa os animes em franquias e devolve cópias com `franquia` preenchida (só para grupos com 2+ títulos).
 * Os grupos se formam também através de títulos que não estão na planilha: se você viu a 1ª e a 3ª
 * temporada, as duas se ligam pela 2ª. Nome do grupo: o nome mais curto ("Berserk", "Jujutsu Kaisen"),
 * que costuma ser o da série; empate → o mais antigo.
 */
export function agruparFranquias(animes: Anime[], rel: Relacoes): Anime[] {
  const pai = new Map<string, string>();
  const raiz = (x: string): string => {
    let r = x;
    while (pai.get(r) !== r) r = pai.get(r)!;
    pai.set(x, r);
    return r;
  };
  const no = (x: string) => { if (!pai.has(x)) pai.set(x, x); return x; };
  const unir = (a: string, b: string) => { const ra = raiz(no(a)), rb = raiz(no(b)); if (ra !== rb) pai.set(rb, ra); };

  // chave de cada anime: o nó do AniList; sem dados do AniList, fica sozinho
  const chave = (a: Anime) => (rel[a.malId] ? `al:${rel[a.malId].id}` : `n:${a.n}:${a.id}`);
  for (const a of animes) {
    no(chave(a));
    for (const l of rel[a.malId]?.ligados ?? []) unir(chave(a), `al:${l}`);
  }

  // grupos automáticos (quem tem a coluna Franquia preenchida fica fora deles)
  const grupos = new Map<string, Anime[]>();
  for (const a of animes) {
    if (a.franquiaManual) continue;
    const g = raiz(chave(a));
    grupos.set(g, [...(grupos.get(g) ?? []), a]);
  }
  const nome = new Map<string, string>();
  for (const [g, lista] of grupos) {
    if (lista.length >= 2) nome.set(g, ordenarFranquia(lista).reduce((m, a) => (a.nome.length < m.nome.length ? a : m)).nome);
  }

  // coluna Franquia: o nome escrito vale; se for igual (sem ligar para maiúsculas) ao de um grupo
  // automático, entra nesse grupo — ex.: "Berserk" em Kenpuu Denki Berserk junta com os filmes
  const canonico = new Map<string, string>();
  for (const n of nome.values()) canonico.set(n.toLowerCase(), n);
  for (const a of animes) {
    const m = a.franquiaManual.trim();
    if (m && !canonico.has(m.toLowerCase())) canonico.set(m.toLowerCase(), m);
  }
  return animes.map((a) => ({
    ...a,
    franquia: a.franquiaManual.trim() ? canonico.get(a.franquiaManual.trim().toLowerCase())! : nome.get(raiz(chave(a))) ?? "",
  }));
}

/** Ordem dentro da franquia: ano de lançamento, depois N° da planilha. */
export function ordenarFranquia(lista: Anime[]): Anime[] {
  const ano = (a: Anime) => Number(a.ano) || 9999;
  return [...lista].sort((x, y) => ano(x) - ano(y) || x.n - y.n);
}

export type ResumoFranquia = {
  nome: string;
  titulos: Anime[];
  episodios: number;
  /** horas assistidas, rewatches incluídos (mesma conta dos KPIs) */
  horas: number;
  notaMedia: number;
  /** nota do primeiro e do último título com nota (ordem de lançamento) */
  primeira: number;
  ultima: number;
  rewatches: number;
};

/** Resumo de cada franquia (2+ títulos entre os animes filtrados). */
export function resumoFranquias(rows: Anime[]): ResumoFranquia[] {
  const grupos = new Map<string, Anime[]>();
  for (const a of rows) if (a.franquia) grupos.set(a.franquia, [...(grupos.get(a.franquia) ?? []), a]);
  const out: ResumoFranquia[] = [];
  for (const [nome, lista] of grupos) {
    if (lista.length < 2) continue;
    const titulos = ordenarFranquia(lista);
    const comNota = titulos.filter((a) => a.score > 0);
    out.push({
      nome,
      titulos,
      episodios: titulos.reduce((s, a) => s + a.eps * (a.rewatch + 1), 0),
      horas: Math.round(titulos.reduce((s, a) => s + a.eps * a.minPerEp * (a.rewatch + 1), 0) / 60),
      notaMedia: comNota.length ? comNota.reduce((s, a) => s + a.score, 0) / comNota.length : 0,
      primeira: comNota[0]?.score ?? 0,
      ultima: comNota[comNota.length - 1]?.score ?? 0,
      rewatches: titulos.reduce((s, a) => s + a.rewatch, 0),
    });
  }
  return out;
}
