/**
 * Anime View — ponte entre o site e a aba "Temporada Atual" da planilha.
 *
 * Instalação (uma vez):
 * 1. Na planilha: Extensões › Apps Script › "+" ao lado de Arquivos › Script, nome "Temporada".
 *    Cole este arquivo inteiro nele (não apague outros arquivos, como macros antigas).
 * 2. Engrenagem (Configurações do projeto) › Propriedades do script › Adicionar:
 *      Propriedade: SENHA   Valor: a senha que você vai digitar no site para marcar episódios
 * 3. Implantar › Nova implantação › tipo "App da Web":
 *      Executar como: Eu     Quem pode acessar: Qualquer pessoa
 *    Autorize o acesso quando pedir e copie a URL do app da Web (termina em /exec).
 * 4. Coloque essa URL em SCRIPT_URL (lib/temporada.ts) ou na variável TEMPORADA_SCRIPT_URL da Vercel.
 *
 * GET  → lista { numero, imagem } para o site mostrar as capas coladas na coluna "Imagem".
 * POST → { senha, numero, episodio } grava o episódio na coluna "Último episódio visto";
 *        { senha, numero, semanal: "V" | "X" | "-" | "" } grava o status na coluna "Semanal".
 *
 * Troca automática "-" → "X" na semana da estreia (semana começa na segunda):
 *   depois de colar esta versão, escolha a função "instalarGatilho" no topo do editor e clique
 *   em Executar uma vez. Ela cria um gatilho que roda "atualizarEstreias" todo dia às 6h.
 *
 * Para atualizar o código mantendo a mesma URL: Implantar › Gerenciar implantações ›
 * lápis (editar) › Versão: "Nova versão" › Implantar.
 */

const ABA = "Temporada Atual";
const COL_NUMERO = "Número";
const COL_IMAGEM = "Imagem";
const COL_EPISODIO = "Último episódio visto";
const COL_SEMANAL = "Semanal";
const COL_INICIO = "Dia de inicio";
const SEMANAL_VALIDOS = ["V", "X", "-", ""];

function doGet() {
  const { sheet, values, header } = lerAba();
  const formulas = sheet.getDataRange().getFormulas();
  const cNum = coluna(values[header], COL_NUMERO);
  const cImg = coluna(values[header], COL_IMAGEM);
  const itens = [];
  for (let r = header + 1; r < values.length; r++) {
    const numero = Number(values[r][cNum]);
    if (!numero) continue;
    itens.push({ numero: numero, imagem: cImg >= 0 ? urlDaImagem(values[r][cImg], formulas[r][cImg]) : "" });
  }
  return json({ ok: true, itens: itens });
}

function doPost(e) {
  let body;
  try {
    body = JSON.parse((e && e.postData && e.postData.contents) || "{}");
  } catch (err) {
    return json({ ok: false, erro: "json" });
  }
  const senha = PropertiesService.getScriptProperties().getProperty("SENHA");
  if (!senha || body.senha !== senha) return json({ ok: false, erro: "senha" });

  // qual coluna gravar: "Semanal" (status) ou "Último episódio visto"
  let alvo, valor;
  if (body.semanal !== undefined) {
    valor = String(body.semanal).toUpperCase();
    if (SEMANAL_VALIDOS.indexOf(valor) < 0) return json({ ok: false, erro: "semanal" });
    alvo = COL_SEMANAL;
  } else {
    const vazio = body.episodio === "" || body.episodio === null || body.episodio === undefined;
    valor = vazio ? "" : Number(body.episodio);
    if (!vazio && (!Number.isInteger(valor) || valor < 0 || valor > 9999)) return json({ ok: false, erro: "episodio" });
    alvo = COL_EPISODIO;
  }

  const lock = LockService.getScriptLock();
  lock.waitLock(10000);
  try {
    const { sheet, values, header } = lerAba();
    const cNum = coluna(values[header], COL_NUMERO);
    const cAlvo = coluna(values[header], alvo);
    if (cNum < 0 || cAlvo < 0) return json({ ok: false, erro: "colunas" });
    for (let r = header + 1; r < values.length; r++) {
      if (Number(values[r][cNum]) === Number(body.numero)) {
        sheet.getRange(r + 1, cAlvo + 1).setValue(valor);
        return json({ ok: true, numero: Number(body.numero), coluna: alvo, valor: valor });
      }
    }
    return json({ ok: false, erro: "anime" });
  } finally {
    lock.releaseLock();
  }
}

/**
 * Única mudança automática de status: marcado "-" (não estreou) e já chegou a semana da
 * estreia (de segunda a domingo) → vira "X" (episódio não visto). Roda pelo gatilho diário.
 */
function atualizarEstreias() {
  const { sheet, values, header } = lerAba();
  const cIni = coluna(values[header], COL_INICIO);
  const cSem = coluna(values[header], COL_SEMANAL);
  if (cIni < 0 || cSem < 0) return;
  const hoje = new Date();
  hoje.setHours(0, 0, 0, 0);
  for (let r = header + 1; r < values.length; r++) {
    const inicio = values[r][cIni];
    if (String(values[r][cSem]).trim() !== "-" || !(inicio instanceof Date)) continue;
    const segunda = new Date(inicio);
    segunda.setHours(0, 0, 0, 0);
    segunda.setDate(segunda.getDate() - ((segunda.getDay() + 6) % 7));
    if (hoje >= segunda) sheet.getRange(r + 1, cSem + 1).setValue("X");
  }
}

/** Rode uma vez pelo editor: cria o gatilho diário (6h) de atualizarEstreias, sem duplicar. */
function instalarGatilho() {
  ScriptApp.getProjectTriggers()
    .filter(function (t) { return t.getHandlerFunction() === "atualizarEstreias"; })
    .forEach(function (t) { ScriptApp.deleteTrigger(t); });
  ScriptApp.newTrigger("atualizarEstreias").timeBased().everyDays(1).atHour(6).create();
  atualizarEstreias();
}

function lerAba() {
  const sheet = SpreadsheetApp.getActive().getSheetByName(ABA);
  if (!sheet) throw new Error('Aba "' + ABA + '" não encontrada');
  const values = sheet.getDataRange().getValues();
  for (let i = 0; i < Math.min(10, values.length); i++) {
    if (coluna(values[i], COL_NUMERO) >= 0) return { sheet: sheet, values: values, header: i };
  }
  throw new Error("Cabeçalho não encontrado");
}

function coluna(linha, nome) {
  return linha.findIndex(function (c) { return String(c).trim() === nome; });
}

/** Imagem colada na célula (CellImage) ou fórmula =IMAGE("url"). */
function urlDaImagem(valor, formula) {
  if (valor && typeof valor === "object") {
    try { if (valor.getUrl && valor.getUrl()) return valor.getUrl(); } catch (err) {}
    try { if (valor.getContentUrl) return valor.getContentUrl(); } catch (err) {}
  }
  const m = String(formula || "").match(/IMAGE\(\s*"([^"]+)"/i);
  return m ? m[1] : "";
}

function json(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}
