"use client";

/**
 * Tela de erro da página (no lugar de uma tela branca). Normalmente nem aparece: se a planilha falhar,
 * a Vercel continua mostrando a última página boa. Só chega aqui se o erro for no navegador.
 */
export default function Erro({ reset }: { error: Error; reset: () => void }) {
  return (
    <main className="fatal">
      <h1>Algo deu errado</h1>
      <p>Não consegui mostrar a página agora. Tente de novo; se continuar, recarregue em alguns instantes.</p>
      <p style={{ display: "flex", gap: 10 }}>
        <button type="button" className="btn red" onClick={reset}>TENTAR DE NOVO</button>
        <button type="button" className="btn line" onClick={() => window.location.reload()}>RECARREGAR</button>
      </p>
    </main>
  );
}
