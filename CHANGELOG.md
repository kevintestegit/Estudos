# Changelog

## 2026-07-15 — Metodologia de Questões (Fase 1)

### Adicionado
- **Classificação forçada de erros**: ao errar uma questão no modo prática, o usuário é obrigado a selecionar o tipo de erro (teoria, interpretação, atenção, memorização) e escrever uma frase curta explicando o motivo.
- **Erros vencidos em destaque no “Hoje”**: bloco de prioridade máxima no topo da página com a lista dos erros D+1/D+7 e link direto para o Caderno de erros.
- Dica de ordem recomendada do dia (erros → plano → matéria fraca).

### Melhorado
- Fluxo de feedback após erro ficou orientado a aprendizado (active recall).
- O caderno de erros recebe classificações e motivos mais úteis para revisão posterior.
- Hierarquia visual de prioridades no fluxo diário.

### Próximos passos (Fase 2)
- Pré-teste obrigatório antes da teoria
- Bloqueio/aviso mais forte se tentar concluir o dia com erros vencidos pendentes
- Melhoria do algoritmo de flashcards

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
