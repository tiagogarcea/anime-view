import App from "@/components/App";
import { loadAnimes } from "@/lib/sheet";
import { loadHistory, resolveHistory } from "@/lib/history";
import { loadTemporada } from "@/lib/temporada";

// Relê a planilha no máximo a cada 60 s.
export const revalidate = 60;

export default async function Page() {
  try {
    const [animes, history, temporada] = await Promise.all([loadAnimes(), loadHistory(), loadTemporada()]);
    return <App animes={animes} history={resolveHistory(history, animes)} temporada={temporada} />;
  } catch (e) {
    return (
      <main className="fatal">
        <h1>Erro ao carregar a planilha</h1>
        <p>{e instanceof Error ? e.message : String(e)}</p>
      </main>
    );
  }
}
