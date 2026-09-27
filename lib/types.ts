export type Tier = "SSR" | "SR" | "R" | "N";

export type Anime = {
  id: number;
  n: number;
  nome: string;
  nomeEn: string;
  score: number;
  eps: number;
  minPerEp: number;
  rewatch: number;
  studio: string;
  genero: string;
  tema: string;
  demografia: string;
  temporada: string;
  season: string;
  ano: string;
  comentario: string;
  favorite: string;
  isFav: boolean;
  /** ISO yyyy-mm-dd, ou null quando a planilha não tem data válida */
  lastSeen: string | null;
  img: string;
  malUrl: string;
  crUrl: string;
  streaming: string;
  tier: Tier;
};

export const TIERS: Tier[] = ["SSR", "SR", "R", "N"];

/** Raridade da carta a partir do score: 10 SSR, 9 SR, 8 R, resto N. */
export function tierOf(score: number): Tier {
  if (score >= 10) return "SSR";
  if (score >= 9) return "SR";
  if (score >= 8) return "R";
  return "N";
}
