"use client";

import { useEffect, useMemo, useState } from "react";
import { Anime } from "@/lib/types";
import type { Viewing } from "@/lib/history";
import type { Semanal, SeasonItem } from "@/lib/temporada";
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
import { Tab, tabValida } from "@/lib/tabs";
import { Busca, escreverBusca, lerBusca } from "@/lib/urlFiltros";

export type { Tab };
/**
 * Aba guardada no endereço (?aba=stats, ?aba=temporada; sem = deck). Fica na busca, não no #, para o
 * servidor já montar a página na aba certa: o F5 não passa pela Anime List antes.
 */
const tabDaUrl = (): Tab => tabValida(new URLSearchParams(window.location.search).get("aba"));
const urlDaTab = (t: Tab) => {
  const q = new URLSearchParams(window.location.search);
  if (t === "deck") q.delete("aba"); else q.set("aba", t);
  const s = q.toString();
  return window.location.pathname + (s ? `?${s}` : "");
};

export default function App({ animes, history, temporada, atualizado, temporadaAtualizada, tabInicial, buscaInicial, filtroStatus }: {
  animes: Anime[]; history: Viewing[]; temporada: SeasonItem[];
  /** hora em que a planilha foi lida ("19:43:28 03/10/2026"); se o Google falhar, é a da última leitura boa */
  atualizado: string; temporadaAtualizada: string;
  tabInicial: Tab; buscaInicial: Busca; filtroStatus: Semanal[];
}) {
  const [tab, setTabState] = useState<Tab>(tabInicial);
  // filtros e ordenação vêm do endereço (lidos no servidor), para o F5 não perdê-los
  const [filters, setFilters] = useState<Filters>(buscaInicial.filters);
  const [sortKey, setSortKey] = useState<SortKey>(buscaInicial.sortKey);
  const [sortAsc, setSortAsc] = useState(buscaInicial.sortAsc);
  const [drawer, setDrawer] = useState(false);
  const [pick, setPick] = useState<Anime | null>(null);
  const [open, setOpen] = useState<Anime | null>(null);

  const result = useMemo(() => applyFilters(animes, filters), [animes, filters]);
  const rows = useMemo(() => sortRows(result.rows, sortKey, sortAsc), [result.rows, sortKey, sortAsc]);

  // Voltar/avançar do navegador troca de aba. Links antigos com #stats / #temporada viram ?aba=.
  useEffect(() => {
    const antigo = tabValida(window.location.hash.slice(1));
    if (antigo !== "deck") {
      window.history.replaceState(null, "", urlDaTab(antigo));
      setTabState(antigo);
    }
    const sync = () => {
      setTabState(tabDaUrl());
      const b = lerBusca(new URLSearchParams(window.location.search));
      setFilters(b.filters);
      setSortKey(b.sortKey);
      setSortAsc(b.sortAsc);
    };
    window.addEventListener("popstate", sync);
    return () => window.removeEventListener("popstate", sync);
  }, []);
  const setTab = (t: Tab) => {
    setTabState(t);
    if (tabDaUrl() !== t) window.history.pushState(null, "", urlDaTab(t));
  };

  // Cada mudança de filtro/ordenação reescreve o endereço (replace: não enche o histórico do voltar).
  useEffect(() => {
    const busca = escreverBusca(new URLSearchParams(window.location.search), { filters, sortKey, sortAsc });
    if (busca !== window.location.search) window.history.replaceState(null, "", window.location.pathname + busca);
  }, [filters, sortKey, sortAsc]);

  // Sorteio só no cliente (Math.random no servidor quebraria a hidratação).
  useEffect(() => {
    setPick(suggest(animes));
  }, [animes]);

  const reroll = () => setPick(suggest(result.rows, pick?.id));
  const clearAll = () => {
    setFilters(EMPTY_FILTERS);
    setSortKey(DEFAULT_SORT.key);
    setSortAsc(DEFAULT_SORT.asc);
  };

  return (
    <div className="shell">
      <Header tab={tab} onTab={setTab} />

      {tab === "deck" && <Hero anime={pick} onReroll={reroll} onOpen={setOpen} poolSize={result.rows.length} />}

      {tab === "temporada" ? (
        <Season items={temporada} atualizado={temporadaAtualizada} filtroInicial={filtroStatus} />
      ) : (
        <>
        <KpiStrip rows={result.rows} total={animes.length} showRarity={tab === "deck"} />

        <FilterBar
          tab={tab}
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
          <Collection rows={rows} onOpen={setOpen} onClear={clearAll} />
        ) : (
          <Stats rows={result.rows} history={history} onOpen={setOpen} />
        )}

        </>
      )}

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
      <DetailModal anime={open} history={history} onClose={() => setOpen(null)} />
    </div>
  );
}
