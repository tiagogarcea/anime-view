# Anime View

Nova versão do Anime Tracker (antes em Streamlit), no visual "Neo-Tokyo + Cinema + Gacha".
Lê a planilha do Google, mostra a coleção como cartas, estatísticas e acompanha a temporada atual
semana a semana (com gravação de volta na planilha).

Stack: Next.js 16 (App Router, Turbopack), React 19, TypeScript, PapaParse. Gráficos feitos à mão
em HTML/SVG (sem biblioteca de gráficos). Fontes: Chakra Petch (títulos) e JetBrains Mono.

> **Regra do projeto:** toda alteração no código deve vir acompanhada da atualização deste README
> (funcionalidades, fontes de dados, variáveis, estrutura). Ver `CLAUDE.md`.

## Rodar local

```bash
npm install
npm run dev        # http://localhost:3000
npm run build      # build de produção (confere tipos)
npm run start      # serve o build
```

No Windows, se o PowerShell bloquear o `npm.ps1`, use `npm.cmd run dev`.

## Deploy (Vercel)

Repositório: `github.com/tiagogarcea/anime-view` (branch `main`). A Vercel publica sozinha a cada push.

Duas pastas na Área de Trabalho:

- `Anime-View/` — pasta de trabalho (tem `node_modules`; é onde se roda `npm run dev` e `npm run build`).
  **Não** é um repositório git.
- `Anime-View-Git/` — clone do GitHub, sem `node_modules`. Para publicar: copie os arquivos alterados
  para cá e faça commit + push (ou rode `Git_Push.bat`, que faz `git add .`, commit com data/hora e push).

A página relê a planilha a cada 60 s (`revalidate` em `app/page.tsx`).

### Variáveis de ambiente (todas opcionais)

| Variável | Padrão / uso |
| --- | --- |
| `SHEET_CSV_URL` | CSV da aba principal "Animes Completos" (`lib/sheet.ts`) |
| `HISTORY_CSV_URL` | CSV da aba "Historico" (`lib/history.ts`) |
| `TEMPORADA_SCRIPT_URL` | URL `/exec` do App da Web do Apps Script (`lib/temporada.ts`) |

Sem elas, o código usa as URLs fixas da planilha `1a6Ylv7yKu8yb1DJkYpZynTSedbOzTUC_ti35fufDyWI`.

## Fontes de dados

Tudo vem de uma única planilha do Google, lida no servidor em `app/page.tsx`:

| Aba | Como é lida | Cache | Se falhar |
| --- | --- | --- | --- |
| **Animes Completos** (`gid=1713940120`) | CSV público (`lib/sheet.ts`) | 60 s | Página mostra "Erro ao carregar a planilha" |
| **Historico** (`gid=1281634781`) | CSV público (`lib/history.ts`) | 60 s | Site segue só com o "Last seen" |
| **Temporada Atual** | JSON do gviz (`lib/temporada.ts`) | 60 s, tag `temporada` | Aba Temporada mostra "SEM DADOS" |
| Capas da Temporada Atual | Coluna `Url Imagem` (gviz); reserva: GET no Apps Script | 60 s | Mostra a inicial do nome |
| Streaming e link da Temporada | GET no Apps Script (colunas `Onde assistir?` e `Link`) | 60 s, tag `temporada` | Botão "assistir" não aparece |
| Episódios (total / lançados) | GraphQL do AniList | 1 h | Mostra "?" |

### Aba "Animes Completos"

O cabeçalho pode estar em qualquer uma das 10 primeiras linhas. Cada campo aceita alguns nomes de
coluna (o primeiro que existir vence; ver `COLS` em `lib/sheet.ts`):

`N°`, `Nome`, `Nome_Ingles`, `Score`, `Episodes`, `Time/episode`, `Rewatched`, `Studio`, `Gênero`,
`Tema`, `Demografia`, `Temporada` (ex.: "Fall 2024" → season + ano), `Coments`, `Favorite`
(contém "FAV" = favorito), `Last seen` (DD/MM/AAAA ou AAAA-MM-DD), `Link` / `Imagem` (capa),
`URL_Pagina` (MyAnimeList), `Link do Anime` (Crunchyroll), `Streaming`.

Valores de Gênero, Tema, Estúdio e Demografia que só diferem em maiúsculas são unificados
(fica a grafia mais frequente).

### Aba "Historico" (desde jan/2023)

Uma linha por vez que um anime foi assistido. Colunas: `Data`/`Mês` (DD/MM/AAAA, AAAA-MM ou
"Março 2023"; pode haver mais de uma, vale a primeira reconhecida), `Nome`/`Anime`, `N°` (formato
antigo, usado só se não houver nome) e `Rewatch` (0 = primeira vez, 1 = primeiro rewatch…).
A ligação com "Animes Completos" é **pelo nome** (ignorando maiúsculas e espaços); linhas sem
correspondência são descartadas. Alimenta o gráfico "Assistidos ao longo do tempo" e o histórico
de visualizações no modal de detalhes.

