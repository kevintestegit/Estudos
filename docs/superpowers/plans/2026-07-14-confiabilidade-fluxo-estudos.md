# Confiabilidade do Fluxo de Estudos Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Corrigir progresso prematuro, dados divergentes, links quebrados, persistência frágil, cache amplo e lacunas de CI/acessibilidade sem mudar a arquitetura estática.

**Architecture:** Manter HTML, JavaScript puro, JSON, `localStorage` e GitHub Pages. Reusar `App`, `Storage` e testes existentes; adicionar somente funções pequenas onde regra de domínio precisa ser compartilhada.

**Tech Stack:** HTML, CSS, JavaScript, Node.js test runner, Playwright, GitHub Actions.

---

### Task 1: Progresso real da tarefa

**Files:**
- Modify: `assets/js/dashboard.js`
- Modify: `assets/js/quiz.js`
- Modify: `assets/js/storage.js`
- Test: `tests/portal.spec.js`

- [ ] Escrever testes provando que abrir teoria/prática não conclui etapa e que finalizar quiz conclui somente `taskKey` recebido.
- [ ] Executar `npx playwright test tests/portal.spec.js -g "etapa|taskKey"` e confirmar falha pelo comportamento atual.
- [ ] Passar `taskKey` ao quiz e gravar conclusão somente em `finish()`; manter link como abertura, não conclusão.
- [ ] Impedir conclusão do dia com tarefas obrigatórias pendentes.
- [ ] Executar testes focados e confirmar aprovação.

### Task 2: Persistência e revisão confiáveis

**Files:**
- Modify: `assets/js/storage.js`
- Modify: `assets/js/backup.js`
- Modify: `assets/js/biblioteca.js`
- Test: `tests/portal.spec.js`

- [ ] Escrever testes para backup inválido, JSON corrompido e deduplicação de erro por `questionId`.
- [ ] Confirmar falhas antes da implementação.
- [ ] Validar arrays/objetos do backup, preservar dado corrompido e deduplicar erros.
- [ ] Exibir URL e data na fila de revisão.
- [ ] Executar testes focados e confirmar aprovação.

### Task 3: Taxonomia e recursos externos

**Files:**
- Modify: `data/questoes-prf.json`
- Modify: `data/materiais.json`
- Modify: `assets/js/biblioteca.js`
- Modify: `scripts/validate.mjs`
- Test: `tests/portal.spec.js`

- [ ] Escrever testes para categoria INSS/PRF e matéria canônica Português.
- [ ] Confirmar falhas atuais.
- [ ] Normalizar matéria e derivar categoria sem sobrescrever dados.
- [ ] Substituir ou retirar somente URLs comprovadamente 404 usando fonte oficial verificada.
- [ ] Ampliar validação estrutural para rejeitar matéria fora do catálogo.

### Task 4: Validador, Service Worker e acessibilidade

**Files:**
- Modify: `scripts/check-links.mjs`
- Modify: `tests/check-links.test.mjs`
- Modify: `service-worker.js`
- Modify: `assets/js/app.js`
- Modify: `assets/js/edital.js`
- Modify: `assets/css/style.css`
- Test: `tests/portal.spec.js`

- [ ] Escrever testes para HTTP 403 inconclusivo, playlist específica e preservação de cache externo.
- [ ] Confirmar falhas atuais.
- [ ] Corrigir estados do validador e restringir exclusão ao prefixo do portal.
- [ ] Adicionar `aria-current`, estado do menu, regiões vivas e progressbar semântica.
- [ ] Executar testes focados.

### Task 5: CI, desempenho e documentação

**Files:**
- Modify: `.github/workflows/pages.yml`
- Modify: `assets/js/app.js`
- Modify: `assets/js/dashboard.js`
- Modify: `service-worker.js`
- Modify: `README.md`
- Modify: `DATA_SCHEMA.md`
- Modify: `ROADMAP.md`
- Modify: `QA_REPORT.md`

- [ ] Adicionar `npm ci` e `npm test` antes do deploy.
- [ ] Trocar `loadAll()` por carregamentos necessários em Hoje e Matérias.
- [ ] Remover dados sem consumidor do pre-cache.
- [ ] Atualizar documentação conforme comportamento e testes reais.

### Task 6: Verificação final

- [ ] Executar `npm test`.
- [ ] Executar `node scripts/check-links.mjs` com rede real.
- [ ] Executar verificações de sintaxe e `git diff --check`.
- [ ] Revisar diff, branch e arquivos não relacionados.
