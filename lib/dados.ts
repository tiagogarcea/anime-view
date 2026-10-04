import { unstable_cache } from "next/cache";
import { loadAnimes } from "./sheet";
import { loadHistory } from "./history";
import { loadTemporada } from "./temporada";
import { buscarRelacoes } from "./franquias";

/**
 * Cache das três abas da planilha, com a hora em que cada uma foi lida.
 * Cada aba é relida no máximo a cada 60 s. Se a leitura falhar (Google fora do ar, resposta vazia),
 * o loader dá erro e o Next continua servindo a última versão que funcionou — por isso o site não
 * mostra tela de erro, e a hora no rodapé diz de quando são os dados.
 * A aba Temporada tem a tag "temporada": gravar um episódio (app/api/temporada) a expira na hora.
 */
export type Lido<T> = { dados: T; em: number };

const lido = <T>(load: () => Promise<T>) => async (): Promise<Lido<T>> => ({ dados: await load(), em: Date.now() });

export const lerAnimes = unstable_cache(lido(loadAnimes), ["animes-v1"], { revalidate: 60 });
export const lerHistorico = unstable_cache(lido(loadHistory), ["historico-v1"], { revalidate: 60 });
export const lerTemporada = unstable_cache(lido(loadTemporada), ["temporada-v1"], { revalidate: 60, tags: ["temporada"] });

/**
 * Ligações do AniList para montar as franquias (lib/franquias.ts): ~12 consultas para a planilha toda,
 * então ficam 6 h em cache. Anime novo na planilha entra na franquia na próxima releitura.
 */
export const lerRelacoes = unstable_cache(
  lido(async () => buscarRelacoes((await loadAnimes()).map((a) => a.malId))),
  ["franquias-v2"],
  { revalidate: 6 * 3600 },
);
