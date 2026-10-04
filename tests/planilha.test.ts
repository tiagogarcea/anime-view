import { test } from "node:test";
import assert from "node:assert/strict";
import { parseSheet } from "@/lib/sheet";
import { historicoSemPar, parseHistory, resolveHistory } from "@/lib/history";
import { tierOf } from "@/lib/types";

const CSV = [
  "Minha lista,,,,,,,,,,",
  "N°,Nome,Nome_Ingles,Score,Episodes,Temporada,Studio,Gênero,Favorite,Last seen,Link",
  '1,Frieren,Frieren: Beyond Journey\'s End,10,28,Fall 2023,Madhouse,Fantasy,FAV,15/03/2024,https://cdn.myanimelist.net/a.jpg',
  "2,Bocchi,,9,12,Fall 2022,CloverWorks,fantasy,,2023-01-05,",
  "3,Sem Data,,7,12,,Madhouse,Fantasy,,,nan",
  ",,,,,,,,,,",
].join("\n");

test("parseSheet: acha o cabeçalho depois de linhas de título e lê cada coluna", () => {
  const [a, b, c] = parseSheet(CSV);
  assert.equal(a.nome, "Frieren");
  assert.equal(a.nomeEn, "Frieren: Beyond Journey's End");
  assert.equal(a.score, 10);
  assert.equal(a.eps, 28);
  assert.equal(a.season, "Fall");
  assert.equal(a.ano, "2023");
  assert.equal(a.isFav, true);
  assert.equal(a.lastSeen, "2024-03-15"); // DD/MM/AAAA
  assert.equal(a.img, "https://cdn.myanimelist.net/a.jpg");
  assert.equal(a.tier, "SSR");
  assert.equal(b.lastSeen, "2023-01-05"); // AAAA-MM-DD
  assert.equal(b.isFav, false);
  assert.equal(c.lastSeen, null);
  assert.equal(c.img, ""); // "nan" vira vazio
});

test("parseSheet: ignora linhas sem nome e unifica maiúsculas (fica a grafia mais comum)", () => {
  const lista = parseSheet(CSV);
  assert.equal(lista.length, 3);
  assert.deepEqual(lista.map((x) => x.genero), ["Fantasy", "Fantasy", "Fantasy"]);
});

test("tierOf: raridade pelo score", () => {
  assert.deepEqual([10, 9.5, 9, 8, 7.9, 0].map(tierOf), ["SSR", "SR", "SR", "R", "N", "N"]);
});

test("parseHistory: aceita DD/MM/AAAA, AAAA-MM e 'Março 2023'; ignora linha sem data", () => {
  const csv = [
    "Data,Nome,Rewatch",
    "01/03/2023,Frieren,0",
    "2023-04,Bocchi,1",
    "Março 2023,Frieren,1",
    "maio de 2024,Frieren,",
    ",Bocchi,0",
  ].join("\n");
  const h = parseHistory(csv);
  assert.deepEqual(h.map((v) => v.ym), ["2023-03", "2023-04", "2023-03", "2024-05"]);
  assert.deepEqual(h.map((v) => v.rewatch), [0, 1, 1, null]);
});

test("resolveHistory: liga pelo nome (sem ligar para maiúsculas e espaços) e descarta o que não existe", () => {
  const animes = [{ n: 7, nome: "Frieren" }, { n: 9, nome: "Bocchi the Rock!" }];
  const h = resolveHistory(
    [
      { ym: "2023-03", n: 0, nome: "  frieren ", rewatch: 0 },
      { ym: "2023-04", n: 0, nome: "Bocchi  the rock!", rewatch: 1 },
      { ym: "2023-05", n: 0, nome: "Não existe", rewatch: 0 },
      { ym: "2023-06", n: 9, nome: "", rewatch: 0 }, // formato antigo: usa o N°
    ],
    animes,
  );
  assert.deepEqual(h.map((v) => v.n), [7, 9, 9]);
});

test("historicoSemPar: linhas que não acharam o anime, com sugestão do nome parecido", () => {
  const animes = [{ n: 7, nome: "Frieren" }, { n: 9, nome: "Bocchi the Rock!" }, { n: 12, nome: "Kusuriya no Hitorigoto" }];
  const h = [
    { ym: "2025-03", n: 0, nome: " frieren ", rewatch: 0 }, // bate (maiúsculas/espaços não importam)
    { ym: "2025-04", n: 0, nome: "Bochi the Rock!", rewatch: 0 }, // erro de digitação
    { ym: "2025-05", n: 0, nome: "Kusuriya no Hitorigoto 2nd Season", rewatch: 0 }, // não existe: longe demais para sugerir
    { ym: "2025-06", n: 99, nome: "", rewatch: 0 }, // formato antigo com N° que não existe
    { ym: "2025-07", n: 9, nome: "", rewatch: 0 }, // formato antigo com N° que existe
  ];
  assert.deepEqual(historicoSemPar(h, animes), [
    { ym: "2025-04", nome: "Bochi the Rock!", sugestao: "Bocchi the Rock!" },
    { ym: "2025-05", nome: "Kusuriya no Hitorigoto 2nd Season", sugestao: "" },
    { ym: "2025-06", nome: "N° 99", sugestao: "" },
  ]);
  // o que fica de fora do resolveHistory é exatamente o que vai para o aviso
  assert.equal(resolveHistory(h, animes).length + historicoSemPar(h, animes).length, h.length);
});
