/**
 * Roda o apps-script/Temporada.gs de verdade, num contexto com uma planilha falsa e os serviços do
 * Google simulados (SpreadsheetApp, PropertiesService, Utilities, UrlFetchApp...), com "agora" e fuso
 * controlados. Testa a virada automática de status e a leitura de links/imagens.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import vm from "node:vm";

const CODIGO = readFileSync(new URL("../apps-script/Temporada.gs", import.meta.url), "utf8");
const CAB = ["Número", "Anime", "Dia de inicio", "Último episódio visto", "Semanal", "Link"];
const FUSO = "America/Sao_Paulo";

type Linha = { nome: string; inicio: string | null; ep?: number | ""; sem: string };

/** Monta o script com a planilha falsa. `agora` é um instante ISO; datas da planilha são meia-noite no FUSO. */
function montar(agora: string, linhas: Linha[], props: Record<string, string> = {}, episodiosAniList: Record<string, number> = {}, horaUtcDaCelula = "03:00:00") {
  const AGORA = Date.parse(agora);
  const Real = Date;
  class FakeDate extends Real {
    constructor(...a: unknown[]) {
      if (a.length === 0) super(AGORA);
      else super(...(a as [number]));
    }
    static now() { return AGORA; }
  }
  // meia-noite no fuso de São Paulo (UTC-3) = 03:00 UTC
  const dataDaCelula = (iso: string) => new FakeDate(`${iso}T${horaUtcDaCelula}Z`);
  const valores: unknown[][] = [
    CAB,
    ...linhas.map((l, i) => [i + 1, l.nome, l.inicio ? dataDaCelula(l.inicio) : "", l.ep ?? "", l.sem, ""]),
  ];
  const gravados: { linha: number; coluna: number; valor: unknown }[] = [];
  const sheet = {
    getDataRange: () => ({
      getValues: () => valores.map((r) => [...r]),
      getFormulas: () => valores.map((r) => r.map(() => "")),
      getRichTextValues: () => valores.map((r) => r.map(() => null)),
    }),
    getRange: (linha: number, coluna: number) => ({
      setValue: (valor: unknown) => { valores[linha - 1][coluna - 1] = valor; gravados.push({ linha, coluna, valor }); },
    }),
  };
  const ctx = vm.createContext({
    Date: FakeDate,
    SpreadsheetApp: { getActive: () => ({ getSheetByName: () => sheet, getSpreadsheetTimeZone: () => FUSO }) },
    PropertiesService: {
      getScriptProperties: () => ({ getProperty: (k: string) => props[k] ?? null, setProperty: (k: string, v: string) => { props[k] = v; } }),
    },
    Utilities: {
      formatDate: (d: Date, tz: string) => new Intl.DateTimeFormat("en-CA", { timeZone: tz, year: "numeric", month: "2-digit", day: "2-digit" }).format(d),
      sleep: () => {},
    },
    UrlFetchApp: {
      fetch: (_url: string, opt: { payload: string }) => {
        const nome = JSON.parse(opt.payload).variables.s;
        const ep = episodiosAniList[nome];
        const media = ep === undefined ? [] : [{ episodes: ep, startDate: { year: 2026, month: 7, day: 1 } }];
        return { getContentText: () => JSON.stringify({ data: { Page: { media } } }) };
      },
    },
    LockService: { getScriptLock: () => ({ waitLock: () => {}, releaseLock: () => {} }) },
    ContentService: { createTextOutput: (s: string) => ({ setMimeType: () => JSON.parse(s) }), MimeType: { JSON: "json" } },
    ScriptApp: {},
  });
  vm.runInContext(CODIGO, ctx);
  const status = () => valores.slice(1).map((r) => r[4]);
  return { ctx, status, gravados, props };
}

const ESTREIAS: Linha[] = [
  { nome: "Psyren", inicio: "2026-10-05", sem: "-" },     // segunda
  { nome: "Tsuihou", inicio: "2026-10-06", sem: "-" },    // terça
  { nome: "Domingo", inicio: "2026-10-11", sem: "-" },    // domingo da mesma semana
  { nome: "Dreamland", inicio: "2026-10-16", sem: "-" },  // semana seguinte
  { nome: "Sem data", inicio: null, sem: "-" },
];

test('gatilho: no sábado antes, nenhum "-" muda', () => {
  const s = montar("2026-10-03T15:00:00Z", ESTREIAS, { ULTIMA_VIRADA: "2026-09-28" });
  s.ctx.atualizarEstreias();
  assert.deepEqual(s.status(), ["-", "-", "-", "-", "-"]);
});

test('gatilho: na segunda da semana da estreia, "-" vira "X" (estreias de seg, ter e dom)', () => {
  const s = montar("2026-10-05T09:00:00Z", ESTREIAS, { ULTIMA_VIRADA: "2026-10-05" }); // 06h em SP
  s.ctx.atualizarEstreias();
  assert.deepEqual(s.status(), ["X", "X", "X", "-", "-"]);
});

