# Unidade Piloto de Interpretação Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Entregar no primeiro dia do cronograma uma unidade completa de Interpretação de textos com leitura, vídeo, checagem, prática real, correção e revisão persistente.

**Architecture:** `data/unidades.json` será a fonte editorial do piloto; `assets/js/unit.js` renderizará a máquina de estados dentro de Hoje; `Storage` manterá estado, tentativas e revisões na chave local existente. O quiz atual receberá apenas os ganchos necessários para execução incorporada e persistida.

**Tech Stack:** HTML, CSS, JavaScript puro, JSON, `localStorage`, Node.js test runner e Playwright.

---

### Task 1: Confirmar evidência editorial do vídeo

**Files:**
- Modify: `data/aulas.json`
- Create: `reports/unidade-pt-interpretacao-evidence.json`

- [ ] **Step 1: Abrir o vídeo real e inspecionar seu conteúdo**

Run:

```bash
curl -fsSL --max-time 20 "https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v=B1lk04l-dRU&format=json"
```

Expected: HTTP útil com `title` igual a `PORTUGUÊS PARA CONCURSOS: INTERPRETAÇÃO DE TEXTO` e `author_name` igual a `FZ Concursos`.

- [ ] **Step 2: Revisar manualmente o vídeo no navegador**

Run:

```bash
python3 -m http.server 3050 --directory .
```

Abra `https://www.youtube.com/watch?v=B1lk04l-dRU`, registre os segundos exatos em que começam e terminam explicações sobre compreensão explícita, inferência e coesão. Não aprove timestamps baseados apenas em título ou legenda automática indisponível.

Expected: intervalo com `inicioSegundos >= 0`, `fimSegundos <= 1959`, `fimSegundos > inicioSegundos` e evidência textual curta para cada objetivo.

- [ ] **Step 3: Registrar somente dados observados**

O relatório deve usar esta forma, substituindo os números apenas pelos segundos efetivamente observados:

```json
{
  "aulaId": "aula-pt-01",
  "videoId": "B1lk04l-dRU",
  "duracaoTotalSegundos": 1959,
  "inicioSegundos": 0,
  "fimSegundos": 1959,
  "objetivosConfirmados": [],
  "evidencias": [],
  "verificadoEm": "2026-07-15",
  "status": "pendente_revisao_manual"
}
```

Use `status: "aprovado"` somente depois da inspeção. Se o vídeo não cobrir os três objetivos, mantenha o piloto como rascunho e pesquise um substituto antes de continuar.

- [ ] **Step 4: Commitar a evidência**

```bash
git add data/aulas.json reports/unidade-pt-interpretacao-evidence.json
git commit -m "docs: verifica video da unidade piloto"
```

### Task 2: Criar o validador antes dos dados

**Files:**
- Create: `scripts/validate-units.mjs`
- Create: `tests/validate-units.test.mjs`
- Modify: `package.json`

- [ ] **Step 1: Escrever testes negativos do contrato editorial**

