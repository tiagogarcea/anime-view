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
 * GET  → lista { numero, imagem, streaming, link }: capa colada na coluna "Imagem", logo do streaming
 *        colado na coluna "Onde assistir?" e URL da coluna "Link".
 * POST → { senha, numero, episodio } grava o episódio na coluna "Último episódio visto";
 *        { senha, numero, semanal: "V" | "X" | "-" | "" } grava o status na coluna "Semanal".
 *
 * Mudanças automáticas de status (ver atualizarEstreias): "-" → "X" na semana da estreia e,
 *   toda segunda, "V" → "X" (menos quem já completou todos os episódios).
 *   Para ligar: escolha a função "instalarGatilho" no topo do editor e clique em Executar uma vez.
 *   Ela cria um gatilho que roda "atualizarEstreias" todo dia às 6h.
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
const COL_NOME = "Anime";
const COL_STREAMING = "Onde assistir?";
const COL_LINK = "Link";
const SEMANAL_VALIDOS = ["V", "X", "-", ""];

function doGet() {
  const { sheet, values, header } = lerAba();
  const formulas = sheet.getDataRange().getFormulas();
  const ricos = sheet.getDataRange().getRichTextValues();
  const cNum = coluna(values[header], COL_NUMERO);
  const cImg = coluna(values[header], COL_IMAGEM);
  const cStr = coluna(values[header], COL_STREAMING);
  const cLink = coluna(values[header], COL_LINK);
  const itens = [];
  for (let r = header + 1; r < values.length; r++) {
    const numero = Number(values[r][cNum]);
    if (!numero) continue;
    itens.push({
      numero: numero,
      imagem: cImg >= 0 ? urlDaImagem(values[r][cImg], formulas[r][cImg]) : "",
      streaming: cStr >= 0 ? urlDaImagem(values[r][cStr], formulas[r][cStr]) : "",
      link: cLink >= 0 ? urlDoLink(values[r][cLink], formulas[r][cLink], ricos[r][cLink]) : "",
    });
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
 * Mudanças automáticas de status (roda todo dia pelo gatilho das 6h):
 * 1. "-" (não estreou) → "X" quando chega a semana da estreia (semana começa na segunda).
 * 2. Uma vez por semana (na primeira execução a partir de segunda): todo "V" → "X", porque sai
 *    episódio novo — exceto quem já completou (Último episódio visto >= total de episódios do AniList).
 */
function atualizarEstreias() {
  const { sheet, values, header } = lerAba();
  const cIni = coluna(values[header], COL_INICIO);
  const cSem = coluna(values[header], COL_SEMANAL);
  const cEp = coluna(values[header], COL_EPISODIO);
  const cNome = coluna(values[header], COL_NOME);
  if (cIni < 0 || cSem < 0) return;

  const hoje = new Date();
  hoje.setHours(0, 0, 0, 0);
  const semanaAtual = isoDia(segundaDe(hoje));
  const props = PropertiesService.getScriptProperties();
  const ultima = props.getProperty("ULTIMA_VIRADA");
  // primeira execução: só registra a semana atual, para não desmarcar os ✓ da semana em curso
  if (!ultima) props.setProperty("ULTIMA_VIRADA", semanaAtual);
  const viraSemana = !!ultima && ultima !== semanaAtual;

  for (let r = header + 1; r < values.length; r++) {
    const status = String(values[r][cSem]).trim().toUpperCase();
    const inicio = values[r][cIni];

    if (status === "-" && inicio instanceof Date && hoje >= segundaDe(inicio)) {
      sheet.getRange(r + 1, cSem + 1).setValue("X");
    } else if (status === "V" && viraSemana) {
      const visto = Number(values[r][cEp]) || 0;
      const total = cNome >= 0 ? totalEpisodios(String(values[r][cNome]).trim(), inicio) : null;
      if (!(total && visto >= total)) sheet.getRange(r + 1, cSem + 1).setValue("X");
    }
  }
  if (viraSemana) props.setProperty("ULTIMA_VIRADA", semanaAtual);
}

function segundaDe(data) {
  const d = new Date(data);
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() - ((d.getDay() + 6) % 7));
  return d;
}

function isoDia(d) {
  return Utilities.formatDate(d, Session.getScriptTimeZone(), "yyyy-MM-dd");
}

/** Total de episódios pelo AniList; só aceita o resultado cuja estreia fica a até 30 dias da planilha. */
function totalEpisodios(nome, inicio) {
  const buscas = [nome];
  const m = nome.match(/^(.*?)\s+(II|III|IV)$/);
  if (m) {
    const n = { II: "2", III: "3", IV: "4" }[m[2]];
    buscas.push(m[1] + " " + n, m[1] + " " + n + (n === "2" ? "nd" : n === "3" ? "rd" : "th") + " Season");
  }
  const query = "query($s:String){Page(perPage:5){media(search:$s,type:ANIME,sort:SEARCH_MATCH){episodes startDate{year month day}}}}";
  for (let i = 0; i < buscas.length; i++) {
    try {
      const resp = UrlFetchApp.fetch("https://graphql.anilist.co", {
        method: "post",
        contentType: "application/json",
        payload: JSON.stringify({ query: query, variables: { s: buscas[i] } }),
        muteHttpExceptions: true,
      });
      const media = (((JSON.parse(resp.getContentText()) || {}).data || {}).Page || {}).media || [];
      for (let k = 0; k < media.length; k++) {
        const sd = media[k].startDate;
        if (!(inicio instanceof Date)) return media[k].episodes;
        if (sd && sd.year && sd.month) {
          const estreia = new Date(sd.year, sd.month - 1, sd.day || 1);
          if (Math.abs(estreia - inicio) / 86400000 <= 30) return media[k].episodes;
        }
      }
    } catch (err) {
      /* sem AniList: trata como não completo */
    }
    Utilities.sleep(700);
  }
  return null;
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

/** Link na célula: texto com hiperlink (Inserir › Link), =HYPERLINK("url"; ...) ou a própria URL digitada. */
function urlDoLink(valor, formula, rico) {
  if (rico) {
    try {
      if (rico.getLinkUrl()) return rico.getLinkUrl();
      const runs = rico.getRuns();
      for (let i = 0; i < runs.length; i++) if (runs[i].getLinkUrl()) return runs[i].getLinkUrl();
    } catch (err) {}
  }
  const m = String(formula || "").match(/HYPERLINK\(\s*"([^"]+)"/i);
  if (m) return m[1];
  const s = String(valor || "").trim();
  return /^https?:\/\//i.test(s) ? s : "";
}

function json(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}
