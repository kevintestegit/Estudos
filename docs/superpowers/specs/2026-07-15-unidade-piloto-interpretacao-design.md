# Unidade piloto — Português: Interpretação de textos

## Escopo

Transformar somente a primeira tarefa do cronograma, hoje identificada por
`aula-pt-01`, em uma unidade completa dentro de `hoje.html`. As outras 95
jornadas permanecem no fluxo existente até que o piloto seja validado.

O portal continua estático, publicado no GitHub Pages e persistindo o progresso
na chave histórica `portal-estudos-v1` do `localStorage`. Não serão adicionados
backend, autenticação, banco de dados ou dependências de produção.

## Diagnóstico confirmado

- `data/cronograma.json` vincula o primeiro dia a Português — Interpretação de
  textos, `aula-pt-01`, `pdf-pt-01` e `portugues-interpretacao`.
- `pdf-pt-01` está indisponível; não existe leitura-base dentro do portal.
- `assets/js/dashboard.js` apresenta três etapas: aprender, ler e praticar.
- `taskStatus` usa data e posição da tarefa; não representa estados pedagógicos
  estáveis de uma unidade.
- `assets/js/quiz.js` mantém a tentativa corrente apenas em memória. Ao recarregar
  a página, respostas intermediárias desaparecem.
- O quiz agrega acertos e erros ao final, mas não preserva o histórico completo
  de tentativas por unidade e objetivo.
- `Storage.addErro()` e as revisões D+1, D+7 e D+30 já funcionam e serão
  reutilizadas.
- O vídeo `B1lk04l-dRU` foi confirmado por oEmbed como público, com título
  “PORTUGUÊS PARA CONCURSOS: INTERPRETAÇÃO DE TEXTO” e canal “FZ Concursos”. A
  página pública informou duração de 1.959 segundos e publicação em 2024.
- A API pública de legenda identificou legenda automática, mas não devolveu seu
  conteúdo na consulta realizada. O trecho só será publicado após inspeção
  manual que confirme início, fim e cobertura dos objetivos.
- O caderno e o gabarito definitivo oficiais do INSS 2022 confirmam os itens de
  Português existentes em `data/questoes-inss.json`.

## Decisão de arquitetura

Será criado um motor de unidade pequeno e genérico, ativado em `renderHoje()`
quando a tarefa possuir `unitId`. O motor renderiza a jornada dentro da página
Hoje e usa o shell, estilos, armazenamento e quiz já existentes.

O conteúdo editorial do piloto ficará em um único `data/unidades.json`. Um
arquivo único evita referências cruzadas e requisições extras para a primeira
unidade. A divisão por matéria só será considerada quando o volume tornar esse
arquivo difícil de revisar.

As questões reais permanecem nos bancos atuais. Cada questão selecionada será
enriquecida em seu próprio registro com `unitIds`, `objetivos`, concurso, ano,
dificuldade, URL da prova, URL do gabarito e estado de verificação. A unidade
referenciará essas questões por ID; não duplicará enunciados ou gabaritos.

## Objetivos do piloto

- `pt-int-compreensao-explicita`: localizar e comparar informações declaradas
  no texto sem acrescentar conclusões externas.
- `pt-int-inferencia-valida`: distinguir inferências autorizadas de inversões,
  generalizações e relações causais não afirmadas.
- `pt-int-coesao-referencial`: identificar referentes e relações de retomada
  que mantêm a continuidade do texto.

Os objetivos são estáveis, descritivos e independentes da posição das listas.

## Modelo editorial

`data/unidades.json` conterá uma coleção `unidades`. A unidade piloto possuirá:

- `id`, `materia`, `assunto`, `titulo` e `objetivos`;
- leitura interna de 5 a 12 minutos, com seções identificadas, exemplos, pontos
  chave, armadilhas de banca e fontes;
- vídeo referenciado por `aulaId`, duração total confirmada, trecho confirmado,
  objetivos cobertos, motivo pedagógico e data da verificação;
- de três a cinco questões autorais de checagem, com feedback imediato e
  referência à seção de leitura;
- IDs das questões reais aprovadas e quantidade editorial mínima;
- configuração de correção e revisão;
- `statusEditorial`, que só poderá ser `publicada` sem erros bloqueantes.

A leitura será autoral e didática. Ela não reproduzirá obras protegidas além do
necessário para exemplos breves e indicará as fontes consultadas. A checagem
será marcada como autoral; questões do INSS serão marcadas como reais e terão
as URLs oficiais da prova e do gabarito.

