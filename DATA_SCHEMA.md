# Schema de dados (localStorage)

Chave: `portal-estudos-v1`  
`schemaVersion` atual: **2**

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

## Sessão (`studySessions[]`)

```
id, date, minutes, dayKey, subject, topic, type,
concurso, origin, startedAt, endedAt, taskId, at
```

## Status de dia

`pendente | em_andamento | concluido | faltou | recuperado | atrasada`

## Migração

`Storage.migrate()` normaliza campos ausentes e sessões antigas **sem apagar** progresso.
