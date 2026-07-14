# Usabilidade e Confiabilidade Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Tornar o portal estático confiável e simples, preservando o progresso local existente e cobrindo os fluxos críticos com testes automatizados.

**Architecture:** Extrair regras puras de calendário e estado diário para um módulo reutilizado pelo navegador e pelo Node. Manter persistência em `portal-estudos-v1`, migrar o schema de modo explícito e fazer as telas consumirem as mesmas regras centrais. Validar dados estaticamente e fluxos reais com Playwright.

**Tech Stack:** HTML, CSS, JavaScript puro, Node.js, Playwright, Service Worker e `localStorage`.

---

### Task 1: Calendário compartilhado

**Files:**
- Create: `assets/js/calendar.js`
- Modify: `assets/js/storage.js`
- Modify: `scripts/test-calendar.mjs`
- Modify: all page HTML files that load `storage.js`

- [ ] Escrever testes que importem a mesma lógica do navegador e cubram normalização, dias úteis, domingo, futuro, bissexto e viradas de mês/ano.
- [ ] Executar `node scripts/test-calendar.mjs` e confirmar falha pela ausência do módulo.
- [ ] Implementar `normalizeStartDate`, `isStudyDate`, `studyDateAt`, `plannedPastDates`, `countStudyDatesBefore` e helpers de ISO em `calendar.js`, exportando para CommonJS e `window` sem dependência.
- [ ] Remover as cópias equivalentes de `storage.js` e carregar `calendar.js` antes dele nas páginas.
- [ ] Executar o teste e confirmar todos os casos aprovados.

### Task 2: Atividade diária, estados e migração

**Files:**
- Modify: `assets/js/storage.js`
- Modify: `scripts/test-calendar.mjs`

- [ ] Criar testes para sessão sem conclusão, questões, revisão, tarefa concluída, falta real, parcial, andamento, concluído e recuperado.
- [ ] Executar os testes e observar falha de `getDayActivity`/`getDayStatus` ausentes.
- [ ] Subir `SCHEMA_VERSION` para 4 e preencher campos ausentes sem substituir arrays ou objetos antigos.
- [ ] Implementar `getDayActivity(date, progress)` e `getDayStatus(date, progress, today)` como funções puras.
- [ ] Fazer `startPlan` normalizar a data e `markMissedDays` persistir `parcial` quando houver atividade.
- [ ] Testar migração de um objeto v3 com sessões, quiz, erros e simulados preservados.

### Task 3: Recuperação e tela Hoje

**Files:**
- Modify: `assets/js/dashboard.js`
- Modify: `assets/js/storage.js`
- Modify: `assets/css/style.css`
- Test: `tests/portal.spec.js`

- [ ] Criar teste de navegador com recuperação antiga e sessão registrada em `date=today`, `dayKey=scheduleDate`.
- [ ] Reestruturar `renderHoje` em helpers pequenos para roteiro, tarefa, cronômetro e opções.
- [ ] Usar `scheduleDate` nas chaves de tarefas e no resumo do cronograma; usar `studyDate` para tempo e questões reais.
- [ ] Representar tarefas mescladas como objetos com `scheduleDate`, sem alterar `data.cronograma` nem sobrescrever o dia atual.
- [ ] Concluir cada origem separadamente e marcar somente o dia recuperado como `recuperado`.
- [ ] Destacar a primeira etapa pendente e persistir o estado.

### Task 4: Aulas e materiais honestos

**Files:**
- Modify: `assets/js/app.js`
- Modify: `assets/js/dashboard.js`
- Modify: `data/aulas.json`
- Modify: `data/pdfs.json`
- Modify: `data/materiais.json`
- Modify: `data/provas.json`
- Modify: `data/cronograma.json`

- [ ] Implementar `materialActionLabel(item)` e `materialUrl(item, materia, assunto)` com rótulos por tipo.
- [ ] Fazer Hoje usar `a?.url || App.youtubeUrl(materia, assunto)` e material específico antes do fallback.
- [ ] Remover `dQw4w9WgXcQ`; substituir links de aula não confirmáveis ou duplicados sem coerência por busca contextual.
- [ ] Classificar páginas oficiais como `legislacao` ou `fonte`, com `paginas: null`; manter páginas apenas em PDFs reais.
- [ ] Corrigir os 11 `pdfId` quebrados preservando IDs de tarefas e conteúdo.
- [ ] Corrigir Licitações para Lei 14.133 e revisar rótulos de provas/fontes.

### Task 5: Biblioteca e Matérias

**Files:**
- Modify: `assets/js/biblioteca.js`
- Modify: `assets/js/dashboard.js`
- Modify: `assets/css/style.css`
- Test: `tests/portal.spec.js`

