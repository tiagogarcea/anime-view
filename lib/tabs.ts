/**
 * Abas do site. Cada uma tem o próprio endereço (página pronta, servida pela Vercel e renovada a cada
 * 60 s): o F5 abre direto nela e ninguém espera a planilha. Usado no servidor e no cliente.
 * "retro" é a segunda página do Stats (retrospectiva, franquias e mais reassistidos).
 */
export type Tab = "deck" | "stats" | "retro" | "temporada";

export const CAMINHO: Record<Tab, string> = {
  deck: "/",
  stats: "/stats",
  retro: "/stats/retrospectiva",
  temporada: "/temporada",
};

/** Endereço → aba ("/stats/" e "/stats" são a mesma; desconhecido = deck). */
export function tabDoCaminho(caminho: string): Tab {
  const p = caminho.replace(/\/+$/, "") || "/";
  return (Object.keys(CAMINHO) as Tab[]).find((t) => CAMINHO[t] === p) ?? "deck";
}

/** Links antigos (?aba=stats, #temporada): valida o nome da aba (qualquer outra coisa = deck). */
export const tabValida = (v: unknown): Tab => (["deck", "stats", "retro", "temporada"].includes(v as string) ? (v as Tab) : "deck");
