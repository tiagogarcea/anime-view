/** Proteções da rota que grava na planilha (app/api/temporada). */

/** Só aceita pedidos feitos pelo próprio site: o Origin (quando o navegador manda) tem de ser o mesmo host. */
export function origemPermitida(origin: string | null, host: string | null): boolean {
  if (!origin) return true; // sem Origin não é navegador de outro site (curl, app); a senha continua valendo
  try {
    return new URL(origin).host === host;
  } catch {
    return false;
  }
}

/**
 * Limite de senhas erradas por visitante: depois de MAX erros dentro da JANELA, bloqueia até a janela
 * passar. Fica na memória de cada instância da Vercel (não é global), mas já barra tentativa em massa.
 */
export const MAX_ERROS = 5;
export const JANELA_MS = 10 * 60_000;

export class LimiteDeErros {
  private erros = new Map<string, { n: number; ate: number }>();

  bloqueado(chave: string, agora = Date.now()): boolean {
    const e = this.erros.get(chave);
    if (!e) return false;
    if (agora >= e.ate) { this.erros.delete(chave); return false; }
    return e.n >= MAX_ERROS;
  }

  errou(chave: string, agora = Date.now()) {
    const e = this.erros.get(chave);
    if (e && agora < e.ate) e.n++;
    else this.erros.set(chave, { n: 1, ate: agora + JANELA_MS });
    if (this.erros.size > 1000) for (const [k, v] of this.erros) if (agora >= v.ate) this.erros.delete(k);
  }

  acertou(chave: string) {
    this.erros.delete(chave);
  }
}

/** IP do visitante (a Vercel manda em x-forwarded-for; o primeiro é o do cliente). */
export function ipDe(req: Request): string {
  return req.headers.get("x-forwarded-for")?.split(",")[0].trim() || "desconhecido";
}
