import { test } from "node:test";
import assert from "node:assert/strict";
import { parseSheet } from "@/lib/sheet";
import type { Viewing } from "@/lib/history";
import { anosDoHistorico, retrospectiva } from "@/lib/stats";
import { escreverFiltroStatus, lerFiltroStatus } from "@/lib/temporada";
import { fmtAtualizado } from "@/lib/format";

const animes = parseSheet([
  "N°,Nome,Score,Episodes,Time/episode,Studio,Gênero,Tema",
  "1,Frieren,10,28,24,Madhouse,Fantasy,Isekai",
  "2,Bocchi,9,12,24,CloverWorks,Comedy,Music",
  "3,Sem Nota,0,12,24,Madhouse,Fantasy,",
].join("\n"));

const v = (ym: string, n: number, rewatch: number | null): Viewing => ({ ym, n, nome: "", rewatch });
const historico: Viewing[] = [
  v("2022-12", 1, 0), // antes do Historico: não conta
  v("2025-03", 1, 0),
  v("2025-03", 2, 0),
  v("2025-11", 2, 1), // rewatch
  v("2026-01", 1, 1),
  v("2026-01", 3, 0),
  v("2026-02", 2, 2),
  v("2026-10", 3, null), // rewatch não informado: conta como 1ª vez
];

test("anosDoHistorico: só de 2023 em diante", () => {
  assert.deepEqual(anosDoHistorico(historico), ["2025", "2026"]);
});

test("retrospectiva: totais do ano", () => {
  const r = retrospectiva(animes, historico, "2025");
  assert.equal(r.vezes, 3);
  assert.equal(r.animes, 2);
  assert.equal(r.primeiras, 2);
  assert.equal(r.rewatches, 1);
  assert.equal(r.episodios, 28 + 12 + 12);
  assert.equal(r.horas, Math.round((52 * 24) / 60));
  assert.equal(r.notaMedia, 9.5);
  assert.deepEqual(r.porMes, [0, 0, 2, 0, 0, 0, 0, 0, 0, 0, 1, 0]);
  assert.equal(r.ateMes, 11);
  assert.deepEqual(r.melhores.map((a) => a.nome), ["Frieren", "Bocchi"]);
});

test("retrospectiva: anime sem nota fica fora da média e dos melhores; rewatch vazio conta como 1ª vez", () => {
  const r = retrospectiva(animes, historico, "2026");
  assert.equal(r.vezes, 4);
  assert.equal(r.rewatches, 2);
  assert.equal(r.primeiras, 2);
  assert.equal(r.notaMedia, 9.5);
  assert.ok(!r.melhores.some((a) => a.nome === "Sem Nota"));
  // Frieren e Bocchi foram só reassistidos em 2026: ficam fora das maiores notas
  assert.deepEqual(r.melhores, []);
  assert.deepEqual(r.estudios[0], { label: "Madhouse", n: 2 });
});

test("retrospectiva: corte no mês para comparar o mesmo período", () => {
  assert.equal(retrospectiva(animes, historico, "2026", 2).vezes, 3); // sem outubro
  assert.equal(retrospectiva(animes, historico, "2025", 10).vezes, 2); // sem novembro
});

test("retrospectiva: respeita os filtros (só animes da lista recebida)", () => {
  const r = retrospectiva(animes.filter((a) => a.nome === "Bocchi"), historico, "2025");
  assert.equal(r.vezes, 2);
  assert.equal(r.animes, 1);
});

test("filtro de status da Temporada no endereço: ida e volta", () => {
  assert.deepEqual(lerFiltroStatus(undefined), []);
  assert.deepEqual(lerFiltroStatus(["X", "-", "sem", "lixo", "x"]), ["X", "-", ""]);
  const s = escreverFiltroStatus(new URLSearchParams("aba=temporada"), ["X", ""]);
  assert.equal(s, "?aba=temporada&status=X&status=sem");
  assert.deepEqual(lerFiltroStatus(new URLSearchParams(s).getAll("status")), ["X", ""]);
  assert.equal(escreverFiltroStatus(new URLSearchParams("status=V"), []), "");
});

test("fmtAtualizado: hora de Brasília, formato 19:43:28 03/10/2026", () => {
  assert.equal(fmtAtualizado(Date.parse("2026-10-03T22:43:28Z")), "19:43:28 03/10/2026");
  assert.equal(fmtAtualizado(Date.parse("2026-10-04T02:05:09Z")), "23:05:09 03/10/2026"); // ainda dia 03 em SP
});
