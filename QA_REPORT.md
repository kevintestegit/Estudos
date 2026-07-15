# QA_REPORT — videoaulas — 2026-07-14

## Resultado

A execução pela rede Wi-Fi publicou 45 vídeos verificados e manteve 24 aulas indisponíveis. Não há playlists, pesquisas genéricas, campo `yt`, duplicações ou links não verificados publicados.

| Métrica | Quantidade |
|---|---:|
| Total de aulas | 69 |
| Vídeos aprovados | 45 |
| Playlists aprovadas | 0 |
| Indisponíveis | 24 |
| Links publicados verificados externamente | 45 |
| Candidatos antigos aprovados | 0 |
| Candidatos antigos rejeitados | 69 |
| Candidatos antigos removidos | 61 |
| Candidatos antigos privados | 0 |
| Candidatos antigos incompatíveis | 2 |
| Candidatos antigos com URL inválida | 2 |
| Substituições aprovadas | 45 |
| Resultados de pesquisa avaliados | 550 |
| Desatualizados comprovados | 0 |
| Erros de rede na validação final | 0 |
| Timeouts na validação final | 0 |
| Candidatos históricos inconclusivos por rede | 4 |
| Duplicações finais | 0 |
| Grupos duplicados antigos removidos | 14 (46 usos) |

## Conectividade

`curl -I -L --max-time 15 https://www.youtube.com/` respondeu HTTP/2 200, sem erro TLS, captcha, consentimento ou bloqueio institucional. Não houve redirecionamento problemático.

O teste do oEmbed respondeu HTTP 200 e JSON com `title` e `author_name` (`Rick Astley`). Esse vídeo foi usado somente para testar conectividade e permanece proibido na biblioteca.

O relatório anterior registrava bloqueio FortiGate. Esse é apenas o histórico da primeira execução; a validação atual ocorreu com sucesso pelo Wi-Fi.

## Processo e evidências

- Os 69 candidatos antigos foram consultados novamente: 61 retornaram HTTP 404 no oEmbed, quatro receberam uma resposta HTTP 200 de bloqueio/consentimento e ficaram como `erro_de_rede`, duas ocorrências de `dQw4w9WgXcQ` foram incompatíveis e duas páginas do Planalto eram URLs inválidas como videoaula. Nenhum candidato histórico está publicado.
- Foram executadas 69 pesquisas específicas no YouTube e avaliados 550 resultados com título, canal, descrição visível, duração e data exibida.
- Os 45 selecionados foram consultados novamente no oEmbed e na página pública. Título e canal coincidiram em 45/45; duração e data foram obtidas em 45/45.
- A revalidação externa final gerou o relatório em `2026-07-15T10:33:31.807Z`, mantendo 45 `ok` e 24 `indisponivel`.
- `aula-pt-01` foi substituída por `B1lk04l-dRU` após relato de falha de acesso ao vídeo anterior. O substituto respondeu HTTP 200, `playabilityStatus: OK` e oEmbed com título e canal em 2026-07-14.
- A consulta às legendas públicas retornou corpo vazio e não foi usada como evidência de aprovação.
- Os 24 casos ambíguos permaneceram com `tipo: indisponivel` e `url: null`.

Os detalhes por aula estão em `reports/aulas-link-report.json`; consultas, alternativas e motivos ficam em `reports/aulas-research.json`. Os endereços históricos permanecem em `reports/aulas-candidates.json` e não são consumidos pela aplicação.

## Canais

Foram usados 28 canais identificados, incluindo Estratégia Concursos, Gran Cursos Online, Nova Concursos, TecConcursos, Cursos do Portal, FZ Concursos, IMP Concursos, Carranza Cursos, professores especializados e canais educacionais consolidados. O nome exato retornado pelo oEmbed consta em cada registro.

## Interface e cache

- `url` continua sendo a única fonte da interface.
- Vídeos usam `Assistir videoaula`, URL exata, nova aba e `rel="noopener noreferrer"`.
- Indisponíveis continuam sem `<a>` e sem conclusão por clique.
- O Service Worker usa `portal-estudos-v16`; durante `activate`, somente caches anteriores do portal, inclusive v15, são removidos. Caches de outras aplicações são preservados.
- A URL exata de `unit.js?v=1` e `data/unidades.json` entram no precache para permitir a primeira abertura offline da unidade piloto após a ativação.
- Navegação e `/data/` continuam em network-first.

## Correções de confiabilidade

- Abrir teoria ou material não conclui mais a etapa. Teoria e leitura exigem ação explícita; a prática é concluída pelo questionário vinculado.
- Um dia com etapa obrigatória pendente não pode ser concluído.
- Backup inválido não substitui o progresso; JSON local corrompido pode ser baixado para recuperação.
- O Caderno de erros agrupa reincidências por questão. A fila de revisão preserva data e link acionável.
- As 11 questões PRF que usavam `Língua Portuguesa` agora usam a matéria canônica `Português`.
- Aulas e PDFs previdenciários aparecem no filtro INSS; assuntos administrativos e de Arquivologia são classificados no filtro PRF.
- Três URLs HTTP 404 foram substituídas após GET real: primeira retificação INSS 2022 (Cebraspe), acordos internacionais previdenciários (Ministério da Previdência) e referência oficial do concurso PRF Agente Administrativo 2014 (Ministério da Gestão).
- HTTP 403 do YouTube passa a ser `nao_verificado`, não prova de conteúdo privado. Playlists são consultadas por GET na página pública.
- Navegação expõe `aria-current`, menu móvel expõe `aria-expanded`, existe link de salto, barras de edital usam `progressbar` e movimentos respeitam `prefers-reduced-motion`.
- Páginas carregam apenas os JSON consumidos. O deploy executa a suíte antes de publicar.
- A suíte Playwright usa relógio determinístico. Uma execução iniciada após a virada para 2026-07-15 expôs dez testes presos a 2026-07-14; após isolar o relógio, a repetição completa passou.

## Comandos finais

| Comando | Código | Resultado |
|---|---:|---|
| `node scripts/validate.mjs` | 0 | Estrutura e cache aprovados |
| `node scripts/test-calendar.mjs` | 0 | 27 casos aprovados |
| `node scripts/check-links.mjs` | 0 | 45 `ok`, 24 `indisponivel` |
| `node --test tests/check-links.test.mjs` | 0 | 16 aprovados, 0 falhos, 0 ignorados |
| `node --check assets/js/app.js` | 0 | Sintaxe aprovada |
| `node --check assets/js/dashboard.js` | 0 | Sintaxe aprovada |
| `node --check assets/js/biblioteca.js` | 0 | Sintaxe aprovada |
| `node --check assets/js/quiz.js` | 0 | Sintaxe aprovada |
| `npx playwright test` | 0 | 67 aprovados, 0 falhos, 0 ignorados |
| `npm test` (antes de isolar o relógio) | 1 | 57 Playwright aprovados e 10 falhos por dependência da data corrente |
| `npx playwright test tests/portal.spec.js --workers=2` | 0 | 54 aprovados após estabilizar a data |
| `npm test` | 0 | Suíte agregada aprovada; 67 testes Playwright aprovados |
| `git diff --check` | 0 | Nenhum erro |

## Limitações

Não foi possível confirmar conteúdo por transcrição. A aprovação usa somente as evidências efetivamente obtidas: pesquisa específica, página pública, título, canal, descrição visível, duração, data e oEmbed. Registros cuja cobertura integral ou atualidade permaneceu ambígua não foram publicados.
