"use client";

import { useState } from "react";
import type { SemPar } from "@/lib/history";
import { fmtMonth } from "@/lib/format";

/**
 * Aviso no Stats quando alguma linha da aba Historico não achou o anime na aba "Animes Completos"
 * (o nome é a ligação entre as duas). Essas linhas não entram na retrospectiva nem nos gráficos.
 * Some sozinho quando o nome é corrigido na planilha.
 */
export default function AvisoHistorico({ linhas }: { linhas: SemPar[] }) {
  const [aberto, setAberto] = useState(false);
  if (!linhas.length) return null;
  const n = linhas.length;
  return (
    <section className="aviso-hist" role="status">
      <button type="button" className="aviso-hist-topo" aria-expanded={aberto} onClick={() => setAberto(!aberto)}>
        ⚠ {n} {n === 1 ? "linha" : "linhas"} da aba Historico {n === 1 ? "não achou" : "não acharam"} o anime na lista
        — {n === 1 ? "fica" : "ficam"} fora da retrospectiva e dos gráficos. <u>{aberto ? "esconder" : "ver"}</u>
      </button>
      {aberto && (
        <>
          <ul>
            {linhas.map((l, i) => (
              <li key={i}>
                <b>{fmtMonth(l.ym)}</b> · “{l.nome}”
                {l.sugestao && <span className="muted"> — você quis dizer “{l.sugestao}”?</span>}
              </li>
            ))}
          </ul>
          <p className="muted small">Corrija o nome na aba Historico para ficar igual ao da aba Animes Completos (maiúsculas e espaços não importam).</p>
        </>
      )}
    </section>
  );
}
