# QA_REPORT — 2026-07-13

## Resultado

O portal permanece estático, sem backend ou banco remoto. A persistência usa somente `localStorage` na chave `portal-estudos-v1`, com migração automática para o schema 4.

## Páginas verificadas no navegador (13/13)

`index.html`, `hoje.html`, `cronograma.html`, `edital.html`, `biblioteca.html`, `materias.html`, `questoes.html`, `flashcards.html`, `simulados.html`, `provas.html`, `caderno-erros.html`, `progresso.html` e `backup.html` abriram sem exceção de página, erro de console ou mensagem de falha de carregamento.

## Cobertura implementada

- Primeiro acesso e normalização da data inicial.
- Calendário útil, descanso, datas futuras, viradas de mês/ano e ano bissexto.
- Cronômetro, registro manual, conclusão normal, recuperação e mesclagem sem misturar datas.
- Dias parciais quando há atividade real sem conclusão.
- Questões corretas, incorretas e em branco no modo prova.
- Configuração de pontuação Cebraspe.
- Biblioteca sem filtro, por matéria, por tipo, busca, limpeza e filtros legados úteis.
- Dashboard, Matérias e roteiro sequencial da tela Hoje.
- Exportação, importação validada e migração de backup.
- Menu móvel, ausência de rolagem horizontal e foco de modal.
- Atualização do Service Worker do cache v10 para v11.

## Testes executados

```text
node scripts/validate.mjs                         — OK
node scripts/test-calendar.mjs                    — 27 casos OK
node scripts/check-links.mjs --internal-only      — 40 OK, 0 WARN, 0 FAIL
node --check assets/js/*.js                       — OK em todos os arquivos
npm run test:e2e                                  — 35 testes de navegador OK
```

Smoke em Chromium móvel com `python3 -m http.server 3050 --directory .`:

```text
hoje.html        — HTTP 200, 0 erros, sem overflow
biblioteca.html  — HTTP 200, 0 erros, sem overflow
materias.html    — HTTP 200, 0 erros, sem overflow
questoes.html    — HTTP 200, 0 erros, sem overflow
cronograma.html  — HTTP 200, 0 erros, sem overflow
progresso.html   — HTTP 200, 0 erros, sem overflow
```

## Pendências editoriais reais

- Resumos e PDFs que não existem não foram inventados; permanecem identificados como indisponíveis e apontam para a Biblioteca ou para fonte oficial. Produzir esses arquivos exige trabalho editorial.
- Videoaulas diretas sem metadados confirmáveis foram substituídas por busca contextual de matéria e assunto. Escolher e validar vídeos específicos exige revisão humana de conteúdo externo.
- Gabaritos e resoluções existentes passaram nas validações estruturais, mas a correção pedagógica integral do banco de questões ainda depende de especialista nas disciplinas.

## Conclusão

As validações automatizadas e o smoke local não encontraram erro de execução conhecido. O relatório registra apenas funcionalidades cobertas por teste ou validação.
