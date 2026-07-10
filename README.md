# Portal de Estudos — INSS e PRF Administrativo

Portal estático e instalável para acompanhar cronograma, horas, questões,
sequência de estudos, atrasos, simulados, provas, materiais e progresso diário.

## Abrir no computador

Execute `./iniciar.sh` e acesse `http://localhost:3050`.

## Dados e backup

O progresso fica salvo somente no navegador. A tela **Backup** permite exportar
e restaurar um arquivo JSON. Faça um backup periódico e guarde-o em local seguro.

## Publicação

O fluxo `.github/workflows/pages.yml` publica automaticamente o conteúdo da
branch `main` no GitHub Pages. No repositório, selecione **Settings → Pages →
Source: GitHub Actions** uma única vez.
