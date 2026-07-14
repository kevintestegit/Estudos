# Biblioteca de Videoaulas Auditável Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Corrigir integralmente dados, interface, validação externa, testes, cache e documentação das 69 videoaulas.

**Architecture:** Manter `data/aulas.json` como fonte única e centralizar apenas a decisão de apresentação em `App.lessonAction`. Tornar `check-links.mjs` importável para testes mockados e executável para auditoria externa real, gerando um relatório JSON por aula.

**Tech Stack:** JavaScript puro, Node.js (`node:test`), Playwright e Service Worker.

---

### Task 1: Evidência externa e dados

**Files:** `data/aulas.json`, `reports/aulas-link-report.json`

- [ ] Extrair candidatos antigos e inventário inicial.
- [ ] Consultar externamente cada candidato; registrar título, canal, HTTP, URL final, tempo e decisão.
- [ ] Pesquisar substituto para rejeitados quando houver opção comprovável.
- [ ] Normalizar cada registro para `video`, `playlist` ou `indisponivel`, sem `yt`.

### Task 2: Validador testável

**Files:** `tests/check-links.test.mjs`, `scripts/check-links.mjs`, `scripts/validate.mjs`

- [ ] Escrever testes falhos para esquema, URL/ID, estados externos, duplicações e relatório.
- [ ] Executar os testes e confirmar falha pelo comportamento ausente.
- [ ] Implementar o mínimo necessário com `fetch`, timeout e relatório auditável.
- [ ] Executar os testes e confirmar aprovação.

### Task 3: Interface honesta

**Files:** `tests/portal.spec.js`, `assets/js/app.js`, `assets/js/dashboard.js`, `assets/js/biblioteca.js`

- [ ] Escrever testes falhos para vídeo, playlist e indisponível.
- [ ] Centralizar a decisão em `App.lessonAction` e remover geração de pesquisas.
- [ ] Fazer Hoje e Biblioteca renderizarem links seguros ou aviso sem link.
- [ ] Impedir conclusão por registros indisponíveis e executar Playwright focalizado.

### Task 4: Cache e documentação

**Files:** `tests/portal.spec.js`, `service-worker.js`, `README.md`, `QA_REPORT.md`

- [ ] Escrever teste de invalidação da versão anterior.
- [ ] Subir a versão do cache preservando network-first para JSON.
- [ ] Executar auditoria externa e todos os comandos obrigatórios, registrando códigos reais.
- [ ] Atualizar README e QA com contagens e limitações observadas.

### Task 5: Revisão e commit

- [ ] Conferir branch, status, diff completo, segredos e arquivos temporários.
- [ ] Executar `git diff --check` e a suíte final completa.
- [ ] Criar um commit descritivo na branch exigida, sem merge nem push.
