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
 * POST → { senha, numero, episodio } grava o episódio na coluna "Último episódio visto".
 */

const ABA = "Temporada Atual";
const COL_NUMERO = "Número";
const COL_IMAGEM = "Imagem";
const COL_EPISODIO = "Último episódio visto";

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

  const vazio = body.episodio === "" || body.episodio === null || body.episodio === undefined;
  const episodio = vazio ? "" : Number(body.episodio);
  if (!vazio && (!Number.isInteger(episodio) || episodio < 0 || episodio > 9999)) return json({ ok: false, erro: "episodio" });

  const lock = LockService.getScriptLock();
  lock.waitLock(10000);
  try {
    const { sheet, values, header } = lerAba();
    const cNum = coluna(values[header], COL_NUMERO);
    const cEp = coluna(values[header], COL_EPISODIO);
    if (cNum < 0 || cEp < 0) return json({ ok: false, erro: "colunas" });
    for (let r = header + 1; r < values.length; r++) {
      if (Number(values[r][cNum]) === Number(body.numero)) {
        sheet.getRange(r + 1, cEp + 1).setValue(episodio);
        return json({ ok: true, numero: Number(body.numero), episodio: episodio });
      }
    }
    return json({ ok: false, erro: "anime" });
  } finally {
    lock.releaseLock();
  }
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