- [ ] Criar testes para Biblioteca sem parâmetros, por matéria, por tipo, busca, filtro manual, limpeza e estado vazio.
- [ ] Declarar `const params = new URLSearchParams(location.search)` em `initBiblioteca`.
- [ ] Mapear `aulas`, `pdfs`, `questoes` e `acertos` para destinos/semânticas que produzam dados reais ou remover o filtro inválido da Biblioteca.
- [ ] Reescrever `renderPainelMaterias` com template literals, classes válidas e contagem real de aulas/fontes.
- [ ] Validar ausência de `class=...+...` e estilos com `+solid+`.

### Task 6: Questões em branco e Cebraspe

**Files:**
- Modify: `assets/js/quiz.js`
- Modify: `assets/js/storage.js`
- Modify: `assets/css/style.css`
- Test: `tests/portal.spec.js`

- [ ] Criar teste para avançar com “Deixar em branco” e resultado separado.
- [ ] Usar sentinela explícita para branco, distinta de questão ainda não visitada.
- [ ] Não incrementar erro, XP de erro ou caderno de erros para brancos.
- [ ] Exibir resposta escolhida, “Em branco”, gabarito, resultado e resolução.
- [ ] Adicionar configuração simples de acerto, penalização e branco na página de Simulados.
- [ ] Rotular a pontuação como calculada conforme configuração da usuária.

### Task 7: Navegação, Dashboard e Progresso

**Files:**
- Modify: all primary HTML pages
- Modify: `assets/js/app.js`
- Modify: `assets/js/dashboard.js`
- Modify: `assets/css/style.css`

- [ ] Reorganizar a navegação em Hoje, Meu plano, Questões, Meu progresso e Mais, preservando todos os destinos.
- [ ] Destacar Hoje e fechar o menu móvel após clique.
- [ ] Priorizar quatro métricas no Dashboard e mover detalhes para `<details>`.
- [ ] Substituir abreviações como `3d seq.` por linguagem natural.
- [ ] Mostrar última data de backup também em Progresso.
- [ ] Envolver tabelas largas em contêiner responsivo com indicação de rolagem.

### Task 8: Backup seguro

**Files:**
- Modify: `assets/js/backup.js`
- Modify: `assets/js/storage.js`
- Test: `tests/portal.spec.js`

- [ ] Testar exportação atualizando `lastBackupAt`.
- [ ] Validar objeto, schema e tipos essenciais antes da importação.
- [ ] Pedir confirmação antes de substituir, migrar e recarregar a página.
- [ ] Informar que reset afeta apenas o navegador atual e recarregar sem chamadas após `Storage.reset()`.

### Task 9: Modais e acessibilidade

**Files:**
- Modify: `assets/js/app.js`
- Modify: `assets/css/style.css`
- Modify: affected HTML/JS labels
- Test: `tests/portal.spec.js`

- [ ] Adicionar `role=dialog`, `aria-modal`, título associado, foco inicial, trap de Tab e restauração de foco.
- [ ] Vincular labels a inputs gerados e garantir controles com 44 px.
- [ ] Separar visualmente ações perigosas e verificar viewport de celular sem overflow da página.

### Task 10: Validações estáticas

**Files:**
- Modify: `scripts/validate.mjs`
- Modify: `scripts/check-links.mjs`

- [ ] Validar duplicatas de IDs e URLs de aula suspeitas, URL conhecida incorreta, tipos/páginas de materiais, referências e tags.
- [ ] Validar questões sem gabarito/resolução, simulados, tópicos sem material e fontes ausentes.
- [ ] Validar HTML/classes/estilos inválidos em arquivos HTML e templates JavaScript.
- [ ] Executar e corrigir os dados até ambos os scripts passarem.

### Task 11: Playwright

**Files:**
- Modify: `package.json`
- Create: `package-lock.json`
- Create: `playwright.config.js`
- Create: `tests/portal.spec.js`

- [ ] Instalar `@playwright/test` como única dependência de desenvolvimento.
- [ ] Configurar `python3 -m http.server 3050 --directory .` como web server.
- [ ] Criar fixture que isole `localStorage` e acumule `pageerror`/console error.
- [ ] Cobrir todas as páginas, primeiro acesso, plano, normalização, cronômetro, manual, conclusão, quiz certo/errado/branco, filtros, recuperação, parcial, backup e celular.
- [ ] Executar `npx playwright test` até passar integralmente.

### Task 12: Service Worker, QA e verificação final

**Files:**
- Modify: `service-worker.js`
- Modify: page cache-bust query strings
- Modify: `QA_REPORT.md`
- Modify: `DATA_SCHEMA.md`

- [ ] Atualizar cache para `portal-estudos-v11`, listar arquivos novos e manter network-first para navegação/dados.
- [ ] Atualizar cache-bust dos assets.
- [ ] Executar `node scripts/validate.mjs`, `node scripts/test-calendar.mjs`, `node scripts/check-links.mjs --internal-only` e `node --check` em todos os JS.
- [ ] Executar Playwright e testes manuais nas seis URLs solicitadas com servidor local.
- [ ] Atualizar QA somente com resultados observados.
- [ ] Executar `git diff --check`, revisar `git status`, apresentar diff e relatório sem commit, push ou merge.
