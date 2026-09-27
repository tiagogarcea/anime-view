import { HD_COVERS } from "./hdCovers";

const nf = new Intl.NumberFormat("pt-BR");

export const fmtInt = (n: number) => nf.format(n);

export const fmtScore = (n: number) => (Number.isInteger(n) ? String(n) : n.toFixed(1).replace(".", ","));

/** AAAA-MM-DD → DD/MM/AAAA */
export function fmtDate(iso: string | null): string {
  if (!iso) return "—";
  const [y, m, d] = iso.split("-");
  return `${d}/${m}/${y}`;
}

const MESES = ["jan", "fev", "mar", "abr", "mai", "jun", "jul", "ago", "set", "out", "nov", "dez"];

/** AAAA-MM → "mar/2025" */
export function fmtMonth(ym: string): string {
  const [y, m] = ym.split("-");
  return `${MESES[Number(m) - 1]}/${y}`;
}

/**
 * Versão grande da capa do MyAnimeList (424×600 em vez de 225×318):
 * ".../117717.jpg" → ".../117717l.jpg". Outros links ficam como estão.
 */
export function largeImg(url: string): string {
  return url.replace(/(myanimelist\.net\/images\/anime\/\d+\/\d+)\.(jpg|jpeg|webp)(\?.*)?$/i, "$1l.$2$3");
}

/** Capa ampliada guardada no projeto (ver lib/hdCovers.ts), ou "" se não houver. */
export function hdImg(url: string): string {
  const m = url.match(/myanimelist\.net\/images\/anime\/(\d+)\/(\d+)l?\.(?:jpg|jpeg|webp)/i);
  const key = m ? `${m[1]}-${m[2]}` : "";
  return key && HD_COVERS.has(key) ? `/covers/${key}.jpg` : "";
}

/** Cor escura estável por nome, usada na capa provisória quando a imagem falha. */
export function hueOf(s: string): string {
  let h = 0;
  for (const c of s) h = (h * 31 + c.charCodeAt(0)) % 360;
  return `hsl(${h} 35% 16%)`;
}
