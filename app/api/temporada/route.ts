import { revalidatePath, revalidateTag } from "next/cache";
import { SCRIPT_URL } from "@/lib/temporada";

/**
 * Grava o "Último episódio visto" na aba "Temporada Atual" pelo script do Google.
 * A senha é conferida pelo próprio script (propriedade SENHA); aqui só repassamos.
 */
export async function POST(req: Request) {
  const url = SCRIPT_URL;
  if (!url) return Response.json({ ok: false, erro: "nao-configurado" }, { status: 503 });

  let body: { numero?: unknown; episodio?: unknown; senha?: unknown };
  try {
    body = await req.json();
  } catch {
    return Response.json({ ok: false, erro: "json" }, { status: 400 });
  }
  const numero = Number(body.numero);
  const episodio = body.episodio === null || body.episodio === "" ? "" : Number(body.episodio);
  if (!Number.isInteger(numero) || (episodio !== "" && (!Number.isInteger(episodio) || episodio < 0 || episodio > 9999)) || typeof body.senha !== "string") {
    return Response.json({ ok: false, erro: "dados" }, { status: 400 });
  }

  try {
    const r = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "text/plain;charset=utf-8" },
      body: JSON.stringify({ senha: body.senha, numero, episodio }),
      redirect: "follow",
      cache: "no-store",
    });
    const j = await r.json();
    if (!j.ok) return Response.json(j, { status: j.erro === "senha" ? 401 : 400 });
    // expira na hora: a próxima visita já lê a planilha atualizada
    revalidateTag("temporada", { expire: 0 });
    revalidatePath("/");
    return Response.json(j);
  } catch {
    return Response.json({ ok: false, erro: "script" }, { status: 502 });
  }
}

// DIAGNÓSTICO TEMPORÁRIO: o que o script do Google devolve quando chamado pela Vercel
export async function GET() {
  const t0 = Date.now();
  try {
    const r = await fetch(SCRIPT_URL, { cache: "no-store", redirect: "follow" });
    const txt = await r.text();
    return Response.json({ status: r.status, url: r.url.slice(0, 80), tipo: r.headers.get("content-type"), ms: Date.now() - t0, inicio: txt.slice(0, 200) });
  } catch (e) {
    return Response.json({ erro: String(e), ms: Date.now() - t0 });
  }
}
