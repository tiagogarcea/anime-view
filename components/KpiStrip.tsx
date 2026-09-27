"use client";

import { Anime } from "@/lib/types";
import { kpis, tierCounts } from "@/lib/stats";
import { fmtInt } from "@/lib/format";

const TIER_LABEL = { SSR: "score 10", SR: "score 9", R: "score 8", N: "até 7" } as const;

export default function KpiStrip({ rows, total, showRarity }: { rows: Anime[]; total: number; showRarity: boolean }) {
  const k = kpis(rows);
  const tiers = tierCounts(rows);
  const maxTier = Math.max(1, ...tiers.map((t) => t.n));
  const items = [
    { label: "ANIMES", sub: rows.length === total ? "TOTAL" : `DE ${fmtInt(total)}`, value: fmtInt(k.count), fill: k.count / Math.max(1, total) },
    { label: "SCORE MÉDIO", sub: "/10", value: k.avgScore.toFixed(2).replace(".", ","), fill: k.avgScore / 10 },
    { label: "TEMPO ASSISTIDO", sub: "+REWATCH", value: `${k.days}d ${k.hours}h`, fill: null },
    { label: "EPISÓDIOS", sub: `↻ ${fmtInt(k.epsRewatch)} REWATCH`, value: fmtInt(k.eps), fill: k.eps ? (k.eps - k.epsRewatch) / k.eps : 0 },
  ];

  return (
    <section className={showRarity ? "kpis with-rarity" : "kpis"} aria-label="Números da seleção">
      {items.map((it) => (
        <div className="kpi" key={it.label}>
          <div className="kpi-head">
            <span>{it.label}</span>
            <span className="cyan">{it.sub}</span>
          </div>
          <div className="kpi-value">{it.value}</div>
          {it.fill !== null && (
            <div className="meter" aria-hidden>
              <span style={{ width: `${Math.min(1, it.fill) * 100}%` }} />
            </div>
          )}
        </div>
      ))}
      {showRarity && (
        <div className="kpi rarity">
          <div className="kpi-head"><span>RARIDADE DA LISTA</span></div>
          {tiers.map((t) => (
            <div className="rarity-row" key={t.tier} title={`${t.tier}: ${TIER_LABEL[t.tier]}`}>
              <span className={`tier-name t-${t.tier}`}>{t.tier}</span>
              <span className="meter thin"><span className={`bg-${t.tier}`} style={{ width: `${(t.n / maxTier) * 100}%` }} /></span>
              <span className="rarity-n">{t.n}</span>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
