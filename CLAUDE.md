@AGENTS.md

# Regras do projeto

- **README sempre em dia:** toda alteração no projeto (funcionalidade, coluna da planilha, fonte de
  dados, variável de ambiente, rota, arquivo novo ou removido, mudança no Apps Script) deve atualizar
  o `README.md` na mesma tarefa. O README é a documentação completa do projeto, em português.
- Se mudar `apps-script/Temporada.gs`, lembrar o usuário de reimplantar o script (Nova versão).
- **Testes:** rodar `npm test` e `npm run build` antes de publicar. Ao criar ou mudar uma regra
  (status da Temporada, leitura da planilha, filtros, Apps Script), criar/atualizar o teste em `tests/`.
- Esta pasta é o repositório git (a antiga `Anime-View-Git/` não é mais usada).
