import App from "@/components/App";
import { tabValida } from "@/lib/tabs";
import { lerBusca } from "@/lib/urlFiltros";
import { resolveHistory } from "@/lib/history";
import { lerAnimes, lerHistorico, lerTemporada } from "@/lib/dados";
import { fmtAtualizado } from "@/lib/format";
import { lerFiltroStatus } from "@/lib/temporada";

// A planilha fica em cache (lib/dados.ts: relida no máximo a cada 60 s, guardando a última versão boa).
// A página em si é montada a cada visita, porque lê ?aba= e os filtros do endereço.

export default async function Page({ searchParams }: { searchParams: Promise<{ [key: string]: string | string[] | undefined }> }) {
  const params = await searchParams;
  const tabInicial = tabValida(params.aba);
  const buscaInicial = lerBusca(params);
  const [animes, history, temporada] = await Promise.allSettled([lerAnimes(), lerHistorico(), lerTemporada()]);
  // Só chega aqui sem dados se a planilha falhar e nunca tiver sido lida com sucesso (cache vazio).
  if (animes.status === "rejected") {
    return (
      <main className="fatal">
        <h1>Erro ao carregar a planilha</h1>
        <p>{animes.reason instanceof Error ? animes.reason.message : String(animes.reason)}</p>
      </main>
    );
  }
  const lista = animes.value.dados;
  return (
    <App
      animes={lista}
      history={history.status === "fulfilled" ? resolveHistory(history.value.dados, lista) : []}
      temporada={temporada.status === "fulfilled" ? temporada.value.dados : []}
      atualizado={fmtAtualizado(animes.value.em)}
      temporadaAtualizada={temporada.status === "fulfilled" ? fmtAtualizado(temporada.value.em) : ""}
      tabInicial={tabInicial}
      buscaInicial={buscaInicial}
      filtroStatus={lerFiltroStatus(params.status)}
    />
  );
}
