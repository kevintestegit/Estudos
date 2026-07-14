# Biblioteca de videoaulas auditável — Especificação

## Objetivo

Normalizar as 69 aulas para vídeo, playlist ou indisponível; publicar somente conteúdo externo cuja disponibilidade, identidade e compatibilidade tenham sido verificadas em 2026-07-14.

## Dados e auditoria

- `url` será a única fonte da interface; `yt` será removido.
- Links antigos são apenas candidatos. Cada um será consultado externamente e aprovado somente se título, canal e assunto forem compatíveis.
- Candidatos ambíguos, removidos, privados, bloqueados ou não consultados serão rejeitados. Sem substituto comprovado, o registro será `indisponivel`, com `url: null` e nota padronizada.
- O relatório por aula registrará candidato antigo, URL avaliada e substituta, estado, evidências, data, duração e motivo.
- Playlists só poderão ser reutilizadas com cobertura e justificativa objetivas.

## Interface

`App.lessonAction()` será a regra compartilhada. Vídeos renderizam `Assistir videoaula`; playlists, `Abrir playlist`; indisponíveis renderizam aviso sem `<a>`. Links usam exatamente `url`, nova aba e `rel="noopener noreferrer"`. Somente cliques em conteúdo disponível registram conclusão.

## Validador

`scripts/check-links.mjs` fará GET real com timeout e redirecionamentos, oEmbed para vídeos e página pública para playlists. Validará esquema, ID, metadados, duplicações e compatibilidade conservadora. Testes unitários usarão `fetch` mockado; a execução CLI real será documentada separadamente.

## Cache, testes e documentação

O Service Worker usará nova versão de cache, removerá versões antigas e manterá JSON em network-first. Testes Node cobrirão estrutura e estados do validador; Playwright cobrirá Hoje, Biblioteca e Matérias em desktop e celular. README e QA registrarão somente resultados e códigos de saída observados.

## Entrega

Um commit será criado somente em `fix/usabilidade-e-confiabilidade`. Não haverá merge nem push automático.
