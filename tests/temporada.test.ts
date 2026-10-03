import { test } from "node:test";
import assert from "node:assert/strict";
import {
  escolher, nomeDoSite, normSemanal, parseGviz, segundaDa, semanalAoMarcar, semanalEfetivo, variantes,
  type AlMedia,
} from "@/lib/temporada";

test("segundaDa: segunda-feira da semana (a semana começa na segunda)", () => {
  assert.equal(segundaDa("2026-10-05"), "2026-10-05"); // segunda
  assert.equal(segundaDa("2026-10-06"), "2026-10-05"); // terça
  assert.equal(segundaDa("2026-10-11"), "2026-10-05"); // domingo: ainda a semana do dia 05
  assert.equal(segundaDa("2026-10-12"), "2026-10-12");
  assert.equal(segundaDa("2027-01-01"), "2026-12-28"); // virada de ano
});

test('semanalEfetivo: "-" só vira "X" a partir da segunda da semana da estreia', () => {
  const casos: [string, string, string][] = [
    // [estreia, hoje, esperado]
    ["2026-10-05", "2026-10-03", "-"], // sábado antes
    ["2026-10-05", "2026-10-04", "-"], // domingo antes
    ["2026-10-05", "2026-10-05", "X"], // segunda da estreia
    ["2026-10-06", "2026-10-04", "-"],
    ["2026-10-06", "2026-10-05", "X"], // estreia na terça, muda na segunda
    ["2026-10-11", "2026-10-05", "X"], // estreia no domingo, mesma semana
    ["2026-10-12", "2026-10-06", "-"], // semana seguinte: ainda não
    ["2026-10-12", "2026-10-12", "X"],
  ];
  for (const [inicio, hoje, esperado] of casos) {
    assert.equal(semanalEfetivo({ semanal: "-", inicio }, hoje), esperado, `estreia ${inicio}, hoje ${hoje}`);
  }
});

test("semanalEfetivo: os outros status são sempre os da planilha", () => {
  assert.equal(semanalEfetivo({ semanal: "V", inicio: "2026-01-01" }, "2026-10-05"), "V");
  assert.equal(semanalEfetivo({ semanal: "", inicio: "2026-01-01" }, "2026-10-05"), "");
  assert.equal(semanalEfetivo({ semanal: "-", inicio: null }, "2026-10-05"), "-"); // sem data
  assert.equal(semanalEfetivo({ semanal: "-", inicio: "2026-10-05" }, ""), "-"); // servidor: não sabe o dia
});

test("semanalAoMarcar: chegar ao último episódio lançado marca V", () => {
  assert.equal(semanalAoMarcar(5, { lancados: 5 }, "X"), "V");
  assert.equal(semanalAoMarcar(12, { lancados: 12 }, "-"), "V");
  assert.equal(semanalAoMarcar(4, { lancados: 5 }, "X"), "X"); // ainda falta um
});

test("semanalAoMarcar: nunca vira X sozinho nem chuta sem dados do AniList", () => {
  // Bleach: AniList diz 10 lançados, mas só saíram 8 → em 8 nada muda
  assert.equal(semanalAoMarcar(8, { lancados: 10 }, "X"), "X");
  assert.equal(semanalAoMarcar(8, { lancados: 10 }, "V"), "V");
  assert.equal(semanalAoMarcar(3, { lancados: null }, "X"), "X");
  assert.equal(semanalAoMarcar(1, { lancados: 0 }, "-"), "-"); // não estreou
  assert.equal(semanalAoMarcar(null, { lancados: 5 }, "X"), "X"); // apagou o episódio
});

test("normSemanal", () => {
  assert.equal(normSemanal("v"), "V");
  assert.equal(normSemanal(" x "), "X");
  assert.equal(normSemanal("—"), "-");
  assert.equal(normSemanal("–"), "-");
  assert.equal(normSemanal("ok"), "");
  assert.equal(normSemanal(null), "");
});

test("nomeDoSite: nome do streaming a partir do link", () => {
  assert.equal(nomeDoSite("https://www.crunchyroll.com/series/ABC"), "Crunchyroll");
  assert.equal(nomeDoSite("https://www.netflix.com/title/1"), "Netflix");
  assert.equal(nomeDoSite("https://www.crunchyroll.com.br/x"), "Crunchyroll");
  assert.equal(nomeDoSite("https://tv.apple.com/x"), "Apple");
  assert.equal(nomeDoSite("não é url"), "");
});

test("parseGviz: lê a aba Temporada Atual (colunas por nome, mês do Date começa em 0)", () => {
  const json = {
    table: {
      cols: ["", "Número", "Imagem", "Anime", "Onde assistir?", "Link", "Dia de inicio", "Dia da semana", "Último episódio visto", "Semanal", "Url Imagem"]
        .map((label) => ({ label })),
      rows: [
        { c: [null, { v: 1 }, null, { v: "Psyren" }, null, { v: "Link" }, { v: "Date(2026,9,5)" }, { v: "Segunda" }, null, { v: "-" }, { v: "https://cdn.myanimelist.net/images/anime/1154/159987l.jpg" }] },
        { c: [null, { v: 2 }, null, { v: "Tensei II" }, null, null, { v: "Date(2026,8,30)" }, { v: "Quarta" }, { v: 3 }, { v: "v" }, { v: "" }] },
        { c: [null, { v: 3 }, null, { v: "" }, null, null, null, null, null, null, null] }, // sem nome: ignora
      ],
    },
  };
  const itens = parseGviz(`/*O_o*/\ngoogle.visualization.Query.setResponse(${JSON.stringify(json)});`);
  assert.equal(itens.length, 2);
  assert.deepEqual(
    { ...itens[0] },
    {
      numero: 1, nome: "Psyren", inicio: "2026-10-05", diaSemana: "Segunda", ultimoEp: null, semanal: "-",
      img: "https://cdn.myanimelist.net/images/anime/1154/159987l.jpg", streamingImg: "", link: "", total: null, lancados: null,
    },
  );
  assert.equal(itens[1].inicio, "2026-09-30");
  assert.equal(itens[1].ultimoEp, 3);
  assert.equal(itens[1].semanal, "V");
  assert.equal(itens[1].img, ""); // sem Url Imagem: fica para a capa do script
});

test("AniList: escolher só aceita estreia a até 30 dias da planilha (evita homônimos)", () => {
  const m = (y: number, mo: number, d: number): AlMedia => ({ episodes: 12, status: "RELEASING", startDate: { year: y, month: mo, day: d }, nextAiringEpisode: null });
  const antigo = m(2008, 4, 1);
  const novo = m(2026, 10, 2);
  assert.equal(escolher([antigo, novo], "2026-10-05"), novo);
  assert.equal(escolher([antigo], "2026-10-05"), null);
  assert.equal(escolher([antigo, novo], null), antigo); // sem data: o primeiro
});

test("AniList: variantes do nome para segunda busca", () => {
  assert.deepEqual(variantes("Tensei shitara Ken deshita II"), ["Tensei shitara Ken deshita 2", "Tensei shitara Ken deshita 2nd Season"]);
  assert.deepEqual(variantes("Tokyo Revengers: Santen Sensou-hen"), ["Tokyo Revengers"]);
  assert.deepEqual(variantes("Psyren"), []);
});
