# Usabilidade e Confiabilidade do Portal — Especificação

## Objetivo

Corrigir o portal estático de estudos para que uma estudante com pouca familiaridade digital consiga identificar o estudo do dia, executar a próxima ação e confirmar a conclusão sem perder o progresso existente.

## Restrições

- Publicação estática no GitHub Pages.
- HTML, CSS e JavaScript puro, sem framework.
- Sem backend, API, login, banco de dados ou sincronização remota.
- Persistência exclusivamente no `localStorage`, sob a chave `portal-estudos-v1`.
- Backup e restauração manuais por arquivo JSON.
- Compatibilidade com dados antigos, desktop, celular e funcionamento offline atual.
- IDs de conteúdo preservados, salvo quando uma referência comprovadamente inválida exigir correção.
- `index.html` permanece como Dashboard; `hoje.html` continua sendo a tela principal da estudante e a abertura da PWA.

## Estratégia

A implementação será feita em três camadas, sempre deixando uma verificação executável:

1. Regras compartilhadas de calendário, atividade, recuperação, migração e materiais.
2. Fluxos e apresentação de Hoje, Dashboard, Matérias, Biblioteca, Quiz, Backup e navegação.
3. Testes de navegador, validações estáticas, acessibilidade, Service Worker e relatório de QA.

## Fundações e dados locais

O schema sobe de 3 para 4 para preencher campos novos sem apagar sessões, questões, erros, simulados, estados de tarefas, edital ou flashcards.

As regras compartilhadas serão centralizadas:

- `normalizeStartDate(startDate, studyDays)` retorna o primeiro dia habilitado igual ou posterior à data escolhida.
- `getDayActivity(date, progress)` consolida minutos, questões, revisões, tarefas e resumo diário.
- `getDayStatus(date, progress)` determina `pendente`, `em_andamento`, `parcial`, `concluido`, `faltou` ou `recuperado` a partir da atividade real.
- Sessões registram `date` como data real do estudo e `dayKey` como data do cronograma cumprida.
- Chaves de tarefas usam a data de origem do cronograma, inclusive em recuperação e mesclagem.
- A importação de backup valida forma e tipos essenciais, migra e só então substitui o progresso.

A lógica pura de calendário será reutilizada no navegador e nos testes Node, sem manter implementações divergentes.

## Materiais e aulas

Materiais terão tipo explícito. `paginas` será numérico apenas para PDF real e `null` para legislação, página oficial ou recurso ainda indisponível.

Uma função compartilhada definirá rótulos honestos:

- Assistir aula.
- Abrir PDF.
- Consultar legislação.
- Abrir fonte oficial.
- Fazer questões.

Videoaulas usarão primeiro a URL da aula específica associada à tarefa. Na ausência de URL específica confirmada, usarão um fallback confirmado da matéria ou busca do YouTube por matéria e assunto. URLs arbitrárias, incluindo `dQw4w9WgXcQ`, serão removidas. Nenhum vídeo ou PDF será inventado.

## Navegação e interface

A navegação apresentará cinco grupos principais:

- Hoje.
- Meu plano.
- Questões.
- Meu progresso.
- Mais.

Todos os destinos atuais permanecerão acessíveis. No celular, o menu lateral fechará depois de uma seleção. “Hoje” terá maior destaque e nenhum ícone será usado sem texto.

A tela Hoje será um roteiro sequencial:

1. Aprender o conteúdo.
2. Ler ou revisar.
3. Praticar.
4. Finalizar.

A primeira etapa pendente será destacada, e o estado persistirá ao recarregar. Cronômetro, registro manual, revisões e recuperação ficarão em blocos recolhíveis. “Dispensar” será secundário.

O Dashboard priorizará dias estudados, horas da semana, questões respondidas e percentual de acertos. Próxima ação, maior dificuldade e pendências virão depois. XP, nível e demais indicadores ficarão em detalhes recolhíveis.

Biblioteca e Matérias mostrarão filtros ativos, opção de limpar, busca e estados vazios explicativos. A página Matérias exibirá grupo, assuntos, aulas, fontes/PDFs reais, questões, acertos, última data e ações.

## Recuperação e estados diários

`studyDate` representará a data real em que a pessoa estudou. `scheduleDate` representará a data do cronograma cumprida.

Ao recuperar um dia:

- O tempo conta em `studyDate`.
- A sessão usa `dayKey: scheduleDate`.
- Tarefas e resumo do cronograma usam `scheduleDate`.
- O dia antigo recebe `recuperado`.
- O dia atual não recebe conclusão indevida.
- O histórico identifica a recuperação.

Ao mesclar, as tarefas atuais e recuperadas serão apenas apresentadas juntas. Cada tarefa conservará sua data de origem e o fechamento atualizará apenas o grupo correspondente.

Um dia passado programado sem atividade será `faltou`. Com atividade real e sem conclusão será `parcial`. O dia atual iniciado será `em_andamento`. Dias parciais poderão ser retomados ou concluídos.

## Questões e simulados

No modo prova, cada questão terá três estados: respondida, em branco e ainda não visitada. A ação “Deixar em branco” permitirá avançar explicitamente.

O resultado exibirá acertos, erros, brancos e percentual. Questões em branco não serão enviadas ao caderno de erros nem contabilizadas como erro. Cada item mostrará escolha, gabarito, resultado e resolução.

Para provas integralmente Cebraspe, a pontuação usará `cebraspeConfig`, com valores configuráveis para acerto, erro e branco. A interface deixará claro que o cálculo depende da configuração escolhida.

## Backup e migração

Progresso e Backup mostrarão a última exportação ou “nunca”. Uma exportação bem-sucedida atualizará `lastBackupAt`.

A importação exigirá objeto compatível, confirmação antes da substituição, migração e recarga. A exclusão informará que apaga apenas o navegador atual e não executará chamadas posteriores desnecessárias.

Não existe armazenamento remoto: perder os dados do navegador sem um backup JSON continuará sendo uma limitação real e será comunicada à usuária.

## Acessibilidade e celular

- Controles interativos terão pelo menos 44 px.
- Labels serão associados aos campos.
- Foco será visível.
- Modais terão papel semântico, foco inicial, Escape, restauração de foco e contenção de teclado.
- Tabelas extensas usarão contêiner com rolagem horizontal indicada no celular.
- Ações perigosas ficarão visualmente separadas.
- Não haverá rolagem horizontal desnecessária na página.

## Verificação

Testes puros cobrirão calendário, normalização, atividade diária, estados, recuperação, sequência, dias de descanso, datas futuras, mudanças de início, viradas de período e migração.

`validate.mjs` verificará referências, IDs, dados, questões, simulados, materiais, aulas duplicadas suspeitas e padrões de HTML/CSS inválido.

Playwright será a única dependência nova. Cada teste terá `localStorage` isolado e falhará com exceções de página, erros inesperados de console ou mensagens de falha de carregamento. Serão cobertas todas as páginas solicitadas, os fluxos críticos e viewport móvel.

O Service Worker passará de `portal-estudos-v10` para `portal-estudos-v11`, preservando `network-first` para navegação e JSON. O relatório de QA só registrará resultados realmente executados.

## Limitações declaradas

- Links externos exigem verificação humana quando sua identidade não puder ser confirmada com segurança.
- Resumos e PDFs inexistentes não serão produzidos nem anunciados como disponíveis.
- O modo offline continua limitado aos arquivos previamente armazenados pelo Service Worker.
- O progresso não é sincronizado entre dispositivos; o transporte depende do backup JSON.
