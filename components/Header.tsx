"use client";

import type { Tab } from "./App";

type Props = { tab: Tab; onTab: (t: Tab) => void; query: string; onQuery: (q: string) => void };

export default function Header({ tab, onTab, query, onQuery }: Props) {
  return (
    <header className="top">
      <div className="brand">
        ANIME<span className="brand-slash">//</span>VIEW
      </div>
      <nav className="tabs" aria-label="Seções">
        <button type="button" className={tab === "deck" ? "tab on" : "tab"} onClick={() => onTab("deck")}>
          [ DECK ]
        </button>
        <button type="button" className={tab === "stats" ? "tab on" : "tab"} onClick={() => onTab("stats")}>
          [ STATS ]
        </button>
      </nav>
      <label className="search">
        <span className="search-caret" aria-hidden>
          &gt;
        </span>
        <span className="sr-only">Buscar por nome</span>
        <input
          type="search"
          value={query}
          onChange={(e) => onQuery(e.target.value)}
          placeholder="buscar_titulo --jp --en"
          autoComplete="off"
        />
      </label>
      <div className="sync">
        SYNC ● <b>ONLINE</b>
        <br />
        SRC: SHEETS
      </div>
    </header>
  );
}
