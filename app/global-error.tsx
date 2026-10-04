"use client";

/** Último recurso: erro no próprio layout. Sem o CSS do site, então o estilo vai aqui mesmo. */
export default function ErroGeral({ reset }: { error: Error; reset: () => void }) {
  return (
    <html lang="pt-BR">
      <body style={{ margin: 0, minHeight: "100vh", display: "grid", placeItems: "center", background: "#07070c", color: "#e8e8f0", fontFamily: "system-ui, sans-serif" }}>
        <main style={{ textAlign: "center", padding: 24 }}>
          <h1>Anime View fora do ar por um instante</h1>
          <p>Tente de novo em alguns segundos.</p>
          <button type="button" onClick={reset} style={{ padding: "10px 18px", border: "1px solid #ff2d3d", background: "none", color: "#ff2d3d", cursor: "pointer" }}>
            TENTAR DE NOVO
          </button>
        </main>
      </body>
    </html>
  );
}