## Fluxo na página Hoje

O piloto substitui visualmente o roteiro antigo somente na primeira tarefa:

1. leitura guiada;
2. trecho da videoaula;
3. checagem rápida;
4. prática com questões reais;
5. correção dos erros;
6. agendamento de revisão e conclusão.

Todas as etapas permanecem visíveis. Somente a etapa ativa exibe uma ação
principal. Etapas futuras ficam bloqueadas com a descrição objetiva da
pré-condição. Etapas concluídas podem ser reabertas para consulta sem regredir o
estado ou apagar tentativas.

A leitura é concluída apenas pelo botão “Concluir leitura”. O vídeo incorporado
usa o trecho validado; iniciar ou abrir o player não altera estado. A conclusão
ocorre somente pelo botão “Concluir videoaula”, conforme decisão aprovada pelo
usuário.

Checagem e prática são concluídas apenas depois de responder todas as questões
da tentativa. Recarregar a página restaura a questão e as respostas salvas. A
correção exige revisar todos os erros da tentativa; quando não houver erros, a
etapa registra explicitamente esse resultado. A unidade termina somente depois
que a regra de revisão produzir um registro persistido.

## Máquina de estados

Estados persistidos:

```text
nao_iniciada
leitura_em_andamento
leitura_concluida
video_em_andamento
video_concluido
checagem_em_andamento
checagem_concluida
pratica_em_andamento
pratica_concluida
correcao_pendente
correcao_concluida
revisao_agendada
concluida
```

Eventos válidos:

| Evento | Pré-condição | Próximo estado |
|---|---|---|
| `iniciar_leitura` | `nao_iniciada` | `leitura_em_andamento` |
| `concluir_leitura` | leitura aberta | `leitura_concluida` |
| `iniciar_video` | leitura concluída | `video_em_andamento` |
| `concluir_video` | vídeo em andamento | `video_concluido` |
| `iniciar_checagem` | vídeo concluído | `checagem_em_andamento` |
| `concluir_checagem` | todas as respostas registradas | `checagem_concluida` |
| `iniciar_pratica` | checagem concluída | `pratica_em_andamento` |
| `concluir_pratica` | todas as respostas registradas | `pratica_concluida` ou `correcao_pendente` |
| `concluir_correcao` | todos os erros revisados ou nenhum erro | `correcao_concluida` |
| `agendar_revisao` | correção concluída | `revisao_agendada` |
| `concluir_unidade` | revisão persistida | `concluida` |

Eventos fora de ordem são rejeitados sem alterar o armazenamento. Erros de
carregamento ou persistência mantêm o estado anterior e mostram uma mensagem
recuperável. Reabrir conteúdo concluído é uma ação de consulta, não uma
transição.

## Persistência e migração

O schema local sobe de 4 para 5 e acrescenta:

```json
{
  "unitProgress": {
    "unidade-pt-interpretacao-01": {
      "state": "checagem_em_andamento",
      "updatedAt": "data ISO",
      "reading": { "startedAt": "data ISO", "completedAt": null },
      "video": { "startedAt": "data ISO", "completedAt": null },
      "activeAttemptId": "identificador ou null"
    }
  },
  "unitAttempts": [],
  "unitReviews": []
}
```

Cada tentativa armazena ID, unidade, tipo (`checagem` ou `pratica`), número,
datas, respostas, resultado, duração e desempenho por objetivo. Tentativas são
somente acrescentadas; uma nova tentativa nunca sobrescreve a anterior.

Revisões armazenam unidade, objetivos, data agendada, motivo e estado. Como o
portal não possui login, `userId` será omitido em vez de receber valor
inventado. Erros de questões continuarão também no caderno existente, agora
com `unitId`, objetivos e classificação escolhida pelo usuário entre conceitual,
interpretação e atenção.

A migração adiciona coleções vazias e preserva todos os campos antigos. A chave
`portal-estudos-v1` permanece a mesma.

## Checagem e prática

A checagem terá de três a cinco questões autorais, diretamente derivadas da
leitura. Cada resposta gera feedback imediato, referência de seção e registro
persistente.

A prática inicial usará cinco itens confirmados no caderno e no gabarito
definitivo oficiais do INSS 2022:

- `inss-2022-i1`: inferência causal indevida;
- `inss-2022-i2`: comparação de informações explícitas;
- `inss-2022-i4`: conclusão não sustentada pelo texto;
- `inss-2022-i5`: recomendação indevidamente atribuída ao texto;
- `inss-2022-i7`: retomada lexical e coesão referencial.

