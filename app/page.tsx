import App from "@/components/App";
import { tabValida } from "@/lib/tabs";
import { lerBusca } from "@/lib/urlFiltros";
import { loadAnimes } from "@/lib/sheet";
import { loadHistory, resolveHistory } from "@/lib/history";
import { loadTemporada } from "@/lib/temporada";

// Relê a planilha no máximo a cada 60 s (cache de cada fetch). A página em si é montada a cada
// visita, porque lê ?aba= e os filtros do endereço para já abrir do jeito certo.
export const revalidate = 60;

export default async function Page({ searchParams }: { searchParams: Promise<{ [key: string]: string | string[] | undefined }> }) {
  const params = await searchParams;
  const tabInicial = tabValida(params.aba);
  const buscaInicial = lerBusca(params);
  try {
    const [animes, history, temporada] = await Promise.all([loadAnimes(), loadHistory(), loadTemporada()]);
    return <App animes={animes} history={resolveHistory(history, animes)} temporada={temporada} tabInicial={tabInicial} buscaInicial={buscaInicial} />;
  } catch (e) {
    return (
      <main className="fatal">
        <h1>Erro ao carregar a planilha</h1>
        <p>{e instanceof Error ? e.message : String(e)}</p>
      </main>
    );
  }
}
