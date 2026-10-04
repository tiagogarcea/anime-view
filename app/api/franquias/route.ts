import { lerRelacoes } from "@/lib/dados";

/**
 * Ligações do AniList para as franquias (reserva): se a página pronta saiu sem elas (AniList lento no
 * build/renovação), o navegador busca aqui e monta as franquias sem recarregar. Vem do cache de 6 h.
 */
export async function GET() {
  try {
    const r = await lerRelacoes();
    return Response.json(r.dados, { headers: { "Cache-Control": "public, max-age=300" } });
  } catch {
    return Response.json({}, { status: 503 });
  }
}
