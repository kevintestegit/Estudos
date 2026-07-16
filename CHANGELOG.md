# Changelog

## 2026-07-15 — Resoluções fundamentadas

### Reescrito
- **Todas as resoluções do banco PRF** (`questoes-prf.json`): cada item explica o porquê do gabarito e por que as outras alternativas falham, quando aplicável.
- Itens INSS 2016 com comentário genérico ou desalinhado corrigidos via `comentarios-override.json`.
- Resoluções previdenciárias críticas expandidas (segurados, carência, BPC, EC 103, filiação, etc.).

### Infra
- `assets/js/quiz-resolucoes.js` aplica overrides por `id` no momento do questionário.
- Cache-bust `?v=9` em Questões e Simulados.

### Ainda em evolução
- Itens oficiais com enunciado truncado na extração original continuam limitados pelo texto disponível.
- Revisões humanas pontuais de gabarito oficial continuam bem-vindas.

---

## 2026-07-15 — Flags no card + resumos comuns

- Favoritar / marcar dúvida no card da questão
- Resumos Ética, Constitucional e Administrativo

---

## 2026-07-15 — Conteúdo previdenciário

- Resumos + 30 questões CE de lei seca
