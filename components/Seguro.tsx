"use client";

import { Component, type ReactNode } from "react";

/**
 * Se um pedaço da página der erro (um gráfico, a temporada…), mostra um aviso só no lugar dele em vez
 * de derrubar a página inteira. "Tentar de novo" redesenha só esse pedaço.
 */
export default class Seguro extends Component<{ nome: string; children: ReactNode }, { erro: boolean }> {
  state = { erro: false };

  static getDerivedStateFromError() {
    return { erro: true };
  }

  componentDidCatch(e: unknown) {
    console.error(`[Anime View] erro em ${this.props.nome}:`, e);
  }

  render() {
    if (!this.state.erro) return this.props.children;
    return (
      <section className="seguro" role="alert">
        <span>Não consegui mostrar {this.props.nome}.</span>
        <button type="button" className="btn line" onClick={() => this.setState({ erro: false })}>TENTAR DE NOVO</button>
      </section>
    );
  }
}
