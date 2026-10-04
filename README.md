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
npm test           # testes das regras (tests/*.test.ts)
```

## Testes

`npm test` roda os testes com o test runner do Node (via `tsx`, sem servidor nem planilha):

- `tests/temporada.test.ts` — regra da estreia (`-` → `X` na segunda da semana), ✓ automático ao
  marcar o último episódio lançado (e que nunca vira `X` sozinho, caso Bleach), leitura da aba
  Temporada Atual (gviz), escolha do resultado do AniList, nome do site pelo link.
- `tests/planilha.test.ts` — leitura das abas Animes Completos e Historico (formatos de data,
  colunas, ligação pelo nome), raridade.
- `tests/filtros.test.ts` — filtros, ordenação, `?aba=` e filtros no endereço.
- `tests/franquias.test.ts` — agrupamento (temporada faltando, OVA, spin-off separado, coluna
  Franquia juntando com o grupo automático), resumo e filtro/endereço.
- `tests/retro.test.ts` — retrospectiva/comparação de anos, filtro de status da Temporada no
  endereço e formato da hora de atualização.
- `tests/appsScript.test.ts` — roda o `apps-script/Temporada.gs` de verdade numa planilha falsa, com
  data e fuso controlados: gatilho diário (estreias, virada semanal de `V`, fuso da planilha),
  links/imagens das células e senha do `doPost`.

Rode `npm test` antes de publicar; ao mudar uma regra, atualize o teste correspondente.

No Windows, se o PowerShell bloquear o `npm.ps1`, use `npm.cmd run dev`.

## Deploy (Vercel)

Repositório: `github.com/tiagogarcea/anime-view` (branch `main`). A Vercel publica sozinha a cada push.

A pasta `Anime-View/` é o próprio repositório: para publicar, `npm test`, `npm run build`, commit e
push (ou rode `Git_Push.bat`, que faz `git add .`, commit com data/hora e push). A antiga
`Anime-View-Git/` não é mais usada.

A planilha é relida no máximo a cada 60 s (`lib/dados.ts`), guardando sempre a última versão que
funcionou. A página em si é montada a cada visita, porque lê a aba e os filtros da URL.

### Variáveis de ambiente (todas opcionais)

| Variável | Padrão / uso |
| --- | --- |
| `SHEET_CSV_URL` | CSV da aba principal "Animes Completos" (`lib/sheet.ts`) |
| `HISTORY_CSV_URL` | CSV da aba "Historico" (`lib/history.ts`) |
| `TEMPORADA_SCRIPT_URL` | URL `/exec` do App da Web do Apps Script (`lib/temporada.ts`) |

Sem elas, o código usa as URLs fixas da planilha `1a6Ylv7yKu8yb1DJkYpZynTSedbOzTUC_ti35fufDyWI`.

## Fontes de dados

Tudo vem de uma única planilha do Google, lida no servidor (`app/page.tsx` → `lib/dados.ts`).

**Se o Google falhar** (fora do ar, resposta vazia), o site não mostra erro: continua com a última
versão que funcionou e tenta de novo na visita seguinte. Cada aba é guardada com a hora em que foi
lida, mostrada no rodapé ("planilha atualizada às 19:43:28 03/10/2026", horário de Brasília) e, na
aba Temporada, abaixo da lista. Só aparece "Erro ao carregar a planilha" se a planilha nunca tiver
sido lida com sucesso naquele servidor (cache vazio, ex.: logo após o primeiro deploy).

| Aba | Como é lida | Cache | Se falhar |
| --- | --- | --- | --- |
| **Animes Completos** (`gid=1713940120`) | CSV público (`lib/sheet.ts`) | 60 s | Última versão boa; sem nenhuma, "Erro ao carregar a planilha" |
| **Historico** (`gid=1281634781`) | CSV público (`lib/history.ts`) | 60 s | Última versão boa; sem nenhuma, só o "Last seen" |
| **Temporada Atual** | JSON do gviz (`lib/temporada.ts`) | 60 s, tag `temporada` | Última versão boa; sem nenhuma, "SEM DADOS" |
| Capas da Temporada Atual | Coluna `Url Imagem` (gviz); reserva: GET no Apps Script | 60 s | Mostra a inicial do nome |
| Streaming e link da Temporada | GET no Apps Script (colunas `Onde assistir?` e `Link`) | 60 s, tag `temporada` | Botão "assistir" não aparece |
| Episódios (total / lançados) | GraphQL do AniList | 1 h | Mostra "?" |
| Franquias (ligações entre títulos) | GraphQL do AniList, ~12 consultas (`lib/franquias.ts`) | 6 h | Última versão boa; sem nenhuma, site sem franquias |

### Aba "Animes Completos"

O cabeçalho pode estar em qualquer uma das 10 primeiras linhas. Cada campo aceita alguns nomes de
coluna (o primeiro que existir vence; ver `COLS` em `lib/sheet.ts`):

`N°`, `Nome`, `Nome_Ingles`, `Score`, `Episodes`, `Time/episode`, `Rewatched`, `Studio`, `Gênero`,
`Tema`, `Demografia`, `Temporada` (ex.: "Fall 2024" → season + ano), `Coments`, `Favorite`
(contém "FAV" = favorito), `Last seen` (DD/MM/AAAA ou AAAA-MM-DD), `Link` / `Imagem` (capa),
`URL_Pagina` (MyAnimeList; o ID do link é usado para as franquias), `Link do Anime` (Crunchyroll),
`Streaming` e `Franquia` (opcional, ver "Franquias").

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

Três abas no topo: **ANIME LIST**, **STATS** e **TEMPORADA**. A aba fica no endereço
(`/?aba=stats`, `/?aba=temporada`; sem `?aba` = Anime List). O servidor lê esse valor e já monta a
página na aba certa, então o F5 continua na mesma aba sem passar pela Anime List; o link abre direto
nela e o voltar/avançar do navegador troca de aba. Links antigos com `#stats` / `#temporada` são
convertidos sozinhos. Abas válidas: `lib/tabs.ts`.

