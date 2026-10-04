import { test } from "node:test";
import assert from "node:assert/strict";
import { parseSheet } from "@/lib/sheet";
import { agruparFranquias, LIGACOES, resumoFranquias, type Relacoes } from "@/lib/franquias";
import { escreverBusca, lerBusca } from "@/lib/urlFiltros";
import { applyFilters, DEFAULT_SORT, EMPTY_FILTERS } from "@/lib/filters";

const mal = (id: number) => `https://myanimelist.net/anime/${id}/x`;
const animes = parseSheet([
  "N°,Nome,Score,Episodes,Time/episode,Rewatched,Temporada,URL_Pagina,Franquia",
  `1,Boku no Hero Academia,8,13,24,1,Spring 2016,${mal(101)},`,
  `2,Boku no Hero Academia 3rd Season,9,25,24,0,Spring 2018,${mal(103)},`, // a 2ª temporada não está na planilha
  `3,Boku no Hero Academia: Ikinokore! (OVA),7,2,24,0,Spring 2017,${mal(150)},`,
  `4,Vigilante: Boku no Hero Academia Illegals,7,13,24,0,Spring 2025,${mal(200)},`,
  `5,Kimi no Na wa.,9,1,106,0,Summer 2016,${mal(300)},`,
  `6,Berserk: Ougon Jidai-hen I,8,1,76,0,Winter 2012,${mal(400)},`,
  `7,Berserk,6,12,24,0,Summer 2016,${mal(401)},`,
  `8,Kenpuu Denki Berserk,9,25,24,0,Fall 1997,${mal(33)},berserk`, // AniList: "versão alternativa" → coluna manual
  `9,Sem Link,7,12,24,0,Fall 2020,,`,
].join("\n"));

// IDs do AniList = 1000 + ID do MAL; a 2ª temporada (AniList 1102) não está na planilha
const rel: Relacoes = {
  101: { id: 1101, ligados: [1102, 1150] }, // SEQUEL → 2ª temporada; SIDE_STORY → OVA
  103: { id: 1103, ligados: [1102] }, // PREQUEL → 2ª temporada
  150: { id: 1150, ligados: [] }, // a OVA só aponta de volta como PARENT, que não entra
  200: { id: 1200, ligados: [] }, // Vigilante → Boku no Hero é PARENT (spin-off): não liga
  300: { id: 1300, ligados: [] },
  400: { id: 1400, ligados: [1401] },
  401: { id: 1401, ligados: [1400] },
  33: { id: 1033, ligados: [] },
};
const agr = agruparFranquias(animes, rel);
const de = (nome: string) => agr.find((a) => a.nome === nome)!.franquia;

test("LIGACOES: continuações, histórias paralelas e versões alternativas; PARENT/SPIN_OFF/crossover ficam de fora", () => {
  assert.deepEqual(LIGACOES, ["SEQUEL", "PREQUEL", "SIDE_STORY", "ALTERNATIVE"]);
});

test("versão alternativa (remake) entra na franquia sem precisar da coluna", () => {
  const t = parseSheet([
    "N°,Nome,Score,Episodes,Temporada,URL_Pagina",
    `1,Trigun,8,26,Spring 1998,${mal(6)}`,
    `2,Trigun Stampede,8,12,Winter 2023,${mal(7)}`,
  ].join("\n"));
  // AniList: Trigun Stampede → Trigun é ALTERNATIVE (buscarRelacoes já filtra pelos tipos de LIGACOES)
  const r = agruparFranquias(t, { 6: { id: 106, ligados: [] }, 7: { id: 107, ligados: [106] } });
  assert.deepEqual(r.map((a) => a.franquia), ["Trigun", "Trigun"]);
});

test("agrupa pela temporada que falta na planilha e pela OVA; nome = o mais curto", () => {
  assert.equal(de("Boku no Hero Academia"), "Boku no Hero Academia");
  assert.equal(de("Boku no Hero Academia 3rd Season"), "Boku no Hero Academia");
  assert.equal(de("Boku no Hero Academia: Ikinokore! (OVA)"), "Boku no Hero Academia");
});

test("spin-off e título sozinho ficam sem franquia", () => {
  assert.equal(de("Vigilante: Boku no Hero Academia Illegals"), "");
  assert.equal(de("Kimi no Na wa."), "");
  assert.equal(de("Sem Link"), "");
});

test("coluna Franquia: igual (sem ligar para maiúsculas) ao nome de um grupo automático, entra nele", () => {
  assert.equal(de("Berserk"), "Berserk"); // nome mais curto, mesmo não sendo o mais antigo
  assert.equal(de("Berserk: Ougon Jidai-hen I"), "Berserk");
  assert.equal(de("Kenpuu Denki Berserk"), "Berserk");
});

test("sem dados do AniList ninguém ganha franquia (o site segue normal)", () => {
  assert.ok(agruparFranquias(animes, {}).every((a) => a.franquia === "" || a.franquiaManual));
});

test("resumoFranquias: totais com rewatch, nota média e evolução 1º → último por ordem de lançamento", () => {
  const bnha = resumoFranquias(agr).find((f) => f.nome === "Boku no Hero Academia")!;
  assert.deepEqual(bnha.titulos.map((a) => a.n), [1, 3, 2]); // 2016, 2017, 2018
  assert.equal(bnha.episodios, 13 * 2 + 2 + 25);
  assert.equal(bnha.horas, Math.round(((13 * 2 + 2 + 25) * 24) / 60));
  assert.equal(bnha.notaMedia, 8);
  assert.equal(bnha.primeira, 8);
  assert.equal(bnha.ultima, 9);
  assert.equal(bnha.rewatches, 1);
  const berserk = resumoFranquias(agr).find((f) => f.nome === "Berserk")!;
  assert.deepEqual(berserk.titulos.map((a) => a.n), [8, 6, 7]); // 1997, 2012, 2016
});

test("filtro Franquia: lista de opções, filtro e endereço", () => {
  const r = applyFilters(agr, { ...EMPTY_FILTERS, franquia: ["Berserk"] });
  assert.deepEqual(r.rows.map((a) => a.n).sort(), [6, 7, 8]);
  assert.deepEqual(applyFilters(agr, EMPTY_FILTERS).options.franquia.map((o) => o.value), ["Berserk", "Boku no Hero Academia"]);
  const s = escreverBusca(new URLSearchParams(), { filters: { ...EMPTY_FILTERS, franquia: ["Berserk"] }, sortKey: DEFAULT_SORT.key, sortAsc: DEFAULT_SORT.asc });
  assert.equal(s, "?franquia=Berserk");
  assert.deepEqual(lerBusca(new URLSearchParams(s)).filters.franquia, ["Berserk"]);
});
