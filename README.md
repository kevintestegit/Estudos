# Portal de Estudos — INSS + PRF Administrativo

Portal estático para preparação dos concursos **INSS Técnico do Seguro Social** e **PRF Agente Administrativo**.

Publicação: https://kevintestegit.github.io/Estudos/

## Como executar localmente

```bash
cd Estudos
python3 -m http.server 3050 --directory .
# ou: ./iniciar.sh
```

Abra: http://localhost:3050

> JSON e módulos precisam de servidor HTTP (não use `file://`).

## Stack

- HTML, CSS e JavaScript puro
- Progresso em `localStorage` (`portal-estudos-v1`)
- Offline parcial via Service Worker
- Sem backend, login ou banco remoto

## Páginas principais

| Página | Função |
|--------|--------|
| Dashboard | Visão geral, meta, fracos |
| Hoje | O que estudar hoje, cronômetro, recuperação |
| Cronograma | Plano 16 semanas |
| Edital | Edital verticalizado + cobertura |
| Questões / Simulados | Prática e modo prova |
| Biblioteca | Leis e materiais oficiais |
| Progresso | Stats, sessões editáveis, relatório 7d |
| Backup | Exportar / importar JSON |

## Dados

Ficam em `data/`:

- `cronograma.json` — plano real (sem conversão em runtime)
- `edital-inss.json` / `edital-prf-administrativo.json`
- `questoes-inss.json` / `questoes-prf.json`
- `materiais.json`, `aulas.json`, `pdfs.json`, `textos.json`, etc.

### Videoaulas

`data/aulas.json` usa `url` como única fonte da interface. Cada registro é `video`, `playlist` ou `indisponivel`; pesquisas do YouTube e fallbacks automáticos são proibidos. Conteúdo sem disponibilidade, título, canal e compatibilidade temática comprovados permanece com `url: null`.

O relatório individual fica em `reports/aulas-link-report.json`; as buscas e alternativas avaliadas ficam em `reports/aulas-research.json`. `reports/aulas-candidates.json` preserva os endereços antigos somente para auditoria: eles não são fontes confiáveis e nunca são carregados pela aplicação.

## Backup

1. Abra **Backup**
2. **Baixar cópia do meu progresso**
3. Para restaurar: escolher arquivo → Importar

A migração de schema é automática e **não zera** o progresso.

Se o JSON do `localStorage` estiver corrompido, a tela de Backup preserva o
conteúdo bruto para download. A importação valida coleções e objetos antes de
substituir o progresso existente.

## Fluxo de estudo

Na página **Hoje**, abrir teoria ou material não conclui a etapa. O usuário
marca teoria e leitura explicitamente; a prática é concluída ao terminar o
questionário vinculado. O dia só pode ser finalizado depois de todas as etapas
e de uma sessão real ou questões respondidas.

Erros repetidos da mesma questão são agrupados no Caderno de erros, com
contagem e data da última ocorrência. Materiais enviados para revisão mantêm
data, link de abertura e ação de remoção.

### Unidade piloto

`data/unidades.json` define a unidade piloto de **Português — Interpretação de
textos** e seus objetivos estáveis. A página Hoje preserva a sequência leitura,
vídeo, checagem, prática, correção e revisão. Tentativas não são sobrescritas;
erros são classificados por objetivo e a primeira revisão é agendada em 1, 3
ou 7 dias conforme o desempenho registrado.

A unidade permanece em `statusEditorial: "rascunho"`: a existência, o título,
o canal e a duração da aula foram confirmados, mas o YouTube não entregou a
transcrição necessária para validar cobertura e timestamps dos três objetivos.
Por isso, a interface bloqueia as etapas posteriores ao vídeo em vez de
publicar um trecho presumido.

## Validação

```bash
node scripts/validate.mjs
node scripts/test-calendar.mjs
node scripts/check-links.mjs
node --test tests/check-links.test.mjs
node --test tests/validate-units.test.mjs
node scripts/validate-units.mjs
for file in assets/js/*.js; do node --check "$file" || exit 1; done
npm run test:e2e
```

`check-links.mjs` faz requisições GET externas reais. Testes com `fetch` mockado verificam somente a lógica do validador e não comprovam links. Bloqueios, timeout ou falhas de rede mantêm o conteúdo sem aprovação e produzem código de saída diferente de zero.

O workflow de GitHub Pages instala as dependências e o Chromium e executa
`npm test` antes de preparar o artefato. Uma falha impede a publicação.

## GitHub Pages

Push na `main` publica o site. Após deploy:

1. Abra o site
2. **Ctrl+Shift+R** (limpa cache do SW)
3. Se necessário: DevTools → Application → Service Workers → Unregister + Clear storage

## Adicionar conteúdo

- **Questão:** inclua em `data/questoes-*.json` com id único, gabarito e fonte.
- **Material:** `data/materiais.json` com URL oficial verificável.
- **Tópico de edital:** `data/edital-*.json`.

Não invente links, gabaritos ou resoluções. Não inclua material pago/pirateado.

## Licença de uso

Material de estudo pessoal. Provas e leis pertencem às fontes oficiais (Cebraspe, Planalto, etc.).