### Anime List
- "Puxada do dia": sorteio ponderado (peso = score, mínimo 1; favorito dobra; +0,1 por mês desde a
  última vez visto, máx. +12), sobre os filtros atuais, com botão para sortear de novo
  (`lib/suggest.ts`). O sorteio roda só no cliente para não quebrar a hidratação.
- Faixa de KPIs (animes, score médio, tempo assistido, episódios + eps de rewatch, raridades),
  respondendo aos filtros.
- Busca por nome JP ou EN, filtros em cascata com contagem por opção (score, datas De/Até, season,
  ano, estúdio, gênero, tema, demografia, favorito, rewatched, raridade) na barra e na gaveta.
- Ordenação por N°, Nome, Score, Episódios, Visto em, Ano, Studio; padrão "Visto em" decrescente.
- Filtros, busca e ordenação ficam no endereço (`lib/urlFiltros.ts`), lidos pelo servidor: o F5 não
  os perde e dá para salvar ou compartilhar uma busca. Só entra o que difere do padrão. Parâmetros:
  `busca`, `score` e `eps` (faixa `min-max`, ex.: `8-10`, `8-`), `de` e `ate` (AAAA-MM-DD), `season`,
  `ano`, `estudio`, `genero`, `tema`, `demografia`, `fav`, `rewatch`, `raridade`, `franquia` (repetidos para vários
  valores), `ordem` e `crescente` (`1`/`0`). Ex.: `/?raridade=SSR&raridade=SR&ano=2024&ordem=score&crescente=0`.
- Cartas com moldura por raridade; clique abre modal com detalhes, comentário, histórico de
  visualizações, links MAL / Crunchyroll e streaming.

Raridade das cartas: score 10 = SSR, 9 = SR, 8 = R, até 7 = N (`tierOf` em `lib/types.ts`).

### Stats
Heatmap de atividade por ano (com seletor e nomes no tooltip; em tela larga a grade não rola, para o
tooltip da segunda-feira não ser cortado, e nas primeiras/últimas semanas ele abre para dentro), distribuição por score, ano de
lançamento, assistidos ao longo do tempo (por mês; a partir de jan/2023 usa a aba Historico e conta
rewatches), top 15 estúdios, top 12 temas, gêneros, demografia (barra empilhada) e mais reassistidos
(top 24).
Tudo responde aos filtros.

**Retrospectiva** (`components/Retro.tsx`, `retrospectiva` em `lib/stats.ts`): resumo de um ano pela
aba Historico — só de 2023 em diante, porque antes não há registro de cada vez assistida. Mostra vezes
que assistiu (1ª vez × rewatches), animes diferentes, episódios, horas, nota média, mês mais ativo,
gráfico por mês, top estúdios/gêneros/temas e as 12 maiores notas entre os animes vistos pela 1ª vez
no ano (rewatches ficam de fora; capas clicáveis, mesmo tamanho das de "mais reassistidos"). No ano em andamento
avisa até que mês vai. **Comparar com** outro ano mostra os dois lado a lado (tabela com diferença,
meses e gêneros/estúdios de cada um); se um dos anos estiver em andamento, compara por padrão o mesmo
período (jan até o mês atual) nos dois — dá para desmarcar.

### Temporada
- Animes da temporada agrupados por dia da semana, com o dia de hoje destacado.
- Os contadores do topo (✓ em dia, ✕ com episódio novo, — não estrearam, sem marcação) são também o
  filtro: clique para mostrar só esses status (dá para escolher vários); "mostrar todos" limpa.
  Fica no endereço (`?status=X&status=-`; `sem` = sem marcação), então o F5 mantém.
- O card inteiro (fundo, borda e linha de informações) fica na cor do status: verde = em dia (`V`),
  vermelho = episódio novo não visto (`X`), azul = não estreou (`-`). Sem marcação fica neutro.
- Para cada um: status semanal (✓ / ✕ / —), capa, data de estreia, último episódio visto,
  "N de M lançados" (AniList) ou "completo".
