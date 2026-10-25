import { test } from "node:test";
import assert from "node:assert/strict";
import { JANELA_MS, LimiteDeErros, MAX_ERROS, origemPermitida } from "../lib/protecao";

test("origem: mesmo host passa, outro site não, sem Origin passa", () => {
  assert.equal(origemPermitida("https://anime.vercel.app", "anime.vercel.app"), true);
  assert.equal(origemPermitida("https://malicioso.com", "anime.vercel.app"), false);
  assert.equal(origemPermitida("lixo", "anime.vercel.app"), false);
  assert.equal(origemPermitida(null, "anime.vercel.app"), true);
});

test("limite: bloqueia depois de MAX_ERROS senhas erradas e libera depois da janela", () => {
  const l = new LimiteDeErros();
  for (let i = 0; i < MAX_ERROS - 1; i++) l.errou("ip", 0);
  assert.equal(l.bloqueado("ip", 1), false);
  l.errou("ip", 1);
  assert.equal(l.bloqueado("ip", 2), true);
  assert.equal(l.bloqueado("outro", 2), false);
  assert.equal(l.bloqueado("ip", JANELA_MS + 1), false);
});

test("limite: acertar a senha zera os erros", () => {
  const l = new LimiteDeErros();
  for (let i = 0; i < MAX_ERROS; i++) l.errou("ip", 0);
  l.acertou("ip");
  assert.equal(l.bloqueado("ip", 1), false);
});
