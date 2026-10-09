"use client";

import { startTransition, useEffect, useMemo, useOptimistic, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { Anime } from "@/lib/types";
import type { SemPar, Viewing } from "@/lib/history";
import type { SeasonItem } from "@/lib/temporada";
import Season from "./Season";
import { applyFilters, DEFAULT_SORT, EMPTY_FILTERS, Filters, sortRows, SortKey } from "@/lib/filters";
import { suggest } from "@/lib/suggest";
import Header from "./Header";
import Hero from "./Hero";
import KpiStrip from "./KpiStrip";
import FilterBar from "./FilterBar";
import FilterDrawer from "./FilterDrawer";
import Collection from "./Collection";
import DetailModal from "./DetailModal";
import Stats from "./Stats";
import Seguro from "./Seguro";
import AvisoHistorico from "./AvisoHistorico";
import { CAMINHO, Tab, tabDoCaminho, tabValida } from "@/lib/tabs";
import { agruparFranquias, type Relacoes } from "@/lib/franquias";
import { escreverBusca, lerBusca } from "@/lib/urlFiltros";

export type { Tab };

/** Endereço de uma aba mantendo filtros e ?status= que já estão no endereço (sem o ?aba= dos links antigos). */
const urlDaTab = (t: Tab) => {
  const q = new URLSearchParams(window.location.search);
  q.delete("aba");
  const s = q.toString();
  return CAMINHO[t] + (s ? `?${s}` : "");
};

export default function App({ animes: base, relacoes: relacoesProntas, history, semPar, temporada, atualizado, temporadaAtualizada, children }: {
  animes: Anime[];
  /** ligações do AniList para as franquias; null = a página saiu sem elas (o navegador busca em /api/franquias) */
  relacoes: Relacoes | null;
  history: Viewing[];
  /** linhas do Historico que não acharam o anime (aviso no Stats) */
  semPar: SemPar[];
  temporada: SeasonItem[];
  /** hora em que a planilha foi lida ("19:43:28 03/10/2026"); se o Google falhar, é a da última leitura boa */
  atualizado: string; temporadaAtualizada: string;
  children: React.ReactNode;
}) {
  // A aba é o endereço (/, /stats, /stats/retrospectiva, /temporada). Trocar de aba é navegar pelo Next:
  // este App fica no layout, então não recarrega nada; voltar/avançar do navegador funciona sozinho.
  const router = useRouter();
  const tabDaUrl = tabDoCaminho(usePathname());
  // Os dados já estão no navegador: a aba muda na hora e o endereço acompanha quando o servidor responder
  // (o pedido da rota pode demorar na renovação de 60 s).
  const [tab, setTabOtimista] = useOptimistic(tabDaUrl);
  const [relacoes, setRelacoes] = useState<Relacoes | null>(relacoesProntas);
  useEffect(() => {
    if (relacoesProntas) return setRelacoes(relacoesProntas);
    fetch("/api/franquias").then((r) => (r.ok ? r.json() : null)).then((j) => j && setRelacoes(j)).catch(() => {});
  }, [relacoesProntas]);
  const animes = useMemo(() => agruparFranquias(base, relacoes ?? {}), [base, relacoes]);
  // A página vem pronta (igual para todo mundo), então os filtros do endereço só são lidos aqui no
  // navegador. Enquanto isso o conteúdo fica escondido (classe url-pendente, ver app/layout.tsx).
  const [filters, setFilters] = useState<Filters>(EMPTY_FILTERS);
  const [sortKey, setSortKey] = useState<SortKey>(DEFAULT_SORT.key);
  const [sortAsc, setSortAsc] = useState(DEFAULT_SORT.asc);
  const [urlLida, setUrlLida] = useState(false);
  const [drawer, setDrawer] = useState(false);
  const [pick, setPick] = useState<Anime | null>(null);
  const [open, setOpen] = useState<Anime | null>(null);

  const result = useMemo(() => applyFilters(animes, filters), [animes, filters]);
  const rows = useMemo(() => sortRows(result.rows, sortKey, sortAsc), [result.rows, sortKey, sortAsc]);

  // Lê filtros do endereço; voltar/avançar do navegador restaura os filtros daquele momento.
  useEffect(() => {
    const ler = () => {
      const b = lerBusca(new URLSearchParams(window.location.search));
      setFilters(b.filters);
      setSortKey(b.sortKey);
      setSortAsc(b.sortAsc);
    };
    // links antigos com #stats / #temporada
    const antigo = tabValida(window.location.hash.slice(1));
    if (antigo !== "deck") router.replace(urlDaTab(antigo));
    ler();
    setUrlLida(true);
    document.documentElement.classList.remove("url-pendente");
    window.addEventListener("popstate", ler);
    return () => window.removeEventListener("popstate", ler);
  }, []);

  const setTab = (t: Tab) => {
    if (t === tab) return;
    startTransition(() => {
      setTabOtimista(t);
      router.push(urlDaTab(t), { scroll: false });
    });
  };

  // Cada mudança de filtro/ordenação reescreve o endereço (replace: não enche o histórico do voltar).
  // Só depois de ler o endereço, senão apagaria os filtros dele antes de aplicá-los.
  useEffect(() => {
    if (!urlLida) return;
    const busca = escreverBusca(new URLSearchParams(window.location.search), { filters, sortKey, sortAsc });
    if (busca !== window.location.search) window.history.replaceState(null, "", window.location.pathname + busca);
  }, [filters, sortKey, sortAsc, urlLida]);

  // Sorteio só no cliente (Math.random no servidor quebraria a hidratação).
  useEffect(() => {
    setPick(suggest(animes));
  }, [animes]);

  // clique numa franquia no Stats: filtra a Anime List por ela (mantendo os outros filtros)
  const verFranquia = (nome: string) => {
    setFilters((f) => ({ ...f, franquia: [nome] }));
    router.push(urlDaTab("deck"));
  };

  const reroll = () => setPick(suggest(result.rows, pick?.id));
  const clearAll = () => {
    setFilters(EMPTY_FILTERS);
    setSortKey(DEFAULT_SORT.key);
    setSortAsc(DEFAULT_SORT.asc);
  };
  const ehStats = tab === "stats" || tab === "retro";

  return (
    <div className="shell">
      <Header tab={tab} onTab={setTab} />

      <div className="conteudo">
        {tab === "deck" && (
          <Seguro nome="a puxada do dia">
            <Hero anime={pick} onReroll={reroll} onOpen={setOpen} poolSize={result.rows.length} />
          </Seguro>
        )}

        {tab === "temporada" ? (
          <Seguro nome="a temporada">
            <Season items={temporada} atualizado={temporadaAtualizada} />
          </Seguro>
        ) : (
          <>
            <KpiStrip rows={result.rows} total={animes.length} showRarity={tab === "deck"} />

            <FilterBar
              tab={ehStats ? "stats" : tab}
              filters={filters}
              onChange={setFilters}
              onOpenDrawer={() => setDrawer(true)}
              onClear={clearAll}
              count={rows.length}
              sortKey={sortKey}
              sortAsc={sortAsc}
              onSort={(k, asc) => {
                setSortKey(k);
                setSortAsc(asc);
              }}
            />

            {tab === "deck" ? (
              <Seguro nome="a lista">
                <Collection rows={rows} onOpen={setOpen} onClear={clearAll} />
              </Seguro>
            ) : (
              <>
                <nav className="subtabs" aria-label="Páginas do Stats">
                  <button type="button" className={tab === "stats" ? "subtab on" : "subtab"} aria-current={tab === "stats" ? "page" : undefined} onClick={() => setTab("stats")}>
                    VISÃO GERAL
                  </button>
                  <button type="button" className={tab === "retro" ? "subtab on" : "subtab"} aria-current={tab === "retro" ? "page" : undefined} onClick={() => setTab("retro")}>
                    RETROSPECTIVA E FRANQUIAS
                  </button>
                </nav>
                <AvisoHistorico linhas={semPar} />
                <Stats secao={tab === "retro" ? "retro" : "geral"} rows={result.rows} history={history} onOpen={setOpen} onFranquia={verFranquia} franquiasProntas={relacoes !== null} />
              </>
            )}
          </>
        )}
      </div>

      {children}

      <footer className="foot">
        <span>ANIME//VIEW</span>
        <span>planilha atualizada às {atualizado}</span>
      </footer>

      <FilterDrawer
        open={drawer}
        onClose={() => setDrawer(false)}
        filters={filters}
        onChange={setFilters}
        result={result}
        onClear={clearAll}
        sortKey={sortKey}
        sortAsc={sortAsc}
        onSort={(k, asc) => {
          setSortKey(k);
          setSortAsc(asc);
        }}
      />
      <Seguro nome="os detalhes do anime">
        <DetailModal anime={open} history={history} onClose={() => setOpen(null)} />
      </Seguro>
    </div>
  );
}