- Botão "▶ ASSISTIR" abaixo do nome: logo do streaming (`Onde assistir?`) + link (`Link`), abre em
  nova aba. Sem logo (ou se o logo não carregar), mostra o nome do site tirado da URL
  ("ASSISTIR NO CRUNCHYROLL"). Só logo, sem link: mostra o logo sem ser clicável.
- Dá para mudar o status e o episódio (botões − / + ou digitando; salva 0,5 s depois de parar).
  A gravação vai para a planilha via `POST /api/temporada` → Apps Script.
- ✓ automático: ao marcar um episódio que alcança o último lançado segundo o AniList (ex.: 12 de 12),
  o status também é gravado como `V` (`semanalAoMarcar`). Nunca vira `X` sozinho: o AniList às vezes
  conta episódios que atrasaram (Bleach: diz 10 lançados, só saíram 8), então aí o ✓ é manual.
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

### Franquias

`lib/franquias.ts` junta os títulos da planilha que o AniList liga como **continuação** (SEQUEL/PREQUEL)
ou **história paralela** (SIDE_STORY: OVAs, especiais e filmes da mesma história). Spin-offs (ex.:
Vigilante, de Boku no Hero; Gun Gale Online, de SAO) e crossovers (Isekai Quartet) ficam separados.
O tipo PARENT não é usado de propósito: é por ele que os spin-offs apontam de volta para a série.

- Títulos se ligam também através de um que não está na planilha (viu a 1ª e a 3ª temporada → ligadas
  pela 2ª). Só grupos com 2+ títulos viram franquia.
- Nome: o título mais curto do grupo ("Berserk", "Jujutsu Kaisen").
- **Coluna `Franquia`** (opcional, na aba Animes Completos): o que estiver escrito manda. Se for igual
  (sem ligar para maiúsculas) ao nome de uma franquia automática, o título entra nela. Ex.: o AniList
  trata *Kenpuu Denki Berserk* (1997) como "versão alternativa", não continuação; escrever `Berserk`
  nela junta com os filmes e a série de 2016.
- Onde aparece: painel **FRANQUIAS** no Stats (tempo, episódios, nota média, evolução da nota do 1º
  ao último título, rewatches; ordenável; clique no nome filtra a Anime List), filtro **Franquia**
  na gaveta de filtros (`?franquia=` no endereço) e linha FRANQUIA no modal do anime.

## No celular

O site é instalável (`app/manifest.ts`): no Android/Chrome, menu › **Instalar app** (ou "Adicionar à
tela inicial"); no iPhone/Safari, Compartilhar › **Adicionar à Tela de Início**. Abre em tela cheia,
sem a barra do navegador, com o ícone do site (`public/icon-192.png`, `icon-512.png` e
`icon-maskable-512.png`, que o Android recorta em círculo/quadrado). Em telas pequenas as abas ficam
numa linha só e os painéis viram uma coluna.

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
  layout.tsx            fontes, metadados e cor do tema (celular)
  manifest.ts           manifesto para instalar no celular
  page.tsx              lê as 3 abas (lib/dados.ts), a aba e os filtros da URL; monta <App>
  globals.css           todo o visual
  api/temporada/        rota POST que grava na aba Temporada Atual
  icon.svg, apple-icon.png
lib/
  dados.ts              cache das 3 abas (60 s) e das franquias (6 h), com hora da leitura e a última versão boa
  franquias.ts          ligações do AniList → franquias; resumo de cada uma
  types.ts              tipo Anime, raridades (tierOf)
  tabs.ts               abas do site e validação do ?aba= (servidor e cliente)
  urlFiltros.ts         filtros e ordenação ↔ parâmetros do endereço (servidor e cliente)
  sheet.ts              CSV "Animes Completos" → Anime[]
  history.ts            CSV "Historico" → Viewing[], ligação por nome
  temporada.ts          gviz "Temporada Atual" (com Url Imagem) + streaming/link/capas reserva
                        (Apps Script) + AniList
  filters.ts            filtros em cascata e ordenação
  stats.ts              agregações dos KPIs e gráficos, retrospectiva do ano
  suggest.ts            sorteio ponderado da puxada do dia
  format.ts             datas, números, hora de atualização, cor por nome
  hdCovers.ts           lista das capas ampliadas em public/covers/
components/
  App.tsx               estado (aba, filtros e ordenação, todos no endereço; modal)
  Header.tsx            marca e abas
  Hero.tsx              puxada do dia
  KpiStrip.tsx, FilterBar.tsx, FilterDrawer.tsx
  Collection.tsx, Card.tsx, Poster.tsx, DetailModal.tsx
  Stats.tsx             gráficos
  Retro.tsx             retrospectiva do ano e comparação entre anos
  Franquias.tsx         painel de franquias do Stats
  Season.tsx            aba Temporada (filtro de status, episódios, onde assistir, senha)
apps-script/
  Temporada.gs          script do Google colado na planilha
public/covers/          capas ampliadas
public/icon-*.png       ícones do app instalado
tests/                  testes das regras (npm test)
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
