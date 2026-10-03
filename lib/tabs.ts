/** Abas do site. Usado no servidor (app/page.tsx lê ?aba=) e no cliente (components/App.tsx). */
export type Tab = "deck" | "stats" | "temporada";
const TABS: Tab[] = ["deck", "stats", "temporada"];

/** Valida o valor de ?aba= (qualquer outra coisa = deck). */
export const tabValida = (v: unknown): Tab => (TABS.includes(v as Tab) ? (v as Tab) : "deck");