```js
import test from "node:test";
import assert from "node:assert/strict";
import { validateUnits } from "../scripts/validate-units.mjs";

const base = {
  unidades: [{
    id: "unidade-pt-interpretacao-01",
    materia: "Português",
    assunto: "Interpretação de textos",
    objetivos: ["pt-int-inferencia-valida"],
    leitura: { objetivosCobertos: ["pt-int-inferencia-valida"], secoes: [{ id: "inferencia", conteudo: "Conteúdo" }] },
    video: { aulaId: "aula-pt-01", inicioSegundos: 0, fimSegundos: 600, objetivosCobertos: ["pt-int-inferencia-valida"] },
    checagem: { questionIds: ["check-1", "check-2", "check-3"], quantidadeMinima: 3 },
    pratica: { questionIds: ["real-1", "real-2", "real-3", "real-4", "real-5"], quantidadeMinima: 5 },
    correcao: { agruparPorObjetivo: true },
    revisao: { habilitada: true, estrategia: "baseada-em-desempenho" },
    statusEditorial: "publicada"
  }],
  checagens: [1, 2, 3].map((n) => ({ id: `check-${n}`, unitId: "unidade-pt-interpretacao-01", objetivos: ["pt-int-inferencia-valida"], feedback: { leituraSecaoId: "inferencia" } })),
  aulas: [{ id: "aula-pt-01", duracaoTotalSegundos: 1959 }],
  questoes: [1, 2, 3, 4, 5].map((n) => ({ id: `real-${n}`, materia: "Português", assunto: "Interpretação de textos", unitIds: ["unidade-pt-interpretacao-01"], objetivos: ["pt-int-inferencia-valida"], fonte: "Cebraspe", fonteUrl: "https://cdn.cebraspe.org.br/prova.pdf", fonteVerificada: true }))
};

test("rejeita timestamp fora da duração", () => {
  const input = structuredClone(base);
  input.unidades[0].video.fimSegundos = 2000;
  assert.match(validateUnits(input).unidades[0].erros.join(" "), /timestamp/i);
});

test("rejeita questão sem objetivo", () => {
  const input = structuredClone(base);
  input.questoes[0].objetivos = [];
  assert.match(validateUnits(input).unidades[0].erros.join(" "), /objetivo/i);
});

test("registra quantidade insuficiente como pendência editorial", () => {
  const input = structuredClone(base);
  input.unidades[0].pratica.questionIds.pop();
  assert.match(validateUnits(input).unidades[0].pendenciasEditoriais.join(" "), /5 questões/i);
});
```

- [ ] **Step 2: Executar e confirmar falha**

Run: `node --test tests/validate-units.test.mjs`

Expected: FAIL porque `scripts/validate-units.mjs` ainda não existe.

- [ ] **Step 3: Implementar validador puro e CLI**

Exporte `validateUnits({ unidades, checagens, aulas, questoes })`. Para cada unidade, devolva:

```js
{
  unitId: unit.id,
  status: erros.length ? "invalida" : pendenciasEditoriais.length ? "pendente_editorial" : "valida",
  erros,
  avisos,
  pendenciasEditoriais,
  dadosNaoVerificados
}
```

O CLI deve carregar `data/unidades.json`, `data/aulas.json` e os dois bancos de questões, escrever `reports/unit-validation-report.json` e sair com código 1 quando houver erro bloqueante ou unidade `publicada` com pendência editorial/dado não verificado.

- [ ] **Step 4: Adicionar scripts**

```json
"validate:units": "node scripts/validate-units.mjs",
"test:units": "node --test tests/validate-units.test.mjs"
```

Inclua ambos em `npm test` antes do Playwright.

- [ ] **Step 5: Executar e confirmar aprovação dos testes unitários**

Run: `node --test tests/validate-units.test.mjs`

Expected: 3 testes aprovados, 0 falhos.

- [ ] **Step 6: Commitar**

```bash
git add scripts/validate-units.mjs tests/validate-units.test.mjs package.json
git commit -m "test: valida coerencia das unidades"
```

### Task 3: Cadastrar a unidade e enriquecer questões reais

**Files:**
- Create: `data/unidades.json`
- Modify: `data/cronograma.json`
- Modify: `data/questoes-inss.json`

- [ ] **Step 1: Cadastrar os três objetivos, leitura e checagem**

Crie `unidade-pt-interpretacao-01` com `tempoMinutos: 8`, seções `compreensao-explicita`, `inferencia-valida`, `coesao-referencial`, `armadilhas-de-banca` e `resumo`. Inclua exemplos autorais, pontos-chave, armadilhas e fontes oficiais. Cadastre entre três e cinco checagens autorais com feedback correto/incorreto e `leituraSecaoId` válido.

- [ ] **Step 2: Referenciar o vídeo aprovado**

Copie do relatório de evidência apenas `inicioSegundos`, `fimSegundos`, objetivos e motivo confirmados. Calcule `duracaoTrechoSegundos` como `fimSegundos - inicioSegundos`.

- [ ] **Step 3: Enriquecer exatamente cinco questões**