### Aba "Temporada Atual"

Colunas: `Número`, `Anime`, `Dia de inicio` (data), `Dia da semana` ("Segunda"…"Domingo"),
`Último episódio visto`, `Semanal`, `Url Imagem` (URL da capa, ex.:
`https://cdn.myanimelist.net/images/anime/1154/159987l.jpg`) e `Imagem` (imagem colada na célula
ou `=IMAGE("url")`, usada só quando `Url Imagem` está vazia), `Onde assistir?` (logo do streaming
colado na célula) e `Link` (texto com hiperlink, `=HYPERLINK("url"; ...)` ou a URL digitada).
Imagens coladas e a URL por trás do texto "Link" não saem no gviz: vêm do `doGet` do Apps Script.

`Semanal`: `V` = em dia, `X` = episódio novo não visto, `-` = não estreou, vazio = sem marcação.

## Funcionalidades

Três abas no topo: **ANIME LIST**, **STATS** e **TEMPORADA**.

### Anime List
- "Puxada do dia": sorteio ponderado (peso = score, mínimo 1; favorito dobra; +0,1 por mês desde a
  última vez visto, máx. +12), sobre os filtros atuais, com botão para sortear de novo
  (`lib/suggest.ts`). O sorteio roda só no cliente para não quebrar a hidratação.
- Faixa de KPIs (animes, score médio, tempo assistido, episódios + eps de rewatch, raridades),
  respondendo aos filtros.
- Busca por nome JP ou EN, filtros em cascata com contagem por opção (score, datas De/Até, season,
  ano, estúdio, gênero, tema, demografia, favorito, rewatched, raridade) na barra e na gaveta.
- Ordenação por N°, Nome, Score, Episódios, Visto em, Ano, Studio; padrão "Visto em" decrescente.
- Cartas com moldura por raridade; clique abre modal com detalhes, comentário, histórico de
  visualizações, links MAL / Crunchyroll e streaming.

Raridade das cartas: score 10 = SSR, 9 = SR, 8 = R, até 7 = N (`tierOf` em `lib/types.ts`).

### Stats
Heatmap de atividade por ano (com seletor e nomes no tooltip), distribuição por score, ano de
lançamento, assistidos ao longo do tempo (por mês; a partir de jan/2023 usa a aba Historico e conta
rewatches), top 15 estúdios, top 12 temas, gêneros, demografia (barra empilhada) e mais reassistidos
(top 24).
Tudo responde aos filtros.

### Temporada
- Animes da temporada agrupados por dia da semana, com o dia de hoje destacado.
- O card inteiro (fundo, borda e linha de informações) fica na cor do status: verde = em dia (`V`),
  vermelho = episódio novo não visto (`X`), azul = não estreou (`-`). Sem marcação fica neutro.
- Para cada um: status semanal (✓ / ✕ / —), capa, data de estreia, último episódio visto,
  "N de M lançados" (AniList) ou "completo".
- Botão "▶ ASSISTIR" abaixo do nome: logo do streaming (`Onde assistir?`) + link (`Link`), abre em
  nova aba. Sem logo (ou se o logo não carregar), mostra o nome do site tirado da URL
  ("ASSISTIR NO CRUNCHYROLL"). Só logo, sem link: mostra o logo sem ser clicável.
- Dá para mudar o status e o episódio (botões − / + ou digitando; salva 0,5 s depois de parar).
  A gravação vai para a planilha via `POST /api/temporada` → Apps Script.
- Na primeira gravação pede uma senha, que fica salva no `localStorage` do navegador
  (`anime-view-senha`). Senha errada → pede de novo.
- Regra da estreia: um anime marcado `-` (não estreou) vira `X` (não visto) **a partir da
  segunda-feira da semana da estreia** — a semana começa na segunda. Ex.: estreia em 05/10/2026
  (segunda) ou 06/10/2026 (terça) → muda em 05/10; estreia em 12/10 → só em 12/10. O site já mostra
  assim (`semanalEfetivo`) e o gatilho diário do script grava na planilha. As datas são comparadas
  como texto AAAA-MM-DD (no script, no fuso da planilha), então o fuso não adianta a mudança.
- Total e lançados vêm do AniList: busca pelo nome e aceita só o resultado com estreia a até
  30 dias do "Dia de inicio"; se não achar, tenta variantes ("II" → "2" / "2nd Season", parte antes
  dos dois-pontos).

## API

`POST /api/temporada` (`app/api/temporada/route.ts`) — repassa para o Apps Script:

```jsonc
{ "numero": 3, "episodio": 5, "senha": "..." }       // grava "Último episódio visto" (vazio apaga)
{ "numero": 3, "semanal": "V", "episodio": 5, "senha": "..." }  // grava "Semanal"
```

