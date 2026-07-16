# Changelog

## 2026-07-15 — Conteúdo + fluxo (pendências)

### Adicionado
- **5 resumos objetivos novos de Previdenciário**: custeio, regras de transição (EC 103), salário de contribuição, dependentes e filiação/inscrição.
- **12 questões CE novas** em `questoes-prev.json` (total 30) cobrindo os novos tópicos.
- Catálogo `pdfs.json` atualizado com os novos resumos (tipo `resumo`).

### Melhorado
- Label de material do tipo `resumo`: "Abrir resumo objetivo".
- Storage e filtros de **favoritos / dúvida** já existiam; uso no fluxo de estudo permanece disponível via filtro em Questões.
- Checklist de finalização do dia: etapas obrigatórias + revisões vencidas (bloqueio/confirmação).
- Pontuação CEBRASPE configurável nos simulados (já disponível).

### Ainda pendente (honesto)
- Volume maior de questões **oficiais** CEBRASPE de conhecimentos específicos
- Resoluções 100% revisadas item a item por humanos
- SM-2 nos flashcards
- IndexedDB (migração completa)

---

## 2026-07-15 — Metodologia de Questões (Fase 1) ✅

### Adicionado
- **Classificação forçada de erros**: ao errar no modo prática, é obrigatório selecionar o tipo (teoria, interpretação, atenção, memorização) e escrever por que errou.
- **Erros vencidos em destaque no “Hoje”**: bloco de prioridade máxima no topo com lista e link para o Caderno de erros.
- **Pré-teste obrigatório**: 3 questões antes de liberar a etapa de teoria de cada tarefa.
- **Confirmação ao concluir o dia** se ainda houver revisões vencidas pendentes.
- Ordem recomendada do dia (erros → pré-teste/plano → matéria fraca).
- `nextAction` do dashboard prioriza revisões vencidas.

### Melhorado
- Fluxo de estudo orientado a active recall.
- Caderno de erros com classificações e motivos úteis.
- Hierarquia visual de prioridades no fluxo diário.

### Próximos (Fase 2+)
- Melhorar algoritmo de flashcards (SM-2)
- Conteúdo teórico mínimo de qualidade por tópico
- Interleaving nas semanas finais

---

## 2026-07-10

### Corrigido
- Remoção definitiva de conteúdo de PRF Policial
- `cronograma.json` real sem conversão em runtime
- Horas só por atividade real
- Plano exige clique em "Iniciar plano"

### Adicionado
- Edital verticalizado, validadores, testes e GitHub Actions
- Textos de apoio e resoluções em questões oficiais
