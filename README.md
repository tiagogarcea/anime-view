# Anime View

Nova versão do Anime Tracker (antes em Streamlit), no visual "Neo-Tokyo + Cinema + Gacha".
Lê a mesma planilha do Google em CSV. Stack: Next.js 16, React 19, TypeScript, PapaParse.
Gráficos feitos à mão em HTML/SVG (sem biblioteca de gráficos).

## Rodar local

```bash
npm install
npm run dev        # http://localhost:3000
```

No Windows, se o PowerShell bloquear o `npm.ps1`, use `npm.cmd run dev`.

## Deploy (Vercel)

1. Suba esta pasta para um repositório no GitHub.
2. Na Vercel: Add New › Project › importe o repositório. Nada a configurar.
3. A página relê a planilha a cada 60 s (`revalidate` em `app/page.tsx`).

Variável opcional: `SHEET_CSV_URL` sobrescreve a URL da planilha (`lib/sheet.ts`).

## Paridade com o Streamlit (`Anime-Tracker/app.py`)

| Streamlit | Anime View |
| --- | --- |
| KPIs: animes, score médio, tempo assistido, episódios + eps de rewatch | Faixa de KPIs (agora respondem aos filtros) |
| Busca por nome JP ou EN | Campo `> buscar_titulo` no topo |
| Filtro score (slider) | Slider duplo na gaveta de filtros |
| Filtro "Visto entre" | Datas De/Até (animes sem data não somem mais) |
| Season, Ano, Estúdio, Gênero, Tema, Demografia, Favorito, Rewatched | Mesmos filtros, em cascata como antes, com contagem por opção |
| — | Novo: filtro por raridade (SSR/SR/R/N) |
| Limpar todos os filtros | "limpar tudo" na barra e na gaveta |
| Ordenar por N°, Nome, Score, Episódios, Visto em, Ano, Studio + crescente/decrescente | Igual, na barra e na gaveta |
| Cards com capa, score, favorito, rewatch; overlay com detalhes, comentário, MAL, Crunchyroll | Cartas com moldura por raridade; clique abre modal com tudo isso + streaming |
| Sugestão do Dia (sorteio ponderado) | "Puxada do dia" no topo, mesma regra de peso, sobre os filtros atuais |
| Empty state | Igual |
| Heatmap de atividade | Heatmap por ano, com seletor de ano e nomes no tooltip |
| Distribuição por score | Colunas coloridas por raridade |
| Animes por ano de lançamento | Colunas com o pico destacado |
| Assistidos ao longo do tempo | Área por mês com leitura ao passar o mouse |
| Top 20 rewatches | Grade de capas clicáveis |
| Top 15 estúdios, Top 12 temas | Barras horizontais |
| Pizza de demografia e de gênero | Barra empilhada (demografia) e barras (gêneros) |

Raridade das cartas: score 10 = SSR, 9 = SR, 8 = R, até 7 = N.

## Capas em alta

- Grade: capa da coluna `Link` como está.
- Modal e sugestão do dia: versão grande do MyAnimeList (troca `123.jpg` por `123l.jpg`).
- 68 capas antigas só existem até ~320×450 no MyAnimeList. Elas foram ampliadas 2× uma vez com
  Real-ESRGAN (modelo `realesr-animevideov3`, fiel à arte) e ficam em `public/covers/`, listadas em
  `lib/hdCovers.ts`. Anime novo na planilha não precisa de nada: usa a versão grande do MyAnimeList.

## Estrutura

```
app/          layout (fontes), page (lê a planilha), globals.css (todo o visual)
lib/          sheet (CSV → Anime), filters, stats, suggest, format, types
components/   App (estado), Header, Hero, KpiStrip, FilterBar, FilterDrawer,
              Collection, Card, Poster, DetailModal, Stats
```