Respostas: `200 { ok: true, ... }`, `400` dados inválidos, `401` senha errada, `502` script fora.
Em caso de sucesso, invalida o cache da tag `temporada` e da página `/`.

## Apps Script (`apps-script/Temporada.gs`)

Ponte entre o site e a aba "Temporada Atual". Não roda no Next: é colado na própria planilha.

- `doGet` → `{ itens: [{ numero, imagem, streaming, link }] }`: capa colada em `Imagem` (reserva para
  linhas sem `Url Imagem`), logo colado em `Onde assistir?` e URL da coluna `Link`.
- `doPost` → grava episódio ou status, conferindo a senha da propriedade de script `SENHA`.
- `atualizarEstreias` (gatilho diário às 6h, criado rodando `instalarGatilho` uma vez):
  `-` → `X` na semana da estreia; toda segunda, `V` → `X` (menos quem já completou todos os
  episódios, consultando o AniList).

Instalação e atualização (mantendo a mesma URL) estão descritas no topo do arquivo. Ao alterar o
`.gs`, é preciso reimplantar: Implantar › Gerenciar implantações › editar › Nova versão.

## Capas em alta

- Grade: capa da coluna `Link` como está.
- Modal e sugestão do dia: versão grande do MyAnimeList (troca `123.jpg` por `123l.jpg`).
- 68 capas antigas só existem até ~320×450 no MyAnimeList. Elas foram ampliadas 2× uma vez com
  Real-ESRGAN (modelo `realesr-animevideov3`, fiel à arte) e ficam em `public/covers/`, listadas em
  `lib/hdCovers.ts`. Anime novo na planilha não precisa de nada: usa a versão grande do MyAnimeList.
- Temporada: capa da coluna `Url Imagem` como está; se vier da coluna `Imagem` (Google), é reduzida
  de 2048 px para 360 px (`=s360`). Logos do streaming são reduzidos para 96 px (`=s96`).

## Estrutura

```
app/
  layout.tsx            fontes e metadados
  page.tsx              lê as 3 abas no servidor (revalidate 60 s) e monta <App>
  globals.css           todo o visual
  api/temporada/        rota POST que grava na aba Temporada Atual
  icon.svg, apple-icon.png
lib/
  types.ts              tipo Anime, raridades (tierOf)
  sheet.ts              CSV "Animes Completos" → Anime[]
  history.ts            CSV "Historico" → Viewing[], ligação por nome
  temporada.ts          gviz "Temporada Atual" (com Url Imagem) + streaming/link/capas reserva
                        (Apps Script) + AniList
  filters.ts            filtros em cascata e ordenação
  stats.ts              agregações dos KPIs e gráficos
  suggest.ts            sorteio ponderado da puxada do dia
  format.ts             datas, números, cor por nome
  hdCovers.ts           lista das capas ampliadas em public/covers/
components/
  App.tsx               estado (aba, filtros, ordenação, modal)
  Header.tsx            marca e abas
  Hero.tsx              puxada do dia
  KpiStrip.tsx, FilterBar.tsx, FilterDrawer.tsx
  Collection.tsx, Card.tsx, Poster.tsx, DetailModal.tsx
  Stats.tsx             gráficos
  Season.tsx            aba Temporada (status, episódios, onde assistir, senha)
apps-script/
  Temporada.gs          script do Google colado na planilha
public/covers/          capas ampliadas
```

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
| Ordenar por N°, Nome, Score, Episódios, Visto em, Ano, Studio + crescente/decrescente | Igual, na barra e na gaveta; padrão agora é "Visto em" decrescente |
| Cards com capa, score, favorito, rewatch; overlay com detalhes, comentário, MAL, Crunchyroll | Cartas com moldura por raridade; clique abre modal com tudo isso + streaming + histórico |
| Sugestão do Dia (sorteio ponderado) | "Puxada do dia" no topo, mesma regra de peso, sobre os filtros atuais |
| Empty state | Igual |
| Heatmap de atividade | Heatmap por ano, com seletor de ano e nomes no tooltip |
| Distribuição por score | Colunas coloridas por raridade |
| Animes por ano de lançamento | Colunas com o pico destacado |
| Assistidos ao longo do tempo | Área por mês, com rewatches da aba Historico desde 2023 |
| Top 20 rewatches | Top 24, em grade de capas clicáveis |
| Top 15 estúdios, Top 12 temas | Barras horizontais |
| Pizza de demografia e de gênero | Barra empilhada (demografia) e barras (gêneros) |
| — | Novo: aba Temporada com gravação na planilha |

## Observações

- `AGENTS.md` é reescrito pelo `next dev`; instruções do projeto ficam em `CLAUDE.md`.
- O ID da planilha e a URL do Apps Script estão no código. A leitura é pública; a escrita depende
  da senha guardada no Apps Script.
