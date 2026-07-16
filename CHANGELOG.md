# Changelog

## 2026-07-15 — Metodologia de Questões (Fase 1)

### Adicionado
- **Classificação forçada de erros**: ao errar uma questão no modo prática, o usuário é obrigado a selecionar o tipo de erro (teoria, interpretação, atenção, memorização) e escrever uma frase curta explicando o motivo.
- O caderno de erros passa a receber classificações mais úteis para revisão posterior.

### Melhorado
- Fluxo de feedback após erro ficou orientado a aprendizado (active recall).
- Erros agora carregam o motivo real escrito pelo usuário.

### Próximos passos (Fase 2)
- Pré-teste obrigatório antes da teoria
- Hierarquia de prioridade no “Hoje” (erros → fracos → plano)
- Integração mais forte dos erros vencidos no início do dia

---

## 2026-07-10

### Corrigido
- Remoção definitiva de conteúdo de PRF Policial (CTB, trânsito, primeiros socorros, física, geografia rodoviária)
- `cronograma.json` real sem conversão em runtime
- Removido `schedule-fix.js`
- Botão "Ver resultado" (aliases `_daily` / `_level` / `_achievements`)
- Horas só por cronômetro/manual/simulado (não por marcar concluído)
- Domingo/descanso não conta como falta
- Plano exige clique em "Iniciar plano"

### Adicionado
- Edital verticalizado INSS e PRF Administrativo
- Página `edital.html` com cobertura e status por tópico
- Histórico de sessões com editar/excluir
- Migração de schema do localStorage
- Scripts `validate.mjs` e `test-calendar.mjs`
- Workflow GitHub Actions de validação
- Textos de apoio em questões de interpretação
- Resoluções detalhadas em questões oficiais

### Cache
- Service Worker `portal-estudos-v6`
