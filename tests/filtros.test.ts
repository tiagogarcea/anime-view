import { test } from "node:test";
import assert from "node:assert/strict";
import { applyFilters, DEFAULT_SORT, EMPTY_FILTERS, sortRows } from "@/lib/filters";
import { escreverBusca, lerBusca } from "@/lib/urlFiltros";
import { tabValida } from "@/lib/tabs";
import { parseSheet } from "@/lib/sheet";

const animes = parseSheet([
  "N°,Nome,Score,Episodes,Temporada,Studio,Last seen",
  "1,Frieren,10,28,Fall 2023,Madhouse,15/03/2024",
  "2,Bocchi,9,12,Fall 2022,CloverWorks,05/01/2023",
  "3,Sem Data,7,12,Spring 2020,Madhouse,",
].join("\n"));

test("tabValida: só aceita as abas que existem", () => {
  assert.equal(tabValida("stats"), "stats");
  assert.equal(tabValida("temporada"), "temporada");
  assert.equal(tabValida("xyz"), "deck");
  assert.equal(tabValida(undefined), "deck");
  assert.equal(tabValida(["stats"]), "deck");
});

test("urlFiltros: sem filtros, o endereço fica limpo", () => {
  assert.equal(escreverBusca(new URLSearchParams(), { filters: EMPTY_FILTERS, ...{ sortKey: DEFAULT_SORT.key, sortAsc: DEFAULT_SORT.asc } }), "");
  const b = lerBusca(new URLSearchParams(""));
  assert.deepEqual(b, { filters: EMPTY_FILTERS, sortKey: DEFAULT_SORT.key, sortAsc: DEFAULT_SORT.asc });
});

test("urlFiltros: ida e volta preserva tudo e mantém o ?aba=", () => {
  const busca = {
    filters: { ...EMPTY_FILTERS, q: "frieren & cia", scoreMin: 8, scoreMax: null, epsMin: 12, epsMax: 28, from: "2023-01-01", to: "2024-12-31", tier: ["SSR", "SR"], studio: ["Madhouse"] },
    sortKey: "score" as const,
    sortAsc: true,
  };
  const s = escreverBusca(new URLSearchParams("aba=stats"), busca);
  const p = new URLSearchParams(s);
  assert.equal(p.get("aba"), "stats");
  assert.equal(p.get("score"), "8-");
  assert.deepEqual(p.getAll("raridade"), ["SSR", "SR"]);
  assert.deepEqual(lerBusca(p), busca);
});

test("urlFiltros: lê do formato do servidor (objeto) e ignora valores inválidos", () => {
  const b = lerBusca({ estudio: ["Madhouse", "MAPPA"], raridade: "SSR", score: "abc", de: "ontem", ordem: "nada" });
  assert.deepEqual(b.filters.studio, ["Madhouse", "MAPPA"]);
  assert.deepEqual(b.filters.tier, ["SSR"]);
  assert.equal(b.filters.scoreMin, null);
  assert.equal(b.filters.from, "");
  assert.equal(b.sortKey, DEFAULT_SORT.key);
});

test("applyFilters: busca, faixa de score e lista combinam", () => {
  const nomes = (f: typeof EMPTY_FILTERS) => applyFilters(animes, f).rows.map((a) => a.nome);
  assert.deepEqual(nomes({ ...EMPTY_FILTERS, q: "boc" }), ["Bocchi"]);
  assert.deepEqual(nomes({ ...EMPTY_FILTERS, scoreMin: 9 }), ["Frieren", "Bocchi"]);
  assert.deepEqual(nomes({ ...EMPTY_FILTERS, studio: ["Madhouse"], scoreMax: 8 }), ["Sem Data"]);
});

test("applyFilters: filtro de data não some com quem não tem data se não for usado", () => {
  assert.equal(applyFilters(animes, EMPTY_FILTERS).rows.length, 3);
  assert.deepEqual(applyFilters(animes, { ...EMPTY_FILTERS, from: "2024-01-01" }).rows.map((a) => a.nome), ["Frieren"]);
});

test("sortRows: padrão 'Visto em' decrescente, sem data sempre no fim", () => {
  assert.deepEqual(sortRows(animes, "lastSeen", false).map((a) => a.nome), ["Frieren", "Bocchi", "Sem Data"]);
  assert.deepEqual(sortRows(animes, "lastSeen", true).map((a) => a.nome), ["Bocchi", "Frieren", "Sem Data"]);
});
