import { after } from "next/server";
import App from "./App";
import { historicoSemPar, resolveHistory } from "@/lib/history";
import { lerAnimes, lerHistorico, lerRelacoes, lerTemporada } from "@/lib/dados";
import { fmtAtualizado } from "@/lib/format";

/**
 * Carrega a planilha e monta o App (usado no app/(site)/layout.tsx, comum a todas as abas). Roda no
 * build e na renovação de 60 s, nunca com alguém esperando: a Vercel entrega a última página pronta.
 *
 * Para não travar a renovação com fonte lenta, Temporada (planilha + script + AniList, ~7 s) e franquias
 * (AniList, ~12 s com cache vazio) têm prazo: se não ficarem prontas a tempo, a página sai sem elas e a
 * busca continua em segundo plano (after) até encher o cache, usado na renovação seguinte. Sem as
 * franquias, o próprio navegador as busca em /api/franquias.
 */
const PRAZO = { historico: 6000, temporada: 12000, relacoes: 4000 };

async function comPrazo<T>(p: Promise<T>, ms: number): Promise<T | undefined> {
  after(() => p.catch(() => {})); // se estourar o prazo, deixa terminar e guardar no cache
  return Promise.race([p.catch(() => undefined), new Promise<undefined>((r) => setTimeout(() => r(undefined), ms))]);
}

export default async function Pagina({ children }: { children: React.ReactNode }) {
  const [animes, history, temporada, relacoes] = await Promise.all([
    // sem a lista principal não há página: o erro faz a Vercel manter a última página boa no ar
    lerAnimes(),
    comPrazo(lerHistorico(), PRAZO.historico),
    comPrazo(lerTemporada(), PRAZO.temporada),
    comPrazo(lerRelacoes(), PRAZO.relacoes),
  ]);
  const lista = animes.dados;
  return (
    <App
      animes={lista}
      relacoes={relacoes?.dados ?? null}
      history={history ? resolveHistory(history.dados, lista) : []}
      semPar={history ? historicoSemPar(history.dados, lista) : []}
      temporada={temporada?.dados ?? []}
      atualizado={fmtAtualizado(animes.em)}
      temporadaAtualizada={temporada ? fmtAtualizado(temporada.em) : ""}
    >
      {children}
    </App>
  );
}