test("gatilho: célula de data em meia-noite UTC (fuso do script ≠ da planilha) não adianta a estreia de segunda", () => {
  // domingo 04/10 às 06h em SP; Psyren estreia na segunda 05/10, a célula chega como 05/10 00:00 UTC (= 04/10 21h em SP)
  for (const hora of ["03:00:00", "00:00:00"]) {
    const s = montar("2026-10-04T09:00:00Z", ESTREIAS, { ULTIMA_VIRADA: "2026-09-28" }, {}, hora);
    s.ctx.atualizarEstreias();
    assert.deepEqual(s.status(), ["-", "-", "-", "-", "-"], `célula às ${hora} UTC`);
  }
});

test("gatilho: domingo 23h30 em SP (já segunda em UTC) ainda não muda — vale o fuso da planilha", () => {
  const s = montar("2026-10-05T02:30:00Z", ESTREIAS, { ULTIMA_VIRADA: "2026-09-28" });
  s.ctx.atualizarEstreias();
  assert.deepEqual(s.status(), ["-", "-", "-", "-", "-"]);
});

test('gatilho: na virada da semana, "V" vira "X" — menos quem já completou', () => {
  const linhas: Linha[] = [
    { nome: "Em dia", inicio: "2026-07-02", ep: 5, sem: "V" },
    { nome: "Completo", inicio: "2026-07-02", ep: 12, sem: "V" },
    { nome: "Atrasado", inicio: "2026-07-02", ep: 3, sem: "X" },
  ];
  const s = montar("2026-10-05T09:00:00Z", linhas, { ULTIMA_VIRADA: "2026-09-28" }, { "Em dia": 12, Completo: 12 });
  s.ctx.atualizarEstreias();
  assert.deepEqual(s.status(), ["X", "V", "X"]);
  assert.equal(s.props.ULTIMA_VIRADA, "2026-10-05");
});

test('gatilho: a virada de "V" acontece uma vez só por semana', () => {
  const linhas: Linha[] = [{ nome: "Em dia", inicio: "2026-07-02", ep: 5, sem: "V" }];
  const s = montar("2026-10-06T09:00:00Z", linhas, { ULTIMA_VIRADA: "2026-10-05" }, { "Em dia": 12 });
  s.ctx.atualizarEstreias();
  assert.deepEqual(s.status(), ["V"]); // já virou na segunda e você marcou ✓ de novo
});

test("gatilho: primeira execução só registra a semana, sem desmarcar ✓", () => {
  const linhas: Linha[] = [{ nome: "Em dia", inicio: "2026-07-02", ep: 5, sem: "V" }];
  const s = montar("2026-10-07T09:00:00Z", linhas, {}, { "Em dia": 12 });
  s.ctx.atualizarEstreias();
  assert.deepEqual(s.status(), ["V"]);
  assert.equal(s.props.ULTIMA_VIRADA, "2026-10-05");
});

test("urlDoLink: texto com hiperlink, =HYPERLINK e URL digitada", () => {
  const { ctx } = montar("2026-10-03T15:00:00Z", []);
  const rico = (url: string | null, runs: (string | null)[] = []) => ({
    getLinkUrl: () => url,
    getRuns: () => runs.map((u) => ({ getLinkUrl: () => u })),
  });
  assert.equal(ctx.urlDoLink("Link", "", rico("https://www.crunchyroll.com/a")), "https://www.crunchyroll.com/a");
  assert.equal(ctx.urlDoLink("Assistir aqui", "", rico(null, [null, "https://netflix.com/b"])), "https://netflix.com/b");
  assert.equal(ctx.urlDoLink("Link", '=HYPERLINK("https://x.com/c"; "Link")', null), "https://x.com/c");
  assert.equal(ctx.urlDoLink("https://y.com/d", "", null), "https://y.com/d");
  assert.equal(ctx.urlDoLink("Link", "", rico(null)), "");
});

test("urlDaImagem: imagem colada na célula ou =IMAGE", () => {
  const { ctx } = montar("2026-10-03T15:00:00Z", []);
  assert.equal(ctx.urlDaImagem({ getUrl: () => "https://img/1" }, ""), "https://img/1");
  assert.equal(ctx.urlDaImagem({ getUrl: () => null, getContentUrl: () => "https://img/2" }, ""), "https://img/2");
  assert.equal(ctx.urlDaImagem("", '=IMAGE("https://img/3")'), "https://img/3");
  assert.equal(ctx.urlDaImagem("", ""), "");
});

test("doPost: senha errada não grava; certa grava episódio e status", () => {
  const s = montar("2026-10-03T15:00:00Z", [{ nome: "Psyren", inicio: "2026-10-05", sem: "-" }], { SENHA: "segredo" });
  const post = (body: object) => s.ctx.doPost({ postData: { contents: JSON.stringify(body) } });
  assert.deepEqual(post({ senha: "errada", numero: 1, episodio: 2 }), { ok: false, erro: "senha" });
  assert.equal(s.gravados.length, 0);
  assert.equal(post({ senha: "segredo", numero: 1, episodio: 2 }).ok, true);
  assert.equal(post({ senha: "segredo", numero: 1, semanal: "v" }).ok, true);
  assert.deepEqual(post({ senha: "segredo", numero: 1, semanal: "Z" }), { ok: false, erro: "semanal" });
  assert.deepEqual(post({ senha: "segredo", numero: 99, episodio: 1 }), { ok: false, erro: "anime" });
  assert.deepEqual(s.gravados.map((g) => g.valor), [2, "V"]);
});
