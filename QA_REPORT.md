# QA_REPORT — 2026-07-14

## Resultado

A biblioteca contém 69 registros normalizados. Nenhum endereço antigo pôde ser autenticado porque o acesso ao YouTube foi bloqueado pela rede institucional; portanto, nenhum vídeo ou playlist foi publicado como disponível.

| Métrica | Quantidade |
|---|---:|
| Total de aulas | 69 |
| Vídeos diretos aprovados | 0 |
| Playlists aprovadas | 0 |
| Indisponíveis | 69 |
| Links efetivamente verificados e aprovados | 0 |
| Candidatos antigos recusados para publicação | 69 |
| Rejeitados conclusivamente | 4 |
| Não verificados por erro de rede | 65 |
| Substituições realizadas | 0 |
| Timeouts | 0 |
| Duplicações legítimas | 0 |
| Grupos de duplicação suspeita antigos corrigidos | 14 (46 usos) |
| Duplicações suspeitas restantes | 0 |

Os quatro candidatos conclusivamente rejeitados são duas ocorrências de `dQw4w9WgXcQ` (`titulo_incompativel`) e duas páginas do Planalto cadastradas como videoaula (`url_invalida`). Os demais 65 candidatos retornaram `erro_de_rede` e não foram aprovados.

## Auditoria por aula

O arquivo `reports/aulas-link-report.json` registra, para cada uma das 69 aulas: ID interno, matéria, assunto, URL avaliada, status final, título e canal reais quando disponíveis, tipo, data, motivo, candidato antigo, URL substituta, escopo e auditoria técnica do candidato. Ele também relaciona os 14 grupos de duplicação suspeita do cadastro anterior, abrangendo 46 usos que foram removidos. `reports/aulas-candidates.json` preserva somente os candidatos anteriores e não é consumido pela aplicação.

Todos os registros finais usam `tipo: indisponivel`, `url: null`, data `2026-07-14` e a nota `Videoaula confiável ainda não selecionada.`

## Validação externa

Foram feitas requisições reais ao endpoint oEmbed do YouTube. O Node retornou `fetch failed` por falha na cadeia TLS. O diagnóstico com `curl` confirmou certificado local não confiável (`curl: (60)`) e, com a desativação de TLS usada somente para diagnóstico, o FortiGate respondeu HTTP 403 com `Application Blocked` para a categoria YouTube. A resposta bloqueada não foi usada como comprovação de nenhum conteúdo.

Nenhum canal, professor ou título foi registrado porque nenhum metadado pôde ser autenticado. Não houve pesquisa nem seleção de substitutos confiáveis sob esse bloqueio.

## Interface e cache

- `url` é a única fonte da interface; `yt` foi removido.
- Vídeos e playlists, quando futuramente aprovados, usam a URL exata, nova aba e `rel="noopener noreferrer"`.
- Indisponíveis exibem `Videoaula ainda não disponível`, sem `<a>` e sem conclusão por clique.
- Hoje, Biblioteca e Matérias foram testados em 1280×800 e 390×844.
- O Service Worker usa `portal-estudos-v12`, remove caches anteriores e mantém navegação e `/data/` em network-first.

## Comandos executados

| Comando | Código | Resultado | Observações |
|---|---:|---|---|
| `node scripts/validate.mjs` | 0 | aprovado | Estrutura, 69 aulas, referências, ausência de pesquisas/`yt`, IDs e cache v12 |
| `node scripts/test-calendar.mjs` | 0 | aprovado | 27 casos aprovados |
| `node scripts/check-links.mjs` | 1 | limitado pela rede | 69 indisponíveis; candidatos: 65 `erro_de_rede`, 2 `titulo_incompativel`, 2 `url_invalida` |
| `node --test tests/check-links.test.mjs` | 0 | aprovado | 7 aprovados, 0 falhos, 0 ignorados; usa `fetch` mockado e não comprova links reais |
| `node --check assets/js/app.js` | 0 | aprovado | Sem erro de sintaxe |
| `node --check assets/js/dashboard.js` | 0 | aprovado | Sem erro de sintaxe |
| `node --check assets/js/biblioteca.js` | 0 | aprovado | Sem erro de sintaxe |
| `node --check assets/js/quiz.js` | 0 | aprovado | Sem erro de sintaxe |
| `npx playwright test` | 0 | aprovado | 43 aprovados, 0 falhos, 0 ignorados; monitora console, respostas e `pageerror` |

## Testes não concluídos

| Teste | Registros afetados | Motivo | Estado atribuído | Impacto |
|---|---:|---|---|---|
| Confirmação externa de disponibilidade, título, canal e compatibilidade | 65 | YouTube bloqueado pelo FortiGate e cadeia TLS local inválida | `indisponivel`; auditoria do candidato em `erro_de_rede` | Nenhum desses links pôde ser publicado |
| Pesquisa de substitutos no YouTube | 69 | Mesmo bloqueio institucional | `indisponivel` | 0 substituições; exige nova execução em rede que permita YouTube |

## Conclusão

As correções estruturais, de interface, testes e cache estão validadas. A missão não é declarada integralmente concluída porque 65 candidatos e a pesquisa de substitutos não puderam ser confirmados externamente. A biblioteca final permanece segura: não contém pesquisas, links inventados nem conteúdo não verificado publicado como disponível.
