import { Anime } from "./types";

/**
 * Sorteio ponderado, mesma regra do Streamlit:
 * peso base = score (mínimo 1), favorito dobra,
 * +0,1 por mês desde a última vez que viu (máx. +12).
 */
export function suggest(rows: Anime[], exclude?: number): Anime | null {
  const pool = rows.length > 1 && exclude !== undefined ? rows.filter((a) => a.id !== exclude) : rows;
  if (!pool.length) return null;
  const now = Date.now();
  const weights = pool.map((a) => {
    let w = Math.max(1, a.score);
    if (a.isFav) w *= 2;
    if (a.lastSeen) {
      const months = (now - new Date(a.lastSeen + "T00:00:00").getTime()) / 86_400_000 / 30;
      w += Math.min(Math.max(months, 0) * 0.1, 12);
    }
    return w;
  });
  let r = Math.random() * weights.reduce((s, w) => s + w, 0);
  for (let i = 0; i < pool.length; i++) {
    r -= weights[i];
    if (r <= 0) return pool[i];
  }
  return pool[pool.length - 1];
}