Atualize `inss-2022-i1`, `inss-2022-i2`, `inss-2022-i4`, `inss-2022-i5` e `inss-2022-i7` com:

```json
{
  "unitIds": ["unidade-pt-interpretacao-01"],
  "objetivos": ["id-explicito-do-objetivo"],
  "concurso": "INSS — Técnico do Seguro Social",
  "ano": 2022,
  "dificuldade": "media",
  "origemQuestao": "real",
  "fonteUrl": "https://cdn.cebraspe.org.br/concursos/INSS_22/arquivos/760_INSS_CB1_01.PDF",
  "gabaritoFonteUrl": "https://cdn.cebraspe.org.br/concursos/INSS_22/arquivos/GAB_DEFINITIVO_760_INSS_CB1_01.PDF",
  "fonteVerificada": true
}
```

Associe cada questão apenas aos objetivos demonstrados no enunciado e no texto-base.

- [ ] **Step 4: Vincular o cronograma por ID estável**

Adicione somente à primeira tarefa:

```json
"unitId": "unidade-pt-interpretacao-01"
```

- [ ] **Step 5: Validar**

Run: `node scripts/validate-units.mjs`

Expected: unidade válida, 0 erros bloqueantes, 0 pendências editoriais e 0 dados não verificados.

- [ ] **Step 6: Commitar**

```bash
git add data/unidades.json data/cronograma.json data/questoes-inss.json reports/unit-validation-report.json
git commit -m "feat: cadastra unidade piloto de interpretacao"
```

### Task 4: Persistir máquina de estados, tentativas e revisões

**Files:**
- Modify: `assets/js/storage.js`
- Modify: `DATA_SCHEMA.md`
- Test: `tests/unit-flow.spec.js`

- [ ] **Step 1: Escrever testes Playwright de migração e transições inválidas**

```js
test("migra schema 4 sem perder progresso", async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem("portal-estudos-v1", JSON.stringify({ schemaVersion: 4, xp: 37, taskStatus: { legado: "concluida" } })));
  await page.goto("/hoje.html");
  const data = await page.evaluate(() => Storage.get());
  expect(data.schemaVersion).toBe(5);
  expect(data.xp).toBe(37);
  expect(data.taskStatus.legado).toBe("concluida");
  expect(data.unitProgress).toEqual({});
  expect(data.unitAttempts).toEqual([]);
  expect(data.unitReviews).toEqual([]);
});

test("não permite pular leitura", async ({ page }) => {
  await page.goto("/hoje.html");
  const result = await page.evaluate(() => Storage.transitionUnit("unidade-pt-interpretacao-01", "concluir_video"));
  expect(result.ok).toBe(false);
  expect(result.state).toBe("nao_iniciada");
});
```

- [ ] **Step 2: Executar e confirmar falha**

Run: `npx playwright test tests/unit-flow.spec.js --grep "migra|pular"`

Expected: FAIL por schema 4 e ausência de `transitionUnit`.

- [ ] **Step 3: Migrar para schema 5**

Acrescente ao padrão:

```js
unitProgress: {},
unitAttempts: [],
unitReviews: [],
```

Normalize essas coleções em `migrate()` e preserve todos os campos existentes.

- [ ] **Step 4: Implementar transições explícitas**

Adicione `getUnitProgress(unitId)`, `transitionUnit(unitId, event)`, `startUnitAttempt(unitId, phase, questionIds)`, `recordUnitAnswer(attemptId, answer)`, `finishUnitAttempt(attemptId)` e `scheduleUnitReview(review)`. Eventos inválidos retornam `{ ok: false, state }` sem gravar.

- [ ] **Step 5: Validar e documentar**

Run: `npx playwright test tests/unit-flow.spec.js --grep "migra|pular"`

Expected: 2 testes aprovados.

- [ ] **Step 6: Commitar**

```bash
git add assets/js/storage.js DATA_SCHEMA.md tests/unit-flow.spec.js
git commit -m "feat: persiste jornada da unidade"
```

