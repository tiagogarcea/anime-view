import App from "@/components/App";
import { loadAnimes } from "@/lib/sheet";

// Relê a planilha no máximo a cada 60 s.
export const revalidate = 60;

export default async function Page() {
  try {
    const animes = await loadAnimes();
    return <App animes={animes} />;
  } catch (e) {
    return (
      <main className="fatal">
        <h1>Erro ao carregar a planilha</h1>
        <p>{e instanceof Error ? e.message : String(e)}</p>
      </main>
    );
  }
}
