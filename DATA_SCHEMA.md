# Schema de dados (localStorage)

Chave: `portal-estudos-v1`  
`schemaVersion` atual: **5**

## Campos principais

| Campo | Tipo | Descrição |
|-------|------|-----------|
| schemaVersion | number | Versão do schema |
| startDate | string\|null | Início do plano (ISO) |
| studyDays | number[] | 0=dom … 6=sáb |
| dayStatus | object | data → status |
| studySessions | array | Sessões reais de tempo |
| quiz | object | Totais e bySubject |
| dailyQuiz | object | Totais por dia |
| erros | array | Caderno de erros |
| simulados | array | Histórico |
| goals | object | Meta diária |
| timer | object\|null | Cronômetro persistente |
| recoveryTarget | object\|null | Recuperação ativa |
| editalProgress | object | id tópico → status |
| flashcards | object | Estado SRS |
| taskStatus | object | Estado das etapas, indexado pela data do cronograma |
| unitProgress | object | Estado pedagógico de cada unidade, indexado por ID estável |
| unitAttempts | array | Histórico append-only das tentativas de checagem e prática |
| unitReviews | array | Revisões futuras agendadas por unidade e objetivo |
| dailySummary | object | Resumo de conclusão por data do cronograma |
| cebraspeConfig | object | Valores configuráveis de acerto, erro e branco |
| lastBackupAt | string\|null | Data e hora ISO da última exportação |

## Sessão (`studySessions[]`)

```
id, date, minutes, dayKey, subject, topic, type,
concurso, origin, startedAt, endedAt, taskId, at
```

## Status de dia

`pendente | em_andamento | parcial | concluido | faltou | recuperado`

## Jornada de unidade

`unitProgress[unitId]` registra o estado atual, datas de início e conclusão da
leitura e do vídeo e a tentativa ativa. `unitAttempts[]` preserva cada tentativa,
suas respostas, resultado, duração e desempenho por objetivo. `unitReviews[]`
registra objetivo, data agendada, motivo e estado da revisão.

Uma resposta errada de prática só é considerada corrigida após receber
`correction.classification` (`conceitual`, `interpretacao` ou `atencao`),
`classifiedAt` e `reviewedAt`. Esses campos são anexados sem substituir a
resposta original.

As transições são explícitas. Eventos fora de ordem não alteram o armazenamento;
abrir ou iniciar um recurso não conclui a etapa correspondente.

## Migração

`Storage.migrate()` normaliza campos ausentes e sessões antigas **sem apagar** progresso. A migração 4 → 5 acrescenta `unitProgress: {}`, `unitAttempts: []` e `unitReviews: []`. A chave histórica `portal-estudos-v1` foi mantida. Sessões, questões, erros, simulados, estados de tarefa e demais dados conhecidos são preservados; os campos novos recebem valores padrão.