### Task 5: Renderizar leitura e vídeo dentro de Hoje

**Files:**
- Create: `assets/js/unit.js`
- Modify: `assets/js/dashboard.js`
- Modify: `hoje.html`
- Modify: `assets/css/style.css`
- Test: `tests/unit-flow.spec.js`

- [ ] **Step 1: Escrever testes de ação única, bloqueios e conclusão explícita**

Cubra: começar/retomar leitura, uma única ação principal, vídeo bloqueado antes da leitura, leitura preservada após reload, player incorporado com `start` e `end`, abertura sem conclusão e botão explícito de conclusão.

- [ ] **Step 2: Executar e confirmar falha**

Run: `npx playwright test tests/unit-flow.spec.js --grep "leitura|video|ação principal|bloqueada"`

Expected: FAIL porque o motor ainda não existe.

- [ ] **Step 3: Implementar `UnitFlow`**

Exponha:

```js
window.UnitFlow = {
  async load(unitId) {},
  render({ unit, task, entry, data }) {},
  bind({ unit, task, entry, data }) {}
};
```

`renderStudyTask()` deve chamar `UnitFlow.render()` somente quando `task.unitId` existir. O componente renderiza leitura sem HTML não escapado, etapas futuras bloqueadas e apenas um elemento com `data-primary-action` visível.

- [ ] **Step 4: Incorporar o trecho confirmado**

Use URL canônica:

