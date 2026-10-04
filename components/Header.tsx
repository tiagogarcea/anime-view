"use client";

import type { Tab } from "./App";

type Props = { tab: Tab; onTab: (t: Tab) => void };

export default function Header({ tab, onTab }: Props) {
  return (
    <header className="top">
      <div className="brand">
        <svg className="brand-mark" viewBox="0 0 64 64" aria-hidden>
          <rect width="64" height="64" rx="12" fill="#07070c" />
          <path d="M10 22V10h12M54 42v12H42" fill="none" stroke="#2de2e6" strokeWidth="4" strokeLinecap="square" />
          <path d="M27 14 17 50h8l10-36zM41 14 31 50h8l10-36z" fill="#ff2d3d" />
        </svg>
        <span>
          ANIME<span className="brand-slash">//</span>VIEW
        </span>
      </div>
      <nav className="tabs" aria-label="Seções">
        <button type="button" className={tab === "deck" ? "tab on" : "tab"} onClick={() => onTab("deck")}>
          <span className="br">[ </span>ANIME LIST<span className="br"> ]</span>
        </button>
        <button type="button" className={tab === "stats" || tab === "retro" ? "tab on" : "tab"} onClick={() => onTab("stats")}>
          <span className="br">[ </span>STATS<span className="br"> ]</span>
        </button>
        <button type="button" className={tab === "temporada" ? "tab on" : "tab"} onClick={() => onTab("temporada")}>
          <span className="br">[ </span>TEMPORADA<span className="br"> ]</span>
        </button>
      </nav>
      <div className="sync">
        SYNC ● <b>ONLINE</b>
        <br />
        SRC: SHEETS
      </div>
    </header>
  );
}
