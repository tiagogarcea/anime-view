import { revalidatePath, revalidateTag } from "next/cache";
import { normSemanal, SCRIPT_URL } from "@/lib/temporada";

/**
 * Grava na aba "Temporada Atual" pelo script do Google:
 *   { numero, episodio, senha } → coluna "Último episódio visto"
 *   { numero, semanal, senha }  → coluna "Semanal" (V, X, - ou vazio)
 * A senha é conferida pelo próprio script (propriedade SENHA); aqui só repassamos.
 */
export async function POST(req: Request) {
  let body: { numero?: unknown; episodio?: unknown; semanal?: unknown; senha?: unknown };
  try {
    body = await req.json();
  } catch {
    return Response.json({ ok: false, erro: "json" }, { status: 400 });
  }
  const numero = Number(body.numero);
  if (!Number.isInteger(numero) || typeof body.senha !== "string") {
    return Response.json({ ok: false, erro: "dados" }, { status: 400 });
  }

  let payload: Record<string, unknown>;
  if (body.semanal !== undefined) {
    // manda também o episódio atual: se o script do Google ainda for a versão antiga (que não conhece
    // "semanal"), ele regrava o mesmo episódio em vez de apagá-lo
    const atual = body.episodio === null || body.episodio === undefined || body.episodio === "" ? "" : Number(body.episodio);
    payload = { senha: body.senha, numero, semanal: normSemanal(body.semanal), episodio: Number.isInteger(atual) ? atual : "" };
  } else {
    const episodio = body.episodio === null || body.episodio === "" ? "" : Number(body.episodio);
    if (episodio !== "" && (!Number.isInteger(episodio) || episodio < 0 || episodio > 9999)) {
      return Response.json({ ok: false, erro: "dados" }, { status: 400 });
    }
    payload = { senha: body.senha, numero, episodio };
  }

  try {
    const r = await fetch(SCRIPT_URL, {
      method: "POST",
      headers: { "Content-Type": "text/plain;charset=utf-8" },
      body: JSON.stringify(payload),
      redirect: "follow",
      cache: "no-store",
      signal: AbortSignal.timeout(20000),
    });
    const j = await r.json();
    if (!j.ok) return Response.json(j, { status: j.erro === "senha" ? 401 : 400 });
    // expira na hora: a próxima visita já lê a planilha atualizada
    revalidateTag("temporada", { expire: 0 });
    revalidatePath("/", "layout"); // todas as páginas (/, /stats, /temporada…)
    return Response.json(j);
  } catch {
    return Response.json({ ok: false, erro: "script" }, { status: 502 });
  }
}