Itens de ortografia, pontuação, sintaxe ou tipologia não serão selecionados
apenas por compartilharem a tag atual.

Se menos de cinco itens forem aprovados, a unidade exibirá a quantidade real e
uma pendência editorial. Isso não bloqueia o estudante, mas impede
`statusEditorial: publicada` até que o critério editorial seja atendido.

## Correção e revisão

A correção agrupa respostas incorretas por objetivo. Cada cartão mostra resposta
original, gabarito, resolução, seção da leitura e trecho do vídeo quando houver
evidência confirmada. O usuário classifica o erro e pode iniciar nova tentativa;
a tentativa original permanece imutável.

A primeira revisão será agendada conforme desempenho:

- objetivo com erro na checagem ou prática: dia seguinte;
- objetivo correto somente após mais de uma tentativa: três dias;
- objetivo sem erro: sete dias;
- reincidência futura poderá antecipar a próxima revisão, sem alterar o histórico.

O motivo será gerado a partir das contagens reais, por exemplo “2 erros em
inferência na prática”. Não haverá texto de motivo inventado ou genérico quando
os dados não existirem.

## Validação editorial

Um novo script validará IDs, referências, objetivos, cobertura, questões,
fontes, timestamps, correção, revisão e etapas obrigatórias. Seu relatório terá
`erros`, `avisos`, `pendenciasEditoriais` e `dadosNaoVerificados` por unidade.

São bloqueantes: referência quebrada, ID duplicado, objetivo inexistente,
objetivo sem leitura, vídeo ou checagem, timestamp inválido, fonte ausente,
questão de outro assunto, correção ausente, revisão ausente ou etapa obrigatória
sem conteúdo. Quantidade insuficiente de questões reais é pendência editorial e
impede publicação, mas não impede uso explícito como piloto em validação.

O validador não fará análise pedagógica automática por semelhança textual. Os
vínculos serão explícitos e a aprovação final de cobertura continuará humana.

## Arquivos previstos

- Criar `data/unidades.json`: fonte única da unidade piloto.
- Criar `assets/js/unit.js`: máquina de estados e interface da unidade.
- Criar `scripts/validate-units.mjs`: coerência estrutural e editorial.
- Criar `tests/unit-flow.spec.js`: fluxo, retomada, bloqueios, mobile e teclado.
- Modificar `data/cronograma.json`: adicionar `unitId` à primeira tarefa.
- Modificar `data/questoes-inss.json`: enriquecer somente as questões aprovadas.
- Modificar `assets/js/storage.js`: schema 5, tentativas, estados e revisões.
- Modificar `assets/js/dashboard.js`: encaminhar a primeira tarefa ao motor.
- Modificar `assets/js/quiz.js`: permitir sessão incorporada e persistida sem
  alterar o comportamento dos questionários existentes.
- Modificar `hoje.html`: carregar o motor e o quiz reutilizado.
- Modificar `assets/css/style.css`: estados da jornada, leitura e correção.
- Modificar `scripts/validate.mjs` e `package.json`: incluir a nova validação.
- Modificar `service-worker.js`: cache novo e novos recursos.
- Modificar `README.md`, `DATA_SCHEMA.md` e `QA_REPORT.md`: documentar o padrão e
  somente resultados realmente executados.

## Testes e critérios de conclusão

- Validador da unidade sem erro bloqueante.
- IDs e referências únicos e válidos.
- Todos os objetivos cobertos por leitura, vídeo, checagem e prática.
- Trecho do vídeo confirmado manualmente e com timestamps válidos.
- Histórico completo de tentativas preservado após repetição e recarga.
- Uma única ação principal ativa; etapas futuras visíveis e bloqueadas.
- Abertura da leitura ou do vídeo não conclui etapa.
- Prática somente com questões e gabaritos oficialmente confirmados.
- Correção agrupada por objetivo e revisão efetivamente persistida.
- Migração do schema 4 para 5 sem perda de campos antigos.
- Fluxo desktop e mobile sem erros de console ou `pageerror`.
- Testes existentes permanecem aprovados.
- Cache anterior removido e novos dados atualizáveis por network-first.

## Fora do escopo

- Converter automaticamente as outras 95 jornadas.
- Adicionar conta, sincronização remota ou banco de dados.
- Rastrear automaticamente segundos assistidos pela YouTube Player API.
- Criar recomendação adaptativa geral para matérias ainda não modeladas.
- Tratar tags amplas como prova de coerência pedagógica.
