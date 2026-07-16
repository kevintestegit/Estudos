# Ordem de correções da plataforma

**Objetivo:** estabilizar o comportamento existente antes de publicar a unidade piloto de Português — Interpretação de textos.

## 1. Fonte única e auditável de videoaulas

- validar o conjunto efetivamente exibido pela interface, incluindo as 24 atualizações hoje aplicadas em runtime;
- manter como `indisponivel` qualquer recurso que não passe pela verificação externa e pedagógica;
- incorporar os aprovados em `data/aulas.json`;
- remover `data/aulas-patch.json` e `assets/js/aulas-patch.js`;
- fazer interface, validador, relatório e documentação consumirem a mesma fonte;
- rejeitar duplicações sem justificativa registrada.

**Conclusão:** `data/aulas.json` é novamente a única fonte e `check-links.mjs` valida exatamente o conjunto publicado.

## 2. Progresso correto no fluxo legado

- impedir conclusão automática ou manual da etapa de vídeo quando o conteúdo estiver indisponível;
- bloquear prática até as etapas obrigatórias anteriores serem concluídas;
- preservar a navegação livre como ação separada do progresso do cronograma;
- adicionar regressões automatizadas para o dia atual e para um dia escolhido.

**Conclusão:** indisponibilidade nunca equivale a aprendizagem e não é possível pular a sequência obrigatória.

## 3. Unidade piloto

- finalizar o plano existente em `2026-07-15-unidade-piloto-interpretacao.md`;
- publicar somente leitura, trecho de vídeo, checagem e questões com objetivos e fontes confirmados;
- usar máquina de estados por `unitId`;
- preservar todas as tentativas;
- concluir apenas após correção e revisão persistidas.

**Conclusão:** a primeira unidade executa integralmente leitura → vídeo → checagem → prática → correção → revisão.

## 4. Consolidação técnica

- eliminar substituições sucessivas de funções globais quando a regra puder viver no módulo canônico;
- unificar catálogos de resumos e recursos duplicados;
- preservar a arquitetura estática, o `localStorage` e a compatibilidade dos dados existentes;
- atualizar o Service Worker para armazenar todos os recursos necessários ao fluxo offline.

**Conclusão:** o comportamento não depende da ordem de patches e online/offline usam o mesmo conjunto funcional.

## 5. Publicação, testes e documentação

- publicar no GitHub Pages apenas arquivos necessários ao site;
- executar a validação externa separadamente dos testes mockados;
- tornar erros de console e `pageerror` falhas de teste;
- testar fonte efetiva de aulas, transições, retomada, mobile, cache e coerência pedagógica;
- alinhar README, schema e QA ao comportamento realmente executado.

**Conclusão:** testes, artefato publicado e documentação descrevem o mesmo sistema.

## Regra de execução

Cada fase segue teste falhando → correção mínima → teste passando → bateria de regressão. Nenhuma fase posterior justifica publicar dados não validados ou esconder uma pendência editorial.
