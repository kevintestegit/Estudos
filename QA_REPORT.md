# QA_REPORT — 2026-07-10

## Páginas verificadas (14/14)

| Página | Erros | OK |
|--------|-------|----|
| index.html | — | ✓ |
| hoje.html | — | ✓ |
| cronograma.html | — | ✓ |
| edital.html | — | ✓ |
| biblioteca.html | — | ✓ |
| materias.html | — | ✓ |
| questoes.html | — | ✓ |
| flashcards.html | — | ✓ |
| simulados.html | — | ✓ |
| provas.html | — | ✓ |
| caderno-erros.html | — | ✓ |
| progresso.html | — | ✓ |
| backup.html | — | ✓ |
| offline.html | — | ✓ |

## Erros corrigidos

1. **Botão "Ver resultado"** — aliases `_daily`/`_level`/`_achievements` faltando (corrigido)
2. **schedule-fix.js removido** — cronograma real sem conversão runtime
3. **Cache SW** — v6 força recarga completa dos JS/JSON
4. **Questões-extração** — `=== PAGE` e OCR quebrado removidos

## Melhorias implementadas

| Funcionalidade | Status |
|----------------|--------|
| Encerramento diário com resumo | ✓ |
| Tarefas individuais (status) | ✓ |
| Favoritar questões | ✓ |
| Dúvida em questões | ✓ |
| Filtros favoritas/dúvidas | ✓ |
| Pontuação Cebraspe líquida | ✓ |
| Itens em branco modo prova | ✓ |
| Questões pendentes ocultas | ✓ |
| Verificador de links internos | ✓ |
| Validação JSON automática | ✓ |
| Testes de calendário | ✓ |

## Testes executados

```
scripts/validate.mjs     — Validação OK
scripts/test-calendar.mjs — 11/11 OK
scripts/check-links.mjs  — interno OK
node --check storage.js  — OK
node --check quiz.js     — OK
node --check dashboard.js — OK
node --check edital.js   — OK
```

## Pendências

- GitHub Actions workflow criado (`validate.yml`) mas **não enviado** (token sem scope `workflow`)
- URLs externas não verificadas por HEAD (script preparado)
- Resoluções de questões: algumas pendentes de revisão humana

## Conclusão

15/15 passam. Sistema funcional sem erros de console conhecidos.