```js
const src = `https://www.youtube.com/embed/${videoId}?start=${inicioSegundos}&end=${fimSegundos}&rel=0`;
```

O iframe terá título, `allowfullscreen` e política de referência. Nenhum evento do player conclui a etapa.

- [ ] **Step 5: Executar testes desktop e mobile**

Run: `npx playwright test tests/unit-flow.spec.js --grep "leitura|video|ação principal|bloqueada"`

Expected: todos aprovados em 1280×800 e 390×844.

- [ ] **Step 6: Commitar**

```bash
git add assets/js/unit.js assets/js/dashboard.js hoje.html assets/css/style.css tests/unit-flow.spec.js
git commit -m "feat: integra leitura e video na pagina hoje"
```

### Task 6: Integrar checagem e prática persistidas

**Files:**
- Modify: `assets/js/quiz.js`
- Modify: `assets/js/unit.js`
- Test: `tests/unit-flow.spec.js`

- [ ] **Step 1: Escrever testes de retomada e histórico**

Cubra: feedback da checagem com seção de leitura, reload após resposta, tentativa original preservada, nova tentativa adicionada e prática usando exatamente os cinco IDs aprovados.

- [ ] **Step 2: Executar e confirmar falha**

Run: `npx playwright test tests/unit-flow.spec.js --grep "checagem|tentativa|prática"`

Expected: FAIL porque o quiz ainda não aceita contexto de unidade.

- [ ] **Step 3: Adicionar ganchos mínimos ao quiz**

`startQuiz(questions, meta)` aceitará opcionalmente:

```js
{
  unitId,
  phase,
  attemptId,
  resumeAnswers,
  onAnswer(answer) {},
  onFinish(result) {},
  onCancel() {}
}
```

Sem esses campos, o comportamento das páginas Questões e Simulados permanece idêntico. Exponha `window.startQuiz = startQuiz`.

- [ ] **Step 4: Ligar o motor às tentativas**

`UnitFlow` cria ou retoma a tentativa, passa respostas anteriores ao quiz e só dispara `concluir_checagem` ou `concluir_pratica` quando todas as questões tiverem resposta persistida.

- [ ] **Step 5: Executar testes**

Run: `npx playwright test tests/unit-flow.spec.js --grep "checagem|tentativa|prática"`

Expected: todos aprovados.

- [ ] **Step 6: Commitar**

```bash
git add assets/js/quiz.js assets/js/unit.js tests/unit-flow.spec.js
git commit -m "feat: preserva tentativas da unidade"
```

### Task 7: Implementar correção e revisão

**Files:**
- Modify: `assets/js/unit.js`
- Modify: `assets/js/storage.js`
- Modify: `assets/js/dashboard.js`
- Test: `tests/unit-flow.spec.js`

- [ ] **Step 1: Escrever testes de correção e agendamento**

Cubra erro agrupado por objetivo, resposta original, gabarito, resolução, seção de leitura, classificação do erro, repetição sem sobrescrita e revisão com data calculada pelo desempenho.

- [ ] **Step 2: Executar e confirmar falha**

Run: `npx playwright test tests/unit-flow.spec.js --grep "correção|revisão|conclusão"`

Expected: FAIL porque as etapas não estão renderizadas.

- [ ] **Step 3: Renderizar correção por objetivo**

Cada erro deve oferecer `conceitual`, `interpretacao` e `atencao`; a classificação é persistida na resposta e enviada ao caderno existente com `unitId` e objetivos. Uma tentativa sem erros exibe “Nenhum erro nesta tentativa” e permite conclusão explícita.

- [ ] **Step 4: Agendar revisão baseada no desempenho**

Use `addDaysISO(todayISO(), intervalo)`: 1 dia para objetivo com erro, 3 dias para acerto após repetição e 7 dias para acerto sem erro. Grave uma revisão por unidade/objetivo/data, sem duplicar registro idêntico.

- [ ] **Step 5: Concluir unidade e sincronizar tarefa antiga**

Ao atingir `concluida`, marque a chave antiga da primeira tarefa como `concluida` para manter estatísticas e fechamento do dia compatíveis. Nenhum estado anterior deve marcar a tarefa como concluída.

- [ ] **Step 6: Executar testes**

Run: `npx playwright test tests/unit-flow.spec.js --grep "correção|revisão|conclusão"`

Expected: todos aprovados.

- [ ] **Step 7: Commitar**

```bash
git add assets/js/unit.js assets/js/storage.js assets/js/dashboard.js tests/unit-flow.spec.js
git commit -m "feat: corrige erros e agenda revisao"
```

### Task 8: Atualizar cache, documentação e bateria completa

**Files:**
- Modify: `service-worker.js`
- Modify: `README.md`
- Modify: `DATA_SCHEMA.md`
- Modify: `QA_REPORT.md`
- Modify: `package.json`

- [ ] **Step 1: Atualizar cache**

Suba `portal-estudos-v15` para `portal-estudos-v16` e inclua `assets/js/unit.js` e `data/unidades.json`. Preserve network-first para navegação e `/data/`; `activate` deve remover v15 sem tocar caches de outras aplicações.

- [ ] **Step 2: Atualizar teste do Service Worker**

Altere a expectativa para v16 e confirme que v15 é removido.

- [ ] **Step 3: Documentar somente fatos implementados**

README descreve o piloto; DATA_SCHEMA descreve schema 5; QA_REPORT registra data real, comandos, códigos de saída, fontes, limitações e qualquer pendência editorial.

- [ ] **Step 4: Executar validações**

```bash
node scripts/validate.mjs
node scripts/validate-units.mjs
node scripts/test-calendar.mjs
node scripts/check-links.mjs
node --test tests/check-links.test.mjs
node --test tests/validate-units.test.mjs
node --check assets/js/app.js
node --check assets/js/storage.js
node --check assets/js/dashboard.js
node --check assets/js/unit.js
node --check assets/js/quiz.js
npx playwright test
git diff --check
```

Expected: todos os comandos com código 0; o validador externo confirma os links publicados; Playwright sem falhas, console errors ou `pageerror`.

- [ ] **Step 5: Revisar escopo e commit final**

```bash
git status --short
git diff --stat main...HEAD
git diff main...HEAD
git add service-worker.js README.md DATA_SCHEMA.md QA_REPORT.md package.json tests/portal.spec.js
git commit -m "docs: registra validacao da unidade piloto"
```

Confirme que `.superpowers/` e `tests/blank-page.spec.js` não entraram nos commits e que nenhuma das outras 95 jornadas foi convertida.
